import { Router } from "express";
import {
  createPedido,
  getPedidoById,
  listPedidos,
  updatePedido,
  deletePedido,
  changeEstadoPedido,
  listPedidosFull
} from "../controllers/pedidos.js";

const router = Router();

router.post("/agregar", createPedido);
router.get("/listar", listPedidos);     
router.get("/listarfull", listPedidosFull);     
router.get("/:id", getPedidoById);
router.put("/:id", updatePedido);            
router.delete("/:id", deletePedido);

router.put("/:id/estado", changeEstadoPedido);

export default router;
