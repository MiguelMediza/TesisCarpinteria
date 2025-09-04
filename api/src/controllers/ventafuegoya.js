import { pool } from "../db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PAGO_ESTADOS = new Set(["credito", "pago"]);
const isValidPagoEstado = (v) => !v || PAGO_ESTADOS.has(v);

// ✅ Normaliza "YYYY-MM-DDTHH:MM" o "YYYY-MM-DD HH:MM" a "YYYY-MM-DD HH:MM:SS" (o null)
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
  try {
    const {
      fecha_realizada,
      precio_total,
      id_cliente,
      id_fuego_ya,
      cantidadbolsas,                 // 👈 NUEVO
      comentarios,
      estadopago,
      fechapago
    } = req.body;

    const foto = req.file?.filename || null;

    // Validaciones básicas
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
    return res.status(400).json({ error: "cantidadbolsas debe ser un entero mayor o igual a 0." });
    }

    // Verificar cliente si vino
    if (id_cliente) {
      const [cli] = await pool.query(
        `SELECT id_cliente FROM clientes WHERE id_cliente = ?`,
        [id_cliente]
      );
      if (cli.length === 0) {
        return res.status(400).json({ error: "El cliente seleccionado no existe." });
      }
    }

    // Verificar fuego_ya
    const [fy] = await pool.query(
      `SELECT id_fuego_ya FROM fuego_ya WHERE id_fuego_ya = ?`,
      [id_fuego_ya]
    );
    if (fy.length === 0) {
      return res.status(400).json({ error: "El registro de fuego_ya no existe." });
    }

    const fechapagoSQL = toMySQLDateTime(fechapago);

    const sql = `
      INSERT INTO venta_fuegoya
        (fecha_realizada, precio_total, id_cliente, id_fuego_ya, cantidadbolsas, foto, comentarios, estadopago, fechapago)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [ins] = await pool.query(sql, [
      fecha_realizada,
      precio_total != null ? parseFloat(precio_total) : null,
      id_cliente || null,
      parseInt(id_fuego_ya, 10),
      cantidadbolsas != null ? parseInt(cantidadbolsas, 10) : null,   // 👈 NUEVO
      foto,
      comentarios || null,
      estadopago || null,
      fechapagoSQL
    ]);

    return res.status(201).json({
      id_ventaFuegoya: ins.insertId,
      message: "Venta Fuegoya creada exitosamente!"
    });
  } catch (err) {
    console.error("❌ createVentaFuegoya:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
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
        c.es_empresa,
        c.nombre           AS nombre_cliente,
        c.apellido         AS apellido_cliente,
        c.nombre_empresa   AS empresa_cliente,
        c.estado           AS cliente_activo,
        fy.tipo            AS fuego_ya_tipo
      FROM venta_fuegoya v
      LEFT JOIN clientes c  ON c.id_cliente = v.id_cliente
      LEFT JOIN fuego_ya fy ON fy.id_fuego_ya = v.id_fuego_ya
      WHERE v.id_ventaFuegoya = ?
      `,
      [id]
    );

    if (rows.length === 0) return res.status(404).json("Venta Fuegoya no encontrada!");

    const r = rows[0];
    const cliente_display = r?.es_empresa
      ? (r?.empresa_cliente || `Empresa #${r.id_cliente}`)
      : [r?.nombre_cliente, r?.apellido_cliente].filter(Boolean).join(" ") || (r.id_cliente ? `Cliente #${r.id_cliente}` : "Sin cliente");

    return res.status(200).json({
      ...r, // incluye cantidadbolsas
      cliente_display
    });
  } catch (err) {
    console.error("❌ getVentaFuegoyaById:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

/* =========================== UPDATE ============================ */
export const updateVentaFuegoya = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      fecha_realizada,
      precio_total,
      id_cliente,
      id_fuego_ya,
      cantidadbolsas,   // 👈 NUEVO
      comentarios,
      estadopago,
      fechapago
    } = req.body;
    const newFoto = req.file?.filename || null;

    // Ver existencia + obtener foto vieja
    const [exists] = await connection.query(
      `SELECT foto FROM venta_fuegoya WHERE id_ventaFuegoya = ?`,
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json("Venta Fuegoya no encontrada!");
    }
    const oldFoto = exists[0].foto;

    // Validaciones ligeras si vienen campos
    if (precio_total != null && isNaN(parseFloat(precio_total))) {
      return res.status(400).json({ error: "precio_total debe ser numérico si se envía." });
    }
    if (estadopago != null && !isValidPagoEstado(estadopago)) {
      return res.status(400).json({ error: "estadopago inválido. Use 'credito' o 'pago'." });
    }
    if (cantidadbolsas != null) {
      const cb = parseInt(cantidadbolsas, 10);
      if (!Number.isInteger(cb) || cb < 0) {
        return res.status(400).json({ error: "cantidadbolsas debe ser un entero mayor o igual a 0." });
      }
    }
    if (id_cliente) {
      const [cli] = await connection.query(
        `SELECT id_cliente FROM clientes WHERE id_cliente = ?`,
        [id_cliente]
      );
      if (cli.length === 0) {
        return res.status(400).json({ error: "El cliente especificado no existe." });
      }
    }
    if (id_fuego_ya) {
      const [fy] = await connection.query(
        `SELECT id_fuego_ya FROM fuego_ya WHERE id_fuego_ya = ?`,
        [id_fuego_ya]
      );
      if (fy.length === 0) {
        return res.status(400).json({ error: "El registro de fuego_ya especificado no existe." });
      }
    }

    await connection.beginTransaction();

    // SET dinámico
    const sets = [];
    const vals = [];

    if (fecha_realizada !== undefined) { sets.push("fecha_realizada = ?"); vals.push(fecha_realizada || null); }
    if (precio_total !== undefined)    { sets.push("precio_total = ?");    vals.push(precio_total != null ? parseFloat(precio_total) : null); }
    if (id_cliente !== undefined)      { sets.push("id_cliente = ?");      vals.push(id_cliente || null); }
    if (id_fuego_ya !== undefined)     { sets.push("id_fuego_ya = ?");     vals.push(id_fuego_ya || null); }
    if (cantidadbolsas !== undefined)  { sets.push("cantidadbolsas = ?");  vals.push(cantidadbolsas != null ? parseInt(cantidadbolsas, 10) : null); } // 👈 NUEVO
    if (comentarios !== undefined)     { sets.push("comentarios = ?");     vals.push(comentarios || null); }
    if (estadopago !== undefined)      { sets.push("estadopago = ?");      vals.push(estadopago || null); }
    if (fechapago !== undefined)       { sets.push("fechapago = ?");       vals.push(toMySQLDateTime(fechapago)); }
    if (newFoto !== null)              { sets.push("foto = COALESCE(?, foto)"); vals.push(newFoto); }

    if (sets.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: "No hay campos para actualizar." });
    }

    const sql = `UPDATE venta_fuegoya SET ${sets.join(", ")} WHERE id_ventaFuegoya = ?`;
    vals.push(id);

    await connection.query(sql, vals);
    await connection.commit();

    // Borrar foto antigua si se reemplazó
    if (newFoto && oldFoto) {
      const oldPath = path.join(__dirname, "../images/venta_fuegoya", oldFoto);
      fs.unlink(oldPath).catch(() => console.warn("⚠️ No se pudo borrar la foto antigua:", oldFoto));
    }

    return res.status(200).json("Venta Fuegoya actualizada correctamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ updateVentaFuegoya:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  } finally {
    connection.release();
  }
};

