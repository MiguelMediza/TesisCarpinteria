import { Router } from "express";
import {
  createClienteFY,
  getClienteFYById,
  listClientesFY,
  updateClienteFY,
  deleteClienteFY,
  getCreditoClienteFuegoya,
  listCreditoClientesFuegoya,
} from "../controllers/clientesfuegoya.js";

const router = Router();

router.get("/credito/resumen", listCreditoClientesFuegoya); 
router.get("/:id/credito", getCreditoClienteFuegoya);       

router.post("/agregar", createClienteFY);   
router.get("/listar", listClientesFY);      
router.get("/:id", getClienteFYById);       
router.put("/:id", updateClienteFY);        
router.delete("/:id", deleteClienteFY);     

export default router;
