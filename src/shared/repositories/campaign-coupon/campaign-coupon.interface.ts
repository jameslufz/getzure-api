import { RowDataPacket } from "mysql2";

export type TAmountUnit = "baht" | "percentage"
export interface RawCampaignCoupon extends RowDataPacket
{
    id: number
    campaign_id: number
    topic: string
    description: string
    code: string
    discount_amount: string
    discount_amount_unit: TAmountUnit
    max_discount: string
    min_transaction: string
    max_receive: number
    max_use: number
    active_date: Date
    expired_date: Date
    created_date: Date
}

export interface CampaignCouponTransformed extends Pick<RawCampaignCoupon, "id" | "topic" | "description" | "code">
{
    campaignId: number
    discountAmount: string
    discountAmountUnit: TAmountUnit
    maxDiscount: string
    minTransaction: string
    maxReceive: number
    maxUse: number
    activeDate: Date
    expiredDate: Date
    createdDate: Date
}