import { Pool } from "mysql2/promise"
import Redis from "ioredis"
import { v4 as uuid } from "uuid"

class ProductRepository
{
    constructor
    (
        private db: Pool,
        private redis?: Redis
    )
    {}

    /**
     * 
     * @return Product's id.
     */
    async createProduct(name: string, categoryId: number, priceAmount: string, discountAmount: string | null, description?: string, campaignId?: number): Promise<string>
    {
        const id = uuid()

        await this.db.execute(`
            insert into product
            (id, name, description, category_id, price_amount, discount_amount, campaign_id, created_at)
            values
            (?, ?, ?, ?, ?, ?, ?, ?)`,
            [ id, name, description, categoryId, priceAmount, discountAmount, campaignId ?? null, new Date() ]
        )

        return id
    }
}

export default ProductRepository