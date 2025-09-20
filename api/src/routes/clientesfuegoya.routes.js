// routes/clientesfuegoya.routes.js
import { Router } from "express";
import {
  createClienteFY,
  getClienteFYById,
  listClientesFY,
  updateClienteFY,
  deleteClienteFY,
} from "../controllers/clientesfuegoya.js";

const router = Router();

router.post("/agregar", createClienteFY);

router.get("/listar", listClientesFY);

router.get("/:id", getClienteFYById);

router.put("/:id", updateClienteFY);

router.delete("/:id", deleteClienteFY);


export default router;
