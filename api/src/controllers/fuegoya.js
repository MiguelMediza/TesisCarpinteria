// controllers/fuegoya.js
import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

const urlFromKey = (key) => {
  if (!key) return null;
  // si ya es una URL absoluta, respetar
  if (/^https?:\/\//i.test(key)) return key;

  const clean = String(key).replace(/^\/+/, ""); // quita leading slashes
  return PUBLIC_BASE ? `${PUBLIC_BASE}/${clean}` : `/${clean}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Crear un nuevo Fuego Y
export const createFuegoYa = async (req, res) => {
  try {
    const { tipo, precio_unidad, stock } = req.body;

    // req.fileR2 = { key, url } si se subió archivo a R2
    const fotoKey = req.fileR2?.key || null;

    const insertQ = `
      INSERT INTO fuego_ya
        (tipo, precio_unidad, stock, foto)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertQ, [
      tipo,
      precio_unidad != null ? parseFloat(precio_unidad) : null,
      stock != null ? parseInt(stock, 10) : null,
      fotoKey,
    ]);

    return res.status(201).json({
      id_fuego_ya: result.insertId,
      message: "Fuego Ya creado exitosamente!",
      foto_key: fotoKey,
      foto_url: urlFromKey(fotoKey),
    });
  } catch (err) {
    console.error("❌ Error en createFuegoYa:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Obtener un Fuego Ya por ID
export const getFuegoYaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        id_fuego_ya,
        tipo,
        precio_unidad,
        stock,
        foto   -- guarda la KEY en R2
      FROM fuego_ya
      WHERE id_fuego_ya = ?
      `,
      [id]
    );

    if (rows.length === 0) return res.status(404).json("Fuego Ya no encontrado!");

    const row = rows[0];
    return res.status(200).json({
      ...row,
      foto_url: urlFromKey(row.foto),
    });
  } catch (err) {
    console.error("❌ Error en getFuegoYaById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Modificar un Fuego Ya existente
export const updateFuegoYa = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { tipo, precio_unidad, stock } = req.body;

    // Verificar existencia y obtener foto anterior (key)
    const [exists] = await connection.query(
      `SELECT foto FROM fuego_ya WHERE id_fuego_ya = ?`,
      [id]
    );
    if (exists.length === 0) {
      connection.release();
      return res.status(404).json("Fuego Ya no encontrado!");
    }
    const oldFotoKey = exists[0].foto || null;

    // Si hay nueva imagen subida a R2, viene en req.fileR2.key
    const newFotoKey = req.fileR2?.key || null;

    await connection.beginTransaction();

    const updateQ = `
      UPDATE fuego_ya SET
        tipo = ?,
        precio_unidad = ?,
        stock = ?,
        foto = COALESCE(?, foto)  -- sólo cambia si hay nueva foto
      WHERE id_fuego_ya = ?
    `;
    await connection.query(updateQ, [
      tipo,
      precio_unidad != null ? parseFloat(precio_unidad) : null,
      stock != null ? parseInt(stock, 10) : null,
      newFotoKey,
      id,
    ]);

    await connection.commit();

    // Si se subió una nueva imagen y cambió, borrar la vieja en R2
    if (newFotoKey && oldFotoKey && newFotoKey !== oldFotoKey) {
      try {
        await r2Delete(oldFotoKey);
      } catch (e) {
        console.warn("⚠️ No se pudo borrar la imagen antigua en R2:", oldFotoKey, e?.message);
      }
    }

    return res.status(200).json({
      message: "Fuego Ya modificado exitosamente!",
      foto_key: newFotoKey || oldFotoKey || null,
      foto_url: urlFromKey(newFotoKey || oldFotoKey),
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateFuegoYa:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Eliminar un Fuego Ya y su imagen (si existe) en R2
export const deleteFuegoYa = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    // Obtener key antes de borrar
    const [rows] = await connection.query(
      `SELECT foto FROM fuego_ya WHERE id_fuego_ya = ?`,
      [id]
    );
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json("Fuego Ya no encontrado!");
    }
    const fotoKey = rows[0].foto || null;

    await connection.beginTransaction();

    const [delRes] = await connection.query(
      `DELETE FROM fuego_ya WHERE id_fuego_ya = ?`,
      [id]
    );
    if (delRes.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json("Fuego Ya no encontrado!");
    }

    await connection.commit();

    // Borrar en R2
    if (fotoKey) {
      try {
        await r2Delete(fotoKey);
      } catch (e) {
        console.warn("⚠️ No se pudo borrar la imagen en R2:", fotoKey, e?.message);
      }
    }

    return res.status(200).json("Fuego Ya eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteFuegoYa:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Listar todos los Fuego Ya
export const listFuegoYa = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id_fuego_ya,
        tipo,
        precio_unidad,
        stock,
        foto   -- KEY en R2
      FROM fuego_ya
      ORDER BY tipo ASC
      `
    );

    const withUrls = rows.map((r) => ({
      ...r,
      foto_url: urlFromKey(r.foto),
    }));

    return res.status(200).json(withUrls);
  } catch (err) {
    console.error("❌ Error en listFuegoYa:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};
