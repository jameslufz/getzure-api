import { RowDataPacket } from "mysql2";

export interface GetUserData extends RowDataPacket
{
    email: string
    phoneNumber: string
    password?: string
    username: string
    firstName: string
    middleName: string | null
    lastName: string
    joinDate: string | Date
}