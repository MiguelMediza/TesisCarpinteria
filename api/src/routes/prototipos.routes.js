import { Router } from "express";
import multer from "multer";
import path from "path";
import { createPrototipo, getPrototipoById, updatePrototipo, deletePrototipo, listPrototipos } from "../controllers/prototipopallet.js";

const router = Router();

// Storage para imágenes de prototipos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "images/prototipos"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Crear
router.post("/agregar", upload.single("foto"), createPrototipo);

// Listar
router.get("/listar", listPrototipos);

// Obtener por ID (incluye costo y BOM)
router.get("/:id", getPrototipoById);

// Actualizar
router.put("/:id", upload.single("foto"), updatePrototipo);

// Eliminar
router.delete("/:id", deletePrototipo);

export default router;
