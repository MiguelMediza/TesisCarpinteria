import { Router } from "express";
const router = Router();
import { createCliente, listClientes, getClienteById, updateCliente, deleteCliente, listarClientesSelect } from "../controllers/clientes.js";

router.post("/agregar", createCliente);

router.get("/select", listarClientesSelect);

// Listar
router.get("/listar", listClientes);

// Obtener por ID
router.get("/:id", getClienteById);


// Actualizar 
router.put("/:id", updateCliente);

// Eliminar
router.delete("/:id", deleteCliente);

export default router;