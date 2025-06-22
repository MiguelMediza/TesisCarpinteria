import { Router } from "express";
import { pool } from "../db.js";
const router = Router();

router.get('/ping', async (req, res) => {
    const result = await pool.query('SELECT * from proveedores')
    res.json(result[0])
});

router.get('/usuarios', (req, res) => res.send('Obteniendo usuarios'));

router.post('/usuarios', (req, res) => res.send('Agregando usuario'));

router.put('/usuarios', (req, res) => res.send('Actualizando usuarios'));

router.delete('/usuarios', (req, res) => res.send('Eliminando usuario'));

export default router;