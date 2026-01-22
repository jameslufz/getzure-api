import { TRegisterRequestBody } from "./auth.model";
import type { Pool } from "mysql2/promise"

export const regsiter = async (db: Pool, body: TRegisterRequestBody) =>
{
    const [data] = await db.query("SELECT * FROM users")
    return {
        data
    }
}