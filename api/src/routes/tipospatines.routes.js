import { Router } from "express";
import multer from "multer";
import { createTipoPatin, deleteTipoPatin, getTipoPatinById, listTipoPatines, updateTipoPatin, listTipoPatinesSelect } from "../controllers/tipopatines.js";
import { r2Put } from "../lib/r2.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) return cb(null, true);
    cb(new Error("Sólo se permiten imágenes"));
  },
});


const uploadToR2 = (folder) => async (req, res, next) => {
  try {
    if (req.file) req.fileR2 = await r2Put({ folder, file: req.file });
    next();
  } catch (e) {
    next(e);
  }
};

router.post("/agregar", upload.single("logo"), uploadToR2("tipo_patines"), createTipoPatin);

// Listas
router.get("/listar", listTipoPatines);
router.get("/select", listTipoPatinesSelect); 

// CRUD por id
router.get("/:id", getTipoPatinById);
router.put("/:id", upload.single("logo"), uploadToR2("tipo_patines"), updateTipoPatin);
router.delete("/:id", deleteTipoPatin);

export default router;
