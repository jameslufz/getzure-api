import { RowDataPacket } from "mysql2";

export type TLogKeys = string
export interface GetOneLogKeyId extends RowDataPacket
{
    id: number
}