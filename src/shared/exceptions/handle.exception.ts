import { HTTPHeaders, StatusMap, ValidationError } from "elysia";
import { HttpException } from "./http.exception";
import { ElysiaCookie } from "elysia/dist/cookies";
import type { TObject } from "@sinclair/typebox"
import { TBaseResponse } from "../models/response.model";

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
                status: 1001,
                message: (property.error ? property.error.toString() : undefined),
            } satisfies TBaseResponse
        }
        else if('error' in error.valueError.schema)
        {
            return {
                status: 1001,
                message: (error.valueError.schema.error ? error.valueError.schema.error.toString() : undefined),
            } satisfies TBaseResponse
        }
    }

    if(error instanceof HttpException)
    {
        set.status = error.httpStatusCode

        return {
            status: error.statusCode,
            message: error.message,
        } satisfies TBaseResponse
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