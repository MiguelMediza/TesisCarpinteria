import { Router } from "express";
import {
  createHorasMaquinas,
  updateHorasMaquinas,
  deleteHorasMaquinas,
  listHorasMaquinas,
  getHorasMaquinasById,
} from "../controllers/horasmaquinas.js";

const router = Router();

// Crear
router.post("/agregar", createHorasMaquinas);

// Listar
router.get("/listar", listHorasMaquinas);

// Obtener uno
router.get("/:id", getHorasMaquinasById);

// Actualizar
router.put("/:id", updateHorasMaquinas);

// Eliminar
router.delete("/:id", deleteHorasMaquinas);

export default router;
