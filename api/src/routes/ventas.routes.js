import { Router } from "express";
import multer from "multer";
import path from 'path';
import { fileURLToPath } from "url";
const router = Router();
import { createVenta, listVentas, getVentaById, updateVenta, deleteVenta } from "../controllers/ventas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // la carpeta images está un nivel arriba de /routes
    cb(null, path.join(__dirname, "../images/ventas"));
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
  createVenta
);

// Listar
router.get("/listar", listVentas);

// Obtener por ID
router.get("/:id", getVentaById);

// Actualizar (con foto opcional)
router.put(
  "/:id",
  upload.single('foto'),
  updateVenta
);

// Eliminar
router.delete("/:id", deleteVenta);

export default router;