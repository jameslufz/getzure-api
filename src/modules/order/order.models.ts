import Elysia, { t } from "elysia";

const createOrderRequestBody = t.Object({
    productName: t.String({ error: "กรุณาระบุชื่อสินค้า", code: "MISSING_PRODUCT_NAME" }),
    categoryId: t.Number({ error: "กรุณาเลือกหมวดหมู่สินค้า", code: "MISSING_PRODUCT_CATEG" }),
    priceAmount: t.String({ error: "กรุณากำหนดราคาสินค้า", code: "MISSING_PRODUCT_PRICE" }),
    billAs: t.Enum({ seller: "seller", buyer: "buyer" }, { error: "กรุณาเลือกประเภทผู้ออกบิล" }),

    description: t.Optional( t.String() ),
    campaignCode: t.Null(
        t.Optional( t.String() )
    ),
})

const OrderModels = new Elysia()
.model({
    createOrderRequestBody,
})

export default OrderModels

export type TCreateOrderRequestBody = typeof createOrderRequestBody.static