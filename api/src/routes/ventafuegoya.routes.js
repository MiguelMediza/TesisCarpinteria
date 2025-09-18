import { Router } from "express";
import multer from "multer";
import { createVentaFuegoya, updateVentaFuegoya, deleteVentaFuegoya, listVentaFuegoya, getVentaFuegoyaById, changeEstadoPagoVentaFuegoya } from "../controllers/ventafuegoya.js";

import { r2Put } from "../lib/r2.js";

const router = Router();

// Multer en memoria + validación de tipo
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Sólo se permiten imágenes"));
  },
});

// Si hay archivo, súbelo a R2 y deja { key, url } en req.fileR2
const uploadToR2 = (folder) => async (req, res, next) => {
  try {
    if (req.file) {
      req.fileR2 = await r2Put({ folder, file: req.file });
    }
    next();
  } catch (e) {
    next(e);
  }
};

// Crear (foto opcional)
router.post("/agregar", upload.single("foto"), uploadToR2("venta_fuegoya"), createVentaFuegoya);

// Listar
router.get("/listar", listVentaFuegoya);

// Obtener uno
router.get("/:id", getVentaFuegoyaById);

// Actualizar (foto opcional)
router.put("/:id", upload.single("foto"), uploadToR2("venta_fuegoya"), updateVentaFuegoya);

// Eliminar
router.delete("/:id", deleteVentaFuegoya);

// Cambiar estado de pago
router.put("/:id/estadopago", changeEstadoPagoVentaFuegoya);

export default router;