export class HttpException extends Error
{
    constructor
    (
        public message: string,
        public statusCode: number,
        public httpStatusCode: number,
    )
    {
        super(message)
    }
}

export class BadRequestException extends HttpException
{
    constructor(message: string, statusCode: number)
    {
        super(message, statusCode, 400)
    }
}

export class UnprocessableContentException extends HttpException
{
    constructor(message: string, statusCode: number)
    {
        super(message, statusCode, 422)
    }
}

export class InternalServerErrorException extends HttpException
{
    constructor(message: string, statusCode: number)
    {
        super(message, statusCode, 500)
    }
}