import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { createTipoPatin, deleteTipoPatin, getTipoPatinById, listTipoPatines, updateTipoPatin } from "../controllers/tipopatines.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, "../images/tipo_patines"));
  },
  filename(req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});
const upload = multer({ storage });

router.post("/agregar", upload.single("logo"), createTipoPatin);
router.get("/listar", listTipoPatines);
router.get("/:id", getTipoPatinById);
router.put("/:id", upload.single("logo"), updateTipoPatin);
router.delete("/:id", deleteTipoPatin);

export default router;