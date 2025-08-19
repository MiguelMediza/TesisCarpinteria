import { pool } from "../db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear una nueva fibra
export const createFibra = async (req, res) => {
  try {
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      ancho_cm,
      largo_cm
    } = req.body;
    const foto = req.file?.filename || null;

    //Inserción en materiaprima
    const insertMP = `
      INSERT INTO materiaprima
        (categoria, titulo, precio_unidad, stock, foto, comentarios)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [mpResult] = await pool.query(insertMP, [
      'fibra',
      titulo,
      parseFloat(precio_unidad),
      parseInt(stock, 10),
      foto,
      comentarios || null
    ]);
    const id_materia_prima = mpResult.insertId;

    //Inserción en fibras
    const insertFibra = `
      INSERT INTO fibras
        (id_materia_prima, ancho_cm, largo_cm)
      VALUES (?, ?, ?)
    `;
    await pool.query(insertFibra, [
      id_materia_prima,
      parseFloat(ancho_cm),
      parseFloat(largo_cm)
    ]);

    return res.status(201).json({
      id_materia_prima,
      message: "Fibra creada exitosamente!"
    });

  } catch (err) {
    console.error("❌ Error en createFibra:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// Obtener una fibra por ID con todos sus datos
export const getFibraById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.categoria,
        mp.titulo,
        mp.precio_unidad,
        mp.stock,
        mp.foto,
        mp.comentarios,
        f.ancho_cm,
        f.largo_cm
      FROM materiaprima AS mp
      JOIN fibras AS f
        ON mp.id_materia_prima = f.id_materia_prima
      WHERE mp.id_materia_prima = ?
      `,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Fibra no encontrada!");
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getFibraById:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// Modificar una fibra existente
export const updateFibra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      ancho_cm,
      largo_cm
    } = req.body;

    //Verificar existencia y foto antigua
    const [exists] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json("Fibra no encontrada!");
    }
    const oldFoto = exists[0].foto;
    const newFoto = req.file?.filename || null;

    await connection.beginTransaction();

    //Actualizar materiaprima
    const updateMP = `
      UPDATE materiaprima SET
        titulo = ?,
        precio_unidad = ?,
        stock = ?,
        comentarios = ?,
        foto = COALESCE(?, foto)
      WHERE id_materia_prima = ?
    `;
    await connection.query(updateMP, [
      titulo,
      parseFloat(precio_unidad),
      parseInt(stock, 10),
      comentarios || null,
      newFoto,
      id
    ]);

    //Actualizar fibras
    const updateF = `
      UPDATE fibras SET
        ancho_cm = ?,
        largo_cm = ?
      WHERE id_materia_prima = ?
    `;
    await connection.query(updateF, [
      parseFloat(ancho_cm),
      parseFloat(largo_cm),
      id
    ]);

    await connection.commit();

    // Borrar foto antigua si se reemplazó
    if (newFoto && oldFoto) {
      const oldPath = path.join(__dirname, '../images/fibras', oldFoto);
      fs.unlink(oldPath).catch(() => console.warn('No se pudo borrar foto antigua:', oldFoto));
    }

    return res.status(200).json("Fibra modificada exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateFibra:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Eliminar una fibra y su imagen
export const deleteFibra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    // Obtener foto antigua
    const [rows] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Fibra no encontrada!");
    }
    const fotoNombre = rows[0].foto;

    await connection.beginTransaction();
    const [child] = await connection.query(
      "DELETE FROM fibras WHERE id_materia_prima = ?",
      [id]
    );
    if (child.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json("Fibra no encontrada!");
    }
    await connection.query(
      "DELETE FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    await connection.commit();

    if (fotoNombre) {
      const filePath = path.join(__dirname, '../images/fibras', fotoNombre);
      fs.unlink(filePath).catch(() => console.warn('No se pudo borrar la foto:', fotoNombre));
    }

    return res.status(200).json("Fibra eliminada exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteFibra:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Listar todas las fibras con sus datos respectivos en materiaprima
export const listFibras = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.categoria,
        mp.titulo,
        mp.precio_unidad,
        mp.stock,
        mp.foto,
        mp.comentarios,
        f.ancho_cm,
        f.largo_cm
      FROM materiaprima AS mp
      JOIN fibras AS f
        ON mp.id_materia_prima = f.id_materia_prima
      WHERE mp.categoria = 'fibra'
      ORDER BY mp.titulo ASC
      `
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listFibras:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
