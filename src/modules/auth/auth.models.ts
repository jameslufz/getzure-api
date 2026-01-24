import Elysia, { t } from "elysia";

const getOtpRequestParam = t.Object({
    phoneNumber: t.String({ error: "กรุณาระบุหมายเลขเบอร์โทรศัพท์" }),
})

const AuthModels = new Elysia()
.model({
    getOtpParam: getOtpRequestParam
})

export default AuthModels

export type TGetOtpRequestParam = typeof getOtpRequestParam.static