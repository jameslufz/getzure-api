import { Pool } from "mysql2/promise"
import Redis from "ioredis"
import { v4 as uuid } from "uuid"
import { CampaignCouponTransformed, RawCampaignCoupon } from "./campaign-coupon.interface"
import { QueryCount } from "../base.repository"

class CampaignCouponRepository
{
    constructor
    (
        private db: Pool,
        private redis?: Redis
    )
    {}

    private async createCache(cacheKey: string, ttl: number, data: string): Promise<"OK" | null>
    {
        if(this.redis)
        {
            return this.redis.setex(cacheKey, ttl, data)
        }

        return null
    }

    private async readCache<TCacheData = undefined>(cacheKey: string): Promise<TCacheData | null>
    {
        if(this.redis)
        {
            const data = await this.redis.get(cacheKey)
            if(data)
            {
                return JSON.parse(data) as TCacheData
            }
        }

        return null
    }

    async getCampaignCouponByCode(code: string): Promise<CampaignCouponTransformed | null>
    {
        const CACHE_KEY = `campaignCouponRepo:getCampaignIdByCode:${code}`
        if(this.redis)
        {
            const data = await this.readCache<CampaignCouponTransformed>(CACHE_KEY)
            if(data)
            {
                return data
            }
        }

        const [data] = await this.db.query<RawCampaignCoupon[]>(`
            select campaign_coupon.*
            from campaign_coupon
            left join campaign on campaign_coupon.campaign_id = campaign.id
            where campaign_coupon.code = ?
            and active_date >= ?
            and expired_date < ?
        `, [ code, new Date(), new Date() ])

        const coupons = data.map<CampaignCouponTransformed>((coupon) => ({
            ...coupon,
            campaignId: coupon.campaign_id,
            discountAmount: coupon.discount_amount,
            discountAmountUnit: coupon.amount_unit,
            maxDiscount: coupon.max_discount,
            minTransaction: coupon.min_transaction,
            maxReceive: coupon.max_receive,
            maxUse: coupon.max_use,
            activeDate: coupon.active_date,
            expiredDate: coupon.expired_date,
            createdDate: coupon.created_date,
        }))

        if(coupons.length > 0)
        {
            await this.createCache(CACHE_KEY, 14_400, JSON.stringify(coupons[0]))
            return coupons[0]
        }

        await this.createCache(CACHE_KEY, 1_200, "null")
        return null
    }
}

export default CampaignCouponRepository