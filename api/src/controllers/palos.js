import { pool } from "../db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear un nuevo palo
export const createPalo = async (req, res) => {
  try {
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      largo_cm,
      diametro_mm,
      tipo_madera
    } = req.body;
    const foto = req.file?.filename || null;

    //Insertar en materiaprima
    const insertMP = `
      INSERT INTO materiaprima
        (categoria, titulo, precio_unidad, stock, foto, comentarios)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [mpResult] = await pool.query(insertMP, [
      'palo',
      titulo,
      parseFloat(precio_unidad),
      parseInt(stock, 10),
      foto,
      comentarios || null
    ]);

    const id_materia_prima = mpResult.insertId;

    //Insertar en palos
    const insertPalo = `
      INSERT INTO palos
        (id_materia_prima, largo_cm, diametro_mm, tipo_madera)
      VALUES (?, ?, ?, ?)
    `;
    await pool.query(insertPalo, [
      id_materia_prima,
      parseFloat(largo_cm),
      parseFloat(diametro_mm),
      tipo_madera
    ]);

    return res.status(201).json({
      id_materia_prima,
      message: "Palo creado exitosamente!"
    });

  } catch (err) {
    console.error("❌ Error en createPalo:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// Obtener un palo por ID con todos sus datos
export const getPaloById = async (req, res) => {
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
        mp.comentarios AS comentarios_mp,
        p.largo_cm,
        p.diametro_mm,
        p.tipo_madera
      FROM materiaprima AS mp
      JOIN palos AS p
        ON mp.id_materia_prima = p.id_materia_prima
      WHERE mp.id_materia_prima = ?
      `,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Palo no encontrado!");
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getPaloById:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// Modificar un palo existente
export const updatePalo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      largo_cm,
      diametro_mm,
      tipo_madera
    } = req.body;

    // Verificar existencia y obtener foto antigua
    const [exists] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json("Palo no encontrado!");
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

    //Actualizar palos
    const updateP = `
      UPDATE palos SET
        largo_cm = ?,
        diametro_mm = ?,
        tipo_madera = ?
      WHERE id_materia_prima = ?
    `;
    await connection.query(updateP, [
      parseFloat(largo_cm),
      parseFloat(diametro_mm),
      tipo_madera,
      id
    ]);

    await connection.commit();

    // Borrar foto antigua del disco si se reemplazó
    if (newFoto && oldFoto) {
      const oldPath = path.join(__dirname, '../images/palos', oldFoto);
      fs.unlink(oldPath).catch(() => console.warn('No se pudo borrar foto antigua:', oldFoto));
    }

    return res.status(200).json("Palo modificado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updatePalo:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Eliminar un palo y su imagen
export const deletePalo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    // Obtener nombre de la foto
    const [rows] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Palo no encontrado!");
    }
    const fotoNombre = rows[0].foto;

    await connection.beginTransaction();
    // Borrar detalle en palos
    const [child] = await connection.query(
      "DELETE FROM palos WHERE id_materia_prima = ?",
      [id]
    );
    if (child.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json("Palo no encontrado!");
    }
    // Borrar materiaprima
    await connection.query(
      "DELETE FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    await connection.commit();

    // Borrar foto del disco
    if (fotoNombre) {
      const filePath = path.join(__dirname, '../images/palos', fotoNombre);
      fs.unlink(filePath).catch(() => console.warn('No se pudo borrar la foto:', fotoNombre));
    }

    return res.status(200).json("Palo eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deletePalo:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Listar todos los palos con sus datos
export const listPalos = async (req, res) => {
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
        mp.comentarios AS comentarios_mp,
        p.largo_cm,
        p.diametro_mm,
        p.tipo_madera
      FROM materiaprima AS mp
      JOIN palos AS p
        ON mp.id_materia_prima = p.id_materia_prima
      WHERE mp.categoria = 'palo'
      ORDER BY mp.titulo ASC
      `
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listPalos:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};