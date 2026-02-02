import { RowDataPacket } from "mysql2";

export interface ListProductCategory extends RowDataPacket
{
    id: number
    name: string
    sub: string[]
}