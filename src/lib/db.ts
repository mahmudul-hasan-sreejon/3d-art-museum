import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __museaPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!global.__museaPool) {
    global.__museaPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      ssl: { rejectUnauthorized: false },
    });
  }
  return global.__museaPool;
}
