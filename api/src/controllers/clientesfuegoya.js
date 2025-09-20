// controllers/clientes_fuegoya.js
import { pool } from "../db.js";

const isNonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

/* CREATE */
export const createClienteFY = async (req, res) => {
  try {
    const { nombre, telefono, email } = req.body;
    if (!isNonEmpty(nombre)) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }

    // Email único opcional
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

/* READ by id */
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

/* LIST (filtros opcionales: q, estado) */
export const listClientesFY = async (req, res) => {
  try {
    const { q, estado } = req.query;
    const where = [];
    const params = [];

    if (typeof estado !== "undefined" && estado !== "") {
      where.push("estado = ?");
      params.push(String(estado) === "1" || String(estado).toLowerCase() === "true");
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
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};

/* UPDATE (parcial) */
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

/* DELETE (soft) */
export const deleteClienteFY = async (req, res) => {
  try {
    const { id } = req.params;
    const [ex] = await pool.query(
      "SELECT 1 FROM clientes_fuegoya WHERE id_cliente = ?",
      [id]
    );
    if (!ex.length) return res.status(404).json("Cliente no encontrado");
    await pool.query("UPDATE clientes_fuegoya SET estado = FALSE WHERE id_cliente = ?", [id]);
    return res.status(200).json("Cliente deshabilitado.");
  } catch (err) {
    console.error("deleteClienteFY:", err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};
