import { Router } from "express";
import multer from "multer";
import path from 'path';
import { fileURLToPath } from "url";
const router = Router();
import { createVentaFuegoya, updateVentaFuegoya, deleteVentaFuegoya, listVentaFuegoya, getVentaFuegoyaById, changeEstadoPagoVentaFuegoya } from "../controllers/ventafuegoya.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // la carpeta images está un nivel arriba de /routes
    cb(null, path.join(__dirname, "../images/venta_fuegoya"));
  },
  filename(req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});
export const upload = multer({ storage });

// Crear (con foto)
router.post(
  "/agregar",
  upload.single('foto'),
  createVentaFuegoya
);

// Listar
router.get("/listar", listVentaFuegoya);

// Obtener por ID
router.get("/:id", getVentaFuegoyaById);

// Actualizar (con foto opcional)
router.put(
  "/:id",
  upload.single('foto'),
  updateVentaFuegoya
);

// Eliminar
router.delete("/:id", deleteVentaFuegoya);

router.put("/:id/estadopago", changeEstadoPagoVentaFuegoya);

export default router;