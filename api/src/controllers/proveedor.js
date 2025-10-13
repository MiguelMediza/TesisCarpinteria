import { pool } from "../db.js";

// Crear un nuevo proveedor
export const createProveedor = async (req, res) => {
  try {
    const { rut, nombre, nombre_empresa, telefono, correo_electronico, comentarios } = req.body;
    console.log("🔔 createProveedor hit:", req.body);

    // Verificar RUT duplicado
    const [existing] = await pool.query(
      "SELECT * FROM proveedores WHERE rut = ?",
      [rut]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "El RUT ya está registrado!" });
    }

    // Verificar correo duplicado
    const [existingEmail] = await pool.query(
      "SELECT * FROM proveedores WHERE correo_electronico = ?",
      [correo_electronico]
    );
    if (existingEmail.length > 0) {
      return res.status(409).json({ message: "El correo electrónico ya está registrado!" });
    }

    // Insertar proveedor
    const insertQuery = `
      INSERT INTO proveedores
        (rut, nombre, nombre_empresa, telefono, correo_electronico, comentarios)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertQuery, [
      rut,
      nombre,
      nombre_empresa,
      telefono,
      correo_electronico,
      comentarios || null,
    ]);

    console.log("✅ Proveedor insertado:", result);
    return res.status(201).json({ id_proveedor: result.insertId, message: "Proveedor creado exitosamente!" });
  } catch (err) {
    console.error("❌ Error en createProveedor:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// Obtener un proveedor por ID
export const getProveedorById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM proveedores WHERE id_proveedor = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Proveedor no encontrado!");
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getProveedorById:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// Modificar un proveedor existente
export const updateProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { rut, nombre, nombre_empresa, telefono, correo_electronico, comentarios } = req.body;
    console.log("🔔 updateProveedor hit:", { id, body: req.body });

    //verificar si el proveedor existe
    const [rows] = await pool.query(
      "SELECT * FROM proveedores WHERE id_proveedor = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Proveedor no encontrado!");
    }

    //verificar duplicado de RUT
    if (rut && rut !== rows[0].rut) {
      const [dup] = await pool.query(
        "SELECT * FROM proveedores WHERE rut = ? AND id_proveedor <> ?",
        [rut, id]
      );
      if (dup.length > 0) {
        return res.status(409).json("El RUT ya está en uso por otro proveedor!");
      }
    }

    // Actualizar campos
    const updateQuery = `
      UPDATE proveedores SET
        rut = ?,
        nombre = ?,
        nombre_empresa = ?,
        telefono = ?,
        correo_electronico = ?,
        comentarios = ?
      WHERE id_proveedor = ?
    `;
    const [result] = await pool.query(updateQuery, [
      rut,
      nombre,
      nombre_empresa,
      telefono,
      correo_electronico,
      comentarios || null,
      id,
    ]);

    console.log("✅ Proveedor actualizado:", result);
    return res.status(200).json("Proveedor modificado exitosamente!");
  } catch (err) {
    console.error("❌ Error en updateProveedor:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const deleteProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    const [provRows] = await pool.query(
      `SELECT id_proveedor, COALESCE(nombre_empresa, nombre) AS display
       FROM proveedores
       WHERE id_proveedor = ?`,
      [id]
    );
    if (provRows.length === 0) {
      return res.status(404).json({ message: "Proveedor no encontrado." });
    }
    const nombreProv = provRows[0].display || `#${id}`;

    const [[encargosRow]] = await pool.query(
      "SELECT COUNT(*) AS n FROM encargos WHERE id_proveedor = ?",
      [id]
    );

    if (encargosRow.n > 0) {
      return res.status(409).json({
        error: "REFERENCED",
        message:
          `No se puede eliminar el proveedor “${nombreProv}” porque tiene ${encargosRow.n} encargo(s) asociado(s). ` +
          "Elimine o reasigne esos registros, o marque el proveedor como inactivo.",
        detalles: { encargos: encargosRow.n },
      });
    }

    const [result] = await pool.query(
      "DELETE FROM proveedores WHERE id_proveedor = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Proveedor no encontrado." });
    }

    return res
      .status(200)
      .json({ message: `Proveedor “${nombreProv}” eliminado exitosamente.` });
  } catch (err) {
    if (
      err?.code === "ER_ROW_IS_REFERENCED_2" ||
      err?.code === "ER_ROW_IS_REFERENCED" ||
      err?.errno === 1451 ||
      err?.errno === 1217
    ) {
      return res.status(409).json({
        error: "REFERENCED",
        message:
          "No se puede eliminar el proveedor porque tiene registros relacionados (por ejemplo, encargos). " +
          "Elimine o reasigne esos registros, o marque el proveedor como inactivo.",
      });
    }

    console.error("❌ Error en deleteProveedor:", err);
    return res
      .status(500)
      .json({ error: "INTERNAL", message: "Error interno", details: err.message });
  }
};



export const listProveedores = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM proveedores ORDER BY nombre ASC");
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listProveedores:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
 