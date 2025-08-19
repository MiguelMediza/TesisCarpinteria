import { pool } from "../db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear un nuevo clavo
export const createClavo = async (req, res) => {
  try {
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      tipo,
      medidas,
      material
    } = req.body;
    const foto = req.file?.filename || null;

    //Inserción en materiaprima
    const insertMP = `
      INSERT INTO materiaprima
        (categoria, titulo, precio_unidad, stock, foto, comentarios)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [mpResult] = await pool.query(insertMP, [
      "clavo",
      titulo,
      parseFloat(precio_unidad),
      parseInt(stock, 10),
      foto,
      comentarios || null
    ]);
    const id_materia_prima = mpResult.insertId;

    // Inserción en clavos
    const insertCl = `
      INSERT INTO clavos
        (id_materia_prima, tipo, medidas, material)
      VALUES (?, ?, ?, ?)
    `;
    await pool.query(insertCl, [
      id_materia_prima,
      tipo,
      medidas,
      material
    ]);

    return res.status(201).json({
      id_materia_prima,
      message: "Clavo creado exitosamente!"
    });
  } catch (err) {
    console.error("❌ Error en createClavo:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// Obtener un clavo por ID (id_materia_prima)
export const getClavoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.titulo,
        mp.precio_unidad,
        mp.stock,
        mp.foto,
        mp.comentarios,
        c.tipo,
        c.medidas,
        c.material
      FROM materiaprima AS mp
      JOIN clavos AS c
        ON mp.id_materia_prima = c.id_materia_prima
      WHERE mp.id_materia_prima = ?
      `,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Clavo no encontrado!");
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getClavoById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// Modificar un clavo existente
export const updateClavo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; 
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      tipo,
      medidas,
      material
    } = req.body;
    const newFoto = req.file?.filename || null;

    //Verificar existencia y foto anterior
    const [exists] = await connection.query(
      `SELECT foto FROM materiaprima WHERE id_materia_prima = ?`,
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json("Clavo no encontrado!");
    }
    const oldFoto = exists[0].foto;

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

    //Actualizar clavos
    const updateCl = `
      UPDATE clavos SET
        tipo = ?,
        medidas = ?,
        material = ?
      WHERE id_materia_prima = ?
    `;
    await connection.query(updateCl, [
      tipo,
      medidas,
      material,
      id
    ]);

    await connection.commit();

    //Borrar imagen antigua si se reemplazó
    if (newFoto && oldFoto) {
      const oldPath = path.join(__dirname, "../images/clavos", oldFoto);
      fs.unlink(oldPath).catch(() => {
        console.warn("No se pudo borrar la imagen antigua:", oldFoto);
      });
    }

    return res.status(200).json("Clavo modificado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateClavo:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Eliminar un clavo y su imagen
export const deleteClavo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    //Leer foto antes de borrar
    const [rows] = await connection.query(
      `SELECT foto FROM materiaprima WHERE id_materia_prima = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Clavo no encontrado!");
    }
    const fotoNombre = rows[0].foto;

    await connection.beginTransaction();

    //Borrar detalle y padre
    const [childRes] = await connection.query(
      `DELETE FROM clavos WHERE id_materia_prima = ?`,
      [id]
    );
    if (childRes.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json("Clavo no encontrado!");
    }
    await connection.query(
      `DELETE FROM materiaprima WHERE id_materia_prima = ?`,
      [id]
    );

    await connection.commit();

    //Borrar archivo de imagen si existe
    if (fotoNombre) {
      const filePath = path.join(__dirname, "../images/clavos", fotoNombre);
      fs.unlink(filePath).catch(() => {
        console.warn("No se pudo borrar la imagen:", fotoNombre);
      });
    }

    return res.status(200).json("Clavo eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteClavo:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Listar todos los clavos
export const listClavos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.titulo,
        mp.precio_unidad,
        mp.stock,
        mp.foto,
        mp.comentarios,
        c.tipo,
        c.medidas,
        c.material
      FROM materiaprima AS mp
      JOIN clavos AS c
        ON mp.id_materia_prima = c.id_materia_prima
      WHERE mp.categoria = 'clavo'
      ORDER BY mp.titulo ASC
      `
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listClavos:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};
