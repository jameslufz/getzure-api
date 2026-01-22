import { Elysia, t } from "elysia";
import * as authHandler from "./auth.handler"
import AuthModels from "./auth.model";
import { RouteContext } from "@/shared/types/context";

export const authRoute = new Elysia<"/auth", RouteContext>({ prefix: "/auth" })
.use(AuthModels)
.post("/signup", ({ body, db }) => authHandler.regsiter(db, body), { body: 'signupBody' })