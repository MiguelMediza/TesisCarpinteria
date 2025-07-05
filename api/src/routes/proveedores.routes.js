import { Router } from "express";
const router = Router();
import { createProveedor, updateProveedor, deleteProveedor, listProveedores } from "../controllers/proveedor.js";

router.post("/agregar", createProveedor);

router.put("/:id", updateProveedor);

router.delete("/:id", deleteProveedor);

router.get("/listar", listProveedores);

export default router;