import { Router } from "express";
import {
  listEntregas,              // ✅ NUEVO: listado global (para /entregas/listar)
  getResumenPedido,
  listEntregasByPedido,
  getEntregaById,
  createEntrega,
  updateEntregaHeader,
  replaceEntregaDetalles,
  deleteEntrega,
  deleteEntregaDetalle,
} from "../controllers/entregas.js";

const router = Router();

/**
 * IMPORTANTE:
 * Rutas "fijas" SIEMPRE antes que "/:id"
 */
router.get("/listar", listEntregas);

router.get("/pedido/:id/resumen", getResumenPedido);
router.get("/pedido/:id/listar", listEntregasByPedido);

router.post("/agregar", createEntrega);

router.get("/:id", getEntregaById);
router.put("/:id", updateEntregaHeader);
router.put("/:id/detalles", replaceEntregaDetalles);

router.delete("/:id", deleteEntrega);
router.delete("/:id/detalles/:id_prototipo", deleteEntregaDetalle);

export default router;
