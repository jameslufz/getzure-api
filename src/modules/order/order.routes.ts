import { Elysia } from "elysia";
import OrderModels from "./order.models";
import { BaseContext } from "@/shared/types/context.type";
import { authenticateUser } from "@/shared/plugins/auth.plugin";
import orderHandlers from "./order.handlers";

export const orderRoute = new Elysia<"/order", BaseContext>({ prefix: "/order" })
.use(OrderModels)
.use(authenticateUser)
.post("/create",
    ({ db, redis, user, body }) => orderHandlers.createOrder(db, redis, user, body),
    { body: "createOrderRequestBody" }
)