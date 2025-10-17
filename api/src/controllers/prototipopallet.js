import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const parseArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

function buildR2Url(key) {
  if (!key) return null;
  const base = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}/${key}` : null;
}


export const createPrototipo = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      titulo,
      medidas,
      id_tipo_patin,
      cantidad_patines,
      comentarios,
      id_cliente,
      tipo_tablas,
      tipo_tacos,
      clavos,
      fibras,
    } = req.body;

    const fotoKey = req.fileR2?.key || null;

    const arrTablas = parseArray(tipo_tablas);
    const arrTacos  = parseArray(tipo_tacos);
    const arrClavos = parseArray(clavos);
    const arrFibras = parseArray(fibras);

    await conn.beginTransaction();

    const [ins] = await conn.query(
      `INSERT INTO prototipo_pallet
        (titulo, medidas, id_tipo_patin, cantidad_patines, comentarios, foto, id_cliente, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        titulo || null,
        medidas || null,
        id_tipo_patin || null,
        Number.isFinite(+cantidad_patines) ? +cantidad_patines : 0,
        comentarios || null,
        fotoKey, 
        id_cliente || null,
      ]
    );

    const id_prototipo = ins.insertId;

    for (const t of arrTablas) {
      await conn.query(
        `INSERT INTO prototipo_tipo_tablas (id_prototipo, id_tipo_tabla, cantidad_lleva, aclaraciones)
         VALUES (?, ?, ?, ?)`,
        [id_prototipo, t.id_tipo_tabla, parseInt(t.cantidad_lleva, 10), t.aclaraciones || null]
      );
    }
    for (const tt of arrTacos) {
      await conn.query(
        `INSERT INTO prototipo_tipo_tacos (id_prototipo, id_tipo_taco, cantidad_lleva, aclaraciones)
         VALUES (?, ?, ?, ?)`,
        [id_prototipo, tt.id_tipo_taco, parseInt(tt.cantidad_lleva, 10), tt.aclaraciones || null]
      );
    }
    for (const c of arrClavos) {
      await conn.query(
        `INSERT INTO prototipo_clavos (id_prototipo, id_materia_prima, cantidad_lleva, aclaraciones)
         VALUES (?, ?, ?, ?)`,
        [id_prototipo, c.id_materia_prima, parseInt(c.cantidad_lleva, 10), c.aclaraciones || null]
      );
    }
    for (const f of arrFibras) {
      await conn.query(
        `INSERT INTO prototipo_fibras (id_prototipo, id_materia_prima, cantidad_lleva, aclaraciones)
         VALUES (?, ?, ?, ?)`,
        [id_prototipo, f.id_materia_prima, parseInt(f.cantidad_lleva, 10), f.aclaraciones || null]
      );
    }

    await conn.commit();

    return res.status(201).json({
      id_prototipo,
      message: "Prototipo creado con éxito",
    });
  } catch (err) {
    await conn.rollback();
    console.error("❌ createPrototipo:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    conn.release();
  }
};

