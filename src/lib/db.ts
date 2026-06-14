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
    const connectionString = process.env.DATABASE_URL;
    const isLocal = /@(localhost|127\.0\.0\.1)/.test(connectionString);
    global.__museaPool = new Pool({
      connectionString,
      max: 3,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }
  return global.__museaPool;
}
