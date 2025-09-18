// controllers/tablas.js
import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL || "";
const urlFromKey = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);

// ─────────────────────────────────────────────────────────────────────────────
// Crear una nueva tabla
export const createTabla = async (req, res) => {
  try {
    const {
      titulo,
      largo_cm,
      ancho_cm,
      espesor_mm,
      tipo_madera,
      cepilladas,
      precio_unidad,
      stock,
      comentarios,
    } = req.body;

    // req.fileR2 = { key, url } si se subió archivo a R2
    const fotoKey = req.fileR2?.key || null;

    // Inserción en materiaprima
    const insertMP = `
      INSERT INTO materiaprima
        (categoria, titulo, precio_unidad, stock, foto, comentarios)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [mpResult] = await pool.query(insertMP, [
      "tabla",
      titulo,
      precio_unidad != null ? parseFloat(precio_unidad) : null,
      stock != null ? parseInt(stock, 10) : null,
      fotoKey,
      comentarios || null,
    ]);
    const id_materia_prima = mpResult.insertId;

    // Inserción en tablas
    const cepValue =
      cepilladas === "1" || cepilladas === 1 || cepilladas === true || cepilladas === "true"
        ? 1
        : 0;

    const insertTablas = `
      INSERT INTO tablas
        (id_materia_prima, largo_cm, ancho_cm, espesor_mm, tipo_madera, cepilladas)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await pool.query(insertTablas, [
      id_materia_prima,
      largo_cm != null ? parseFloat(largo_cm) : null,
      ancho_cm != null ? parseFloat(ancho_cm) : null,
      espesor_mm != null ? parseFloat(espesor_mm) : null,
      tipo_madera || null,
      cepValue,
    ]);

    return res.status(201).json({
      id_materia_prima,
      message: "Tabla creada exitosamente!",
      foto_key: fotoKey,
      foto_url: urlFromKey(fotoKey),
    });
  } catch (err) {
    console.error("❌ Error en createTabla:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Obtener una tabla por ID (id_materia_prima)
export const getTablaById = async (req, res) => {
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
        mp.foto,            -- KEY en R2
        mp.comentarios,
        t.largo_cm,
        t.ancho_cm,
        t.espesor_mm,
        t.tipo_madera,
        t.cepilladas
      FROM materiaprima AS mp
      JOIN tablas AS t
        ON mp.id_materia_prima = t.id_materia_prima
      WHERE mp.id_materia_prima = ?
      `,
      [id]
    );

    if (rows.length === 0) return res.status(404).json("Tabla no encontrada!");

    const row = rows[0];
    return res.status(200).json({
      ...row,
      foto_url: urlFromKey(row.foto),
    });
  } catch (err) {
    console.error("❌ Error en getTablaById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Modificar una tabla existente
export const updateTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      largo_cm,
      ancho_cm,
      espesor_mm,
      tipo_madera,
      cepilladas,
    } = req.body;

    // Verificar existencia y obtener foto anterior
    const [exists] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (exists.length === 0) {
      connection.release();
      return res.status(404).json("Tabla no encontrada!");
    }
    const oldFotoKey = exists[0].foto || null;

    // Si hay nueva imagen subida a R2, viene en req.fileR2.key
    const newFotoKey = req.fileR2?.key || null;

    await connection.beginTransaction();

    // Actualizar materiaprima
    const updateMP = `
      UPDATE materiaprima SET
        titulo = ?,
        precio_unidad = ?,
        stock = ?,
        comentarios = ?,
        foto = COALESCE(?, foto)  -- sólo cambia si hay nueva foto
      WHERE id_materia_prima = ?
    `;
    await connection.query(updateMP, [
      titulo,
      precio_unidad != null ? parseFloat(precio_unidad) : null,
      stock != null ? parseInt(stock, 10) : null,
      comentarios || null,
      newFotoKey,
      id,
    ]);

    // Actualizar tablas
    const cepValue =
      cepilladas === "1" || cepilladas === 1 || cepilladas === true || cepilladas === "true"
        ? 1
        : 0;

    const updateT = `
      UPDATE tablas SET
        largo_cm = ?,
        ancho_cm = ?,
        espesor_mm = ?,
        tipo_madera = ?,
        cepilladas = ?
      WHERE id_materia_prima = ?
    `;
    await connection.query(updateT, [
      largo_cm != null ? parseFloat(largo_cm) : null,
      ancho_cm != null ? parseFloat(ancho_cm) : null,
      espesor_mm != null ? parseFloat(espesor_mm) : null,
      tipo_madera || null,
      cepValue,
      id,
    ]);

    await connection.commit();

    // Si se subió nueva foto, borrar la anterior en R2
    if (newFotoKey && oldFotoKey && newFotoKey !== oldFotoKey) {
      try {
        await r2Delete(oldFotoKey);
      } catch (e) {
        console.warn("⚠️ No se pudo borrar la imagen antigua en R2:", oldFotoKey, e?.message);
      }
    }

    return res.status(200).json({
      message: "Tabla modificada exitosamente!",
      foto_key: newFotoKey || oldFotoKey || null,
      foto_url: urlFromKey(newFotoKey || oldFotoKey),
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateTabla:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Eliminar una tabla y su imagen (si existe) en R2
export const deleteTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    // Leer key antes de borrar
    const [rows] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json("Tabla no encontrada!");
    }
    const fotoKey = rows[0].foto || null;

    await connection.beginTransaction();

    // Borrar detalle y padre
    const [childRes] = await connection.query(
      "DELETE FROM tablas WHERE id_materia_prima = ?",
      [id]
    );
    if (childRes.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json("Tabla no encontrada!");
    }

    await connection.query(
      "DELETE FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );

    await connection.commit();

    // Borrar en R2 si hay key
    if (fotoKey) {
      try {
        await r2Delete(fotoKey);
      } catch (e) {
        console.warn("⚠️ No se pudo borrar la imagen en R2:", fotoKey, e?.message);
      }
    }

    return res.status(200).json("Tabla eliminada exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteTabla:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Listar todas las tablas
export const listTablas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.categoria,
        mp.titulo,
        mp.precio_unidad,
        mp.stock,
        mp.foto,            -- KEY en R2
        mp.comentarios,
        t.largo_cm,
        t.ancho_cm,
        t.espesor_mm,
        t.tipo_madera,
        t.cepilladas
      FROM materiaprima AS mp
      JOIN tablas AS t
        ON mp.id_materia_prima = t.id_materia_prima
      WHERE mp.categoria = 'tabla'
      ORDER BY mp.titulo ASC
      `
    );

    const withUrls = rows.map((r) => ({
      ...r,
      foto_url: urlFromKey(r.foto),
    }));

    return res.status(200).json(withUrls);
  } catch (err) {
    console.error("❌ Error en listTablas:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};
