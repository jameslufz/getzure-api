import { UnprocessableContentException } from "@/shared/exceptions/http.exception";
import { CheckExistsPhoneNumber, RequestOtpTotal } from "./auth.interfaces";
import { TGetOtpRequestParam } from "./auth.models";
import type { Pool } from "mysql2/promise"
import { randNumber, randString } from "@/shared/utils/randoms";
import { v4 as uuid } from "uuid"
import Redis from "ioredis"
import dayjs from "dayjs"

export const getOtp = async (db: Pool, redis: Redis, p: TGetOtpRequestParam) =>
{
    const CACHE_WAIT_RENEW_KEY = `WAIT_OTP_RENEW:${p.phoneNumber}`
    const CACHE_WAIT_TOMORROW_KEY = `WAIT_OTP_TOMORROW:${p.phoneNumber}`

    const [isWaitRenew, isWaitTomorrow] = await Promise.all([
        redis.get(CACHE_WAIT_RENEW_KEY),
        redis.get(CACHE_WAIT_TOMORROW_KEY),
    ])

    if(isWaitRenew)
    {
        const ttl = await redis.ttl(CACHE_WAIT_RENEW_KEY)
        const mins = Math.floor(ttl / 60)
        const secs = (ttl % 60)
        throw new UnprocessableContentException(`กรุณารออีก ${mins} นาที ${secs} วินาที ก่อนขอ OTP ใหม่อีกครั้ง`, "WAIT_OTP_RENEW")
    }

    if(isWaitTomorrow)
    {
        const ttl = await redis.ttl(CACHE_WAIT_TOMORROW_KEY)
        const hours = Math.floor(ttl / 3600)
        const mins = Math.floor(ttl / 60) % 60
        const secs = (ttl % 60)
        throw new UnprocessableContentException(`วันนี้คุณขอ OTP ครบ 3 ครั้งแล้ว สามารถทำรายการได้อีกครั้งใน ${hours} ชั่วโมง ${mins} นาที ${secs} วินาที`, "OVER_REQ_OTP")
    }

    const [[ phoneNumber ]] = await db.query<CheckExistsPhoneNumber[]>("select count(phone_number) as isExists from users where phone_number = ?", [ p.phoneNumber ])
    if(phoneNumber.isExists)
    {
        throw new UnprocessableContentException(`เบอร์โทรศัพท์หมายเลข ${p.phoneNumber} มีผู้ใช้งานแล้ว`, "EXISTS_PHONE_NUMB")
    }

    const dateStart = dayjs().startOf("d")
    const dateEnd = dayjs().endOf("d")
    const [[ requestOtp ]] = await db.query<RequestOtpTotal[]>("select count(id) as total from otp where phone_number = ? and (created_date between ? and ?)", [ p.phoneNumber, dateStart.toDate(), dateEnd.toDate() ])
    if(requestOtp.total >= 3)
    {
        const tomorrow = Math.floor(Number(dayjs().add(1, "d").startOf("d").toDate()) / 1000)
        const now = Math.floor(Number(new Date()) / 1000)
        const waitSeconds = (tomorrow - now)
        await redis.setex(CACHE_WAIT_TOMORROW_KEY, waitSeconds, 1)

        throw new UnprocessableContentException(`วันนี้คุณขอ OTP ครบ 3 ครั้งแล้ว สามารถทำรายการได้อีกครั้งในวันพรุ่งนี้`, "OVER_REQ_OTP")
    }

    await db.execute("update otp set is_timeout = 1, updated_date = ? where is_timeout is null and is_success is null", [ p.phoneNumber, new Date() ])

    const otpNo = randNumber(4)
    const otpRef = randString(4)

    await db.execute("INSERT INTO otp (id, phone_number, otp_number, otp_ref, created_date) VALUES (?, ?, ?, ?, ?)", [uuid(), p.phoneNumber, otpNo, otpRef, new Date()])
    await redis.setex(CACHE_WAIT_RENEW_KEY, 60, JSON.stringify({ otpNo, otpRef }))

    return {
        otpRef,
    }
}