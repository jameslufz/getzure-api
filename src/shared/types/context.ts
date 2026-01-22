import type { Pool } from 'mysql2/promise';

export interface RouteContext
{
    decorator: {
        db: Pool
    }
    store: {}
    derive: {}
    resolve: {}
}