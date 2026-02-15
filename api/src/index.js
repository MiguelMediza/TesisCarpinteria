import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { PORT, CORS_ORIGIN } from "./config.js";

import indexRoutes from "./routes/index.routes.js";
import authRoutes from "./routes/usuarios.routes.js";
import fuegoYaRouter from "./routes/fuegoya.routes.js";
import ventafuegoyaRouter from "./routes/ventafuegoya.routes.js";
import clientesfuegoyaRouter from "./routes/clientesfuegoya.routes.js";
import estadisticasRouter from "./routes/estadisticas.routes.js";
import horasMaquinasRoutes from "./routes/horasmaquinas.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../client/dist");
const indexHtml = path.join(clientDist, "index.html");


const app = express();
const isProd = process.env.NODE_ENV === "production";

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED_REJECTION:", err);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION:", err);
});

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

if (!isProd) {
  const allowedOrigins = [CORS_ORIGIN, "http://localhost:5173"].filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins.length ? allowedOrigins : true,
      credentials: true,
    })
  );
}


app.use(express.static(clientDist));
app.use(
  "/assets",
  express.static(path.join(clientDist, "assets"), { maxAge: "1y", immutable: true })
);

// ─── Rutas API ────────────────────────────────────────────────────────────────
app.use("/api/src", indexRoutes);
app.use("/api/src/usuarios", authRoutes);
app.use("/api/src/fuegoya", fuegoYaRouter);
app.use("/api/src/ventafuegoya", ventafuegoyaRouter);
app.use("/api/src/clientesfuegoya", clientesfuegoyaRouter);
app.use("/api/src/estadisticas", estadisticasRouter);
app.use("/api/src/horasmaquinas", horasMaquinasRoutes);

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

// ─── Arranque ─
console.log("Sirviendo frontend desde:", clientDist);
const HOST = "0.0.0.0"; 
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});