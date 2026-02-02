import { BadRequestException, InternalServerErrorException, UnprocessableContentException } from "@/shared/exceptions/http.exception";
import { TLoginRequestBody, TLoginResponseBody, TOtpVerificationsRequestBody, TRegisterRequestBody, TRequestedOtp, TRequestOtpRequestBody, TRequestOtpResponseData } from "./auth.models";
import type { Pool } from "mysql2/promise"
import { randNumber, randString } from "@/shared/utils/randoms";
import { v4 as uuid } from "uuid"
import Redis from "ioredis"
import dayjs from "dayjs"
import responseBuilder from "@/shared/utils/response";
import { BaseResponse } from "@/shared/types/response.type";
import * as argon2 from "argon2"
import { JWTWritters } from "@/shared/utils/jwt";
import OtpRepository from "@/shared/repositories/otp/otp.repository";
import UsersRepository from "@/shared/repositories/users/users.repository";
import { UserData } from "@/shared/repositories/users/users.interface";
import UserLoginLogsRepository from "@/shared/repositories/user-login-logs/user-login-logs.repository";

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

    const otpRepo = new OtpRepository(db)

    const isPhoneNumberExists = await otpRepo.isExistsPhoneNumber(b.phoneNumber)
    if(isPhoneNumberExists)
    {
        throw new UnprocessableContentException(`เบอร์โทรศัพท์หมายเลข ${b.phoneNumber} มีผู้ใช้งานแล้ว`, "EXISTS_PHONE_NUMB")
    }

    const dateStart = dayjs().startOf("d")
    const dateEnd = dayjs().endOf("d")
    const requestedOtp = await otpRepo.requestedOtp(b.phoneNumber, dateStart.toDate(), dateEnd.toDate())
    if(requestedOtp.total >= 3)
    {
        const tomorrow = Math.floor(Number(dayjs().add(1, "d").startOf("d").toDate()) / 1000)
        const now = Math.floor(Number(new Date()) / 1000)
        const waitSeconds = (tomorrow - now)
        await redis.setex(CACHE_WAIT_OTP_TOMORROW_KEY, waitSeconds, 1)

        throw new UnprocessableContentException(`วันนี้คุณขอ OTP ครบ 3 ครั้งแล้ว สามารถทำรายการได้อีกครั้งในวันพรุ่งนี้`, "OVER_REQ_OTP")
    }

    await Promise.all([
        otpRepo.updateOtpTimeout(b.phoneNumber),
        redis.del(CACHE_OTP_REQUESTED_KEY)
    ])

    const otpNumber = randNumber(6)
    const otpRef = randString(6)

    await otpRepo.createOtpRequest(uuid(), b.phoneNumber, otpNumber, otpRef)
    await Promise.all([
        redis.setex(CACHE_OTP_REQUESTED_KEY, 180, JSON.stringify({ phoneNumber: b.phoneNumber, otpNumber, otpRef })),
        redis.setex(CACHE_WAIT_OTP_RENEW_KEY, 60, 1),
    ])

    return responseBuilder.Ok<TRequestOtpResponseData>({ otpRef })
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

    const otpRepo = new OtpRepository(db)
    await otpRepo.updateOtpSuccess(b.phoneNumber)
    await Promise.all([
        redis.del(CACHE_OTP_REQUESTED),
        redis.setex(`otpVerifications:OTP_VERIFIED:${b.phoneNumber}`, 900, 1)
    ])

    return responseBuilder.Ok()
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

    const usersRepo = new UsersRepository(db)
    await usersRepo.createUser(b.email, b.phoneNumber, hashedPassword, sanitizedFirstName, sanitizedMiddleName, sanitizedLastName)
    await redis.del([
        CACHE_OTP_VERIFIED,
        `requestOtp:OTP_REQUESTED:${b.phoneNumber}`,
        `requestOtp:WAIT_OTP_RENEW:${b.phoneNumber}`,
        `requestOtp:WAIT_OTP_TOMORROW:${b.phoneNumber}`,
    ])

    return responseBuilder.Ok()
}

export const login = async (db: Pool, redis: Redis, jwt: JWTWritters, b: TLoginRequestBody, ipAddress: string | null, device?: string): Promise<BaseResponse<TLoginResponseBody>> =>
{
    const LOGIN_ATTEMP_KEY = `auth:login:attempt:${b.username}:${ipAddress}`
    const attempAmount = await redis.incr(LOGIN_ATTEMP_KEY)

    const usersRepo = new UsersRepository(db)
    const user = await usersRepo.findOneUser(b.username)
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

    const userLoginLogs = new UserLoginLogsRepository(db)

    await Promise.all([
        userLoginLogs.createLogs(user.id, attempAmount, ipAddress, device),
        redis.setex(`auth:access_token:${accessToken}`, 3600, 1),
    ])

    return responseBuilder.Ok<TLoginResponseBody>({ accessToken, refreshToken })
}

export const me = (user?: UserData) =>
{
    return responseBuilder.Ok(user)
}

export const refreshLogin = async (redis: Redis, jwt: JWTWritters, user: UserData,) =>
{
    const [accessToken, refreshToken] = await Promise.all([
        jwt.access.sign(user),
        jwt.refresh.sign(user),
    ])

    await redis.setex(`auth:access_token:${accessToken}`, 3600, 1)

    return responseBuilder.Ok<TLoginResponseBody>({ accessToken, refreshToken })
}

export const invokeToken = async (redis: Redis, accessToken?: string) =>
{
    await redis.del(`auth:access_token:${accessToken}`)
    return responseBuilder.Ok()
}