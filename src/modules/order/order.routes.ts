import { Elysia } from "elysia";
import OrderModels from "./order.models";
import { BaseContext } from "@/shared/types/context.type";
import { authenticateUser } from "@/shared/plugins/auth.plugin";

export const orderRoute = new Elysia<"/order", BaseContext>({ prefix: "/order" })
.use(OrderModels)
.use(authenticateUser)
.post("/create", () => "OK")