export const getPrototipoById = async (req, res) => {
  try {
    const { id } = req.params;

    const [p] = await pool.query(
      `SELECT * FROM prototipo_pallet WHERE id_prototipo = ?`,
      [id]
    );
    if (p.length === 0) return res.status(404).json("Prototipo no encontrado");

    const row = p[0];

    const [costos] = await pool.query(
      `SELECT COALESCE(costo_materiales,0) AS costo_materiales
       FROM vw_prototipo_costo_total WHERE id_prototipo = ?`,
      [id]
    );

    const [bom] = await pool.query(
      `SELECT * FROM vw_prototipo_bom_detalle WHERE id_prototipo = ? ORDER BY categoria, titulo`,
      [id]
    );

    const foto_url = buildR2Url(row.foto);
    return res.status(200).json({
      ...row,
      foto: foto_url,
      foto_url,
      costo_materiales: costos[0]?.costo_materiales ?? 0,
      bom_detalle: bom,
    });
  } catch (err) {
    console.error("❌ getPrototipoById:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// ---------- LIST ---------
export const listPrototipos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        pp.id_prototipo,
        pp.titulo,
        pp.medidas,
        pp.id_tipo_patin,
        pp.cantidad_patines,
        pp.foto,               -- KEY en DB
        pp.comentarios,
        pp.id_cliente,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.nombre_empresa AS cliente_empresa,
        COALESCE(v.costo_materiales, 0) AS costo_materiales
      FROM prototipo_pallet pp
      LEFT JOIN clientes c ON c.id_cliente = pp.id_cliente
      LEFT JOIN vw_prototipo_costo_total v ON v.id_prototipo = pp.id_prototipo
      WHERE pp.estado = TRUE
      ORDER BY pp.titulo ASC
      `
    );

    const out = rows.map((r) => {
      const foto_url = buildR2Url(r.foto);
      return {
        ...r,
        foto: foto_url, 
        foto_url,
      };
    });

    return res.status(200).json(out);
  } catch (err) {
    console.error("❌ listPrototipos:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// ---------- UPDATE ----------
export const updatePrototipo = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      titulo,
      medidas,
      id_tipo_patin,
      cantidad_patines,
      comentarios,
      id_cliente,
      tipo_tablas,
      tipo_tacos,
      clavos,
      fibras,
    } = req.body;

    const [exists] = await conn.query(
      `SELECT foto FROM prototipo_pallet WHERE id_prototipo = ?`,
      [id]
    );
    if (exists.length === 0) return res.status(404).json("Prototipo no encontrado");

    const oldKey = exists[0].foto;
    const newKey = req.fileR2?.key || null; 

    const arrTablas = parseArray(tipo_tablas);
    const arrTacos  = parseArray(tipo_tacos);
    const arrClavos = parseArray(clavos);
    const arrFibras = parseArray(fibras);

    await conn.beginTransaction();

    // Cabecera
    await conn.query(
      `UPDATE prototipo_pallet SET
         titulo = ?,
         medidas = ?,
         id_tipo_patin = ?,
         cantidad_patines = ?,
         comentarios = ?,
         foto = COALESCE(?, foto), -- si vino foto nueva, reemplaza KEY
         id_cliente = ?
       WHERE id_prototipo = ?`,
      [
        titulo || null,
        medidas || null,
        id_tipo_patin || null,
        Number.isFinite(+cantidad_patines) ? +cantidad_patines : 0,
        comentarios || null,
        newKey, 
        id_cliente || null,
        id,
      ]
    );

    // Reemplazar detalles
    await conn.query(`DELETE FROM prototipo_tipo_tablas WHERE id_prototipo = ?`, [id]);
    await conn.query(`DELETE FROM prototipo_tipo_tacos  WHERE id_prototipo = ?`, [id]);
    await conn.query(`DELETE FROM prototipo_clavos      WHERE id_prototipo = ?`, [id]);
    await conn.query(`DELETE FROM prototipo_fibras      WHERE id_prototipo = ?`, [id]);

    for (const t of arrTablas) {
      await conn.query(
        `INSERT INTO prototipo_tipo_tablas (id_prototipo, id_tipo_tabla, cantidad_lleva, aclaraciones)
         VALUES (?, ?, ?, ?)`,
        [id, t.id_tipo_tabla, parseInt(t.cantidad_lleva, 10), t.aclaraciones || null]
      );
    }
    for (const tt of arrTacos) {
      await conn.query(
        `INSERT INTO prototipo_tipo_tacos (id_prototipo, id_tipo_taco, cantidad_lleva, aclaraciones)
         VALUES (?, ?, ?, ?)`,
        [id, tt.id_tipo_taco, parseInt(tt.cantidad_lleva, 10), tt.aclaraciones || null]
      );
    }
    for (const c of arrClavos) {
      await conn.query(
        `INSERT INTO prototipo_clavos (id_prototipo, id_materia_prima, cantidad_lleva, aclaraciones)
         VALUES (?, ?, ?, ?)`,
        [id, c.id_materia_prima, parseInt(c.cantidad_lleva, 10), c.aclaraciones || null]
      );
    }
    for (const f of arrFibras) {
      await conn.query(
        `INSERT INTO prototipo_fibras (id_prototipo, id_materia_prima, cantidad_lleva, aclaraciones)
         VALUES (?, ?, ?, ?)`,
        [id, f.id_materia_prima, parseInt(f.cantidad_lleva, 10), f.aclaraciones || null]
      );
    }

    await conn.commit();

    if (newKey && oldKey && newKey !== oldKey) {
      try {
        await r2Delete(oldKey);
      } catch (e) {
        console.warn("No se pudo borrar la imagen anterior en R2:", oldKey, e?.message);
      }
    }

    return res.status(200).json("Prototipo actualizado exitosamente!");
  } catch (err) {
    await conn.rollback();
    console.error("❌ updatePrototipo:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    conn.release();
  }
};

// ---------- DELETE (BORRADO LÓGICO) ----------
export const deletePrototipo = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    
    const [rows] = await conn.query(
      `SELECT id_prototipo, estado FROM prototipo_pallet WHERE id_prototipo = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json("Prototipo no encontrado!");

    const wasActive = !!rows[0].estado;

    await conn.beginTransaction();


    await conn.query(
      `UPDATE prototipo_pallet SET estado = FALSE WHERE id_prototipo = ?`,
      [id]
    );

    await conn.commit();

    return res.status(200).json({
      message: wasActive
        ? "Prototipo desactivado exitosamente."
        : "El prototipo ya estaba desactivado.",
    });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error("❌ deletePrototipo:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    conn.release();
  }
};
