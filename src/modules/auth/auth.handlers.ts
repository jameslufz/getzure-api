import { BadRequestException, InternalServerErrorException, UnprocessableContentException } from "@/shared/exceptions/http.exception";
import { CheckExistsPhoneNumber, GetUserData, RequestOtpTotal } from "./auth.interfaces";
import { TLoginRequestBody, TLoginResponseBody, TOtpVerificationsRequestBody, TRegisterRequestBody, TRequestedOtp, TRequestOtpRequestBody, TRequestOtpResponseData } from "./auth.models";
import type { Pool } from "mysql2/promise"
import { randNumber, randString } from "@/shared/utils/randoms";
import { v4 as uuid } from "uuid"
import Redis from "ioredis"
import dayjs from "dayjs"
import { Ok } from "@/shared/utils/response";
import { BaseResponse } from "@/shared/types/response";
import * as argon2 from "argon2"
import { JWTCustom } from "@/shared/types/context";
import { JWTWritters } from "@/shared/utils/jwt";

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
        redis.del(CACHE_OTP_REQUESTED),
        redis.setex(`otpVerifications:OTP_VERIFIED:${b.phoneNumber}`, 900, 1)
    ])

    return Ok()
}

export const register = async (db: Pool, redis: Redis, b: TRegisterRequestBody): Promise<BaseResponse> =>
{
    const validateEmailRFC5322Pattern = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
    if(!validateEmailRFC5322Pattern.test(b.email))
    {
        throw new BadRequestException("รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบ", "INVALID_EMAIL_PATTERN")
    }

    if(!/[0-9]{10}/gi.test(b.phoneNumber))
    {
        throw new UnprocessableContentException("เบอร์โทรศัพท์ต้องเป็นตัวเลขและมี 10 หลักเท่านั้น", "INVALID_PHONE_NUMB_PATTERN")
    }

    if(/[ก-๙]+/gi.test(b.password))
    {
        throw new UnprocessableContentException("รหัสผ่านไม่สามารถมีภาษาไทยได้", "INVALID_PWD_PATTERN")
    }

    if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/gi.test(b.password))
    {
        throw new UnprocessableContentException("รหัสผ่านต้องมีอย่างน้อย 8 หลัก และประกอบด้วยอักษร A-Z ทั้งพิมพ์เล็กและพิมพ์ใหญ่ ตัวเลขและอักษรพิเศษ", "INVALID_PWD_PATTERN")
    }

    if(b.password !== b.confirmPassword)
    {
        throw new UnprocessableContentException("รหัสผ่านไม่ตรงกัน", "BAD_CONFIRM_PWD")
    }

    const CACHE_OTP_VERIFIED = `otpVerifications:OTP_VERIFIED:${b.phoneNumber}`
    const rawOtpVerified = await redis.exists(CACHE_OTP_VERIFIED)
    if(!rawOtpVerified)
    {
        throw new BadRequestException("หมดเวลาทำรายการ โปรดทำรายการใหม่อีกครั้ง(กรุณาทำรายการภายใน 15 นาที หลังยืนยัน OTP)", "INVALID_OTP_NUMB")
    }

    const sanitizedFirstName = b.firstName.replace(/\s+/gi, "").trim()
    const sanitizedMiddleName = (b.middleName && b.middleName !== "" ? b.middleName.replace(/\s+/gi, "").trim() : null)
    const sanitizedLastName = b.lastName.replace(/\s+/gi, "").trim()

    const hashedPassword = await argon2.hash(b.password)

    await db.execute("insert into users (email, phone_number, password, first_name, middle_name, last_name, join_date) values (?, ?, ?, ?, ?, ?, ?)", [b.email, b.phoneNumber, hashedPassword, sanitizedFirstName, sanitizedMiddleName, sanitizedLastName, new Date()])
    await redis.del([
        CACHE_OTP_VERIFIED,
        `requestOtp:OTP_REQUESTED:${b.phoneNumber}`,
        `requestOtp:WAIT_OTP_RENEW:${b.phoneNumber}`,
        `requestOtp:WAIT_OTP_TOMORROW:${b.phoneNumber}`,
    ])

    return Ok()
}

export const login = async (db: Pool, redis: Redis, jwt: JWTWritters, b: TLoginRequestBody): Promise<BaseResponse<TLoginResponseBody>> =>
{
    const [[user]] = await db.query<GetUserData[]>(`
        select email,
            phone_number as phoneNumber,
            password,
            username,
            first_name as firstName,
            middle_name as middleName,
            last_name as lastName,
            join_date as joinDate
        from users
        where username = ? or email = ? or phone_number = ?
    `, [ b.username, b.username, b.username ])
    if(!user)
    {
        throw new UnprocessableContentException("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "INVALID_USER_PWD")
    }

    if(!user.password)
    {
        throw new InternalServerErrorException("เกิดเหตุขัดข้องขณะเข้าสู่ระบบ", "ERR_PWD_MISSING")
    }

    const isCorrectPassword = await argon2.verify(user.password, b.password)
    if(!isCorrectPassword)
    {
        throw new UnprocessableContentException("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "INVALID_USER_PWD")
    }

    delete user.password

    const [accessToken, refreshToken] = await Promise.all([
        jwt.access.sign(user),
        jwt.refresh.sign(user),
    ])

    return Ok<TLoginResponseBody>({ accessToken, refreshToken })
}