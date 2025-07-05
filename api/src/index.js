import express from 'express';
import { PORT } from './config.js';
import indexRoutes from "./routes/index.routes.js";
import authRoutes from "./routes/usuarios.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import proveedoresRouter from "./routes/proveedores.routes.js";


const app = express();

// ✅ Middlewares PRIMERO
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true)
  next()
});
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173", 
}));
app.use(cookieParser());

// ✅ Luego tus rutas
app.use("/api/src/usuarios", authRoutes); // <-- contiene /register
app.use("/api/src/proveedores", proveedoresRouter);
app.use(indexRoutes);

app.listen(PORT);
console.log(`Server is running on port ${PORT}`);




