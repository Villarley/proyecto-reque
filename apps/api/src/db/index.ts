import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";
import * as schema from "./schema.js";

const client = postgres(env.SUPABASE_DB_URL, { max: 10 });

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

export const db = drizzle(client, { schema });

/** Narrow alias for Drizzle Postgres.js client wired to this app's schema */
export type Database = typeof db;

export { schema };
