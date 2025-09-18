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
router.get("/listar", listPedidos);          
router.get("/:id", getPedidoById);
router.put("/:id", updatePedido);            
router.delete("/:id", deletePedido);

// cambiar solo estado
router.put("/:id/estado", changeEstadoPedido);

export default router;
