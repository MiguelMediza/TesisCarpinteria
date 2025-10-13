import { Router } from "express";
import {
  createClienteFY,
  getClienteFYById,
  listClientesFY,
  updateClienteFY,
  deleteClienteFY,
  listCreditoClientesFuegoya,
  registrarEntrega,
  listarPagosCliente,
  getCreditoCliente
} from "../controllers/clientesfuegoya.js";

const router = Router();


router.get("/credito/resumen", listCreditoClientesFuegoya); 
router.get("/:id/credito", getCreditoCliente);       

router.post("/agregar", createClienteFY);   
router.get("/listar", listClientesFY);      
router.get("/:id", getClienteFYById);       
router.put("/:id", updateClienteFY);        
router.delete("/:id", deleteClienteFY);  
router.get("/:id/pagos", listarPagosCliente); 
router.post("/:id/registrarentrega", registrarEntrega);  

export default router;
