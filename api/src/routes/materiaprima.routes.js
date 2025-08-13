import { Router } from "express";
import { listMateriasPrimas } from "../controllers/materiaprima.js";
const router = Router();

// GET /api/src/materiaprima/listar?categoria=clavo,fibra&q=2"
router.get("/listar", listMateriasPrimas);

export default router;
