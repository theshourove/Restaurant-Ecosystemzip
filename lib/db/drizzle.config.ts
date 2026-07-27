import { defineConfig } from "drizzle-kit";
import path from "path";

const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("Set SUPABASE_DATABASE_URL or DATABASE_URL before running drizzle-kit.");
}

const isSupabase = url === process.env.SUPABASE_DATABASE_URL;

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url,
    // Supabase requires SSL
    ...(isSupabase ? { ssl: true } : {}),
  },
});
