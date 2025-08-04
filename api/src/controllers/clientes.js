import { pool } from "../db.js";

/* ============================================================
   🔹 CREAR CLIENTE
   - Si es_empresa = true, se requieren los campos de empresa
============================================================ */
export const createCliente = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      telefono,
      email,
      es_empresa,
      nombre_empresa,
      direccion_empresa,
      email_empresa
    } = req.body;

    // ✅ Validaciones básicas
    if (!nombre) {
      return res.status(400).json({ error: "El nombre del cliente es obligatorio." });
    }

    const esEmpresaBool = es_empresa === "1" || es_empresa === 1 || es_empresa === true;


    // ✅ Validar campos de empresa solo si es_empresa es true
    if (esEmpresaBool) {
      if (!nombre_empresa || !direccion_empresa || !email_empresa) {
        return res.status(400).json({ error: "Los datos de la empresa son obligatorios." });
      }
    }

    const insertSQL = `
      INSERT INTO clientes
        (nombre, apellido, telefono, email, es_empresa, nombre_empresa, direccion_empresa, email_empresa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(insertSQL, [
      nombre,
      apellido || null,
      telefono || null,
      email || null,
      esEmpresaBool ? 1 : 0,
      esEmpresaBool ? nombre_empresa : null,
      esEmpresaBool ? direccion_empresa : null,
      esEmpresaBool ? email_empresa : null
    ]);

    return res.status(201).json({ id_cliente: result.insertId, message: "Cliente creado exitosamente!" });
  } catch (err) {
    console.error("❌ Error en createCliente:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

/* ============================================================
   🔹 OBTENER CLIENTE POR ID
============================================================ */
export const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`SELECT * FROM clientes WHERE id_cliente = ?`, [id]);

    if (rows.length === 0) {
      return res.status(404).json("Cliente no encontrado!");
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getClienteById:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

/* ============================================================
   🔹 ACTUALIZAR CLIENTE
   - Validación similar a creación
============================================================ */
export const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      apellido,
      telefono,
      email,
      es_empresa,
      nombre_empresa,
      direccion_empresa,
      email_empresa
    } = req.body;

    // ✅ Verificar existencia
    const [exists] = await pool.query(`SELECT id_cliente FROM clientes WHERE id_cliente = ?`, [id]);
    if (exists.length === 0) return res.status(404).json("Cliente no encontrado!");

    const esEmpresaBool = es_empresa === "1" || es_empresa === 1 || es_empresa === true;


    if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio." });

    if (esEmpresaBool && (!nombre_empresa || !direccion_empresa || !email_empresa)) {
      return res.status(400).json({ error: "Los datos de la empresa son obligatorios para clientes empresa." });
    }

    const updateSQL = `
      UPDATE clientes SET
        nombre = ?,
        apellido = ?,
        telefono = ?,
        email = ?,
        es_empresa = ?,
        nombre_empresa = ?,
        direccion_empresa = ?,
        email_empresa = ?
      WHERE id_cliente = ?
    `;

    await pool.query(updateSQL, [
      nombre,
      apellido || null,
      telefono || null,
      email || null,
      esEmpresaBool ? 1 : 0,
      esEmpresaBool ? nombre_empresa : null,
      esEmpresaBool ? direccion_empresa : null,
      esEmpresaBool ? email_empresa : null,
      id
    ]);

    return res.status(200).json("Cliente actualizado correctamente!");
  } catch (err) {
    console.error("❌ Error en updateCliente:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

/* ============================================================
   🔹 ELIMINAR CLIENTE
============================================================ */
export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(`DELETE FROM clientes WHERE id_cliente = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json("Cliente no encontrado!");
    }

    return res.status(200).json("Cliente eliminado exitosamente!");
  } catch (err) {
    console.error("❌ Error en deleteCliente:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

/* ============================================================
   🔹 LISTAR TODOS LOS CLIENTES
============================================================ */
export const listClientes = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM clientes ORDER BY nombre ASC`);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listClientes:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};
