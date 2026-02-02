import { BaseResponse } from "@/shared/types/response.type";

const Ok = <T = undefined>(data?: T, message: string = "success."): BaseResponse<T> => ({
    status: "OK",
    message,
    data,
})

const Error = (message: string, status: string = "INTERNAL_ERR"): BaseResponse => ({
    status,
    message,
})

const responseBuilder = {
    Ok,
    Error
}

export default responseBuilder