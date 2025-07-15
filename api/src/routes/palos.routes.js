import { Router } from "express";
import multer from "multer";
import path from 'path';
import { fileURLToPath } from "url";
const router = Router();
import { createPalo, listPalos, getPaloById, updatePalo, deletePalo } from "../controllers/palos.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // la carpeta images está un nivel arriba de /routes
    cb(null, path.join(__dirname, "../images/palos"));
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
  createPalo
);

// Listar
router.get("/listar", listPalos);

// Obtener por ID
router.get("/:id", getPaloById);

// Actualizar (con foto opcional)
router.put(
  "/:id",
  upload.single('foto'),
  updatePalo
);

// Eliminar
router.delete("/:id", deletePalo);

export default router;