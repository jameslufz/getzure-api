import { Pool } from "mysql2/promise"
import Redis from "ioredis"
import { v4 as uuid } from "uuid"
import { RawCampaignData } from "./campaign-coupon.interface"

class CampaignCouponRepository
{
    constructor
    (
        private db: Pool,
        private redis?: Redis
    )
    {}

    async getCampaignIdByCode(code: string): Promise<RawCampaignData | null>
    {
        const [data] = await this.db.query<RawCampaignData[]>(`
            select campaign.id
            from campaign_coupon
            left join campaign on campaign_coupon.campaign_id = campaign.id
            where campaign_coupon.code = ?
            and active_date >= ?
            and expired_date < ?
        `, [ code, new Date(), new Date() ])

        return (data.length > 0 ? data[0] : null)
    }
}

export default CampaignCouponRepository