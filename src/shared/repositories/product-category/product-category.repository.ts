import { Pool } from "mysql2/promise"
import { ListProductCategory } from "./product-category.interface"
import Redis from "ioredis"

class ProductCategoryRepository
{
    constructor
    (
        private db: Pool,
        private redis?: Redis
    )
    {}

    protected CACHE_GET_ALL_KEY = "productCategoryRepo:getAll"

    async getAll(): Promise<ListProductCategory[]>
    {
        if(this.redis)
        {
            const listProductCategoryRaw = await this.redis.get(this.CACHE_GET_ALL_KEY)
            if(listProductCategoryRaw)
            {
                return JSON.parse(listProductCategoryRaw)
            }
        }

        const [ data ] = await this.db.query<ListProductCategory[]>("select * from product_category")

        if(this.redis)
        {
            await this.redis.setex(this.CACHE_GET_ALL_KEY, 14_400, JSON.stringify(data))
        }

        return data
    }

    async findOne(id: number): Promise<ListProductCategory | null>
    {
        const CACHE_FIND_ONE_KEY = `productCategoryRepo:findOne:${id}`
        if(this.redis)
        {
            const cachedData = await this.redis.get(CACHE_FIND_ONE_KEY)
            if(cachedData)
            {
                return JSON.parse(cachedData)
            }

            const listProductCategoryRaw = await this.redis.get(this.CACHE_GET_ALL_KEY)
            if(listProductCategoryRaw)
            {
                const listProductCategory = JSON.parse(listProductCategoryRaw) as ListProductCategory[]
                return listProductCategory.find((category) => category.id === id) || null
            }
        }

        const listProductCategory = await this.getAll()
        const productCategory = listProductCategory.find((category) => category.id === id) || null
        if(this.redis)
        {
            await this.redis.setex(CACHE_FIND_ONE_KEY, 14_400, JSON.stringify(productCategory))
        }

        return productCategory
    }
}

export default ProductCategoryRepository