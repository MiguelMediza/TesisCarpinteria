import { pool } from "../db.js";

// Crear un nuevo encargo
export const createEncargo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      fecha_realizado,
      fecha_prevista_llegada,
      comentarios,
      id_proveedor,
      materias_primas 
    } = req.body;

    console.log("🔔 createEncargo hit:", req.body);

    await connection.beginTransaction();

    //Insertar en encargo
    const [encargoResult] = await connection.query(
      `INSERT INTO encargos (fecha_realizado, fecha_prevista_llegada, comentarios, id_proveedor)
       VALUES (?, ?, ?, ?)`,
      [fecha_realizado, fecha_prevista_llegada, comentarios || null, id_proveedor]
    );
    const id_encargo = encargoResult.insertId;
    console.log("✅ Encargo creado:", id_encargo);

    //Insertar detalles
    for (const { id_materia_prima, cantidad } of materias_primas) {
      await connection.query(
        `INSERT INTO encargo_detalles (id_encargo, id_materia_prima, cantidad)
         VALUES (?, ?, ?)`,
        [id_encargo, id_materia_prima, cantidad]
      );
    }

    await connection.commit();
    return res.status(201).json({
      message: "Encargo creado exitosamente!",
      id_encargo
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en createEncargo:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Obtener un encargo por ID (con detalles)
export const getEncargoById = async (req, res) => {
  try {
    const { id } = req.params;

    const [encargo] = await pool.query(
      `SELECT * FROM encargos WHERE id_encargo = ?`,
      [id]
    );

    if (encargo.length === 0) {
      return res.status(404).json("Encargo no encontrado!");
    }

    const [detalles] = await pool.query(
      `SELECT ed.*, mp.titulo
       FROM encargo_detalles ed
       JOIN materiaprima mp ON ed.id_materia_prima = mp.id_materia_prima
       WHERE ed.id_encargo = ?`,
      [id]
    );

    return res.status(200).json({
      ...encargo[0],
      detalles
    });
  } catch (err) {
    console.error("❌ Error en getEncargoById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

//Listar todos los encargos con proveedor y detalles
export const listEncargos = async (req, res) => {
  try {
    const [encargos] = await pool.query(`
      SELECT e.*, p.nombre_empresa
      FROM encargos e
      LEFT JOIN proveedores p ON e.id_proveedor = p.id_proveedor
      ORDER BY e.fecha_realizado DESC
    `);

    // Agregar detalles a cada encargo
    for (const encargo of encargos) {
      const [detalles] = await pool.query(
        `SELECT ed.*, mp.titulo
         FROM encargo_detalles ed
         JOIN materiaprima mp ON ed.id_materia_prima = mp.id_materia_prima
         WHERE ed.id_encargo = ?`,
        [encargo.id_encargo]
      );
      encargo.detalles = detalles;
    }

    return res.status(200).json(encargos);
  } catch (err) {
    console.error("❌ Error en listEncargos:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

//Eliminar un encargo y sus detalles
export const deleteEncargo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    await connection.query(`DELETE FROM encargo_detalles WHERE id_encargo = ?`, [id]);
    const [result] = await connection.query(`DELETE FROM encargos WHERE id_encargo = ?`, [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json("Encargo no encontrado!");
    }

    await connection.commit();
    console.log("✅ Encargo eliminado:", id);
    return res.status(200).json("Encargo eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteEncargo:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

//Actualizar un encargo y sus detalles
export const updateEncargo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; 
    const {
      fecha_realizado,
      fecha_prevista_llegada,
      comentarios,
      id_proveedor,
      materias_primas // array: [{ id_materia_prima, cantidad }]
    } = req.body;

    console.log("🔔 updateEncargo hit:", req.body);

    //Verificar existencia
    const [exists] = await connection.query(
      `SELECT * FROM encargos WHERE id_encargo = ?`,
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json("Encargo no encontrado!");
    }

    await connection.beginTransaction();

    //Actualizar encabezado del encargo
    await connection.query(
      `UPDATE encargos SET
        fecha_realizado = ?,
        fecha_prevista_llegada = ?,
        comentarios = ?,
        id_proveedor = ?
       WHERE id_encargo = ?`,
      [
        fecha_realizado,
        fecha_prevista_llegada,
        comentarios || null,
        id_proveedor,
        id
      ]
    );

    //Eliminar detalles anteriores
    await connection.query(
      `DELETE FROM encargo_detalles WHERE id_encargo = ?`,
      [id]
    );

    //Insertar nuevos detalles
    for (const { id_materia_prima, cantidad } of materias_primas) {
      await connection.query(
        `INSERT INTO encargo_detalles (id_encargo, id_materia_prima, cantidad)
         VALUES (?, ?, ?)`,
        [id, id_materia_prima, cantidad]
      );
    }

    await connection.commit();
    console.log("✅ Encargo actualizado:", id);
    return res.status(200).json("Encargo actualizado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateEncargo:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

export const listarMateriasPrimas = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id_materia_prima, titulo, categoria, stock
      FROM materiaprima
      ORDER BY titulo ASC
    `);
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error al listar materias primas:", err);
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

//Marcar un encargo como RECIBIDO y actualizar stock
export const markEncargoRecibido = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // id_encargo
    await connection.beginTransaction();

    //Verificar existencia y estado actual
    const [rows] = await connection.query(
      `SELECT estado FROM encargos WHERE id_encargo = ?`,
      [id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json("Encargo no encontrado!");
    }

    const estadoActual = rows[0].estado;
    if (estadoActual === "recibido") {
      await connection.rollback();
      return res
        .status(200)
        .json({ message: "El encargo ya está marcado como recibido." });
    }

    //Obtener detalles del encargo (materias primas y cantidades)
    const [detalles] = await connection.query(
      `SELECT id_materia_prima, cantidad 
       FROM encargo_detalles 
       WHERE id_encargo = ?`,
      [id]
    );

    //Actualizar stock de cada materia prima
    for (const { id_materia_prima, cantidad } of detalles) {
      await connection.query(
        `UPDATE materiaprima 
         SET stock = stock + ? 
         WHERE id_materia_prima = ?`,
        [cantidad, id_materia_prima]
      );
    }

    //Actualizar estado del encargo
    await connection.query(
      `UPDATE encargos SET estado = 'recibido' WHERE id_encargo = ?`,
      [id]
    );

    await connection.commit();
    return res
      .status(200)
      .json({ message: "Encargo marcado como recibido y stock actualizado." });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en markEncargoRecibido:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};
