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


async function getPendienteVenta(conn, idVenta) {
  const [rows] = await conn.query(
    `
    SELECT v.id_ventaFuegoya,
           v.precio_total - COALESCE(SUM(a.monto),0) AS pendiente
      FROM venta_fuegoya v
 LEFT JOIN fuegoya_pago_aplicaciones a
        ON a.id_ventaFuegoya = v.id_ventaFuegoya
     WHERE v.id_ventaFuegoya = ?
  GROUP BY v.id_ventaFuegoya, v.precio_total
       FOR UPDATE
    `,
    [idVenta]
  );
  if (!rows.length) return null;
  return Math.max(0, Number(rows[0].pendiente || 0));
}

async function getPagosConSaldo(conn, idCliente) {
  const [rows] = await conn.query(
    `
    SELECT p.id_pago,
           p.fecha_hora,
           (p.monto - COALESCE(SUM(a.monto),0)) AS restante
      FROM fuegoya_pagos p
 LEFT JOIN fuegoya_pago_aplicaciones a
        ON a.id_pago = p.id_pago
     WHERE p.id_cliente = ?
  GROUP BY p.id_pago, p.fecha_hora, p.monto
    HAVING restante > 0
  ORDER BY p.fecha_hora ASC, p.id_pago ASC
       FOR UPDATE
    `,
    [idCliente]
  );
  return rows.map((r) => ({
    id_pago: r.id_pago,
    restante: Math.max(0, Number(r.restante || 0)),
  }));
}


