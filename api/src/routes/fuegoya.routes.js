import { Router } from "express";
import multer from "multer";
import path from 'path';
import { fileURLToPath } from "url";
const router = Router();
import { createFuegoYa, listFuegoYa, deleteFuegoYa, updateFuegoYa, getFuegoYaById } from "../controllers/fuegoya.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // la carpeta images está un nivel arriba de /routes
    cb(null, path.join(__dirname, "../images/fuego_ya"));
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
  createFuegoYa
);

// Listar
router.get("/listar", listFuegoYa);

// Obtener por ID
router.get("/:id", getFuegoYaById);

// Actualizar (con foto opcional)
router.put(
  "/:id",
  upload.single('foto'),
  updateFuegoYa
);

// Eliminar
router.delete("/:id", deleteFuegoYa);

export default router;