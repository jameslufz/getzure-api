import jwt from "@elysiajs/jwt"
import fs from "fs/promises"
import { importPKCS8, importSPKI } from "jose"
import { JWTSign } from "../types/context"

export type JWTWritters = {
    access: JWTSign
    refresh: JWTSign
}

export const jwtAccessTokenWritter = async () =>
{
    const accessTokenPrivateBase64 = process.env.JWT_ACCESS_PRIVATE as string
    const accessTokenPrivateBuffer = Buffer.from(accessTokenPrivateBase64, "base64")
    const accessTokenPrivate = await importPKCS8(accessTokenPrivateBuffer.toString("utf-8"), "EdDSA")
    return jwt({
        name: "accessTokenWritter",
        alg: "EdDSA",
        secret: accessTokenPrivate,
        iat: true,
        exp: "1h"
    })
}

export const jwtAccessTokenReader = async () =>
{
    const accessTokenPublicBase64 = process.env.JWT_ACCESS_PUBLIC as string
    const accessTokenPublicBuffer = Buffer.from(accessTokenPublicBase64, "base64")
    const accessTokenPublic = await importSPKI(accessTokenPublicBuffer.toString("utf-8"), "EdDSA")
    return jwt({
        name: "accessTokenReader",
        alg: "EdDSA",
        secret: accessTokenPublic,
    })
}

/**
 * 
 * Refresh token writter.
 */
export const jwtRefreshTokenWritter = async () =>
{
    const refreshTokenPrivateBase64 = process.env.JWT_REFRESH_PRIVATE as string
    const refreshTokenPrivateBuffer = Buffer.from(refreshTokenPrivateBase64, "base64")
    const refreshTokenPrivate = await importPKCS8(refreshTokenPrivateBuffer.toString("utf-8"), "EdDSA")
    return jwt({
        name: "refreshTokenWritter",
        alg: "EdDSA",
        secret: refreshTokenPrivate,
        iat: true,
        exp: "2h",
        nbf: "1h"
    })
}

/**
 * 
 * Refresh token reader.
 */
export const jwtRefreshTokenReader = async () =>
{
    const refreshTokenPublicBase64 = process.env.JWT_REFRESH_PUBLIC as string
    const refreshTokenPublicBuffer = Buffer.from(refreshTokenPublicBase64, "base64")
    const refreshTokenPublic = await importSPKI(refreshTokenPublicBuffer.toString("utf-8"), "EdDSA")
    return jwt({
        name: "refreshTokenReader",
        alg: "EdDSA",
        secret: refreshTokenPublic,
    })
}
