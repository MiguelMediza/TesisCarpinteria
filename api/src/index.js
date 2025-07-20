import express from 'express';
import { PORT } from './config.js';
import indexRoutes from "./routes/index.routes.js";
import authRoutes from "./routes/usuarios.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import proveedoresRouter from "./routes/proveedores.routes.js";
import tablasRouter from "./routes/tablas.routes.js";
import palosRouter from "./routes/palos.routes.js";
import clavosRouter from "./routes/clavos.routes.js";
import fibrasRouter from "./routes/fibras.routes.js";
import tiposTablasRouter from "./routes/tipostablas.routes.js";
// Para resolver __dirname en ESM
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Middlewares ───────────────────────────────────────────────────────────────

// Servir archivos estáticos de /images
app.use(
  "/images/tablas",
  express.static(path.join(__dirname, "images", "tablas"))
);
app.use(
  "/images/palos",
  express.static(path.join(__dirname, "images", "palos"))
);
app.use(
  "/images/clavos",
  express.static(path.join(__dirname, "images", "clavos"))
);
app.use(
  "/images/fibras",
  express.static(path.join(__dirname, "images", "fibras"))
);
app.use(
  "/images/tipo_tablas",
  express.static(path.join(__dirname, "images", "tipo_tablas"))
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  next();
});
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true
  })
);
app.use(cookieParser());

// ─── Rutas ────────────────────────────────────────────────────────────────────

app.use("/api/src/usuarios", authRoutes);
app.use("/api/src/proveedores", proveedoresRouter);
app.use("/api/src/tablas", tablasRouter);
app.use("/api/src/palos", palosRouter);
app.use("/api/src/clavos", clavosRouter);
app.use("/api/src/fibras", fibrasRouter);
app.use("/api/src/tipotablas", tiposTablasRouter);
app.use(indexRoutes);

// ─── Arranque del servidor ────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});




