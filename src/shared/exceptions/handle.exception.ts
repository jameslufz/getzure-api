import { HTTPHeaders, StatusMap, ValidationError } from "elysia";
import { HttpException } from "./http.exception";
import { ElysiaCookie } from "elysia/dist/cookies";
import type { TObject } from "@sinclair/typebox"
import { ReplyError } from "ioredis"
import { BaseResponse } from "../types/response";

export default (error: TError, set: TSet ) =>
{
    if(error instanceof ValidationError && error.valueError)
    {
        set.status = 400

        if('properties' in error.valueError.schema)
        {
            const { properties } = error.valueError.schema as TObject
            const [property] = Object.values(properties)

            return {
                status: error.valueError.schema.code ?? "ERR_PARAMS",
                message: (property.error ? property.error.toString() : ""),
            } satisfies BaseResponse
        }
        else if('error' in error.valueError.schema)
        {
            return {
                status: error.valueError.schema.code ?? "ERR_PARAMS",
                message: (error.valueError.schema.error ? error.valueError.schema.error.toString() : ""),
            } satisfies BaseResponse
        }
    }

    if('sql' in error)
    {
        const sqlMessage = ('sqlMessage' in error ? error.sqlMessage : "-")
        console.log(`\x1b[33m[${new Date().toLocaleString()}]\x1b[31m[ERROR] \x1b[0m${sqlMessage}`)

        return {
            status: "INT_ERR_QC",
            message: `มีบางอย่างผิดพลาด โปรดติดต่อผู้ดูแลระบบ`,
        } satisfies BaseResponse
    }

    if(error instanceof ReplyError)
    {
        console.log(`\x1b[33m[${new Date().toLocaleString()}]\x1b[31m[ERROR] \x1b[0m${error.message}`)
        return {
            status: "INT_ERR_RD",
            message: `มีบางอย่างผิดพลาด โปรดติดต่อผู้ดูแลระบบ`,
        } satisfies BaseResponse
    }

    if(error instanceof HttpException)
    {
        set.status = error.httpStatusCode

        return {
            status: error.statusCode,
            message: error.message,
        } satisfies BaseResponse
    }

    return {
        status: 1001,
        message: error.message,
    }
}

type TError = ValidationError | HttpException
type TSet = {
    headers: HTTPHeaders;
    status?: number | keyof StatusMap;
    redirect?: string;
    cookie?: Record<string, ElysiaCookie>;
} & {
    headers: HTTPHeaders;
    status?: number | keyof StatusMap;
    redirect?: string;
    cookie?: Record<string, ElysiaCookie>;
}