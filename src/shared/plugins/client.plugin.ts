import Elysia from "elysia";

const clientInfo = new Elysia()
.derive({ as: "global" }, async ({ request, server }) => {
    const requestIp = await server?.requestIP(request)
    return {
        client: {
            ip: request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || request.headers.get("X-Real-IP") || requestIp?.address,
            device: request.headers.get("User-Agent"),
        }
    }
})

export default clientInfo