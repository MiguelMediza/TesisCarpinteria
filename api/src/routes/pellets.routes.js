import { Router } from "express";
import multer from "multer";
import path from 'path';
import { fileURLToPath } from "url";
const router = Router();
import { createPellet, listPellets, getPelletById, updatePellet, deletePellet } from "../controllers/pellets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // la carpeta images está un nivel arriba de /routes
    cb(null, path.join(__dirname, "../images/pellets"));
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
  createPellet
);

// Listar
router.get("/listar", listPellets);

// Obtener por ID
router.get("/:id", getPelletById);

// Actualizar (con foto opcional)
router.put(
  "/:id",
  upload.single('foto'),
  updatePellet
);

// Eliminar
router.delete("/:id", deletePellet);

export default router;