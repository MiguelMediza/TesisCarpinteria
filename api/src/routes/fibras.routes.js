import { Router } from "express";
import multer from "multer";
import {
  createFibra,
  listFibras,
  getFibraById,
  updateFibra,
  deleteFibra,
} from "../controllers/fibras.js";
import { r2Put } from "../lib/r2.js";

const router = Router();

// Multer en memoria (no disco). 10MB por defecto.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Middleware: si hay archivo, subir a R2 y colgar { key, url } en req.fileR2
const uploadToR2 =
  (folder) =>
  async (req, res, next) => {
    try {
      if (req.file) {
        req.fileR2 = await r2Put({ folder, file: req.file });
      }
      next();
    } catch (e) {
      next(e);
    }
  };

// Crear una nueva fibra (con foto opcional)
router.post("/agregar", upload.single("foto"), uploadToR2("fibras"), createFibra);

// Listar todas las fibras
router.get("/listar", listFibras);

// Obtener una fibra por ID
router.get("/:id", getFibraById);

// Actualizar fibra existente (foto opcional)
router.put("/:id", upload.single("foto"), uploadToR2("fibras"), updateFibra);

// Eliminar una fibra
router.delete("/:id", deleteFibra);

export default router;
