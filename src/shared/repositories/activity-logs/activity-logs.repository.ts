import { Pool } from "mysql2/promise"
import { v4 as uuid } from "uuid"
import { GetOneLogKeyId, TLogKeys } from "./activity-logs.interface"

class ActivityLogsRepository
{
    constructor
    (
        private db: Pool,
    )
    {}

    async getOneLogKeyId(logKeyName: TLogKeys): Promise<GetOneLogKeyId | null>
    {
        const [logKey] = await this.db.query<GetOneLogKeyId[]>("select id from activity_log_keys where key_code = ?", [ logKeyName ])
        return (logKey.length > 0 ? logKey[0] : null)
    }

    async createLogKey(logKeyName: TLogKeys)
    {
        return this.db.query("insert into activity_log_keys (key_code) values (?)", [logKeyName])
    }

    async createLog(logKeyName: TLogKeys, userId: number, beforeChange: object | null, afterChange: object | null)
    {
        let logKey = await this.getOneLogKeyId(logKeyName)
        if(!logKey)
        {
            await this.createLogKey(logKeyName)

            logKey = await this.getOneLogKeyId(logKeyName)
        }

        if(!logKey)
        {
            return false
        }

        return this.db.execute("insert into activity_logs (id, log_key_id, before_change, after_change, created_at, created_by) values (?, ?, ?, ?, ?, ?)", [uuid(), logKey.id, beforeChange, afterChange, new Date(), userId ])
    }
}

export default ActivityLogsRepository