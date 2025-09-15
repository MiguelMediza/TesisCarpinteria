import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { PORT, CORS_ORIGIN } from "./config.js";
import { pool } from "./db.js";

import indexRoutes from "./routes/index.routes.js";
import authRoutes from "./routes/usuarios.routes.js";
import proveedoresRouter from "./routes/proveedores.routes.js";
import tablasRouter from "./routes/tablas.routes.js";
import palosRouter from "./routes/palos.routes.js";
import clavosRouter from "./routes/clavos.routes.js";
import fibrasRouter from "./routes/fibras.routes.js";
import tiposTablasRouter from "./routes/tipostablas.routes.js";
import tiposTacosRouter from "./routes/tipostacos.routes.js";
import tiposPatinesRouter from "./routes/tipospatines.routes.js";
import fuegoYaRouter from "./routes/fuegoya.routes.js";
import pelletsRouter from "./routes/pellets.routes.js";
import clientesRouter from "./routes/clientes.routes.js";
import ventasRouter from "./routes/ventas.routes.js";
import encargosRouter from "./routes/encargos.routes.js";
import prototiposRouter from "./routes/prototipos.routes.js";
import materiaprimaRouter from "./routes/materiaprima.routes.js";
import pedidosRouter from "./routes/pedidos.routes.js";
import ventafuegoyaRouter from "./routes/ventafuegoya.routes.js";

// ─── Paths ────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ahora que moviste el frontend a api/client:
const clientDist = path.resolve(__dirname, "../client/dist");
const indexHtml = path.join(clientDist, "index.html");

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
const isProd = process.env.NODE_ENV === "production";

// Handlers globales para ver errores que tumben el proceso
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED_REJECTION:", err);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION:", err);
});

// ─── Middlewares base ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  next();
});
app.use(express.json());
app.use(cookieParser());

// CORS SOLO en desarrollo (vite en 5173). En prod es mismo dominio → no hace falta.
if (!isProd) {
  const allowedOrigins = [CORS_ORIGIN, "http://localhost:5173"].filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins.length ? allowedOrigins : true,
      credentials: true,
    })
  );
}

// ─── Static de imágenes (api/src/images/*) ────────────────────────────────────
app.use("/images/tablas", express.static(path.join(__dirname, "images", "tablas")));
app.use("/images/palos", express.static(path.join(__dirname, "images", "palos")));
app.use("/images/clavos", express.static(path.join(__dirname, "images", "clavos")));
app.use("/images/fibras", express.static(path.join(__dirname, "images", "fibras")));
app.use("/images/tipo_tablas", express.static(path.join(__dirname, "images", "tipo_tablas")));
app.use("/images/tipo_tacos", express.static(path.join(__dirname, "images", "tipo_tacos")));
app.use("/images/tipo_patines", express.static(path.join(__dirname, "images", "tipo_patines")));
app.use("/images/fuego_ya", express.static(path.join(__dirname, "images", "fuego_ya")));
app.use("/images/pellets", express.static(path.join(__dirname, "images", "pellets")));
app.use("/images/ventas", express.static(path.join(__dirname, "images", "ventas")));
app.use("/images/prototipos", express.static(path.join(__dirname, "images", "prototipos")));
app.use("/images/venta_fuegoya", express.static(path.join(__dirname, "images", "venta_fuegoya")));

// ─── Rutas API ────────────────────────────────────────────────────────────────
app.use("/api/src", indexRoutes);
app.use("/api/src/usuarios", authRoutes);
app.use("/api/src/proveedores", proveedoresRouter);
app.use("/api/src/tablas", tablasRouter);
app.use("/api/src/palos", palosRouter);
app.use("/api/src/clavos", clavosRouter);
app.use("/api/src/fibras", fibrasRouter);
app.use("/api/src/tipotablas", tiposTablasRouter);
app.use("/api/src/tipotacos", tiposTacosRouter);
app.use("/api/src/tipopatines", tiposPatinesRouter);
app.use("/api/src/fuegoya", fuegoYaRouter);
app.use("/api/src/pellets", pelletsRouter);
app.use("/api/src/clientes", clientesRouter);
app.use("/api/src/ventas", ventasRouter);
app.use("/api/src/encargos", encargosRouter);
app.use("/api/src/prototipos", prototiposRouter);
app.use("/api/src/materiaprima", materiaprimaRouter);
app.use("/api/src/pedidos", pedidosRouter);
app.use("/api/src/ventafuegoya", ventafuegoyaRouter);

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    const [info] = await pool.query("SELECT DATABASE() AS db, VERSION() AS ver");
    res.json({
      ok: true,
      db: rows[0]?.ok ?? 0,
      info: info[0],
      env: process.env.NODE_ENV || "development",
      time: new Date().toISOString(),
    });
  } catch (e) {
    console.error("HEALTH_DB_ERROR:", e);
    res.status(500).json({
      ok: false,
      code: e.code,
      errno: e.errno,
      sqlState: e.sqlState,
      fatal: e.fatal,
      message: e.message,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      ssl: process.env.DB_SSL,
    });
  }
});

// ─── Servir frontend (solo si existe el build) ────────────────────────────────
if (fs.existsSync(indexHtml)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    res.sendFile(indexHtml);
  });
} else {
  // Fallback temporal si aún no se construyó el front
  app.get("/", (_, res) => res.send("Frontend no compilado aún"));
}

// ─── Arranque ─────────────────────────────────────────────────────────────────
console.log("Sirviendo frontend desde:", clientDist);
const HOST = "0.0.0.0"; // importante para Railway
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
