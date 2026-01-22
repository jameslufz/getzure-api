import Elysia, { t } from "elysia";

const baseResponse = t.Object({
    status: t.Number(),
    message: t.Optional(
        t.String()
    ),
    data: t.Optional(
        t.Object({})
    ),
})

const ResponseModels = new Elysia()
.model({
    base: baseResponse
})

export default ResponseModels

export type TBaseResponse = typeof baseResponse.static