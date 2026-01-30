import { Elysia } from "elysia";
import * as authHandler from "./auth.handlers"
import AuthModels from "./auth.models";
import { RouteContext } from "@/shared/types/context";

export const authRoute = new Elysia<"/auth", RouteContext>({ prefix: "/auth" })
.use(AuthModels)
.post("/otp/request", ({ body, db, redis }) => authHandler.requestOtp(db, redis, body), { body: "requestOtpBody" })
.post("/otp/verifications", ({ body, db, redis }) => authHandler.otpVerifications(db, redis, body), { body: "otpVerificationsBody" })
.post("/register", ({ body, db, redis }) => authHandler.register(db, redis, body), { body: "registerBody" })