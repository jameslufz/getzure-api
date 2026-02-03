import { Pool } from "mysql2/promise"
import Redis from "ioredis"
import { v4 as uuid } from "uuid"

class OrdersRepository
{
    constructor
    (
        private db: Pool,
        private redis?: Redis
    )
    {}

    /**
     * 
     * @return Orders's id.
     */
    async createOrders(productId: string, sellerId: number | null, buyerId: number | null, sellerGeustId: number | null, buyerGeustId: number | null, billAs: string): Promise<string>
    {
        const id = uuid()

        await this.db.execute("insert into orders (id, seller_id, buyer_id, seller_guest_id, buyer_guest_id, bill_as, product_id, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)", [ id, sellerId, buyerId, sellerGeustId, buyerGeustId, billAs, productId, new Date() ])

        return id
    }
}

export default OrdersRepository