import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

const client = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(client, { schema });

/** Narrow alias for Drizzle Postgres.js client wired to this app's schema */
export type Database = typeof db;

export { schema };
