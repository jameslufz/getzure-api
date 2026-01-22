import { Elysia } from "elysia"
import mysql from "mysql2/promise"

export const masterDatabase = () =>
{
    const pool = mysql.createPool({
        host: "localhost",
        user: "root",
        password: "12345678",
        database: "master_db",
        waitForConnections: true,
        connectionLimit: 10,
    })

    return new Elysia({ name: "masterDatabase" })
    .decorate("db", pool)
    .onStop(async () => pool.end())
}

export type MasterDatabase = ReturnType<typeof masterDatabase>