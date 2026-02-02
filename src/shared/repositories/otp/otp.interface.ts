import { RowDataPacket } from "mysql2";

export interface CheckExistsPhoneNumber extends RowDataPacket
{
    isExists: number
}

export interface RequestOtpTotal extends RowDataPacket
{
    total: number
}
