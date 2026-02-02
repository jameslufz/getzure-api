import { Pool } from "mysql2/promise"
import { v4 as uuid } from "uuid"

class UserLoginLogsRepository
{
    constructor
    (
        private db: Pool
    )
    {}

    async createLogs(userId: number, attempAmount: number, ipAddress: string | null, device?: string)
    {
        return this.db.execute(
            "insert into user_login_logs (id, user_id, attempt_amount, ip_address, device, created_at) values (?, ?, ?, ?, ?, ?)",
            [ uuid(), userId, attempAmount, ipAddress, device, new Date() ]
        )
    }
}

export default UserLoginLogsRepository