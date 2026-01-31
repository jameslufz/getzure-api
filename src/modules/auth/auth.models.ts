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

const registerRequestBody = t.Object({
    email: t.String({ error: "กรุณาระบุอีเมล์", code: "MISS_EMAIL" }),
    phoneNumber: t.String({ error: "กรุณาระบุหมายเลขเบอร์โทรศัพท์", code: "MISS_PHONE_NUMB" }),
    password: t.String({ error: "กรุณากำหนดรหัสผ่าน", code: "MISS_PWD" }),
    confirmPassword: t.String({ error: "กรุณายืนยันรหัสผ่าน", code: "MISS_PWD" }),
    firstName: t.String({ error: "กรุณาระบุชื่อจริง", code: "MISS_FIRST_NAME" }),
    middleName: t.Optional(
        t.String()
    ),
    lastName: t.String({ error: "กรุณาระบุนามสกุล", code: "MISS_LAST_NAME" }),
})

const loginRequestBody = t.Object({
    username: t.String({ error: "กรุณาระบุชื่อผู้ใช้ เบอร์โทรศัพท์ หรืออีเมล์", code: "MISS_USERNAME" }),
    password: t.String({ error: "กรุณากรอกรหัสผ่าน", code: "MISS_PWD" }),
})

const loginResponseBody = t.Object({
    accessToken: t.String(),
    refreshToken: t.String(),
})


const AuthModels = new Elysia()
.model({
    requestOtpBody: requestOtpRequestBody,
    otpVerificationsBody: otpVerificationsRequestBody,
    registerBody: registerRequestBody,
    loginBody: loginRequestBody,
})

export default AuthModels

export type TRequestOtpRequestBody = typeof requestOtpRequestBody.static
export type TRequestedOtp = typeof requestedOtp.static
export type TRequestOtpResponseData = typeof requestOtpResponseData.static

export type TOtpVerificationsRequestBody = typeof otpVerificationsRequestBody.static

export type TRegisterRequestBody = typeof registerRequestBody.static

export type TLoginRequestBody = typeof loginRequestBody.static
export type TLoginResponseBody = typeof loginResponseBody.static