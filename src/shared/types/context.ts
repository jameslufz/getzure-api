import Redis from 'ioredis';
import type { Pool } from 'mysql2/promise';

export interface RouteContext
{
    decorator: {
        db: Pool
        redis: Redis
    }
    store: {}
    derive: {}
    resolve: {}
}