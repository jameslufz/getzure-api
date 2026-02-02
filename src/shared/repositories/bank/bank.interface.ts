import { RowDataPacket } from "mysql2";

export interface ListBankRaw extends RowDataPacket
{
    id: number
    name_th: string
    name_en: string
    code: string
    image_url: string
}

export interface ListBankMapped
{
    id: number
    name: {
        th: string
        en: string
    }
    code: string
    imageUrl: string
}