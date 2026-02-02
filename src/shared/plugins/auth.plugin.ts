import Elysia from "elysia";
import bearer from "@elysiajs/bearer";
import responseBuilder from "../utils/response";
import { GetUserData } from "../repositories/users/users.interface";
import { importSPKI, jwtVerify } from "jose";
import { errors } from "jose";

export const authenticateUser = new Elysia()
.use(bearer())
.derive({ as: 'global' }, async ({ bearer, status }) => {
    if(!bearer)
    {
        return status(401, responseBuilder.Error("คุณไม่ได้รับอนุญาตให้ใช้งาน", "UNAUTHORIZED"))
    }

    const accessTokenPublicBase64 = process.env.JWT_ACCESS_PUBLIC as string
    const accessTokenPublicBuffer = Buffer.from(accessTokenPublicBase64, "base64")
    const accessTokenPublic = await importSPKI(accessTokenPublicBuffer.toString("utf-8"), "EdDSA")

    try
    {
        const jwt = await jwtVerify<GetUserData>(bearer, accessTokenPublic)
        return {
            user: jwt.payload
        }
    }
    catch
    {
        return status(401, responseBuilder.Error("เซสซั่นหมดอายุ", "EXPIRED_SESSION"))
    }
})

export const refreshToken = new Elysia()
.use(bearer())
.derive({ as: "global" }, async ({ bearer, status }) => {
    if(!bearer)
    {
        return status(401, responseBuilder.Error("คุณไม่ได้รับอนุญาตให้ใช้งาน", "UNAUTHORIZED"))
    }

    const refreshTokenPublicBase64 = process.env.JWT_REFRESH_PUBLIC as string
    const refreshTokenPublicBuffer = Buffer.from(refreshTokenPublicBase64, "base64")
    const refreshTokenPublic = await importSPKI(refreshTokenPublicBuffer.toString("utf-8"), "EdDSA")

    try
    {
        const jwt = await jwtVerify<GetUserData>(bearer, refreshTokenPublic)

        return {
            user: jwt.payload
        }
    }
    catch(e)
    {
        let errorMessage = "เซสซั่นหมดอายุ"
        let errorCode = "EXPIRED_SESSION"
        if(e instanceof errors.JWTClaimValidationFailed)
        {
            const errorMessages: Record<errors.JWTClaimValidationFailed["claim"], Record<"message" | "code", string>> = {
                nbf: {
                    message: "โทเคนไม่สามารถใช้งานได้",
                    code: "UNAVAILABLE_TOKEN"
                },
            }

            errorMessage = errorMessages[e.claim]["message"]
            errorCode = errorMessages[e.claim]["code"]
        }
    
        return status(401, responseBuilder.Error(errorMessage, errorCode))
    }
})