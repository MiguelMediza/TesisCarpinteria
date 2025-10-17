import { pool } from "../db.js";

const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL || "";
const urlFromKey = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);

export const listStockBajo = async (req, res) => {
  try {
    const threshold = Number(req.query.threshold ?? 500);

    const sql = `
      SELECT mp.categoria AS origen, mp.id_materia_prima AS id, mp.titulo, mp.stock, mp.foto
      FROM materiaprima mp
      WHERE mp.stock < ?

      UNION ALL
      SELECT 'tipo_tablas' AS origen, tt.id_tipo_tabla AS id, tt.titulo, tt.stock, tt.foto
      FROM tipo_tablas tt
      WHERE tt.stock < ?

      UNION ALL
      SELECT 'tipo_tacos' AS origen, tk.id_tipo_taco AS id, tk.titulo, tk.stock, tk.foto
      FROM tipo_tacos tk
      WHERE tk.stock < ?

      UNION ALL
      SELECT 'tipo_patines' AS origen, tp.id_tipo_patin AS id, COALESCE(tp.titulo,'Tipo patín') AS titulo, tp.stock, tp.logo AS foto
      FROM tipo_patines tp
      WHERE tp.stock < ?

      UNION ALL
      SELECT 'fuego_ya' AS origen, fy.id_fuego_ya AS id, fy.tipo AS titulo, fy.stock, fy.foto
      FROM fuego_ya fy
      WHERE fy.stock < ?

      UNION ALL
      SELECT 'pellets' AS origen, pe.id_pellet AS id, pe.titulo, pe.stock, pe.foto
      FROM pellets pe
      WHERE pe.stock < ?
    `;

    const [rows] = await pool.query(sql, [
      threshold, threshold, threshold, threshold, threshold, threshold
    ]);

    const mapped = rows.map((r) => ({
      ...r,
      foto_url: urlFromKey(r.foto),
    }));

    res.status(200).json(mapped);
  } catch (err) {
    console.error("listStockBajo:", err);
    res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
}; 
