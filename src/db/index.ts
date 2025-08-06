import { env } from "@/lib/env";
import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export const database = drizzle(pool, { schema });
