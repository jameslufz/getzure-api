import { Pool } from "mysql2/promise"
import { ListBankMapped, ListBankRaw } from "./bank.interface"
import Redis from "ioredis"

class BankRepository
{
    constructor
    (
        private db: Pool,
        private redis?: Redis
    )
    {}

    async getAll(): Promise<ListBankMapped[]>
    {
        const CACHE_KEY = "bankRepo:getAll"
        if(this.redis)
        {
            const listBankRaw = await this.redis.get(CACHE_KEY)
            if(listBankRaw)
            {
                return JSON.parse(listBankRaw)
            }
        }

        const [ data ] = await this.db.query<ListBankRaw[]>("select * from bank")
        const listBank = data.map<ListBankMapped>((bank) => ({
            id: bank.id,
            name: {
                th: bank.name_th,
                en: bank.name_en,
            },
            code: bank.code,
            imageUrl: bank.image_url
        }))

        if(this.redis)
        {
            await this.redis.setex(CACHE_KEY, 14_400, JSON.stringify(listBank))
        }

        return listBank
    }
}

export default BankRepository