// controllers/ventafuegoya.js
import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const PAGO_ESTADOS = new Set(["credito", "pago"]);
const isValidPagoEstado = (v) => !v || PAGO_ESTADOS.has(v);


const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const urlFromKey = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);

// Normaliza "YYYY-MM-DDTHH:MM" o "YYYY-MM-DD HH:MM" a "YYYY-MM-DD HH:MM:SS" (o null)
const toMySQLDateTime = (s) => {
  if (s == null) return null;
  const raw = String(s).trim();
  if (!raw) return null;
  let t = raw.replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(t)) t += ":00";
  const d = new Date(t.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return t.slice(0, 19);
};

/* ========================= CREATE ============================== */
export const createVentaFuegoya = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      fecha_realizada,
      precio_total,
      id_cliente,       
      id_fuego_ya,
      cantidadbolsas,
      comentarios,
      estadopago,
      fechapago,
    } = req.body;

    const fotoKey = req.fileR2?.key || null;

    // Validaciones
    if (!fecha_realizada) {
      return res.status(400).json({ error: "La fecha de la venta es obligatoria." });
    }
    if (precio_total != null && isNaN(parseFloat(precio_total))) {
      return res.status(400).json({ error: "El precio total debe ser numérico si se envía." });
    }
    if (!id_fuego_ya) {
      return res.status(400).json({ error: "id_fuego_ya es obligatorio." });
    }
    if (!isValidPagoEstado(estadopago)) {
      return res.status(400).json({ error: "estadopago inválido. Use 'credito' o 'pago'." });
    }
    if (cantidadbolsas == null) {
      return res.status(400).json({ error: "cantidadbolsas es obligatorio." });
    }
    const cb = parseInt(cantidadbolsas, 10);
    if (!Number.isInteger(cb) || cb < 0) {
      return res.status(400).json({ error: "cantidadbolsas debe ser un entero >= 0." });
    }

    if (id_cliente) {
      const [cli] = await pool.query(
        `SELECT id_cliente FROM clientes_fuegoya WHERE id_cliente = ?`,
        [id_cliente]
      );
      if (cli.length === 0) {
        return res.status(400).json({ error: "El cliente (FuegoYa) seleccionado no existe." });
      }
    }

    await conn.beginTransaction();

    const [[fy]] = await conn.query(
      `SELECT id_fuego_ya, stock FROM fuego_ya WHERE id_fuego_ya = ? FOR UPDATE`,
      [id_fuego_ya]
    );
    if (!fy) {
      await conn.rollback();
      return res.status(400).json({ error: "El registro de fuego_ya no existe." });
    }
    if ((fy.stock ?? 0) < cb) {
      await conn.rollback();
      return res.status(400).json({ error: "Stock insuficiente de Fuego Ya." });
    }

    const fechapagoSQL = toMySQLDateTime(fechapago);

    // Insert venta
    const [ins] = await conn.query(
      `
      INSERT INTO venta_fuegoya
        (fecha_realizada, precio_total, id_cliente, id_fuego_ya, cantidadbolsas, foto, comentarios, estadopago, fechapago)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        fecha_realizada,
        precio_total != null ? parseFloat(precio_total) : null,
        id_cliente || null,
        parseInt(id_fuego_ya, 10),
        cb,
        fotoKey,                
        comentarios || null,
        estadopago || null,
        fechapagoSQL,
      ]
    );

    await conn.query(
      `UPDATE fuego_ya SET stock = stock - ? WHERE id_fuego_ya = ?`,
      [cb, id_fuego_ya]
    );

    await conn.commit();

    return res.status(201).json({
      id_ventaFuegoya: ins.insertId,
      message: "Venta Fuegoya creada exitosamente!",
      foto_key: fotoKey,
      foto_url: urlFromKey(fotoKey),
    });
  } catch (err) {
    await conn.rollback();
    console.error("❌ createVentaFuegoya:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  } finally {
    conn.release();
  }
};

/* ======================== GET BY ID ============================ */
export const getVentaFuegoyaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        v.*,
        cf.nombre        AS cf_nombre,
        cf.estado        AS cf_activo,
        fy.tipo          AS fuego_ya_tipo
      FROM venta_fuegoya v
      LEFT JOIN clientes_fuegoya cf ON cf.id_cliente = v.id_cliente
      LEFT JOIN fuego_ya        fy ON fy.id_fuego_ya = v.id_fuego_ya
      WHERE v.id_ventaFuegoya = ?
      `,
      [id]
    );

    if (rows.length === 0) return res.status(404).json("Venta Fuegoya no encontrada!");

    const r = rows[0];
    const cliente_display = r?.cf_nombre || (r.id_cliente ? `Cliente #${r.id_cliente}` : "Sin cliente");

    return res.status(200).json({
      ...r,
      foto_url: urlFromKey(r.foto),
      cliente_display,
    });
  } catch (err) {
    console.error("❌ getVentaFuegoyaById:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

/* =========================== UPDATE ============================ */
export const updateVentaFuegoya = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      fecha_realizada,
      precio_total,
      id_cliente,      
      id_fuego_ya,     
      cantidadbolsas,  
      comentarios,
      estadopago,
      fechapago,
      borrar_foto      
    } = req.body;

    const newFotoKey = req.fileR2?.key || null;

    await conn.beginTransaction();

    
    const [[curr]] = await conn.query(
      `SELECT id_fuego_ya, cantidadbolsas, foto FROM venta_fuegoya WHERE id_ventaFuegoya = ? FOR UPDATE`,
      [id]
    );
    if (!curr) {
      await conn.rollback();
      return res.status(404).json("Venta Fuegoya no encontrada!");
    }
    const oldFY = curr.id_fuego_ya;
    const oldCB = parseInt(curr.cantidadbolsas, 10) || 0;
    const oldFotoKey = curr.foto || null;

    
    if (precio_total != null && isNaN(parseFloat(precio_total))) {
      await conn.rollback();
      return res.status(400).json({ error: "precio_total debe ser numérico si se envía." });
    }
    if (estadopago != null && !isValidPagoEstado(estadopago)) {
      await conn.rollback();
      return res.status(400).json({ error: "estadopago inválido. Use 'credito' o 'pago'." });
    }
    if (cantidadbolsas != null) {
      const cb = parseInt(cantidadbolsas, 10);
      if (!Number.isInteger(cb) || cb < 0) {
        await conn.rollback();
        return res.status(400).json({ error: "cantidadbolsas debe ser un entero >= 0." });
      }
    }
    if (id_cliente) {
      const [[cli]] = await conn.query(
        `SELECT id_cliente FROM clientes_fuegoya WHERE id_cliente = ?`,
        [id_cliente]
      );
      if (!cli) {
        await conn.rollback();
        return res.status(400).json({ error: "El cliente (FuegoYa) especificado no existe." });
      }
    }

    
    const newFY = (id_fuego_ya !== undefined && id_fuego_ya !== null) ? parseInt(id_fuego_ya, 10) : oldFY;
    const newCB = (cantidadbolsas !== undefined && cantidadbolsas !== null) ? parseInt(cantidadbolsas, 10) : oldCB;

    
    if (newFY !== oldFY) {
      const [[fyOld]] = await conn.query(
        `SELECT id_fuego_ya, stock FROM fuego_ya WHERE id_fuego_ya = ? FOR UPDATE`,
        [oldFY]
      );
      const [[fyNew]] = await conn.query(
        `SELECT id_fuego_ya, stock FROM fuego_ya WHERE id_fuego_ya = ? FOR UPDATE`,
        [newFY]
      );
      if (!fyNew) {
        await conn.rollback();
        return res.status(400).json({ error: "El nuevo fuego_ya especificado no existe." });
      }
      
      if (oldCB > 0) {
        await conn.query(`UPDATE fuego_ya SET stock = stock + ? WHERE id_fuego_ya = ?`, [oldCB, oldFY]);
      }
      
      if ((fyNew.stock ?? 0) < newCB) {
        await conn.rollback();
        return res.status(400).json({ error: "Stock insuficiente en el nuevo Fuego Ya." });
      }
      await conn.query(`UPDATE fuego_ya SET stock = stock - ? WHERE id_fuego_ya = ?`, [newCB, newFY]);
    } else if (newCB !== oldCB) {
      const delta = newCB - oldCB;
      if (delta !== 0) {
        const [[fy]] = await conn.query(
          `SELECT id_fuego_ya, stock FROM fuego_ya WHERE id_fuego_ya = ? FOR UPDATE`,
          [oldFY]
        );
        if (delta > 0) {
          if ((fy.stock ?? 0) < delta) {
            await conn.rollback();
            return res.status(400).json({ error: "Stock insuficiente de Fuego Ya." });
          }
          await conn.query(`UPDATE fuego_ya SET stock = stock - ? WHERE id_fuego_ya = ?`, [delta, oldFY]);
        } else {
          await conn.query(`UPDATE fuego_ya SET stock = stock + ? WHERE id_fuego_ya = ?`, [-delta, oldFY]);
        }
      }
    }

    const sets = [];
    const vals = [];

    if (fecha_realizada !== undefined) { sets.push("fecha_realizada = ?"); vals.push(fecha_realizada || null); }
    if (precio_total !== undefined)    { sets.push("precio_total = ?");    vals.push(precio_total != null ? parseFloat(precio_total) : null); }
    if (id_cliente !== undefined)      { sets.push("id_cliente = ?");      vals.push(id_cliente || null); }
    if (id_fuego_ya !== undefined)     { sets.push("id_fuego_ya = ?");     vals.push(newFY); }
    if (cantidadbolsas !== undefined)  { sets.push("cantidadbolsas = ?");  vals.push(newCB); }
    if (comentarios !== undefined)     { sets.push("comentarios = ?");     vals.push(comentarios || null); }
    if (estadopago !== undefined)      { sets.push("estadopago = ?");      vals.push(estadopago || null); }
    if (fechapago !== undefined)       { sets.push("fechapago = ?");       vals.push(toMySQLDateTime(fechapago)); }

    const wantDeletePhoto = String(borrar_foto || "") === "1";
    if (newFotoKey !== null) {
      sets.push("foto = COALESCE(?, foto)");
      vals.push(newFotoKey);
    } else if (wantDeletePhoto) {
      sets.push("foto = NULL");
    }

    if (sets.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: "No hay campos para actualizar." });
    }

    await conn.query(
      `UPDATE venta_fuegoya SET ${sets.join(", ")} WHERE id_ventaFuegoya = ?`,
      [...vals, id]
    );

    await conn.commit();

    if ((newFotoKey && oldFotoKey && newFotoKey !== oldFotoKey) || (wantDeletePhoto && oldFotoKey)) {
      try { await r2Delete(oldFotoKey); } catch {}
    }

    const finalKey = wantDeletePhoto ? null : (newFotoKey || oldFotoKey || null);
    return res.status(200).json({
      message: "Venta Fuegoya actualizada correctamente!",
      foto_key: finalKey,
      foto_url: urlFromKey(finalKey),
    });
  } catch (err) {
    await conn.rollback();
    console.error("❌ updateVentaFuegoya:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  } finally {
    conn.release();
  }
};

