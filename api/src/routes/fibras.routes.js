import { Router } from "express";
import multer from "multer";
import path from 'path';
import { fileURLToPath } from "url";
import {
  createFibra,
  listFibras,
  getFibraById,
  updateFibra,
  deleteFibra
} from "../controllers/fibras.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // la carpeta images/fibras está un nivel arriba de /routes
    cb(null, path.join(__dirname, "../images/fibras"));
  },
  filename(req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});
export const upload = multer({ storage });

// Crear una nueva fibra (con foto)
router.post(
  "/agregar",
  upload.single("foto"),
  createFibra
);

// Listar todas las fibras
router.get("/listar", listFibras);

// Obtener una fibra por ID
router.get("/:id", getFibraById);

// Actualizar fibra existente (foto opcional)
router.put(
  "/:id",
  upload.single("foto"),
  updateFibra
);

// Eliminar una fibra
router.delete("/:id", deleteFibra);

export default router;
