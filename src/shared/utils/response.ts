import { BaseResponse } from "@/shared/types/response";

export const Ok = <T = undefined>(data?: T, message: string = "success."): BaseResponse<T> =>
{
    return {
        status: "OK",
        message,
        data,
    }
}