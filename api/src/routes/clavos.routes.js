// routes/clavos.routes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  createClavo,
  listClavos,
  getClavoById,
  updateClavo,
  deleteClavo
} from "../controllers/clavos.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer to save into /images/clavos
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, "../images/clavos"));
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
export const upload = multer({ storage });

// Crear un nuevo clavo (con foto opcional)
router.post(
  "/agregar",
  upload.single("foto"),
  createClavo
);

// Listar todos los clavos
router.get("/listar", listClavos);

// Obtener un clavo por ID
router.get("/:id", getClavoById);

// Actualizar un clavo existente (con foto opcional)
router.put(
  "/:id",
  upload.single("foto"),
  updateClavo
);

// Eliminar un clavo
router.delete("/:id", deleteClavo);

export default router;
