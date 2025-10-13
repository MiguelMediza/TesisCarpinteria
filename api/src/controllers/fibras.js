// controllers/fibras.js
import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

const urlFromKey = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);

// Crear una nueva fibra
export const createFibra = async (req, res) => {
  try {
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      ancho_cm,
      largo_cm,
    } = req.body;

    const fotoKey = req.fileR2?.key || null;

    // Inserción en materiaprima
    const insertMP = `
      INSERT INTO materiaprima
        (categoria, titulo, precio_unidad, stock, foto, comentarios)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [mpResult] = await pool.query(insertMP, [
      "fibra",
      titulo || null,
      precio_unidad != null ? parseFloat(precio_unidad) : 0,
      stock != null ? parseInt(stock, 10) : 0,
      fotoKey,
      comentarios || null,
    ]);
    const id_materia_prima = mpResult.insertId;

    // Inserción en fibras
    const insertFibra = `
      INSERT INTO fibras
        (id_materia_prima, ancho_cm, largo_cm)
      VALUES (?, ?, ?)
    `;
    await pool.query(insertFibra, [
      id_materia_prima,
      ancho_cm != null ? parseFloat(ancho_cm) : null,
      largo_cm != null ? parseFloat(largo_cm) : null,
    ]);

    return res.status(201).json({
      id_materia_prima,
      message: "Fibra creada exitosamente!",
    });
  } catch (err) {
    console.error("❌ Error en createFibra:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
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
        mp.foto,           -- key en R2
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

    const row = rows[0];
    const foto_url = urlFromKey(row.foto);

    return res.status(200).json({ ...row, foto_url });
  } catch (err) {
    console.error("❌ Error en getFibraById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
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
      largo_cm,
    } = req.body;

    // Verificar existencia y obtener foto antigua (key)
    const [exists] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json("Fibra no encontrada!");
    }
    const oldFotoKey = exists[0].foto;
    const newFotoKey = req.fileR2?.key || null;

    await connection.beginTransaction();

    // Actualizar materiaprima
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
      titulo || null,
      precio_unidad != null ? parseFloat(precio_unidad) : 0,
      stock != null ? parseInt(stock, 10) : 0,
      comentarios || null,
      newFotoKey, // si es null, mantiene la anterior
      id,
    ]);

    // Actualizar fibras
    const updateF = `
      UPDATE fibras SET
        ancho_cm = ?,
        largo_cm = ?
      WHERE id_materia_prima = ?
    `;
    await connection.query(updateF, [
      ancho_cm != null ? parseFloat(ancho_cm) : null,
      largo_cm != null ? parseFloat(largo_cm) : null,
      id,
    ]);

    await connection.commit();

    // Borrar foto antigua en R2 si se reemplazó
    if (newFotoKey && oldFotoKey && newFotoKey !== oldFotoKey) {
      try {
        await r2Delete(oldFotoKey);
      } catch (e) {
        console.warn("No se pudo borrar la imagen antigua en R2:", oldFotoKey, e?.message);
      }
    }

    return res.status(200).json("Fibra modificada exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateFibra:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Eliminar una fibra y su imagen (R2)
export const deleteFibra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    // Obtener foto (key) antes de borrar
    const [rows] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Fibra no encontrada!");
    }
    const fotoKey = rows[0].foto;

    await connection.beginTransaction();

    // Borrar detalle y padre
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

    // Intentar borrar objeto en R2 (si hay key)
    if (fotoKey) {
      try {
        await r2Delete(fotoKey);
      } catch (e) {
        console.warn("No se pudo borrar la imagen en R2:", fotoKey, e?.message);
      }
    }

    return res.status(200).json("Fibra eliminada exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteFibra:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Listar todas las fibras con sus datos
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

    const data = rows.map((r) => ({
      ...r,
      foto_url: urlFromKey(r.foto),
    }));

    return res.status(200).json(data);
  } catch (err) {
    console.error("❌ Error en listFibras:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};
 