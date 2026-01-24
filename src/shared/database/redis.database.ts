import Elysia from "elysia"
import Redis from "ioredis"

const redisDatabase = () =>
{
    const redis = new Redis()

    return new Elysia({ name: "redisMaster" }).decorate("redis", redis)
}

export default redisDatabase