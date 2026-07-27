import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// SUPABASE_DATABASE_URL takes priority — set it as a Replit Secret to use an
// external Supabase database instead of the Replit-provisioned one.
// This makes the app fully portable: import the repo on any Replit account,
// set SUPABASE_DATABASE_URL, and it connects to the same external database.
const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No database URL found. Set SUPABASE_DATABASE_URL (recommended) or DATABASE_URL.",
  );
}

const isSupabase = connectionString === process.env.SUPABASE_DATABASE_URL;

export const pool = new Pool({
  connectionString,
  // Supabase requires SSL; Replit's built-in Postgres does not.
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
