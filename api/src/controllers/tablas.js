import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL || "";
const urlFromKey = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);

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

    const fotoKey = req.fileR2?.key || null;

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
export const deleteTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [[mpRow]] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (!mpRow) {
      return res.status(404).json({ message: "Tabla no encontrada!" });
    }
    const fotoKey = mpRow.foto || null;

    const [tipoRows] = await connection.query(
      `
      SELECT
        tt.id_tipo_tabla,
        COALESCE(NULLIF(TRIM(tt.titulo), ''), CONCAT('Tipo #', tt.id_tipo_tabla)) AS titulo
      FROM tipo_tablas tt
      WHERE tt.id_materia_prima = ?
      LIMIT 8
      `,
      [id]
    );
    if (tipoRows.length > 0) {
      const titulos = tipoRows.map(r => r.titulo);
      return res.status(409).json({
        code: "REFERENCED_IN_TIPO_TABLAS",
        message:
          `No se puede eliminar: esta tabla tiene tipos derivados asociados (${tipoRows.length}).`,
        tipos: titulos,
        count: tipoRows.length,
      });
    }

    await connection.beginTransaction();

    const [delChild] = await connection.query(
      "DELETE FROM tablas WHERE id_materia_prima = ?",
      [id]
    );
    if (delChild.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Tabla no encontrada!" });
    }

    await connection.query(
      "DELETE FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );

    await connection.commit();

    if (fotoKey) {
      try { await r2Delete(fotoKey); } 
      catch (e) { console.warn("⚠️ No se pudo borrar imagen R2:", fotoKey, e?.message); }
    }

    return res.status(200).json({ message: "Tabla eliminada exitosamente!" });
  } catch (err) {
    try { await connection.rollback(); } catch {}

    if (err?.errno === 1451 || err?.code === "ER_ROW_IS_REFERENCED_2") {
      try {
        const [tipoRows] = await pool.query(
          `
          SELECT
            tt.id_tipo_tabla,
            COALESCE(NULLIF(TRIM(tt.titulo), ''), CONCAT('Tipo #', tt.id_tipo_tabla)) AS titulo
          FROM tipo_tablas tt
          WHERE tt.id_materia_prima = ?
          LIMIT 8
          `,
          [req.params.id]
        );
        if (tipoRows.length > 0) {
          return res.status(409).json({
            code: "REFERENCED_IN_TIPO_TABLAS",
            message:
              `No se puede eliminar: esta tabla tiene tipos derivados asociados (${tipoRows.length}).`,
            tipos: tipoRows.map(r => r.titulo),
            count: tipoRows.length,
          });
        }
      } catch {}
      return res.status(409).json({
        code: "ROW_REFERENCED",
        message: "No se puede eliminar: la tabla está referenciada por otros registros.",
      });
    }

    console.error("❌ Error en deleteTabla:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Listar todas las tabla
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