/* ============================ DELETE =========================== */
export const deleteVentaFuegoya = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT id_fuego_ya, cantidadbolsas, foto FROM venta_fuegoya WHERE id_ventaFuegoya = ? FOR UPDATE`,
      [id]
    );
    if (!row) {
      await conn.rollback();
      return res.status(404).json("Venta Fuegoya no encontrada!");
    }
    const addBack = parseInt(row.cantidadbolsas, 10) || 0;

    if (row.id_fuego_ya && addBack > 0) {
      await conn.query(
        `UPDATE fuego_ya SET stock = stock + ? WHERE id_fuego_ya = ?`,
        [addBack, row.id_fuego_ya]
      );
    }

    await conn.query(`DELETE FROM venta_fuegoya WHERE id_ventaFuegoya = ?`, [id]);
    await conn.commit();

    if (row.foto) {
      try { await r2Delete(row.foto); } catch {}
    }

    return res.status(200).json("Venta Fuegoya eliminada correctamente!");
  } catch (err) {
    await conn.rollback();
    console.error("❌ deleteVentaFuegoya:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  } finally {
    conn.release();
  }
};

/* ============================= LIST ============================ */
export const listVentaFuegoya = async (req, res) => {
  try {
    const { desde, hasta, cliente, estadopago } = req.query;

    const where = [];
    const params = [];

    if (desde) { where.push("v.fecha_realizada >= ?"); params.push(desde); }
    if (hasta) { where.push("v.fecha_realizada <= ?"); params.push(hasta); }
    if (estadopago && isValidPagoEstado(estadopago)) {
      where.push("v.estadopago = ?"); params.push(estadopago);
    }
    if (cliente && cliente.trim()) {
      const like = `%${cliente.trim()}%`;
      where.push("(cf.nombre LIKE ?)");
      params.push(like);
    }

    const sql = `
      SELECT
        v.*,
        cf.nombre  AS cf_nombre,
        cf.estado  AS cf_activo,
        fy.tipo    AS fuego_ya_tipo
      FROM venta_fuegoya v
      LEFT JOIN clientes_fuegoya cf ON cf.id_cliente = v.id_cliente
      LEFT JOIN fuego_ya        fy ON fy.id_fuego_ya = v.id_fuego_ya
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY v.fecha_realizada DESC, v.id_ventaFuegoya DESC
    `;

    const [rows] = await pool.query(sql, params);

    const mapped = rows.map((r) => {
      const display = r?.cf_nombre || (r.id_cliente ? `Cliente #${r.id_cliente}` : "Sin cliente");
      const cliente_eliminado = r?.id_cliente
        ? (r?.cf_activo === 0 || r?.cf_activo === false)
        : true;

      return {
        ...r,
        foto_url: urlFromKey(r.foto),
        cliente_display: display,
        cliente_eliminado,
      };
    });

    return res.status(200).json(mapped);
  } catch (err) {
    console.error("❌ listVentaFuegoya:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

/* =========== CHANGE ESTADO PAGO  =========== */
export const changeEstadoPagoVentaFuegoya = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;        
    const { estadopago } = req.body;  

    if (!isValidPagoEstado(estadopago)) {
      conn.release();
      return res.status(400).json("estadopago inválido. Use 'credito' o 'pago'.");
    }

    const [[ex]] = await conn.query(
      `SELECT 1 FROM venta_fuegoya WHERE id_ventaFuegoya = ?`,
      [id]
    );
    if (!ex) {
      conn.release();
      return res.status(404).json("Venta Fuegoya no encontrada.");
    }

    await conn.beginTransaction();

    if (estadopago === "pago") {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      await conn.query(
        `UPDATE venta_fuegoya
           SET estadopago = ?, fechapago = ?
         WHERE id_ventaFuegoya = ?`,
        [estadopago, now, id]
      );
    } else {
      await conn.query(
        `UPDATE venta_fuegoya
           SET estadopago = ?, fechapago = NULL
         WHERE id_ventaFuegoya = ?`,
        [estadopago, id]
      );
    }

    await conn.commit();
    return res.status(200).json("Estado de pago actualizado.");
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("❌ Error en changeEstadoPagoVentaFuegoya:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    conn.release();
  }
};
