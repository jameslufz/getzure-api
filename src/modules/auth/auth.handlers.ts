import { BadRequestException, UnprocessableContentException } from "@/shared/exceptions/http.exception";
import { CheckExistsPhoneNumber, RequestOtpTotal } from "./auth.interfaces";
import { TOtpVerificationsRequestBody, TRequestedOtp, TRequestOtpRequestBody, TRequestOtpResponseData } from "./auth.models";
import type { Pool } from "mysql2/promise"
import { randNumber, randString } from "@/shared/utils/randoms";
import { v4 as uuid } from "uuid"
import Redis from "ioredis"
import dayjs from "dayjs"
import { Ok } from "@/shared/utils/response";
import { BaseResponse } from "@/shared/types/response";

export const requestOtp = async (db: Pool, redis: Redis, b: TRequestOtpRequestBody): Promise<BaseResponse<TRequestOtpResponseData>> =>
{
    const CACHE_OTP_REQUESTED_KEY = `requestOtp:OTP_REQUESTED:${b.phoneNumber}`
    const CACHE_WAIT_OTP_RENEW_KEY = `requestOtp:WAIT_OTP_RENEW:${b.phoneNumber}`
    const CACHE_WAIT_OTP_TOMORROW_KEY = `requestOtp:WAIT_OTP_TOMORROW:${b.phoneNumber}`

    const [isWaitOtpRenew, isWaitTomorrow] = await Promise.all([
        redis.get(CACHE_WAIT_OTP_RENEW_KEY),
        redis.get(CACHE_WAIT_OTP_TOMORROW_KEY),
    ])

    if(isWaitOtpRenew)
    {
        const ttl = await redis.ttl(CACHE_WAIT_OTP_RENEW_KEY)
        const mins = Math.floor(ttl / 60)
        const secs = (ttl % 60)
        throw new UnprocessableContentException(`กรุณารออีก ${mins} นาที ${secs} วินาที ก่อนขอ OTP ใหม่อีกครั้ง`, "WAIT_OTP_RENEW")
    }

    if(isWaitTomorrow)
    {
        const ttl = await redis.ttl(CACHE_WAIT_OTP_TOMORROW_KEY)
        const hours = Math.floor(ttl / 3600)
        const mins = Math.floor(ttl / 60) % 60
        const secs = (ttl % 60)
        throw new UnprocessableContentException(`วันนี้คุณขอ OTP ครบ 3 ครั้งแล้ว สามารถทำรายการได้อีกครั้งใน ${hours} ชั่วโมง ${mins} นาที ${secs} วินาที`, "OVER_REQ_OTP")
    }

    const [[ phoneNumber ]] = await db.query<CheckExistsPhoneNumber[]>("select count(phone_number) as isExists from users where phone_number = ?", [ b.phoneNumber ])
    if(phoneNumber.isExists)
    {
        throw new UnprocessableContentException(`เบอร์โทรศัพท์หมายเลข ${b.phoneNumber} มีผู้ใช้งานแล้ว`, "EXISTS_PHONE_NUMB")
    }

    const dateStart = dayjs().startOf("d")
    const dateEnd = dayjs().endOf("d")
    const [[ requestOtp ]] = await db.query<RequestOtpTotal[]>("select count(id) as total from otp where phone_number = ? and (created_date between ? and ?)", [ b.phoneNumber, dateStart.toDate(), dateEnd.toDate() ])
    if(requestOtp.total >= 3)
    {
        const tomorrow = Math.floor(Number(dayjs().add(1, "d").startOf("d").toDate()) / 1000)
        const now = Math.floor(Number(new Date()) / 1000)
        const waitSeconds = (tomorrow - now)
        await redis.setex(CACHE_WAIT_OTP_TOMORROW_KEY, waitSeconds, 1)

        throw new UnprocessableContentException(`วันนี้คุณขอ OTP ครบ 3 ครั้งแล้ว สามารถทำรายการได้อีกครั้งในวันพรุ่งนี้`, "OVER_REQ_OTP")
    }

    await Promise.all([
        db.execute("update otp set is_timeout = 1, updated_date = ? where phone_number = ? and is_timeout is null and is_success is null", [ new Date(), b.phoneNumber ]),
        redis.del(CACHE_OTP_REQUESTED_KEY)
    ])

    const otpNumber = randNumber(6)
    const otpRef = randString(6)

    await db.execute("INSERT INTO otp (id, phone_number, otp_number, otp_ref, created_date) VALUES (?, ?, ?, ?, ?)", [uuid(), b.phoneNumber, otpNumber, otpRef, new Date()])
    await Promise.all([
        redis.setex(CACHE_OTP_REQUESTED_KEY, 180, JSON.stringify({ phoneNumber: b.phoneNumber, otpNumber, otpRef })),
        redis.setex(CACHE_WAIT_OTP_RENEW_KEY, 60, 1),
    ])

    return Ok<TRequestOtpResponseData>({ otpRef })
}

export const otpVerifications = async (db: Pool, redis: Redis, b: TOtpVerificationsRequestBody): Promise<BaseResponse> =>
{
    const CACHE_OTP_REQUESTED = `requestOtp:OTP_REQUESTED:${b.phoneNumber}`
    const rawRequestedOtp = await redis.get(CACHE_OTP_REQUESTED)
    if(!rawRequestedOtp)
    {
        throw new BadRequestException("หมายเลข OTP หมดอายุ กรุณาขอใหม่อีกครั้ง", "EXPIRED_OTP")
    }

    const requestedOtp = JSON.parse(rawRequestedOtp) as TRequestedOtp

    if(b.phoneNumber !== requestedOtp.phoneNumber)
    {
        console.log(b.phoneNumber, requestedOtp.phoneNumber)
        throw new BadRequestException("หมายเลขเบอร์โทรศัพท์ไม่ตรงกัน โปรดลองใหม่อีกครั้ง", "INVALID_OTP_PHONE_NUMB")
    }

    if(b.otpRef !== requestedOtp.otpRef)
    {
        throw new BadRequestException("รหัสอ้างอิงไม่ถูกต้อง โปรดลองใหม่อีกครั้ง", "INVALID_OTP_REF")
    }

    if(b.otpNumber !== requestedOtp.otpNumber)
    {
        throw new BadRequestException("หมายเลข OTP ไม่ถูกต้อง โปรดลองใหม่อีกครั้ง", "INVALID_OTP_NUMB")
    }

    await Promise.all([
        db.execute("update otp set is_success = 1, updated_date = ? where phone_number = ? and is_timeout is null and is_success is null", [ new Date(), b.phoneNumber ]),
        redis.del(CACHE_OTP_REQUESTED)
    ])

    return Ok()
}