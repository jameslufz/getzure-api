import { Elysia } from "elysia";
import * as authHandler from "./auth.handlers"
import AuthModels from "./auth.models";
import { BaseContext } from "@/shared/types/context.type";
import { authenticateUser, refreshToken } from "@/shared/plugins/auth.plugin";
import bearer from "@elysiajs/bearer";
import { jwtAccessTokenWritter, jwtRefreshTokenWritter } from "@/shared/utils/jwt";

export const authRoute = new Elysia<"/auth", BaseContext>({ prefix: "/auth" })
.use(AuthModels)

/**
 * 
 * Do not authorize routes.
 */
.post("/otp/request",
    ({ body, db, redis }) => authHandler.requestOtp(db, redis, body),
    { body: "requestOtpBody" }
)
.post("/otp/verifications",
    ({ body, db, redis }) => authHandler.otpVerifications(db, redis, body),
    { body: "otpVerificationsBody" }
)
.post("/register",
    ({ body, db, redis }) => authHandler.register(db, redis, body),
    { body: "registerBody" }
)
.group("/login", (app) => (
    app
    .use(jwtAccessTokenWritter())
    .use(jwtRefreshTokenWritter())
    .post("/",
        ({ body, db, redis, accessTokenWritter: access, refreshTokenWritter: refresh }) => authHandler.login(db, redis, {access, refresh}, body),
        { body: "loginBody" }
    )
))

/**
 * 
 * Need authorized routes.
 */
.group("/me", (app) => (
    app
    .use(authenticateUser)
    .get("/", ({ user }) => authHandler.me(user))
))

/**
 * 
 * Only refresh token.
 */
.group("/refresh", (app) => (
    app
    .use(refreshToken)
    .use(jwtAccessTokenWritter())
    .use(jwtRefreshTokenWritter())
    .post("/",
        ({ redis, accessTokenWritter: access, refreshTokenWritter: refresh, user }) => authHandler.refreshLogin(redis, {access, refresh}, user),
    )
))