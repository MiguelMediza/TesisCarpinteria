import { pool } from "../db.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    //Verificar cliente
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

export const updateVenta = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { fecha_realizada, precio_total, id_cliente, comentarios } = req.body;
    const newFoto = req.file?.filename || null;

    //Verificar existencia de venta
    const [exists] = await connection.query(`SELECT foto FROM ventas WHERE id_venta = ?`, [id]);
    if (exists.length === 0) {
      return res.status(404).json("Venta no encontrada!");
    }
    const oldFoto = exists[0].foto;

    //Verificar cliente si se pasa
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

    //Borrar foto antigua si se reemplazó
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

export const deleteVenta = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    // Obtener foto antes de borrar
    const [rows] = await connection.query(`SELECT foto FROM ventas WHERE id_venta = ?`, [id]);
    if (rows.length === 0) return res.status(404).json("Venta no encontrada!");
    const foto = rows[0].foto;

    await connection.beginTransaction();
    await connection.query(`DELETE FROM ventas WHERE id_venta = ?`, [id]);
    await connection.commit();

    // Borrar foto si existe
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

export const listVentas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        v.id_venta,
        v.fecha_realizada,
        v.precio_total,
        v.id_cliente,
        v.comentarios,
        v.foto,
        c.es_empresa,
        c.nombre           AS nombre_cliente,
        c.apellido         AS apellido_cliente,
        c.nombre_empresa   AS empresa_cliente,
        c.estado           AS cliente_activo  
      FROM ventas v
      LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
      ORDER BY v.fecha_realizada DESC, v.id_venta DESC
      `
    );

    const ventas = rows.map(r => {
      const display = r?.es_empresa
        ? (r?.empresa_cliente || `Empresa #${r.id_cliente}`)
        : [r?.nombre_cliente, r?.apellido_cliente].filter(Boolean).join(" ") || `Cliente #${r.id_cliente}`;

      // si hay id_cliente pero estado=0 => eliminado lógico
      // si no hay registro de cliente (null) => tratar como eliminado/no disponible
      const eliminado = r?.id_cliente
        ? (r?.cliente_activo === 0 || r?.cliente_activo === false)
        : true;

      return {
        ...r,
        cliente_display: display,
        cliente_eliminado: eliminado,
      };
    });

    res.status(200).json(ventas);
  } catch (err) {
    console.error("❌ listVentas:", err);
    res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

