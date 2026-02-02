import { Pool } from "mysql2/promise"
import { UserData } from "./users.interface"

class UsersRepository
{
    constructor
    (
        private db: Pool
    )
    {}

    async createUser(email: string, phoneNumber: string, password: string, firstName: string, middleName: string | null, lastName: string)
    {
        return this.db.execute("insert into users (email, phone_number, password, first_name, middle_name, last_name, created_date) values (?, ?, ?, ?, ?, ?, ?)", [email, phoneNumber, password, firstName, middleName, lastName, new Date()])
    }

    async findOneUser(username: string): Promise<UserData | null>
    {
        const [user] = await this.db.query<UserData[]>(`
            select id,
                email,
                phone_number as phoneNumber,
                password,
                username,
                first_name as firstName,
                middle_name as middleName,
                last_name as lastName,
                created_date as createdDate
            from users
            where username = ? or email = ? or phone_number = ?
        `, [ username, username, username ])

        return (user.length > 0 ? user[0] : null)
    }
}

export default UsersRepository