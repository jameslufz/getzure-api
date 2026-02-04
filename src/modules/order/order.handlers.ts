import Redis from "ioredis"
import { Pool } from "mysql2/promise"
import { TCreateOrderRequestBody } from "./order.models"
import ProductCategoryRepository from "@/shared/repositories/product-category/product-category.repository"
import ProductRepository from "@/shared/repositories/product/product.repository"
import { BadRequestException, UnprocessableContentException } from "@/shared/exceptions/http.exception"
import OrdersRepository from "@/shared/repositories/orders/orders.repository"
import { UserData } from "@/shared/repositories/users/users.interface"
import ActivityLogsRepository from "@/shared/repositories/activity-logs/activity-logs.repository"
import CampaignCouponRepository from "@/shared/repositories/campaign-coupon/campaign-coupon.repository"
import Decimal from "decimal.js"
import responseBuilder from "@/shared/utils/response"

const createOrder = async (db: Pool, redis: Redis, user: UserData, b: TCreateOrderRequestBody) =>
{
    const activityLogsRepo = new ActivityLogsRepository(db)
    const productRepo = new ProductRepository(db, redis)
    const productCategoryRepo = new ProductCategoryRepository(db, redis)
    const ordersRepositoryRepo = new OrdersRepository(db, redis)
    const campaignCouponRepo = new CampaignCouponRepository(db, redis)

    let campaignId = null
    let totalDiscount = new Decimal(0)
    let netPriceAmount = new Decimal(b.priceAmount)

    const priceAmount = new Decimal(b.priceAmount)

    if(b.campaignCode)
    {
        const campaignCoupon = await campaignCouponRepo.getCampaignCouponByCode(b.campaignCode)
        if(campaignCoupon)
        {
            const maxDiscountAmount = new Decimal(campaignCoupon.maxDiscount)
            const minTransaction = new Decimal(campaignCoupon.minTransaction)

            if(priceAmount.lessThan(minTransaction))
            {
                throw new BadRequestException("ไม่สามารถใช้งานคูปองนี้ได้ เนื่องจากราคาไม่ถึงที่กำหนด", "REQUIRE_MIN_TXN")
            }

            campaignId = campaignCoupon.campaignId

            if(campaignCoupon.discountAmountUnit === "baht")
            {
                totalDiscount = totalDiscount.plus(campaignCoupon.discountAmount)
                netPriceAmount = priceAmount.minus(campaignCoupon.discountAmount)
            }
            else
            {
                const discountAmount = new Decimal(campaignCoupon.discountAmount)
                totalDiscount = priceAmount.mul( discountAmount.div(100) )
                netPriceAmount = priceAmount.minus(totalDiscount)

                if(netPriceAmount.greaterThan(maxDiscountAmount))
                {
                    netPriceAmount = maxDiscountAmount
                }
            }
        }
    }

    const productCategory = await productCategoryRepo.findOne(b.categoryId)
    if(!productCategory)
    {
        throw new UnprocessableContentException("ไม่พบหมวดหมู่ที่เลือก", "INVALID_CATEGORY")
    }

    const productId = await productRepo.createProduct(b.productName, productCategory.id, priceAmount.toFixed(2), totalDiscount.toFixed(2), b.description)
    const sellerId = (b.billAs === "seller" ? user.id : null)
    const buyerId = (b.billAs === "buyer" ? user.id : null)

    await ordersRepositoryRepo.createOrders(productId, sellerId, buyerId, null, null, b.billAs)
    await activityLogsRepo.createLog("CREATE_ORDER", user.id, null, [
        {
            productName: b.productName,
            description: b.description,
            category: productCategory.name,
            price: priceAmount.toFixed(2),
            discount: totalDiscount.toFixed(2),
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

    return responseBuilder.Ok()
}

export default {
    createOrder
}