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

app.enable('trust proxy');
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

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

// ─── Static del frontend build ────────────────────────────────────────────────
// Sirve todo el contenido de dist
app.use(express.static(clientDist));
// Sirve explícitamente /assets con cache agresivo
app.use(
  "/assets",
  express.static(path.join(clientDist, "assets"), { maxAge: "1y", immutable: true })
);

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

// ─── Fallback SPA (Express 5 friendly, NO archivos) ───────────────────────────
// Solo para GET, que no empiecen con /api/ y que NO tengan extensión (.js, .css, .png, etc.)
app.use((req, res, next) => {
  const isGet = req.method === "GET";
  const isApi = req.path.startsWith("/api/");
  const hasExt = path.extname(req.path) !== "";

  if (isGet && !isApi && !hasExt) {
    if (fs.existsSync(indexHtml)) {
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(indexHtml);
    }
    return res.status(503).send("Frontend no compilado aún.");
  }
  next();
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
console.log("Sirviendo frontend desde:", clientDist);
const HOST = "0.0.0.0"; // importante para Railway
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
