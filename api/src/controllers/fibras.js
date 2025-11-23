import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const urlFromKey = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);

export const createFibra = async (req, res) => {
  try {
    const { titulo, stock, comentarios, ancho_cm, largo_cm } = req.body;
    const fotoKey = req.fileR2?.key || null;

    const toIntOrZero = (v) => (v !== undefined && v !== "" ? parseInt(v, 10) : 0);
    const toFloatOrNull = (v) => (v !== undefined && v !== "" ? parseFloat(v) : null);

    // SIN precio_unidad
    const insertMP = `
      INSERT INTO materiaprima
        (categoria, titulo, stock, foto, comentarios)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [mpResult] = await pool.query(insertMP, [
      "fibra",
      titulo || null,
      toIntOrZero(stock),
      fotoKey,
      comentarios || null,
    ]);
    const id_materia_prima = mpResult.insertId;

    const insertFibra = `
      INSERT INTO fibras
        (id_materia_prima, ancho_cm, largo_cm)
      VALUES (?, ?, ?)
    `;
    await pool.query(insertFibra, [
      id_materia_prima,
      toFloatOrNull(ancho_cm),
      toFloatOrNull(largo_cm),
    ]);

    return res.status(201).json({
      id_materia_prima,
      message: "Fibra creada exitosamente!",
      foto_key: fotoKey,
      foto_url: urlFromKey(fotoKey),
    });
  } catch (err) {
    console.error("❌ Error en createFibra:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};


export const getFibraById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.categoria,
        mp.titulo,
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

    if (rows.length === 0) return res.status(404).json("Fibra no encontrada!");

    const row = rows[0];
    return res.status(200).json({ ...row, foto_url: urlFromKey(row.foto) });
  } catch (err) {
    console.error("❌ Error en getFibraById:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const updateFibra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { titulo, stock, comentarios, ancho_cm, largo_cm, foto_remove } = req.body;

    const newFotoKey = req.fileR2?.key || null;

    // verificar existencia y foto previa
    const [exists] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json("Fibra no encontrada!");
    }
    const oldFotoKey = exists[0].foto || null;

    await connection.beginTransaction();

    // construir SET dinámico (sin precio_unidad)
    const setParts = ["titulo = ?", "stock = ?", "comentarios = ?"];
    const setVals = [
      titulo,
      stock != null ? parseInt(stock, 10) : null,
      comentarios || null,
    ];

    if (newFotoKey) {
      setParts.push("foto = ?");
      setVals.push(newFotoKey);
    } else if (String(foto_remove) === "1") {
      setParts.push("foto = NULL");
    }

    const updateMP = `
      UPDATE materiaprima
         SET ${setParts.join(", ")}
       WHERE id_materia_prima = ?
    `;
    setVals.push(id);
    await connection.query(updateMP, setVals);

    const updateF = `
      UPDATE fibras
         SET ancho_cm = ?, largo_cm = ?
       WHERE id_materia_prima = ?
    `;
    await connection.query(updateF, [
      ancho_cm != null ? parseFloat(ancho_cm) : null,
      largo_cm != null ? parseFloat(largo_cm) : null,
      id,
    ]);

    await connection.commit();

    // borrar imagen vieja si corresponde
    const mustDeleteOld =
      (newFotoKey && oldFotoKey && newFotoKey !== oldFotoKey) ||
      (!newFotoKey && String(foto_remove) === "1" && oldFotoKey);

    if (mustDeleteOld) {
      try { await r2Delete(oldFotoKey); }
      catch (e) { console.warn("No se pudo borrar la imagen antigua en R2:", oldFotoKey, e?.message); }
    }

    const currentKey = newFotoKey ? newFotoKey : String(foto_remove) === "1" ? null : oldFotoKey;
    return res.status(200).json({
      message: "Fibra modificada exitosamente!",
      foto_key: currentKey,
      foto_url: urlFromKey(currentKey),
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.error("❌ Error en updateFibra:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};


export const deleteFibra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [rows] = await connection.query(
      "SELECT foto FROM materiaprima WHERE id_materia_prima = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Fibra no encontrada!");
    }
    const fotoKey = rows[0].foto || null;

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

    if (fotoKey) {
      try { await r2Delete(fotoKey); }
      catch (e) { console.warn("No se pudo borrar la imagen en R2:", fotoKey, e?.message); }
    }

    return res.status(200).json("Fibra eliminada exitosamente!");
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.error("❌ Error en deleteFibra:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};


export const listFibras = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.categoria,
        mp.titulo,
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

    const data = rows.map((r) => ({ ...r, foto_url: urlFromKey(r.foto) }));
    return res.status(200).json(data);
  } catch (err) {
    console.error("❌ Error en listFibras:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
