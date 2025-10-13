import { pool } from "../db.js";

const isNonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

export const createClienteFY = async (req, res) => {
  try {
    const { nombre, telefono, email } = req.body;
    if (!isNonEmpty(nombre)) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }

    if (email) {
      const [dups] = await pool.query(
        "SELECT 1 FROM clientes_fuegoya WHERE email = ? LIMIT 1",
        [email]
      );
      if (dups.length) {
        return res.status(400).json({ error: "El email ya está en uso." });
      }
    }

    const [ins] = await pool.query(
      `INSERT INTO clientes_fuegoya (nombre, telefono, email, estado)
       VALUES (?, ?, ?, TRUE)`,
      [nombre.trim(), telefono || null, email || null]
    );
    return res.status(201).json({ id_cliente: ins.insertId, message: "Cliente creado." });
  } catch (err) {
    console.error("createClienteFY:", err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const getClienteFYById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM clientes_fuegoya WHERE id_cliente = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json("Cliente no encontrado");
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("getClienteFYById:", err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const listClientesFY = async (req, res) => {
  try {
    const { q, estado } = req.query;
    const where = [];
    const params = [];

    if (typeof estado === "undefined" || estado === "") {
      where.push("estado = TRUE"); 
    } else {
      const active =
        String(estado) === "1" || String(estado).toLowerCase() === "true";
      where.push("estado = ?");
      params.push(active);
    }

    if (isNonEmpty(q)) {
      where.push("(nombre LIKE ? OR telefono LIKE ? OR email LIKE ?)");
      const like = `%${q.trim()}%`;
      params.push(like, like, like);
    }

    const sql = `
      SELECT * FROM clientes_fuegoya
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY nombre ASC
    `;
    const [rows] = await pool.query(sql, params);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("listClientesFY:", err);
    return res
      .status(500)
      .json({ error: "Error interno", details: err.message });
  }
};


export const updateClienteFY = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, email, estado } = req.body;

    const [exists] = await pool.query(
      "SELECT 1 FROM clientes_fuegoya WHERE id_cliente = ?",
      [id]
    );
    if (!exists.length) return res.status(404).json("Cliente no encontrado");

    if (email) {
      const [dups] = await pool.query(
        "SELECT 1 FROM clientes_fuegoya WHERE email = ? AND id_cliente <> ? LIMIT 1",
        [email, id]
      );
      if (dups.length) {
        return res.status(400).json({ error: "El email ya está en uso." });
      }
    }

    const sets = [];
    const vals = [];

    if (typeof nombre !== "undefined") {
      if (!isNonEmpty(nombre)) return res.status(400).json({ error: "El nombre es obligatorio." });
      sets.push("nombre = ?"); vals.push(nombre.trim());
    }
    if (typeof telefono !== "undefined") { sets.push("telefono = ?"); vals.push(telefono || null); }
    if (typeof email !== "undefined")    { sets.push("email = ?");    vals.push(email || null); }
    if (typeof estado !== "undefined")   { sets.push("estado = ?");   vals.push(Boolean(estado)); }

    if (!sets.length) return res.status(400).json({ error: "Sin cambios a actualizar." });

    const sql = `UPDATE clientes_fuegoya SET ${sets.join(", ")} WHERE id_cliente = ?`;
    vals.push(id);

    await pool.query(sql, vals);
    return res.status(200).json("Cliente actualizado.");
  } catch (err) {
    console.error("updateClienteFY:", err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const deleteClienteFY = async (req, res) => {
  try {
    const { id } = req.params;

    const [ex] = await pool.query(
      "SELECT 1 FROM clientes_fuegoya WHERE id_cliente = ?",
      [id]
    );
    if (!ex.length) return res.status(404).json("Cliente no encontrado");

    const [[cred]] = await pool.query(
      `
      SELECT 
        COUNT(*)         AS pendientes,
        COALESCE(SUM(COALESCE(precio_total,0)), 0) AS total_pendiente
      FROM venta_fuegoya
      WHERE id_cliente = ? AND estadopago = 'credito'
      `,
      [id]
    );

    if (cred?.pendientes > 0) {
      const total = Number(cred.total_pendiente || 0).toFixed(2);
      return res.status(409).json({
        message: `No se puede deshabilitar el cliente: tiene ${cred.pendientes} venta(s) a crédito sin pagar (total pendiente $${total}).`
      });
    }

    await pool.query(
      "UPDATE clientes_fuegoya SET estado = FALSE WHERE id_cliente = ?",
      [id]
    );

    return res.status(200).json("Cliente deshabilitado.");
  } catch (err) {
    console.error("deleteClienteFY:", err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};


function groupByCliente(rows) {
  const byClient = new Map();

  for (const r of rows) {
    if (!byClient.has(r.id_cliente)) {
      byClient.set(r.id_cliente, {
        id_cliente: r.id_cliente,
        nombre: r.nombre,
        telefono: r.telefono,
        email: r.email,
        estado: r.estado,
        creditos: [],
        credito_total: 0,
      });
    }
    const acc = byClient.get(r.id_cliente);

    acc.creditos.push({
      id_fuego_ya: r.id_fuego_ya,
      tipo: r.tipo,
      bolsas: Number(r.bolsas) || 0,
      precio_unitario: r.precio_unitario != null ? Number(r.precio_unitario) : null,
      monto: Number(r.monto) || 0,
    });

    acc.credito_total += Number(r.monto) || 0;
  }


  for (const v of byClient.values()) {
    v.creditos.sort((a, b) => String(a.tipo).localeCompare(String(b.tipo)));
    v.credito_total = Number(v.credito_total.toFixed(2));
  }

  return Array.from(byClient.values());
}
export const getCreditoCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT
        v.id_ventaFuegoya,
        v.fecha_realizada,
        fy.tipo                         AS tipo_fuego,
        v.cantidadbolsas,
        v.precio_total,
        COALESCE(SUM(a.monto), 0)       AS aplicado,
        GREATEST(v.precio_total - COALESCE(SUM(a.monto),0), 0) AS saldo
      FROM venta_fuegoya v
      LEFT JOIN fuegoya_pago_aplicaciones a
             ON a.id_ventaFuegoya = v.id_ventaFuegoya
      LEFT JOIN fuego_ya fy
             ON fy.id_fuego_ya = v.id_fuego_ya
      WHERE v.id_cliente = ?
        AND v.estadopago = 'credito'          -- sólo ventas aún en crédito
      GROUP BY
        v.id_ventaFuegoya, v.fecha_realizada, fy.tipo, v.cantidadbolsas, v.precio_total
      HAVING saldo > 0                         -- sólo las que deben algo
      ORDER BY v.fecha_realizada ASC, v.id_ventaFuegoya ASC;
    `;

    const [rows] = await pool.query(sql, [id]);

    const creditos = rows.map(r => ({
      id_ventaFuegoya: r.id_ventaFuegoya,
      fecha: r.fecha_realizada,
      tipo: r.tipo_fuego || null,
      bolsas: r.cantidadbolsas ?? null,
      monto: Number(r.saldo || 0),                 
      aplicado: Number(r.aplicado || 0),           
      total_venta: Number(r.precio_total || 0),    
    }));

    const credito_total = creditos.reduce((acc, c) => acc + (c.monto || 0), 0);

    return res.json({ creditos, credito_total });
  } catch (err) {
    console.error("❌ getCreditoCliente error:", err);
    return res.status(500).json({ error: "No se pudo obtener el crédito del cliente." });
  }
};


export const getCreditoClienteFuegoya = async (req, res) => {
  try {
    const { id } = req.params;

    const [[exists]] = await pool.query(
      `SELECT id_cliente FROM clientes_fuegoya WHERE id_cliente = ?`,
      [id]
    );
    if (!exists) {
      return res.status(404).json("Cliente FuegoYa no encontrado.");
    }
    const [rows] = await pool.query(
      `
      SELECT
        cf.id_cliente,
        cf.nombre,
        cf.telefono,
        cf.email,
        cf.estado,
        v.id_fuego_ya,
        fy.tipo,
        SUM(v.cantidadbolsas) AS bolsas,
        MAX(fy.precio_unidad) AS precio_unitario,
        SUM(COALESCE(v.precio_total, v.cantidadbolsas * fy.precio_unidad)) AS monto
      FROM clientes_fuegoya cf
      JOIN venta_fuegoya v ON v.id_cliente = cf.id_cliente AND v.estadopago = 'credito'
      JOIN fuego_ya fy      ON fy.id_fuego_ya = v.id_fuego_ya
      WHERE cf.id_cliente = ?
      GROUP BY cf.id_cliente, v.id_fuego_ya, fy.tipo
      ORDER BY fy.tipo ASC
      `,
      [id]
    );

    if (rows.length === 0) {
      const [[cliente]] = await pool.query(
        `SELECT id_cliente, nombre, telefono, email, estado FROM clientes_fuegoya WHERE id_cliente = ?`,
        [id]
      );
      return res.status(200).json({
        ...cliente,
        creditos: [],
        credito_total: 0,
      });
    }

    const [result] = groupByCliente(rows);
    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ getCreditoClienteFuegoya:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};
 
export const listCreditoClientesFuegoya = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        cf.id_cliente,
        cf.nombre,
        cf.telefono,
        cf.email,
        cf.estado,
        v.id_fuego_ya,
        fy.tipo,
        SUM(v.cantidadbolsas) AS bolsas,
        MAX(fy.precio_unidad) AS precio_unitario,
        SUM(COALESCE(v.precio_total, v.cantidadbolsas * fy.precio_unidad)) AS monto
      FROM clientes_fuegoya cf
      JOIN venta_fuegoya v ON v.id_cliente = cf.id_cliente AND v.estadopago = 'credito'
      JOIN fuego_ya fy      ON fy.id_fuego_ya = v.id_fuego_ya
      GROUP BY cf.id_cliente, v.id_fuego_ya, fy.tipo
      ORDER BY cf.nombre ASC, fy.tipo ASC
      `
    );

    if (rows.length === 0) {
      return res.status(200).json([]);
    }

    const grouped = groupByCliente(rows);
    return res.status(200).json(grouped);
  } catch (err) {
    console.error("❌ listCreditoClientesFuegoya:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

export const registrarEntrega = async function (req, res) {
  const conn = await pool.getConnection();
  try {
    const idCliente = Number(req.params.id);
    const { monto, medio, nota, fecha_hora } = req.body;
    if (!idCliente || !(monto > 0)) return res.status(400).json({ error: "Datos inválidos" });

    await conn.beginTransaction();

    const [rPago] = await conn.query(
      `INSERT INTO fuegoya_pagos (id_cliente, monto, fecha_hora, medio, nota, creado_por)
       VALUES (?,?,?,?,?,?)`,
      [idCliente, monto, fecha_hora || new Date(), medio || null, nota || null, req.user?.idUser || null]
    );
    const idPago = rPago.insertId;

    let restante = Number(monto);

    const [ventas] = await conn.query(
      `SELECT v.id_ventaFuegoya, v.precio_total, v.fecha_realizada
         FROM venta_fuegoya v
        WHERE v.id_cliente=? AND v.estadopago='credito'
        ORDER BY v.fecha_realizada ASC, v.id_ventaFuegoya ASC
        FOR UPDATE`,
      [idCliente]
    );

    for (const v of ventas) {
      if (restante <= 0) break;

      const [[pendRow]] = await conn.query(
        `SELECT v.precio_total - COALESCE(SUM(a.monto),0) AS pendiente
           FROM venta_fuegoya v
      LEFT JOIN fuegoya_pago_aplicaciones a ON a.id_ventaFuegoya=v.id_ventaFuegoya
          WHERE v.id_ventaFuegoya=? GROUP BY v.id_ventaFuegoya FOR UPDATE`,
        [v.id_ventaFuegoya]
      );
      const pendiente = Math.max(0, Number(pendRow?.pendiente ?? v.precio_total));

      if (pendiente <= 0) continue;

      const aplicar = Math.min(restante, pendiente);

      await conn.query(
        `INSERT INTO fuegoya_pago_aplicaciones (id_pago, id_ventaFuegoya, monto)
         VALUES (?,?,?)`,
        [idPago, v.id_ventaFuegoya, aplicar]
      );

      restante -= aplicar;

      if (aplicar === pendiente) {
        await conn.query(
          `UPDATE venta_fuegoya
              SET estadopago='pago', fechapago=NOW()
            WHERE id_ventaFuegoya=?`,
          [v.id_ventaFuegoya]
        );
      }
    }

    await conn.commit();
    return res.status(201).json({ id_pago: idPago, aplicado: monto - restante, sin_aplicar: restante });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: "Error registrando la entrega" });
  } finally {
    conn.release();
  }
}

export const listarPagosCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const limit  = Number.isFinite(parseInt(req.query.limit, 10))  ? parseInt(req.query.limit, 10)  : 50;
    const offset = Number.isFinite(parseInt(req.query.offset, 10)) ? parseInt(req.query.offset, 10) : 0;

    const sql = `
      SELECT
        p.id_pago,
        p.fecha_hora,
        p.monto,
        p.medio,
        p.nota,
        COALESCE(SUM(a.monto), 0) AS aplicado
      FROM fuegoya_pagos p
      LEFT JOIN fuegoya_pago_aplicaciones a
        ON a.id_pago = p.id_pago
      WHERE p.id_cliente = ?
      GROUP BY
        p.id_pago, p.fecha_hora, p.monto, p.medio, p.nota
      ORDER BY p.fecha_hora DESC
      LIMIT ? OFFSET ?
    `;

    const params = [id, limit, offset];
    const [rows] = await pool.query(sql, params);

    const data = rows.map(r => {
      const monto     = Number(r.monto || 0);
      const aplicado  = Number(r.aplicado || 0);
      const restante  = Math.max(0, monto - aplicado);
      return {
        id_pago: r.id_pago,
        fecha: r.fecha_hora,          
        monto,
        medio: r.medio || null,
        nota: r.nota || null,
        aplicado,
        sin_aplicar: restante,
      };
    });

    return res.json(data);
  } catch (err) {
    console.error("❌ listarPagosCliente error:", err);
    return res.status(500).json({ error: "No se pudieron listar los pagos." });
  }
};

