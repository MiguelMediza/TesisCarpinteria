import { pool } from "../db.js";

/**
 * GET /api/src/materiaprima/listar
 * Query params:
 *   - categoria: "clavo", "fibra" (también soporta múltiple: "clavo,fibra,tabla")
 *   - q: texto de búsqueda en titulo (opcional)
 *
 * Por defecto filtra por clavo y fibra si no se especifica categoria.
 */
export const listMateriasPrimas = async (req, res) => {
  try {
    const { categoria, q } = req.query;

    // Categorías permitidas en tu schema
    const allowed = new Set(["tabla", "palo", "clavo", "fibra"]);

    // Si no envían categoria, por defecto clavo y fibra
    let categories = ["clavo", "fibra"];

    if (categoria) {
      categories = categoria
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(c => allowed.has(c));
      if (categories.length === 0) {
        return res.status(400).json({ error: "Categoría(s) inválida(s)." });
      }
    }

    // Construcción dinámica del WHERE
    const whereParts = [];
    const params = [];

    // WHERE categoria IN (...)
    whereParts.push(`categoria IN (${categories.map(() => "?").join(",")})`);
    params.push(...categories);

    // Búsqueda por título si hay q
    if (q && q.trim()) {
      whereParts.push(`titulo LIKE ?`);
      params.push(`%${q.trim()}%`);
    }

    const sql = `
      SELECT
        id_materia_prima,
        categoria,
        titulo,
        precio_unidad,
        stock,
        foto,
        comentarios
      FROM materiaprima
      WHERE ${whereParts.join(" AND ")}
      ORDER BY titulo ASC
    `;

    const [rows] = await pool.query(sql, params);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listMateriasPrimas:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};
