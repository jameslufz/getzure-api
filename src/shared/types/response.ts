export interface BaseResponse<T = undefined>
{
    status: string
    message: string
    data?: T
}