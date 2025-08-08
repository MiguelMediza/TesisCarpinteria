import { Router } from "express";
const router = Router();
import { createEncargo, listEncargos, getEncargoById, updateEncargo, deleteEncargo, listarMateriasPrimas, markEncargoRecibido } from "../controllers/encargos.js";

router.post("/agregar", createEncargo);

// Listar
router.get("/listar", listEncargos);

// Listar materias primas
router.get("/primas", listarMateriasPrimas);

router.put("/:id/recibido", markEncargoRecibido); 

// Obtener por ID
router.get("/:id", getEncargoById);

// Actualizar 
router.put("/:id", updateEncargo);

// Eliminar
router.delete("/:id", deleteEncargo);



export default router;
