import { Elysia, ValidationError } from "elysia";
import { authRoute } from "@/modules/auth/auth.routes";
import ResponseModels from "@/shared/models/response.model";
import handleException from "./shared/exceptions/handle.exception";
import { masterDatabase } from "./shared/database/mysql.database";
import redisDatabase from "./shared/database/redis.database";

const app = new Elysia({ prefix: "/api/v1" })
.onError(({ error, set, }) => handleException(error as ValidationError, set))
.use(masterDatabase())
.use(redisDatabase())
.use(ResponseModels)
.use(authRoute)
.listen(3000);

console.log(
  `\x1b[33m[${new Date().toLocaleString()}] \x1b[0m🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
