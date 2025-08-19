import { pool } from "../db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createPellet = async (req, res) => {
  try {
    const { titulo, bolsa_kilogramos, precio_unidad, stock } = req.body;
    const foto = req.file?.filename || null;

    const insertSQL = `
      INSERT INTO pellets (titulo, bolsa_kilogramos, precio_unidad, stock, foto)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(insertSQL, [
      titulo,
      parseFloat(bolsa_kilogramos) || 0,
      parseFloat(precio_unidad) || 0,
      parseInt(stock, 10) || 0,
      foto,
    ]);

    return res.status(201).json({
      id_pellet: result.insertId,
      message: "Pellet creado exitosamente!",
    });
  } catch (err) {
    console.error("❌ Error en createPellet:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const getPelletById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT * FROM pellets WHERE id_pellet = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json("Pellet no encontrado!");

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getPelletById:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const updatePellet = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { titulo, bolsa_kilogramos, precio_unidad, stock } = req.body;
    const newFoto = req.file?.filename || null;

    // Obtener foto antigua
    const [[old]] = await connection.query(
      `SELECT foto FROM pellets WHERE id_pellet = ?`,
      [id]
    );
    if (!old) return res.status(404).json("Pellet no encontrado!");
    const oldFoto = old.foto;

    await connection.beginTransaction();

    await connection.query(
      `UPDATE pellets SET 
        titulo = ?, bolsa_kilogramos = ?, precio_unidad = ?, stock = ?, foto = COALESCE(?, foto)
       WHERE id_pellet = ?`,
      [
        titulo,
        parseFloat(bolsa_kilogramos) || 0,
        parseFloat(precio_unidad) || 0,
        parseInt(stock, 10) || 0,
        newFoto,
        id,
      ]
    );

    await connection.commit();

    // Borrar foto antigua si se reemplazó
    if (newFoto && oldFoto) {
      const oldPath = path.join(__dirname, "../images/pellets", oldFoto);
      fs.unlink(oldPath).catch(() => console.warn("⚠️ No se pudo borrar la foto antigua:", oldFoto));
    }

    return res.status(200).json("Pellet actualizado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updatePellet:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

export const deletePellet = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [[pellet]] = await connection.query(
      `SELECT foto FROM pellets WHERE id_pellet = ?`,
      [id]
    );
    if (!pellet) return res.status(404).json("Pellet no encontrado!");
    const fotoNombre = pellet.foto;

    await connection.beginTransaction();
    await connection.query(`DELETE FROM pellets WHERE id_pellet = ?`, [id]);
    await connection.commit();

    // Borrar archivo de imagen si existe
    if (fotoNombre) {
      const filePath = path.join(__dirname, "../images/pellets", fotoNombre);
      fs.unlink(filePath).catch(() => console.warn("⚠️ No se pudo borrar la foto:", fotoNombre));
    }

    return res.status(200).json("Pellet eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deletePellet:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

export const listPellets = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM pellets ORDER BY titulo ASC`);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listPellets:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
