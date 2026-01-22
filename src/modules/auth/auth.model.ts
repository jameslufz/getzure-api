import Elysia, { t } from "elysia";

const registerRequestBody = t.Object({
    phoneNumber: t.String({ error: "กรุณาระบุหมายเลขเบอร์โทรศัพท์" }),
})

const AuthModels = new Elysia()
.model({
    signupBody: registerRequestBody
})

export default AuthModels

export type TRegisterRequestBody = typeof registerRequestBody.static