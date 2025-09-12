import { Router } from "express";
import { pool } from "../db.js";
import { listStockBajo } from "../controllers/stockBajo.js";
const router = Router();

router.get('/ping', async (req, res) => {
    const result = await pool.query('SELECT * from proveedores')
    res.json(result[0])
});

router.get("/stockbajo", listStockBajo);


export default router;