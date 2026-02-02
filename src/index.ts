import { Elysia, ValidationError } from "elysia";
import { authRoute } from "@/modules/auth/auth.routes";
import handleException from "./shared/exceptions/handle.exception";
import { masterDatabase } from "./shared/database/mysql.database";
import redisDatabase from "./shared/database/redis.database";
import { jwtAccessTokenWritter, jwtRefreshTokenWritter } from "./shared/utils/jwt";
import { orderRoute } from "./modules/order/order.routes";

const app = new Elysia({ prefix: "/api/v1" })

.onError(({ error, set, }) => handleException(error as ValidationError, set))

.use(masterDatabase())
.use(redisDatabase())

.use(jwtAccessTokenWritter())
.use(jwtRefreshTokenWritter())

.use(authRoute)
.use(orderRoute)

.listen(3000)

console.log(`\x1b[33m[${new Date().toLocaleString()}] \x1b[0m🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)