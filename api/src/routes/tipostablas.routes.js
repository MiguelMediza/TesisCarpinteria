import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  createTipoTabla,
  listTipoTablas,
  getTipoTablaById,
  updateTipoTabla,
  deleteTipoTabla
} from "../controllers/tipotablas.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, "../images/tipo_tablas"));
  },
  filename(req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});
const upload = multer({ storage });

router.post("/agregar", upload.single("foto"), createTipoTabla);
router.get("/listar", listTipoTablas);
router.get("/:id", getTipoTablaById);
router.put("/:id", upload.single("foto"), updateTipoTabla);
router.delete("/:id", deleteTipoTabla);

export default router;
