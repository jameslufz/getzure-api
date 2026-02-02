import { JWTPayloadInput, JWTPayloadSpec } from '@elysiajs/jwt';
import Redis from 'ioredis';
import type { Pool } from 'mysql2/promise';
import { JWTVerifyOptions } from "jose"
import { Context } from 'elysia';

export interface BaseContext
{
    decorator: {
        db: Pool
        redis: Redis
        accessTokenWritter: JWTSign
        accessTokenReader: JWTVerify
        refreshTokenWritter: JWTSign
        refreshTokenReader: JWTVerify
    }
    store: {}
    derive: {
        client: {
            ip: string | null
            device?: string
        }
    }
    resolve: {}
}

type NormalizedClaim = 'nbf' | 'exp' | 'iat';
type AllowClaimValue = string | number | boolean | null | undefined | AllowClaimValue[] | {
    [key: string]: AllowClaimValue;
};
type ClaimType = Record<string, AllowClaimValue>;
export type JWTSignFn = (signValue: Omit<ClaimType, NormalizedClaim> & JWTPayloadInput) => Promise<string>;
export type JWTVerifyFn = <T = (ClaimType & Omit<JWTPayloadSpec, never>) | false>(jwt?: string, options?: JWTVerifyOptions) => Promise<false | T>;
export type JWTSign = { sign: JWTSignFn }
export type JWTVerify = { verify: JWTVerifyFn }
export type JWTCustom = {
    accessTokenWritter: {
        sign: JWTSignFn
    };
    accessTokenReader: {
        verify: JWTVerifyFn
    };
    refreshTokenWritter: {
        sign: JWTSignFn
    };
    refreshTokenReader: {
        verify: JWTVerifyFn
    };
};

export type SetHttpStatus = Context["status"]