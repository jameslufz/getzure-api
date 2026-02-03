import { RowDataPacket } from "mysql2";

export interface RawCampaignData extends RowDataPacket
{
    id: number
}