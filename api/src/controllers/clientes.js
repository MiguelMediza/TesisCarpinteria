import { pool } from "../db.js";

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

    if (!nombre) {
      return res.status(400).json({ error: "El nombre del cliente es obligatorio." });
    }

    const esEmpresaBool = es_empresa === "1" || es_empresa === 1 || es_empresa === true;

    if (esEmpresaBool) {
      if (!nombre_empresa || !direccion_empresa || !email_empresa) {
        return res.status(400).json({ error: "Los datos de la empresa son obligatorios." });
      }
    }

    const insertSQL = `
      INSERT INTO clientes
        (nombre, apellido, telefono, email, es_empresa, nombre_empresa, direccion_empresa, email_empresa, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
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

    // Verificar existencia
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

export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(`UPDATE clientes SET estado = FALSE WHERE id_cliente = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json("Cliente no encontrado!");
    }

    return res.status(200).json("Cliente eliminado exitosamente!");
  } catch (err) {
    console.error("❌ Error en deleteCliente:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

export const listClientes = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM clientes WHERE estado = TRUE ORDER BY nombre ASC`);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listClientes:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

export const listarClientesSelect = async (req, res) => {
  try {
    const { incluir_id } = req.query; 

    // Activos
    const [activos] = await pool.query(
      `SELECT id_cliente, es_empresa, nombre, apellido, nombre_empresa, estado
       FROM clientes
       WHERE estado = TRUE
       ORDER BY nombre_empresa, nombre, apellido`
    );

    let extra = [];
    if (incluir_id) {
      const yaEsta = activos.some(c => String(c.id_cliente) === String(incluir_id));
      if (!yaEsta) {
        const [fila] = await pool.query(
          `SELECT id_cliente, es_empresa, nombre, apellido, nombre_empresa, estado
           FROM clientes
           WHERE id_cliente = ?`,
          [incluir_id]
        );
        if (fila.length) extra = fila; 
      }
    }

    const mapDisplay = (c) => ({
      id_cliente: c.id_cliente,
      display: c.es_empresa
        ? (c.nombre_empresa || `Empresa #${c.id_cliente}`)
        : [c.nombre, c.apellido].filter(Boolean).join(" ") || `Cliente #${c.id_cliente}`,
      eliminado: c.estado === 0 || c.estado === false, 
    });

    const data = [
      ...extra.map(mapDisplay),  
      ...activos.map(mapDisplay)
    ];

    res.status(200).json(data);
  } catch (err) {
    console.error("❌ listarClientesSelect:", err);
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

