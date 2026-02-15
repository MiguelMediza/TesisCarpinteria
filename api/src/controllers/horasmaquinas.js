import { pool } from "../db.js";

const EMPLEADOS = new Set(["Miguel", "Jhon", "Richard", "William", "Juan", "Ruben"]);
const isValidEmpleado = (v) => !!v && EMPLEADOS.has(String(v).trim());

/** Acepta YYYY-MM-DD o YYYY-MM-DDTHH... y devuelve YYYY-MM-DD */
const toISODate = (s) => {
  if (s == null) return null;
  const raw = String(s).trim();
  if (!raw) return null;

  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;

  const d = new Date(`${m[1]}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return m[1];
};

const parseIntNonNeg = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
};

// POST /horas-maquinas/agregar
export const createHorasMaquinas = async (req, res) => {
  try {
    const { empleado, fecha, horas, bolsones_cajones } = req.body;

    if (!isValidEmpleado(empleado)) {
      return res.status(400).json({ error: "Empleado inválido." });
    }

    const fechaSQL = toISODate(fecha);
    if (!fechaSQL) {
      return res
        .status(400)
        .json({ error: "La fecha es obligatoria y debe ser válida (YYYY-MM-DD)." });
    }

    const h = parseIntNonNeg(horas);
    if (h === null) {
      return res.status(400).json({ error: "La cantidad de horas debe ser un entero >= 0." });
    }

    const bc = parseIntNonNeg(bolsones_cajones);
    if (bc === null) {
      return res
        .status(400)
        .json({ error: "La cantidad de bolsones/cajones debe ser un entero >= 0." });
    }

    const [ins] = await pool.query(
      `
      INSERT INTO horas_maquinas (empleado, fecha, horas, bolsones_cajones)
      VALUES (?, ?, ?, ?)
      `,
      [String(empleado).trim(), fechaSQL, h, bc]
    );

    return res.status(201).json({
      id: ins.insertId,
      message: "Registro creado exitosamente!",
    });
  } catch (err) {
    console.error("❌ createHorasMaquinas:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

// GET /horas-maquinas/:id
export const getHorasMaquinasById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        hm.id,
        hm.empleado,
        DATE_FORMAT(hm.fecha, '%Y-%m-%d') AS fecha,
        hm.horas,
        hm.bolsones_cajones,
        hm.created_at
      FROM horas_maquinas hm
      WHERE hm.id = ?
      `,
      [id]
    );

    if (!rows.length) return res.status(404).json("Registro no encontrado!");
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ getHorasMaquinasById:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

// PUT /horas-maquinas/:id
export const updateHorasMaquinas = async (req, res) => {
  try {
    const { id } = req.params;
    const { empleado, fecha, horas, bolsones_cajones } = req.body;

    const [[curr]] = await pool.query(`SELECT id FROM horas_maquinas WHERE id = ?`, [id]);
    if (!curr) return res.status(404).json("Registro no encontrado!");

    const sets = [];
    const vals = [];

    if (empleado !== undefined) {
      if (!isValidEmpleado(empleado)) {
        return res.status(400).json({ error: "Empleado inválido." });
      }
      sets.push("empleado = ?");
      vals.push(String(empleado).trim());
    }

    if (fecha !== undefined) {
      const fechaSQL = toISODate(fecha);
      if (!fechaSQL) return res.status(400).json({ error: "Fecha inválida. Use YYYY-MM-DD." });
      sets.push("fecha = ?");
      vals.push(fechaSQL);
    }

    if (horas !== undefined) {
      const h = parseIntNonNeg(horas);
      if (h === null) {
        return res.status(400).json({ error: "La cantidad de horas debe ser un entero >= 0." });
      }
      sets.push("horas = ?");
      vals.push(h);
    }

    if (bolsones_cajones !== undefined) {
      const bc = parseIntNonNeg(bolsones_cajones);
      if (bc === null) {
        return res
          .status(400)
          .json({ error: "La cantidad de bolsones/cajones debe ser un entero >= 0." });
      }
      sets.push("bolsones_cajones = ?");
      vals.push(bc);
    }

    if (!sets.length) {
      return res.status(400).json({ error: "No hay campos para actualizar." });
    }

    await pool.query(
      `UPDATE horas_maquinas SET ${sets.join(", ")} WHERE id = ?`,
      [...vals, id]
    );

    return res.status(200).json({ message: "Registro actualizado correctamente!" });
  } catch (err) {
    console.error("❌ updateHorasMaquinas:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

// DELETE /horas-maquinas/:id
export const deleteHorasMaquinas = async (req, res) => {
  try {
    const { id } = req.params;

    const [del] = await pool.query(`DELETE FROM horas_maquinas WHERE id = ?`, [id]);
    if (!del.affectedRows) return res.status(404).json("Registro no encontrado!");

    return res.status(200).json("Registro eliminado correctamente!");
  } catch (err) {
    console.error("❌ deleteHorasMaquinas:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

// GET /horas-maquinas/listar?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&empleado=Miguel
export const listHorasMaquinas = async (req, res) => {
  try {
    const { desde, hasta, empleado } = req.query;

    const where = [];
    const params = [];

    if (desde) {
      const d = toISODate(desde);
      if (!d) return res.status(400).json({ error: "Parámetro 'desde' inválido (YYYY-MM-DD)." });
      where.push("hm.fecha >= ?");
      params.push(d);
    }

    if (hasta) {
      const h = toISODate(hasta);
      if (!h) return res.status(400).json({ error: "Parámetro 'hasta' inválido (YYYY-MM-DD)." });
      where.push("hm.fecha <= ?");
      params.push(h);
    }

    if (empleado && String(empleado).trim()) {
      const emp = String(empleado).trim();
      if (!EMPLEADOS.has(emp)) return res.status(400).json({ error: "Empleado inválido en filtro." });
      where.push("hm.empleado = ?");
      params.push(emp);
    }

    const sql = `
      SELECT
        hm.id,
        hm.empleado,
        DATE_FORMAT(hm.fecha, '%Y-%m-%d') AS fecha,
        hm.horas,
        hm.bolsones_cajones,
        hm.created_at
      FROM horas_maquinas hm
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY hm.fecha DESC, hm.id DESC
    `;

    const [rows] = await pool.query(sql, params);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ listHorasMaquinas:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};
