import { Elysia, ValidationError } from "elysia";
import { authRoute } from "@/modules/auth/auth.routes";
import ResponseModels from "@/shared/models/response.model";
import handleException from "./shared/exceptions/handle.exception";
import { masterDatabase } from "./shared/database/mysql.database";

const app = new Elysia()
.onError(({ error, set, }) => handleException(error as ValidationError, set))
.use(masterDatabase)
.use(ResponseModels)
.use(authRoute)
.listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
