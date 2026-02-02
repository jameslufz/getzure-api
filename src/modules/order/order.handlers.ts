import Redis from "ioredis"
import { Pool } from "mysql2/promise"
import { TCreateOrderRequestBody } from "./order.models"
import ProductCategoryRepository from "@/shared/repositories/product-category/product-category.repository"
import ProductRepository from "@/shared/repositories/product/product.repository"
import { UnprocessableContentException } from "@/shared/exceptions/http.exception"

const createOrder = async (db: Pool, redis: Redis, b: TCreateOrderRequestBody) =>
{
    const productRepo = new ProductRepository(db, redis)
    const productCategoryRepo = new ProductCategoryRepository(db, redis)

    const productCategory = await productCategoryRepo.findOne(b.categoryId)
    if(!productCategory)
    {
        throw new UnprocessableContentException("ไม่พบหมวดหมู่ที่เลือก", "INVALID_CATEGORY")
    }

    const productId = await productRepo.createProduct(b.productName, productCategory.id, b.priceAmount, null, b.description)

    return "OK"
}

export default {
    createOrder
}