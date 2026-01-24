import { Elysia } from "elysia";
import * as authHandler from "./auth.handlers"
import AuthModels from "./auth.models";
import { RouteContext } from "@/shared/types/context";

export const authRoute = new Elysia<"/auth", RouteContext>({ prefix: "/auth" })
.use(AuthModels)
.get("/otp/:phoneNumber", ({ params, db, redis }) => authHandler.getOtp(db, redis, params), { params: "getOtpParam" })