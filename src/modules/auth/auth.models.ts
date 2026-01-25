import Elysia, { t } from "elysia";

const requestOtpRequestBody = t.Object({
    phoneNumber: t.String({ error: "กรุณาระบุหมายเลขเบอร์โทรศัพท์", code: "MISS_PHONE_NUMB" }),
})

const requestedOtp = t.Object({
    phoneNumber: t.String(),
    otpRef: t.String(),
    otpNumber: t.String(),
})

const requestOtpResponseData = t.Object({
    otpRef: t.String(),
})

const otpVerificationsRequestBody = t.Object({
    phoneNumber: t.String({ error: "กรุณาระบุหมายเลขเบอร์โทรศัพท์", code: "MISS_PHONE_NUMB" }),
    otpNumber: t.String({ error: "กรุณาระบุหมายเลข OTP", code: "MISS_OTP_NUMB" }),
    otpRef: t.String({ error: "กรุณาระบุรหัสอ้างอิง OTP", code: "MISS_OTP_REF" }),
})

const AuthModels = new Elysia()
.model({
    requestOtpBody: requestOtpRequestBody,
    otpVerificationsBody: otpVerificationsRequestBody,
})

export default AuthModels

export type TRequestOtpRequestBody = typeof requestOtpRequestBody.static
export type TRequestedOtp = typeof requestedOtp.static
export type TRequestOtpResponseData = typeof requestOtpResponseData.static

export type TOtpVerificationsRequestBody = typeof otpVerificationsRequestBody.static