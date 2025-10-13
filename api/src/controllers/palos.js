import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const urlFor = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);

export const createPalo = async (req, res) => {
  try {
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      largo_cm,
      diametro_mm,
      tipo_madera,
    } = req.body;

    const fotoKey = req.fileR2?.key || null;

    const insertMP = `
      INSERT INTO materiaprima
        (categoria, titulo, precio_unidad, stock, foto, comentarios)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [mpResult] = await pool.query(insertMP, [
      "palo",
      titulo,
      parseFloat(precio_unidad),
      parseInt(stock, 10),
      fotoKey,
      comentarios || null,
    ]);

    const id_materia_prima = mpResult.insertId;

    const insertPalo = `
      INSERT INTO palos
        (id_materia_prima, largo_cm, diametro_mm, tipo_madera)
      VALUES (?, ?, ?, ?)
    `;
    await pool.query(insertPalo, [
      id_materia_prima,
      parseFloat(largo_cm),
      parseFloat(diametro_mm),
      tipo_madera,
    ]);

    return res.status(201).json({
      id_materia_prima,
      message: "Palo creado exitosamente!",
    });
  } catch (err) {
    console.error("❌ Error en createPalo:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

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
    if (rows.length === 0) return res.status(404).json("Palo no encontrado!");

    const row = rows[0];
    return res.status(200).json({
      ...row,
      foto_url: urlFor(row.foto),
    });
  } catch (err) {
    console.error("❌ Error en getPaloById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

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
      tipo_madera,
    } = req.body;

    const [exists] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json("Palo no encontrado!");
    }
    const oldFotoKey = exists[0].foto;
    const newFotoKey = req.fileR2?.key || null;

    await connection.beginTransaction();

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
      newFotoKey,
      id,
    ]);

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
      id,
    ]);

    await connection.commit();

    if (newFotoKey && oldFotoKey) {
      try {
        await r2Delete(oldFotoKey);
      } catch (e) {
        console.warn("No se pudo borrar la imagen antigua en R2:", oldFotoKey, e?.message);
      }
    }

    return res.status(200).json("Palo modificado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updatePalo:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

export const deletePalo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [[mpRow]] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (!mpRow) {
      return res.status(404).json({ message: "Tirante no encontrado!" });
    }
    const fotoKey = mpRow.foto || null;

    const [tipoRows] = await connection.query(
      `
      SELECT
        tt.id_tipo_taco,
        COALESCE(NULLIF(TRIM(tt.titulo), ''), CONCAT('Tipo #', tt.id_tipo_taco)) AS titulo
      FROM tipo_tacos tt
      WHERE tt.id_materia_prima = ?
      LIMIT 8
      `,
      [id]
    );
    if (tipoRows.length > 0) {
      return res.status(409).json({
        code: "REFERENCED_IN_TIPO_TACOS",
        message:
          `No se puede eliminar: este tirante tiene tipos derivados asociados (${tipoRows.length}).`,
        tipos: tipoRows.map(r => r.titulo),
        count: tipoRows.length,
      });
    }

    await connection.beginTransaction();

    const [delChild] = await connection.query(
      "DELETE FROM palos WHERE id_materia_prima = ?",
      [id]
    );
    if (delChild.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Tirante no encontrado!" });
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

    return res.status(200).json({ message: "Tirante eliminado exitosamente!" });
  } catch (err) {
    try { await connection.rollback(); } catch {}

    if (err?.errno === 1451 || err?.code === "ER_ROW_IS_REFERENCED_2") {
      try {
        const [tipoRows] = await pool.query(
          `
          SELECT
            tt.id_tipo_taco,
            COALESCE(NULLIF(TRIM(tt.titulo), ''), CONCAT('Tipo #', tt.id_tipo_taco)) AS titulo
          FROM tipo_tacos tt
          WHERE tt.id_materia_prima = ?
          LIMIT 8
          `,
          [req.params.id]
        );
        if (tipoRows.length > 0) {
          return res.status(409).json({
            code: "REFERENCED_IN_TIPO_TACOS",
            message:
              `No se puede eliminar: este tirante tiene tipos derivados asociados (${tipoRows.length}).`,
            tipos: tipoRows.map(r => r.titulo),
            count: tipoRows.length,
          });
        }
      } catch {}
      return res.status(409).json({
        code: "ROW_REFERENCED",
        message: "No se puede eliminar: el tirante está referenciado por otros registros.",
      });
    }

    console.error("❌ Error en deletePalo:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

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
 
    const data = rows.map((r) => ({
      ...r,
      foto_url: urlFor(r.foto),
    }));

    return res.status(200).json(data);
  } catch (err) {
    console.error("❌ Error en listPalos:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};
