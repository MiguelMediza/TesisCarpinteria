import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL || "";
const urlFromKey = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);

const TABLES_PER_PATIN = 1;
const TACOS_PER_PATIN = 3;

const calcCostoPatin = async (conn, id_tipo_tabla, id_tipo_taco) => {
  const [[tabla]] = await conn.query(
    `SELECT precio_unidad FROM tipo_tablas WHERE id_tipo_tabla = ?`,
    [id_tipo_tabla]
  );
  const [[taco]] = await conn.query(
    `SELECT precio_unidad FROM tipo_tacos WHERE id_tipo_taco = ?`,
    [id_tipo_taco]
  );
  const precioTabla = Number(tabla?.precio_unidad || 0);
  const precioTaco  = Number(taco?.precio_unidad  || 0);
  const costo = precioTabla * TABLES_PER_PATIN + precioTaco * TACOS_PER_PATIN;
  return Number(costo.toFixed(2));
};


export const createTipoPatin = async (req, res) => {
  const connection = await pool.getConnection();
  const uploadedLogoKey = req.fileR2?.key || null;

  try {
    const { id_tipo_tabla, id_tipo_taco, titulo, medidas, comentarios, stock } = req.body;

    const cantidad = parseInt(stock, 10);
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      return res.status(400).json({ error: "Stock inválido" });
    }

    await connection.beginTransaction();

    const [[tabla]] = await connection.query(
      `SELECT stock FROM tipo_tablas WHERE id_tipo_tabla = ? FOR UPDATE`,
      [id_tipo_tabla]
    );
    if (!tabla) {
      await connection.rollback();
      return res.status(404).json("Tipo de tabla padre no encontrado!");
    }

    const [[taco]] = await connection.query(
      `SELECT stock FROM tipo_tacos WHERE id_tipo_taco = ? FOR UPDATE`,
      [id_tipo_taco]
    );
    if (!taco) {
      await connection.rollback();
      return res.status(404).json("Tipo de taco padre no encontrado!");
    }

    const tablasNecesarias = cantidad * TABLES_PER_PATIN;
    const tacosNecesarios  = cantidad * TACOS_PER_PATIN;

    if (tabla.stock < tablasNecesarias) {
      await connection.rollback();
      return res.status(400).json("Stock insuficiente de tablas");
    }
    if (taco.stock < tacosNecesarios) {
      await connection.rollback();
      return res.status(400).json("Stock insuficiente de tacos");
    }

    const costoCalculado = await calcCostoPatin(connection, id_tipo_tabla, id_tipo_taco);

    const [ins] = await connection.query(
      `INSERT INTO tipo_patines 
        (id_tipo_tabla, id_tipo_taco, titulo, medidas, logo, precio_unidad, comentarios, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_tipo_tabla,
        id_tipo_taco,
        titulo,
        medidas || "",
        uploadedLogoKey || null,
        costoCalculado,
        comentarios || "",
        cantidad
      ]
    );

    if (ins.affectedRows !== 1) {
      throw new Error("No se pudo crear el tipo de patín");
    }

    await connection.query(
      `UPDATE tipo_tablas SET stock = stock - ? WHERE id_tipo_tabla = ?`,
      [tablasNecesarias, id_tipo_tabla]
    );
    await connection.query(
      `UPDATE tipo_tacos SET stock = stock - ? WHERE id_tipo_taco = ?`,
      [tacosNecesarios, id_tipo_taco]
    );

    await connection.commit();

    return res.status(201).json({
      id_tipo_patin: ins.insertId,
      message: "Tipo de patín creado exitosamente!",
      logo_key: uploadedLogoKey,
      logo_url: urlFromKey(uploadedLogoKey),
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    if (uploadedLogoKey) {
      try { await r2Delete(uploadedLogoKey); } catch {}
    }
    return res.status(400).json({ error: err.message || "Error al crear tipo de patín" });
  } finally {
    connection.release();
  }
};


export const updateTipoPatin = async (req, res) => {
  const connection = await pool.getConnection();
  const newLogoKey = req.fileR2?.key || null; 

  try {
    const { id } = req.params;
    const { id_tipo_tabla, id_tipo_taco, titulo, medidas, comentarios, stock } = req.body;

    const newCantidad = parseInt(stock, 10);
    if (!Number.isInteger(newCantidad) || newCantidad < 0) {
      return res.status(400).json({ error: "Stock inválido" });
    }

    await connection.beginTransaction();

    const [[old]] = await connection.query(
      `SELECT id_tipo_tabla, id_tipo_taco, stock, logo 
       FROM tipo_patines WHERE id_tipo_patin = ? FOR UPDATE`,
      [id]
    );
    if (!old) {
      await connection.rollback();
      return res.status(404).json("Tipo de patín no encontrado!");
    }

    const [[tabla]] = await connection.query(
      `SELECT stock FROM tipo_tablas WHERE id_tipo_tabla = ? FOR UPDATE`,
      [id_tipo_tabla]
    );
    if (!tabla) {
      await connection.rollback();
      return res.status(404).json("Tipo de tabla padre no encontrado!");
    }

    const [[taco]] = await connection.query(
      `SELECT stock FROM tipo_tacos WHERE id_tipo_taco = ? FOR UPDATE`,
      [id_tipo_taco]
    );
    if (!taco) {
      await connection.rollback();
      return res.status(404).json("Tipo de taco padre no encontrado!");
    }


    const delta = newCantidad - old.stock;
    const tablasNecesarias = delta * TABLES_PER_PATIN;
    const tacosNecesarios  = delta * TACOS_PER_PATIN;

    if (delta > 0) {
      if (tabla.stock < tablasNecesarias) {
        await connection.rollback();
        return res.status(400).json("Stock insuficiente de tablas");
      }
      if (taco.stock < tacosNecesarios) {
        await connection.rollback();
        return res.status(400).json("Stock insuficiente de tacos");
      }
    }


    if (tablasNecesarias !== 0) {
      await connection.query(
        `UPDATE tipo_tablas SET stock = stock - ? WHERE id_tipo_tabla = ?`,
        [tablasNecesarias, id_tipo_tabla]
      );
    }
    if (tacosNecesarios !== 0) {
      await connection.query(
        `UPDATE tipo_tacos SET stock = stock - ? WHERE id_tipo_taco = ?`,
        [tacosNecesarios, id_tipo_taco]
      );
    }

    const costoCalculado = await calcCostoPatin(connection, id_tipo_tabla, id_tipo_taco);

    await connection.query(
      `UPDATE tipo_patines SET 
         id_tipo_tabla = ?, 
         id_tipo_taco  = ?, 
         titulo        = ?, 
         medidas       = ?, 
         logo          = COALESCE(?, logo), 
         precio_unidad = ?, 
         comentarios   = ?, 
         stock         = ?
       WHERE id_tipo_patin = ?`,
      [
        id_tipo_tabla,
        id_tipo_taco,
        titulo,
        medidas || "",
        newLogoKey,                
        costoCalculado,
        comentarios || "",
        newCantidad,
        id
      ]
    );

    await connection.commit();

    if (newLogoKey && old.logo && newLogoKey !== old.logo) {
      try { await r2Delete(old.logo); } catch {}
    }

    return res.status(200).json({
      message: "Tipo de patín actualizado exitosamente!",
      logo_key: newLogoKey || old.logo || null,
      logo_url: urlFromKey(newLogoKey || old.logo),
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    if (newLogoKey) {
      try { await r2Delete(newLogoKey); } catch {}
    }
    return res.status(400).json({ error: err.message || "Error al actualizar tipo de patín" });
  } finally {
    connection.release();
  }
};


export const getTipoPatinById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT p.*, tt.titulo AS tabla_padre, tc.titulo AS taco_padre
       FROM tipo_patines AS p
       JOIN tipo_tablas AS tt ON p.id_tipo_tabla = tt.id_tipo_tabla
       JOIN tipo_tacos  AS tc ON p.id_tipo_taco  = tc.id_tipo_taco
       WHERE p.id_tipo_patin = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json("Tipo de patín no encontrado!");
    const row = rows[0];
    return res.status(200).json({ ...row, logo_url: urlFromKey(row.logo) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteTipoPatin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [[row]] = await connection.query(
      `SELECT logo FROM tipo_patines WHERE id_tipo_patin = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ message: "Tipo de patín no encontrado!" });
    const logoKey = row.logo || null;

    const [refsProt] = await connection.query(
      `
      SELECT
        pp.id_prototipo,
        COALESCE(NULLIF(TRIM(pp.titulo), ''), CONCAT('Prototipo #', pp.id_prototipo)) AS titulo
      FROM prototipo_pallet pp
      WHERE pp.id_tipo_patin = ?
      LIMIT 12
      `,
      [id]
    );

    if (refsProt.length) {
      return res.status(409).json({
        code: "ROW_REFERENCED",
        message: "No se puede eliminar: el patín está referenciado por otros registros.",
        prototipos: refsProt.map(r => r.titulo),
        count: refsProt.length,
      });
    }

    await connection.beginTransaction();
    const [del] = await connection.query(
      `DELETE FROM tipo_patines WHERE id_tipo_patin = ?`,
      [id]
    );
    if (del.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Tipo de patín no encontrado!" });
    }
    await connection.commit();

    if (logoKey) {
      try { await r2Delete(logoKey); } catch (e) { console.warn("R2 delete:", e?.message); }
    }

    return res.status(200).json({ message: "Tipo de patín eliminado exitosamente!" });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    if (err?.errno === 1451 || err?.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        code: "ROW_REFERENCED",
        message: "No se puede eliminar: el patín está referenciado por otros registros.",
      });
    }
    console.error("❌ Error en deleteTipoPatin:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

export const listTipoPatines = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, tt.titulo AS tabla_padre, tc.titulo AS taco_padre
       FROM tipo_patines AS p
       JOIN tipo_tablas AS tt ON p.id_tipo_tabla = tt.id_tipo_tabla
       JOIN tipo_tacos  AS tc ON p.id_tipo_taco = tc.id_tipo_taco
       ORDER BY p.titulo ASC`
    );
    return res.status(200).json(rows.map(r => ({ ...r, logo_url: urlFromKey(r.logo) })));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const listTipoPatinesSelect = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id_tipo_patin,
        COALESCE(titulo, CONCAT('Patín #', id_tipo_patin)) AS titulo,
        medidas
      FROM tipo_patines
      ORDER BY COALESCE(titulo, '') ASC, id_tipo_patin ASC
    `);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};