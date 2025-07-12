import { Router } from "express";
import multer from "multer";
import path from 'path';
import { fileURLToPath } from "url";
const router = Router();
import { createTabla, listTablas, getTablaById, updateTabla, deleteTabla } from "../controllers/tablas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ahora __dirname apunta a /routes
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // la carpeta images está un nivel arriba de /routes
    cb(null, path.join(__dirname, "../images/tablas"));
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
  createTabla
);

// Listar
router.get("/listar", listTablas);

// Obtener por ID
router.get("/:id", getTablaById);

// Actualizar (con foto opcional)
router.put(
  "/:id",
  upload.single('foto'),
  updateTabla
);

// Eliminar
router.delete("/:id", deleteTabla);

export default router;