import {createPool} from 'mysql2/promise';
import { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } from './config.js';
export const pool = createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  port: Number(DB_PORT),
  database: DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? {} : undefined, // <- habilita TLS si DB_SSL=true
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});