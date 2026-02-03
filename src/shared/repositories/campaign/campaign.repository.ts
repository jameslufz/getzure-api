import { Pool } from "mysql2/promise"
import Redis from "ioredis"
import { v4 as uuid } from "uuid"

class CampaignRepository
{
    constructor
    (
        private db: Pool,
        private redis?: Redis
    )
    {}
}

export default CampaignRepository