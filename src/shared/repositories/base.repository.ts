import { RowDataPacket } from "mysql2";

export interface QueryGetId extends RowDataPacket
{
    id: number
}

export interface QueryCount extends RowDataPacket
{
    total: number
}