import Redis from "ioredis"
import { Pool } from "mysql2/promise"
import { TCreateOrderRequestBody } from "./order.models"
import ProductCategoryRepository from "@/shared/repositories/product-category/product-category.repository"
import ProductRepository from "@/shared/repositories/product/product.repository"
import { UnprocessableContentException } from "@/shared/exceptions/http.exception"
import OrdersRepository from "@/shared/repositories/orders/orders.repository"
import { UserData } from "@/shared/repositories/users/users.interface"
import ActivityLogsRepository from "@/shared/repositories/activity-logs/activity-logs.repository"
import CampaignCouponRepository from "@/shared/repositories/campaign-coupon/campaign-coupon.repository"

const createOrder = async (db: Pool, redis: Redis, user: UserData, b: TCreateOrderRequestBody) =>
{
    const activityLogsRepo = new ActivityLogsRepository(db)
    const productRepo = new ProductRepository(db, redis)
    const productCategoryRepo = new ProductCategoryRepository(db, redis)
    const ordersRepositoryRepo = new OrdersRepository(db, redis)
    const campaignCouponRepo = new CampaignCouponRepository(db, redis)

    const productCategory = await productCategoryRepo.findOne(b.categoryId)
    if(!productCategory)
    {
        throw new UnprocessableContentException("ไม่พบหมวดหมู่ที่เลือก", "INVALID_CATEGORY")
    }

    const productId = await productRepo.createProduct(b.productName, productCategory.id, b.priceAmount, null, b.description)
    const sellerId = (b.billAs === "seller" ? user.id : null)
    const buyerId = (b.billAs === "buyer" ? user.id : null)

    await ordersRepositoryRepo.createOrders(productId, sellerId, buyerId, null, null, b.billAs)
    await activityLogsRepo.createLog("CREATE_ORDER", user.id, null, [
        {
            productName: b.productName,
            description: b.description,
            category: productCategory.name,
            price: b.priceAmount,
            discount: null,
        },
        {
            productId,
            sellerId,
            buyerId,
            sellerGeustId: null,
            buyerGeustId: null,
            billAs: b.billAs,
        }
    ])

    return "OK"
}

export default {
    createOrder
}