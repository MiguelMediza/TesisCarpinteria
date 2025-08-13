import { pool } from "../db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📌 Configuración de consumo
const TABLES_PER_PATIN = 1;
const TACOS_PER_PATIN = 3;

/* ============================================================
   🔹 CREAR TIPO DE PATÍN (Controlando y guardando stock)
============================================================ */
export const createTipoPatin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_tipo_tabla, id_tipo_taco, titulo, medidas, precio_unidad, comentarios, stock } = req.body;
    const cantidad = parseInt(stock, 10) || 0;
    const logo = req.file?.filename || null;

    await connection.beginTransaction();

    // ✅ Verificar stock de tabla
    const [[tabla]] = await connection.query(
      `SELECT stock FROM tipo_tablas WHERE id_tipo_tabla = ? FOR UPDATE`,
      [id_tipo_tabla]
    );
    if (!tabla) throw new Error("Tipo de tabla padre no encontrado");

    // ✅ Verificar stock de tacos
    const [[taco]] = await connection.query(
      `SELECT stock FROM tipo_tacos WHERE id_tipo_taco = ? FOR UPDATE`,
      [id_tipo_taco]
    );
    if (!taco) throw new Error("Tipo de taco padre no encontrado");

    const tablasNecesarias = cantidad * TABLES_PER_PATIN;
    const tacosNecesarios = cantidad * TACOS_PER_PATIN;

      // ✅ Si se aumenta el stock, verificar disponibilidad
      
        const faltaTabla = tabla.stock < tablasNecesarias;
        const faltaTaco  = taco.stock < tacosNecesarios;

        if (faltaTabla && faltaTaco) {
          throw new Error("Stock insuficiente: tanto las tablas como los tacos no tienen stock suficiente");
        } else if (faltaTabla) {
          throw new Error("Stock insuficiente de tablas");
        } else if (faltaTaco) {
          throw new Error("Stock insuficiente de tacos");
        }
      


    // ✅ Insertar patín incluyendo su stock
    await connection.query(
      `INSERT INTO tipo_patines 
        (id_tipo_tabla, id_tipo_taco, titulo, medidas, logo, precio_unidad, comentarios, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_tipo_tabla,
        id_tipo_taco,
        titulo,
        medidas || "",
        logo,
        parseFloat(precio_unidad) || 0,
        comentarios || "",
        cantidad
      ]
    );

    // ✅ Descontar stock de tablas y tacos
    await connection.query(`UPDATE tipo_tablas SET stock = stock - ? WHERE id_tipo_tabla = ?`, [
      tablasNecesarias,
      id_tipo_tabla
    ]);
    await connection.query(`UPDATE tipo_tacos SET stock = stock - ? WHERE id_tipo_taco = ?`, [
      tacosNecesarios,
      id_tipo_taco
    ]);

    await connection.commit();
    return res.status(201).json({ message: "Tipo de patín creado exitosamente!" });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en createTipoPatin:", err);
    return res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
};

/* ============================================================
   🔹 OBTENER TIPO DE PATÍN POR ID
============================================================ */
export const getTipoPatinById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT p.*, tt.titulo AS tabla_padre, tc.titulo AS taco_padre
       FROM tipo_patines AS p
       JOIN tipo_tablas AS tt ON p.id_tipo_tabla = tt.id_tipo_tabla
       JOIN tipo_tacos  AS tc ON p.id_tipo_taco  = tc.id_tipo_taco
       WHERE p.id_tipo_patin = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json("Tipo de patín no encontrado!");
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getTipoPatinById:", err);
    return res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   🔹 ACTUALIZAR TIPO DE PATÍN (Reajustando stock)
============================================================ */
export const updateTipoPatin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { id_tipo_tabla, id_tipo_taco, titulo, medidas, precio_unidad, comentarios, stock } = req.body;
    const newCantidad = parseInt(stock, 10) || 0;
    const newLogo = req.file?.filename || null;

    await connection.beginTransaction();

    // ✅ Obtener datos antiguos
    const [[old]] = await connection.query(
      `SELECT id_tipo_tabla, id_tipo_taco, stock, logo 
       FROM tipo_patines WHERE id_tipo_patin = ? FOR UPDATE`,
      [id]
    );
    if (!old) {
      await connection.rollback();
      return res.status(404).json("Tipo de patín no encontrado!");
    }
    const oldCantidad = old.stock;

    // ✅ Bloquear y verificar stock de tabla y tacos
    const [[tabla]] = await connection.query(`SELECT stock FROM tipo_tablas WHERE id_tipo_tabla = ? FOR UPDATE`, [
      id_tipo_tabla
    ]);
    if (!tabla) throw new Error("Tipo de tabla padre no encontrado");

    const [[taco]] = await connection.query(`SELECT stock FROM tipo_tacos WHERE id_tipo_taco = ? FOR UPDATE`, [
      id_tipo_taco
    ]);
    if (!taco) throw new Error("Tipo de taco padre no encontrado");

    // ✅ Calcular diferencia de consumo
    const delta = newCantidad - oldCantidad;
    const tablasNecesarias = delta * TABLES_PER_PATIN;
    const tacosNecesarios = delta * TACOS_PER_PATIN;

    // ✅ Si se aumenta el stock, verificar disponibilidad
    if (delta > 0) {
      const faltaTabla = tabla.stock < tablasNecesarias;
      const faltaTaco  = taco.stock < tacosNecesarios;

      if (faltaTabla && faltaTaco) {
        throw new Error("Stock insuficiente: tanto las tablas como los tacos no tienen stock suficiente");
      } else if (faltaTabla) {
        throw new Error("Stock insuficiente de tablas");
      } else if (faltaTaco) {
        throw new Error("Stock insuficiente de tacos");
      }
    }


    // ✅ Actualizar stock de los padres
    await connection.query(`UPDATE tipo_tablas SET stock = stock - ? WHERE id_tipo_tabla = ?`, [
      tablasNecesarias,
      id_tipo_tabla
    ]);
    await connection.query(`UPDATE tipo_tacos SET stock = stock - ? WHERE id_tipo_taco = ?`, [
      tacosNecesarios,
      id_tipo_taco
    ]);

    // ✅ Actualizar el registro del patín incluyendo nuevo stock
    await connection.query(
      `UPDATE tipo_patines SET 
         id_tipo_tabla = ?, id_tipo_taco = ?, titulo = ?, medidas = ?, 
         logo = COALESCE(?, logo), precio_unidad = ?, comentarios = ?, stock = ? 
       WHERE id_tipo_patin = ?`,
      [
        id_tipo_tabla,
        id_tipo_taco,
        titulo,
        medidas || "",
        newLogo,
        parseFloat(precio_unidad) || 0,
        comentarios || "",
        newCantidad,
        id
      ]
    );

    await connection.commit();

    // ✅ Borrar logo viejo si se reemplazó
    if (newLogo && old.logo) {
      const oldPath = path.join(__dirname, "../images/tipo_patines", old.logo);
      fs.unlink(oldPath).catch(() => console.warn("⚠️ No se pudo borrar logo antiguo:", old.logo));
    }

    return res.status(200).json("Tipo de patín actualizado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateTipoPatin:", err);
    return res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
};

/* ============================================================
   🔹 ELIMINAR TIPO DE PATÍN
============================================================ */
export const deleteTipoPatin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const [rows] = await connection.query(`SELECT logo FROM tipo_patines WHERE id_tipo_patin = ?`, [id]);
    if (rows.length === 0) return res.status(404).json("Tipo de patín no encontrado!");
    const logo = rows[0].logo;

    await connection.beginTransaction();
    const [del] = await connection.query(`DELETE FROM tipo_patines WHERE id_tipo_patin = ?`, [id]);
    if (del.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json("Tipo de patín no encontrado!");
    }
    await connection.commit();

    if (logo) {
      const filePath = path.join(__dirname, "../images/tipo_patines", logo);
      fs.unlink(filePath).catch(() => console.warn("⚠️ No se pudo borrar logo:", logo));
    }

    return res.status(200).json("Tipo de patín eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteTipoPatin:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

/* ============================================================
   🔹 LISTAR TODOS LOS TIPOS DE PATINES
============================================================ */
export const listTipoPatines = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, tt.titulo AS tabla_padre, tc.titulo AS taco_padre
       FROM tipo_patines AS p
       JOIN tipo_tablas AS tt ON p.id_tipo_tabla = tt.id_tipo_tabla
       JOIN tipo_tacos  AS tc ON p.id_tipo_taco = tc.id_tipo_taco
       ORDER BY p.titulo ASC`
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listTipoPatines:", err);
    return res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   🔹 LISTAR PATINES (simple para selects)
   GET /api/src/tipopatines/select
============================================================ */
export const listTipoPatinesSelect = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id_tipo_patin,
        COALESCE(titulo, CONCAT('Patín #', id_tipo_patin)) AS titulo,
        medidas
      FROM tipo_patines
      ORDER BY COALESCE(titulo, '') ASC, id_tipo_patin ASC
    `);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listTipoPatinesSelect:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
