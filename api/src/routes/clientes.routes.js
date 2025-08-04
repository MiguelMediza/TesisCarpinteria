import { Router } from "express";
const router = Router();
import { createCliente, listClientes, getClienteById, updateCliente, deleteCliente } from "../controllers/clientes.js";

router.post("/agregar", createCliente);

// Listar
router.get("/listar", listClientes);

// Obtener por ID
router.get("/:id", getClienteById);

// Actualizar 
router.put("/:id", updateCliente);

// Eliminar
router.delete("/:id", deleteCliente);

export default router;