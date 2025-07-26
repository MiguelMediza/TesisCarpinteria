import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
    createTipoTaco,
    listTipoTacos,
    getTipoTacoById,
    updateTipoTaco,
    deleteTipoTaco
} from "../controllers/tipotacos.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, "../images/tipo_tacos"));
  },
  filename(req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});
const upload = multer({ storage });

router.post("/agregar", upload.single("foto"), createTipoTaco);
router.get("/listar", listTipoTacos);
router.get("/:id", getTipoTacoById);
router.put("/:id", upload.single("foto"), updateTipoTaco);
router.delete("/:id", deleteTipoTaco);

export default router;
