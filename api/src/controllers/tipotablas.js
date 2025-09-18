// controllers/tipotablas.js
import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

export const createTipoTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      id_materia_prima,
      titulo,
      largo_cm,
      ancho_cm,
      espesor_mm,
      precio_unidad,
      cepillada,
      stock
    } = req.body;

    const foto = req.fileR2?.url || null;

    await connection.beginTransaction();

    const [[parent]] = await connection.query(
      `SELECT t.largo_cm AS parentLargo, mp.stock AS parentStock
       FROM tablas t
       JOIN materiaprima mp ON t.id_materia_prima = mp.id_materia_prima
       WHERE t.id_materia_prima = ?
       FOR UPDATE`,
      [id_materia_prima]
    );
    if (!parent) throw new Error("Tabla padre no encontrada");

    const margen = 0.5;
    const piezasPorTabla = Math.floor(parent.parentLargo / (parseFloat(largo_cm) + margen));
    if (piezasPorTabla <= 0) throw new Error("El largo del tipo excede al de la tabla padre");

    const cantidadDeseada = parseInt(stock, 10);
    const tablasNecesarias = Math.ceil(cantidadDeseada / piezasPorTabla);
    if (parent.parentStock < tablasNecesarias) throw new Error("No hay stock suficiente de tablas padre");

    await connection.query(
      `INSERT INTO tipo_tablas
       (id_materia_prima, titulo, largo_cm, ancho_cm, espesor_mm, foto, precio_unidad, cepillada, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_materia_prima,
        titulo,
        parseFloat(largo_cm),
        parseFloat(ancho_cm),
        parseFloat(espesor_mm),
        foto,
        parseFloat(precio_unidad),
        cepillada === "1" ? 1 : 0,
        cantidadDeseada
      ]
    );

    await connection.query(
      `UPDATE materiaprima SET stock = stock - ? WHERE id_materia_prima = ?`,
      [tablasNecesarias, id_materia_prima]
    );

    await connection.commit();
    return res.status(201).json({ message: "Tipo de tabla creado exitosamente!", tablasConsumidas: tablasNecesarias });
  } catch (err) {
    await connection.rollback();
    return res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
};

export const getTipoTablaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT tt.*, mp.titulo AS tabla_padre, mp.foto AS tabla_padre_foto
       FROM tipo_tablas tt
       JOIN materiaprima mp ON tt.id_materia_prima = mp.id_materia_prima
       WHERE tt.id_tipo_tabla = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json("Tipo de tabla no encontrado!");
    return res.status(200).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const updateTipoTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      titulo,
      largo_cm: newLargoCm,
      ancho_cm,
      espesor_mm,
      precio_unidad,
      cepillada,
      stock: newStock
    } = req.body;

    const newFoto = req.fileR2?.url || null;
    const newLargo = parseFloat(newLargoCm);
    const newStockI = parseInt(newStock, 10);
    const cep = cepillada === "1" ? 1 : 0;

    await connection.beginTransaction();

    const [[old]] = await connection.query(
      `SELECT id_materia_prima, largo_cm AS oldLargo, stock AS oldStock, foto
       FROM tipo_tablas
       WHERE id_tipo_tabla = ?
       FOR UPDATE`,
      [id]
    );
    if (!old) {
      await connection.rollback();
      return res.status(404).json("Tipo de tabla no encontrado!");
    }

    const { id_materia_prima, oldLargo, oldStock, foto: oldFoto } = old;

    const [[parent]] = await connection.query(
      `SELECT t.largo_cm AS parentLargo, mp.stock AS parentStock
       FROM tablas t
       JOIN materiaprima mp ON t.id_materia_prima = mp.id_materia_prima
       WHERE t.id_materia_prima = ?
       FOR UPDATE`,
      [id_materia_prima]
    );
    if (!parent) {
      await connection.rollback();
      return res.status(404).json("Tabla padre no encontrada!");
    }

    const margin = 0.5;
    const pOld = Math.floor((parent.parentLargo + margin) / (oldLargo + margin));
    const pNew = Math.floor((parent.parentLargo + margin) / (newLargo + margin));
    if (pNew < 1) {
      await connection.rollback();
      return res.status(400).json("El largo solicitado supera al de la tabla padre.");
    }

    const parentsUsedOld = Math.ceil(oldStock / pOld);
    const parentsUsedNew = Math.ceil(newStockI / pNew);
    const deltaParents = parentsUsedNew - parentsUsedOld;

    await connection.query(
      `UPDATE materiaprima SET stock = ? WHERE id_materia_prima = ?`,
      [parent.parentStock - deltaParents, id_materia_prima]
    );

    await connection.query(
      `UPDATE tipo_tablas SET
         titulo = ?,
         largo_cm = ?,
         ancho_cm = ?,
         espesor_mm = ?,
         foto = COALESCE(?, foto),
         precio_unidad = ?,
         cepillada = ?,
         stock = ?
       WHERE id_tipo_tabla = ?`,
      [
        titulo,
        newLargo,
        parseFloat(ancho_cm),
        parseFloat(espesor_mm),
        newFoto,
        parseFloat(precio_unidad),
        cep,
        newStockI,
        id
      ]
    );

    await connection.commit();

    if (newFoto && oldFoto) {
      await r2Delete(oldFoto);
    }

    return res.status(200).json("Tipo de tabla actualizado exitosamente!");
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

export const deleteTipoTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [rows] = await connection.query(
      "SELECT foto FROM tipo_tablas WHERE id_tipo_tabla = ?",
      [id]
    );
    if (rows.length === 0) return res.status(404).json("Tipo de tabla no encontrado!");
    const foto = rows[0].foto;

    await connection.beginTransaction();
    const [del] = await connection.query(
      "DELETE FROM tipo_tablas WHERE id_tipo_tabla = ?",
      [id]
    );
    if (del.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json("Tipo de tabla no encontrado!");
    }
    await connection.commit();

    if (foto) {
      await r2Delete(foto);
    }

    return res.status(200).json("Tipo de tabla eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

export const listTipoTablas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT tt.*, mp.titulo AS tabla_padre
       FROM tipo_tablas tt
       JOIN materiaprima mp ON tt.id_materia_prima = mp.id_materia_prima
       ORDER BY tt.titulo ASC`
    );
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
