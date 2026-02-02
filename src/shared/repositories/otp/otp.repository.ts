import { Pool } from "mysql2/promise"
import { CheckExistsPhoneNumber, RequestOtpTotal } from "./otp.interface"

class OtpRepository
{
    constructor
    (
        private db: Pool
    )
    {}

    async isExistsPhoneNumber(phoneNumber: string): Promise<boolean>
    {
        const [[ data ]] = await this.db.query<CheckExistsPhoneNumber[]>("select count(phone_number) as isExists from users where phone_number = ?", [ phoneNumber ])
        return data.isExists === 1
    }

    async requestedOtp(phoneNumber: string, dateStart: Date, dateEnd: Date): Promise<RequestOtpTotal>
    {
        const [[ data ]] = await this.db.query<RequestOtpTotal[]>("select count(id) as total from otp where phone_number = ? and (created_date between ? and ?)", [ phoneNumber, dateStart, dateEnd ])
        return data
    }

    async updateOtpTimeout(phoneNumber: string)
    {
        return this.db.execute("update otp set is_timeout = 1, updated_date = ? where phone_number = ? and is_timeout is null and is_success is null", [ new Date(), phoneNumber ])
    }

    async createOtpRequest(id: string, phoneNumber: string, otpNumber: string, otpRef: string)
    {
        return this.db.execute("INSERT INTO otp (id, phone_number, otp_number, otp_ref, created_date) VALUES (?, ?, ?, ?, ?)", [id, phoneNumber, otpNumber, otpRef, new Date()])
    }

    async updateOtpSuccess(phoneNumber: string)
    {
        return this.db.execute("update otp set is_success = 1, updated_date = ? where phone_number = ? and is_timeout is null and is_success is null", [ new Date(), phoneNumber ])
    }
}

export default OtpRepository