async function autoAplicarSaldoAFavor(conn, idCliente, idVenta) {
  let aplicadoTotal = 0;

  let pendiente = await getPendienteVenta(conn, idVenta);
  if (pendiente == null || pendiente <= 0) {
    return { aplicado: 0, pendiente_final: pendiente ?? 0 };
  }

  const pagos = await getPagosConSaldo(conn, idCliente);

  for (const p of pagos) {
    if (pendiente <= 0) break;
    if (p.restante <= 0) continue;

    const aplicar = Math.min(pendiente, p.restante);

    await conn.query(
      `INSERT INTO fuegoya_pago_aplicaciones (id_pago, id_ventaFuegoya, monto) VALUES (?,?,?)`,
      [p.id_pago, idVenta, aplicar]
    );

    aplicadoTotal += aplicar;
    pendiente -= aplicar;
  }

  if (pendiente <= 0) {
    await conn.query(
      `UPDATE venta_fuegoya SET estadopago='pago', fechapago=NOW() WHERE id_ventaFuegoya=?`,
      [idVenta]
    );
  } else {
    await conn.query(
      `UPDATE venta_fuegoya SET estadopago='credito', fechapago=NULL WHERE id_ventaFuegoya=?`,
      [idVenta]
    );
  }

  return { aplicado: aplicadoTotal, pendiente_final: pendiente };
}

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

    if (!fecha_realizada) {
      return res.status(400).json({ error: "La fecha de la venta es obligatoria." });
    }
    if (precio_total != null && isNaN(parseFloat(precio_total))) {
      return res.status(400).json({ error: "El precio total debe ser numérico si se envía." });
    }
    if (!id_fuego_ya) {
      return res.status(400).json({ error: "Debe seleccionar un Fuego Ya" });
    }
    if (!id_cliente) {
      return res.status(400).json("Debe seleccionar un cliente FuegoYa.");
    }
    if (!isValidPagoEstado(estadopago)) {
      return res.status(400).json({ error: "Estado pago inválido. Use 'credito' o 'pago'." });
    }
    if (cantidadbolsas == null) {
      return res.status(400).json({ error: "Cantidad de bolsas es obligatorio." });
    }
    const cb = parseInt(cantidadbolsas, 10);
    if (!Number.isInteger(cb) || cb < 0) {
      return res.status(400).json({ error: "La cantidad de bolsas debe ser un entero >= 0." });
    }

    const [cli] = await pool.query(
      `SELECT id_cliente FROM clientes_fuegoya WHERE id_cliente = ?`,
      [id_cliente]
    );
    if (cli.length === 0) {
      return res.status(400).json({ error: "El cliente (FuegoYa) seleccionado no existe." });
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
    const idVenta = ins.insertId;

    await conn.query(
      `UPDATE fuego_ya SET stock = stock - ? WHERE id_fuego_ya = ?`,
      [cb, id_fuego_ya]
    );

    let aplicado_auto = 0;
    let estado_final = estadopago || null;

    if (id_cliente && (estado_final === null || estado_final === "credito")) {
      const { aplicado, pendiente_final } = await autoAplicarSaldoAFavor(conn, id_cliente, idVenta);
      aplicado_auto = aplicado;
      estado_final = pendiente_final <= 0 ? "pago" : "credito";
    }

    await conn.commit();

    return res.status(201).json({
      id_ventaFuegoya: idVenta,
      message: aplicado_auto > 0
        ? "Venta creada y cubierta parcial/total con saldo a favor."
        : "Venta Fuegoya creada exitosamente!",
      aplicado_auto,
      estadopago_final: estado_final,
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

    const [[venta]] = await conn.query(
      `SELECT id_cliente, id_fuego_ya, cantidadbolsas, foto
         FROM venta_fuegoya
        WHERE id_ventaFuegoya = ?
        FOR UPDATE`,
      [id]
    );
    if (!venta) {
      await conn.rollback();
      return res.status(404).json("Venta Fuegoya no encontrada!");
    }

    const addBack = parseInt(venta.cantidadbolsas, 10) || 0;

    const [apps] = await conn.query(
      `SELECT id_aplicacion, id_pago, monto
         FROM fuegoya_pago_aplicaciones
        WHERE id_ventaFuegoya = ?
        ORDER BY aplicado_en ASC, id_aplicacion ASC
        FOR UPDATE`,
      [id]
    );

    if (apps.length) {
      const [ventasCredito] = await conn.query(
        `SELECT v.id_ventaFuegoya
           FROM venta_fuegoya v
          WHERE v.id_cliente = ?
            AND v.id_ventaFuegoya <> ?
            AND v.estadopago = 'credito'
          ORDER BY v.fecha_realizada ASC, v.id_ventaFuegoya ASC
          FOR UPDATE`,
        [venta.id_cliente, id]
      );

      for (const app of apps) {
        let aReasignar = Number(app.monto);

        for (const vc of ventasCredito) {
          if (aReasignar <= 0) break;

          const [[pend]] = await conn.query(
            `SELECT v.precio_total - COALESCE(SUM(a.monto),0) AS pendiente
               FROM venta_fuegoya v
          LEFT JOIN fuegoya_pago_aplicaciones a ON a.id_ventaFuegoya = v.id_ventaFuegoya
              WHERE v.id_ventaFuegoya = ?
           GROUP BY v.id_ventaFuegoya
               FOR UPDATE`,
            [vc.id_ventaFuegoya]
          );

          const pendiente = Math.max(0, Number(pend?.pendiente ?? 0));
          if (pendiente <= 0) continue;

          const mov = Math.min(aReasignar, pendiente);

          await conn.query(
            `INSERT INTO fuegoya_pago_aplicaciones (id_pago, id_ventaFuegoya, monto)
             VALUES (?,?,?)`,
            [app.id_pago, vc.id_ventaFuegoya, mov]
          );

          aReasignar -= mov;

          if (mov === pendiente) {
            await conn.query(
              `UPDATE venta_fuegoya
                  SET estadopago = 'pago', fechapago = NOW()
                WHERE id_ventaFuegoya = ?`,
              [vc.id_ventaFuegoya]
            );
          }
        }

        await conn.query(
          `DELETE FROM fuegoya_pago_aplicaciones WHERE id_aplicacion = ?`,
          [app.id_aplicacion]
        );
      }
    }

    if (venta.id_fuego_ya && addBack > 0) {
      await conn.query(
        `UPDATE fuego_ya SET stock = stock + ? WHERE id_fuego_ya = ?`,
        [addBack, venta.id_fuego_ya]
      );
    }

    await conn.query(
      `DELETE FROM fuegoya_pago_aplicaciones WHERE id_ventaFuegoya = ?`,
      [id]
    );

    await conn.query(
      `DELETE FROM venta_fuegoya WHERE id_ventaFuegoya = ?`,
      [id]
    );

    await conn.commit();

    if (venta.foto) {
      try { await r2Delete(venta.foto); } catch {}
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
      await conn.query(
        `UPDATE venta_fuegoya SET estadopago='pago', fechapago=NOW() WHERE id_ventaFuegoya = ?`,
        [id]
      );
    } else {
      await conn.query(
        `UPDATE venta_fuegoya SET estadopago='credito', fechapago=NULL WHERE id_ventaFuegoya = ?`,
        [id]
      );
    }

    await conn.commit();
    return res.status(200).json("Estado de pago actualizado.");
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("❌ Error en changeEstadoPagoVentaFuegoya:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    conn.release();
  }
};

export const statsVentasFYMensual = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const where = [];
    const params = [];
    if (desde) { where.push("v.fecha_realizada >= ?"); params.push(desde); }
    if (hasta) { where.push("v.fecha_realizada <= ?"); params.push(hasta); }

    const sql = `
      SELECT
        DATE_FORMAT(v.fecha_realizada, '%Y-%m') AS ym,
        SUM(COALESCE(v.precio_total, 0))       AS total_uyu
      FROM venta_fuegoya v
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      GROUP BY ym
      ORDER BY ym ASC
    `;
    const [rows] = await pool.query(sql, params);
    res.status(200).json(rows);
  } catch (err) {
    console.error("statsVentasFYMensual:", err);
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const topClientesFuegoYa = async (req, res) => {
  try {
    const { desde, hasta, limit = 8 } = req.query;
    if (!desde || !hasta) {
      return res.status(400).json({ error: "Parámetros 'desde' y 'hasta' son obligatorios." });
    }

    const lim = Number(limit) || 8;

    const sql = `
      SELECT
        v.id_cliente,
        COALESCE(cf.nombre, CONCAT('Cliente #', v.id_cliente)) AS nombre,
        SUM(COALESCE(v.precio_total, 0)) AS total_uyu
      FROM venta_fuegoya v
      LEFT JOIN clientes_fuegoya cf ON cf.id_cliente = v.id_cliente
      WHERE v.fecha_realizada >= ? AND v.fecha_realizada <= ? AND v.id_cliente IS NOT NULL
      GROUP BY v.id_cliente, cf.nombre
      ORDER BY total_uyu DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(sql, [desde, hasta, lim]);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("topClientesFuegoYa:", err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const marcarPagoManual = async function (req, res) {
  const conn = await pool.getConnection();
  try {
    const idVenta = Number(req.params.id);
    await conn.beginTransaction();

    await conn.query(
      `UPDATE venta_fuegoya SET estadopago='pago', fechapago=NOW() WHERE id_ventaFuegoya=?`,
      [idVenta]
    );

    const [apps] = await conn.query(
      `SELECT id_aplicacion, id_pago, monto
         FROM fuegoya_pago_aplicaciones
        WHERE id_ventaFuegoya=? 
        ORDER BY aplicado_en ASC, id_aplicacion ASC
        FOR UPDATE`,
      [idVenta]
    );

    if (apps.length) {
      const [ventasCredito] = await conn.query(
        `SELECT v.id_ventaFuegoya
           FROM venta_fuegoya v
          WHERE v.id_cliente = (SELECT id_cliente FROM venta_fuegoya WHERE id_ventaFuegoya=?)
            AND v.estadopago='credito'
          ORDER BY v.fecha_realizada ASC, v.id_ventaFuegoya ASC
          FOR UPDATE`,
        [idVenta]
      );

      for (const app of apps) {
        let aReasignar = Number(app.monto);

        for (const vc of ventasCredito) {
          if (aReasignar <= 0) break;

          const [[pend]] = await conn.query(
            `SELECT v.precio_total - COALESCE(SUM(a.monto),0) AS pendiente
               FROM venta_fuegoya v
          LEFT JOIN fuegoya_pago_aplicaciones a ON a.id_ventaFuegoya=v.id_ventaFuegoya
              WHERE v.id_ventaFuegoya=? GROUP BY v.id_ventaFuegoya FOR UPDATE`,
            [vc.id_ventaFuegoya]
          );

          const pendiente = Math.max(0, Number(pend?.pendiente ?? 0));
          if (pendiente <= 0) continue;

          const mov = Math.min(aReasignar, pendiente);

          await conn.query(
            `INSERT INTO fuegoya_pago_aplicaciones (id_pago, id_ventaFuegoya, monto)
             VALUES (?,?,?)`,
            [app.id_pago, vc.id_ventaFuegoya, mov]
          );

          aReasignar -= mov;

          if (mov === pendiente) {
            await conn.query(
              `UPDATE venta_fuegoya SET estadopago='pago', fechapago=NOW() WHERE id_ventaFuegoya=?`,
              [vc.id_ventaFuegoya]
            );
          }
        }

        await conn.query(
          `DELETE FROM fuegoya_pago_aplicaciones WHERE id_aplicacion=?`,
          [app.id_aplicacion]
        );
      }
    }

    await conn.commit();
    return res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: "No se pudo marcar como pagada" });
  } finally {
    conn.release();
  }
};
