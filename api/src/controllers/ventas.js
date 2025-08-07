import { pool } from "../db.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ============================================================
   🔹 CREAR VENTA
============================================================ */
export const createVenta = async (req, res) => {
  try {
    const { fecha_realizada, precio_total, id_cliente, comentarios } = req.body;
    const foto = req.file?.filename || null;

    if (!fecha_realizada) {
      return res.status(400).json({ error: "La fecha de la venta es obligatoria." });
    }
    if (!precio_total || isNaN(precio_total)) {
      return res.status(400).json({ error: "El precio total es obligatorio y debe ser numérico." });
    }

    // ✅ Verificar cliente si se proporciona
    if (id_cliente) {
      const [cliente] = await pool.query(`SELECT id_cliente FROM clientes WHERE id_cliente = ?`, [id_cliente]);
      if (cliente.length === 0) {
        return res.status(400).json({ error: "El cliente seleccionado no existe." });
      }
    }

    const insertSQL = `
      INSERT INTO ventas (fecha_realizada, precio_total, id_cliente, foto, comentarios)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertSQL, [
      fecha_realizada,
      parseFloat(precio_total),
      id_cliente || null,
      foto,
      comentarios || null
    ]);

    return res.status(201).json({ id_venta: result.insertId, message: "Venta creada exitosamente!" });
  } catch (err) {
    console.error("❌ Error en createVenta:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

/* ============================================================
   🔹 OBTENER VENTA POR ID
============================================================ */
export const getVentaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT v.*, c.nombre AS nombre_cliente, c.apellido AS apellido_cliente
       FROM ventas v
       LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
       WHERE v.id_venta = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json("Venta no encontrada!");
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getVentaById:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

/* ============================================================
   🔹 ACTUALIZAR VENTA
============================================================ */
export const updateVenta = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { fecha_realizada, precio_total, id_cliente, comentarios } = req.body;
    const newFoto = req.file?.filename || null;

    // ✅ Verificar existencia de venta
    const [exists] = await connection.query(`SELECT foto FROM ventas WHERE id_venta = ?`, [id]);
    if (exists.length === 0) {
      return res.status(404).json("Venta no encontrada!");
    }
    const oldFoto = exists[0].foto;

    // ✅ Verificar cliente si se pasa
    if (id_cliente) {
      const [cliente] = await connection.query(`SELECT id_cliente FROM clientes WHERE id_cliente = ?`, [id_cliente]);
      if (cliente.length === 0) {
        return res.status(400).json({ error: "El cliente especificado no existe." });
      }
    }

    await connection.beginTransaction();

    const updateSQL = `
      UPDATE ventas SET
        fecha_realizada = ?,
        precio_total = ?,
        id_cliente = ?,
        foto = COALESCE(?, foto),
        comentarios = ?
      WHERE id_venta = ?
    `;

    await connection.query(updateSQL, [
      fecha_realizada,
      parseFloat(precio_total),
      id_cliente || null,
      newFoto,
      comentarios || null,
      id
    ]);

    await connection.commit();

    // ✅ Borrar foto antigua si se reemplazó
    if (newFoto && oldFoto) {
      const oldPath = path.join(__dirname, "../images/ventas", oldFoto);
      fs.unlink(oldPath).catch(() => console.warn("⚠️ No se pudo borrar la foto antigua:", oldFoto));
    }

    return res.status(200).json("Venta actualizada correctamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateVenta:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  } finally {
    connection.release();
  }
};

/* ============================================================
   🔹 ELIMINAR VENTA
============================================================ */
export const deleteVenta = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    // ✅ Obtener foto antes de borrar
    const [rows] = await connection.query(`SELECT foto FROM ventas WHERE id_venta = ?`, [id]);
    if (rows.length === 0) return res.status(404).json("Venta no encontrada!");
    const foto = rows[0].foto;

    await connection.beginTransaction();
    await connection.query(`DELETE FROM ventas WHERE id_venta = ?`, [id]);
    await connection.commit();

    // ✅ Borrar foto si existe
    if (foto) {
      const filePath = path.join(__dirname, "../images/ventas", foto);
      fs.unlink(filePath).catch(() => console.warn("⚠️ No se pudo borrar foto:", foto));
    }

    return res.status(200).json("Venta eliminada correctamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteVenta:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  } finally {
    connection.release();
  }
};

/* ============================================================
   🔹 LISTAR TODAS LAS VENTAS
============================================================ */
export const listVentas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.*, c.nombre AS nombre_cliente, c.apellido AS apellido_cliente
       FROM ventas v
       LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
       ORDER BY v.fecha_realizada DESC`
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listVentas:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};
