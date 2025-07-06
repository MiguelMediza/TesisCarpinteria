import { Router } from "express";
const router = Router();
import { createProveedor, updateProveedor, deleteProveedor, listProveedores, getProveedorById } from "../controllers/proveedor.js";

router.post("/agregar", createProveedor);

router.get("/listar", listProveedores);

router.get("/:id", getProveedorById);

router.put("/:id", updateProveedor);

router.delete("/:id", deleteProveedor);



export default router;