import { createPool } from "mysql2/promise";
import { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } from "./config.js";

const sslMode = (process.env.DB_SSL || "").toLowerCase();

export const pool = createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: Number(DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Si usás el host público, permitimos self-signed:
  ssl:
    sslMode === "true" || sslMode === "require" || sslMode === "public" || sslMode === "skip"
      ? { rejectUnauthorized: false, minVersion: "TLSv1.2" }
      : undefined,
});

