import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const basePublic = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

export const createPellet = async (req, res) => {
  try {
    const { titulo, bolsa_kilogramos, precio_unidad, stock } = req.body;
    const fotoKey = req.fileR2?.key || null;
    const insertSQL = `
      INSERT INTO pellets (titulo, bolsa_kilogramos, precio_unidad, stock, foto)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertSQL, [
      titulo || null,
      parseFloat(bolsa_kilogramos) || 0,
      parseFloat(precio_unidad) || 0,
      parseInt(stock, 10) || 0,
      fotoKey
    ]);
    return res.status(201).json({
      id_pellet: result.insertId,
      message: "Pellet creado exitosamente!"
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const getPelletById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        id_pellet,
        titulo,
        bolsa_kilogramos,
        precio_unidad,
        stock,
        foto,
        CASE WHEN foto IS NOT NULL AND foto <> '' THEN CONCAT(?, '/', foto) ELSE NULL END AS foto_url
      FROM pellets
      WHERE id_pellet = ?
      `,
      [basePublic, id]
    );
    if (rows.length === 0) return res.status(404).json("Pellet no encontrado!");
    return res.status(200).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const updatePellet = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { titulo, bolsa_kilogramos, precio_unidad, stock } = req.body;
    const [exists] = await connection.query(
      `SELECT foto FROM pellets WHERE id_pellet = ?`,
      [id]
    );
    if (exists.length === 0) {
      connection.release();
      return res.status(404).json("Pellet no encontrado!");
    }
    const oldFoto = exists[0].foto || null;
    const newFotoKey = req.fileR2?.key || null;

    await connection.beginTransaction();
    await connection.query(
      `
      UPDATE pellets SET
        titulo = ?,
        bolsa_kilogramos = ?,
        precio_unidad = ?,
        stock = ?,
        foto = COALESCE(?, foto)
      WHERE id_pellet = ?
      `,
      [
        titulo || null,
        parseFloat(bolsa_kilogramos) || 0,
        parseFloat(precio_unidad) || 0,
        parseInt(stock, 10) || 0,
        newFotoKey,
        id
      ]
    );
    await connection.commit();
    connection.release();

    if (newFotoKey && oldFoto && oldFoto !== newFotoKey) {
      try { await r2Delete(oldFoto); } catch {}
    }
    return res.status(200).json("Pellet actualizado exitosamente!");
  } catch (err) {
    await connection.rollback();
    connection.release();
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const deletePellet = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const [rows] = await connection.query(
      `SELECT foto FROM pellets WHERE id_pellet = ?`,
      [id]
    );
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json("Pellet no encontrado!");
    }
    const fotoKey = rows[0].foto || null;

    await connection.beginTransaction();
    await connection.query(`DELETE FROM pellets WHERE id_pellet = ?`, [id]);
    await connection.commit();
    connection.release();

    if (fotoKey) {
      try { await r2Delete(fotoKey); } catch {}
    }
    return res.status(200).json("Pellet eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    connection.release();
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const listPellets = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id_pellet,
        titulo,
        bolsa_kilogramos,
        precio_unidad,
        stock,
        foto,
        CASE WHEN foto IS NOT NULL AND foto <> '' THEN CONCAT(?, '/', foto) ELSE NULL END AS foto_url
      FROM pellets
      ORDER BY titulo ASC
      `,
      [basePublic]
    );
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
