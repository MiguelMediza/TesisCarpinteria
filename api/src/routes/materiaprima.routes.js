import { Router } from "express";
import { listMateriasPrimas } from "../controllers/materiaprima.js";
const router = Router();

router.get("/listar", listMateriasPrimas);

export default router;