/* ============================ DELETE =========================== */
export const deleteVentaFuegoya = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [rows] = await connection.query(
      `SELECT foto FROM venta_fuegoya WHERE id_ventaFuegoya = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json("Venta Fuegoya no encontrada!");
    const oldFoto = rows[0].foto;

    await connection.beginTransaction();
    await connection.query(`DELETE FROM venta_fuegoya WHERE id_ventaFuegoya = ?`, [id]);
    await connection.commit();

    if (oldFoto) {
      const fp = path.join(__dirname, "../images/venta_fuegoya", oldFoto);
      fs.unlink(fp).catch(() => console.warn("⚠️ No se pudo borrar la foto:", oldFoto));
    }

    return res.status(200).json("Venta Fuegoya eliminada correctamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ deleteVentaFuegoya:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  } finally {
    connection.release();
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
      where.push("v.estadopago = ?");
      params.push(estadopago);
    }
    if (cliente && cliente.trim()) {
      const like = `%${cliente.trim()}%`;
      where.push("(c.nombre_empresa LIKE ? OR c.nombre LIKE ? OR c.apellido LIKE ?)");
      params.push(like, like, like);
    }

    const sql = `
      SELECT
        v.*,
        c.es_empresa,
        c.nombre           AS nombre_cliente,
        c.apellido         AS apellido_cliente,
        c.nombre_empresa   AS empresa_cliente,
        c.estado           AS cliente_activo,
        fy.tipo            AS fuego_ya_tipo
      FROM venta_fuegoya v
      LEFT JOIN clientes  c  ON c.id_cliente = v.id_cliente
      LEFT JOIN fuego_ya  fy ON fy.id_fuego_ya = v.id_fuego_ya
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY v.fecha_realizada DESC, v.id_ventaFuegoya DESC
    `;

    const [rows] = await pool.query(sql, params);

    const mapped = rows.map(r => {
      const display = r?.es_empresa
        ? (r?.empresa_cliente || (r.id_cliente ? `Empresa #${r.id_cliente}` : "Sin cliente"))
        : [r?.nombre_cliente, r?.apellido_cliente].filter(Boolean).join(" ") || (r.id_cliente ? `Cliente #${r.id_cliente}` : "Sin cliente");

      const cliente_eliminado = r?.id_cliente
        ? (r?.cliente_activo === 0 || r?.cliente_activo === false)
        : true;

      return {
        ...r, // incluye cantidadbolsas
        cliente_display: display,
        cliente_eliminado
      };
    });

    return res.status(200).json(mapped);
  } catch (err) {
    console.error("❌ listVentaFuegoya:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

/* =========== CHANGE ESTADO PAGO (con fechapago auto) =========== */
export const changeEstadoPagoVentaFuegoya = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;        // id_ventaFuegoya
    const { estadopago } = req.body;  // "credito" | "pago"

    if (!isValidPagoEstado(estadopago)) {
      conn.release();
      return res.status(400).json("estadopago inválido. Use 'credito' o 'pago'.");
    }

    const [ex] = await conn.query(
      `SELECT 1 FROM venta_fuegoya WHERE id_ventaFuegoya = ?`,
      [id]
    );
    if (ex.length === 0) {
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
