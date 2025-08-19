import { Router } from "express";
import {
  createPedido,
  getPedidoById,
  listPedidos,
  updatePedido,
  deletePedido,
  changeEstadoPedido,
} from "../controllers/pedidos.js";

const router = Router();

router.post("/agregar", createPedido);
router.get("/listar", listPedidos);          // filtros: ?estado=&desde=&hasta=&cliente=
router.get("/:id", getPedidoById);
router.put("/:id", updatePedido);            // reemplaza items si mandas "items"
router.delete("/:id", deletePedido);

// cambiar solo estado
router.put("/:id/estado", changeEstadoPedido);

export default router;
