// controllers/tipotacos.js
import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL || "";
const urlFromKey = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);

export const createTipoTaco = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      id_materia_prima,
      titulo,
      largo_cm,
      ancho_cm,
      espesor_mm,
      precio_unidad,
      stock: cantidadDeseada,
    } = req.body;
    const fotoKey = req.fileR2?.key || null;

    await connection.beginTransaction();

    const [[parent]] = await connection.query(
      `SELECT p.largo_cm, mp.stock
       FROM palos AS p
       JOIN materiaprima AS mp ON p.id_materia_prima = mp.id_materia_prima
       WHERE p.id_materia_prima = ?
       FOR UPDATE`,
      [id_materia_prima]
    );
    if (!parent) throw new Error("Palo padre no encontrado");

    const margen = 0.5;
    const piezasPorPalo = Math.floor(parent.largo_cm / (parseFloat(largo_cm) + margen));
    if (piezasPorPalo <= 0) throw new Error("El largo del taco excede al del palo padre");

    const qty = parseInt(cantidadDeseada, 10) || 0;
    const palosNecesarios = Math.ceil(qty / piezasPorPalo);
    if (parent.stock < palosNecesarios) throw new Error("No hay stock suficiente de palos padre");

    await connection.query(
      `INSERT INTO tipo_tacos
         (id_materia_prima, titulo, largo_cm, ancho_cm, espesor_mm, foto, precio_unidad, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_materia_prima,
        titulo,
        parseFloat(largo_cm),
        parseFloat(ancho_cm),
        parseFloat(espesor_mm),
        fotoKey,
        parseFloat(precio_unidad),
        qty,
      ]
    );

    await connection.query(
      `UPDATE materiaprima SET stock = stock - ? WHERE id_materia_prima = ?`,
      [palosNecesarios, id_materia_prima]
    );

    await connection.commit();
    return res.status(201).json({
      message: "Tipo de taco creado exitosamente!",
      palosConsumidos: palosNecesarios,
      foto_key: fotoKey,
      foto_url: urlFromKey(fotoKey),
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en createTipoTaco:", err);
    return res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
};

export const listTipoTacos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         tt.*,
         mp.titulo AS palo_padre
       FROM tipo_tacos AS tt
       JOIN materiaprima AS mp
         ON tt.id_materia_prima = mp.id_materia_prima
       ORDER BY tt.titulo ASC`
    );
    const withUrls = rows.map((r) => ({ ...r, foto_url: urlFromKey(r.foto) }));
    return res.status(200).json(withUrls);
  } catch (err) {
    console.error("❌ Error en listTipoTacos:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const getTipoTacoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT
         tt.*,
         mp.titulo AS palo_padre,
         mp.foto   AS palo_padre_foto
       FROM tipo_tacos AS tt
       JOIN materiaprima AS mp
         ON tt.id_materia_prima = mp.id_materia_prima
       WHERE tt.id_tipo_taco = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json("Tipo de taco no encontrado!");
    const row = rows[0];
    return res.status(200).json({ ...row, foto_url: urlFromKey(row.foto) });
  } catch (err) {
    console.error("❌ Error en getTipoTacoById:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const updateTipoTaco = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      titulo,
      largo_cm: newLargoCm,
      ancho_cm,
      espesor_mm,
      precio_unidad,
      stock: newStock,
    } = req.body;
    const newFotoKey = req.fileR2?.key || null;

    await connection.beginTransaction();

    const [[oldRec]] = await connection.query(
      `SELECT id_materia_prima, largo_cm AS oldLargo, stock AS oldStock, foto AS oldFoto
       FROM tipo_tacos
       WHERE id_tipo_taco = ?
       FOR UPDATE`,
      [id]
    );
    if (!oldRec) {
      await connection.rollback();
      return res.status(404).json("Tipo de taco no encontrado!");
    }
    const { id_materia_prima, oldLargo, oldStock, oldFoto } = oldRec;

    const [[parent]] = await connection.query(
      `SELECT p.largo_cm AS parentLargo, mp.stock AS parentStock
       FROM palos AS p
       JOIN materiaprima AS mp ON p.id_materia_prima = mp.id_materia_prima
       WHERE p.id_materia_prima = ?
       FOR UPDATE`,
      [id_materia_prima]
    );
    if (!parent) {
      await connection.rollback();
      return res.status(404).json("Palo padre no encontrado!");
    }
    const { parentLargo, parentStock } = parent;

    const margin = 0.5;
    const newLargo = parseFloat(newLargoCm);
    const piecesOld = Math.floor((parentLargo + margin) / (parseFloat(oldLargo) + margin));
    const piecesNew = Math.floor((parentLargo + margin) / (newLargo + margin));
    if (!Number.isFinite(newLargo) || piecesNew < 1) {
      await connection.rollback();
      return res.status(400).json("El largo solicitado supera al del palo padre o es inválido.");
    }

    const newStockI = parseInt(newStock, 10);
    if (!Number.isInteger(newStockI) || newStockI < 0) {
      await connection.rollback();
      return res.status(400).json("Stock inválido.");
    }

    const usedOld = Math.ceil(oldStock / Math.max(piecesOld, 1));
    const usedNew = Math.ceil(newStockI / Math.max(piecesNew, 1));
    const delta = usedNew - usedOld;

    await connection.query(
      `UPDATE materiaprima SET stock = ? WHERE id_materia_prima = ?`,
      [parentStock - delta, id_materia_prima]
    );

    await connection.query(
      `UPDATE tipo_tacos SET
         titulo        = ?,
         largo_cm      = ?,
         ancho_cm      = COALESCE(?, ancho_cm),
         espesor_mm    = COALESCE(?, espesor_mm),
         precio_unidad = COALESCE(?, precio_unidad),
         foto          = COALESCE(?, foto),
         stock         = ?
       WHERE id_tipo_taco = ?`,
      [
        titulo,
        newLargo,
        ancho_cm != null ? parseFloat(ancho_cm) : null,
        espesor_mm != null ? parseFloat(espesor_mm) : null,
        precio_unidad != null ? parseFloat(precio_unidad) : null,
        newFotoKey,
        newStockI,
        id,
      ]
    );

    await connection.commit();

    if (newFotoKey && oldFoto && newFotoKey !== oldFoto) {
      try {
        await r2Delete(oldFoto);
      } catch (e) {
        console.warn("No se pudo borrar la foto antigua en R2:", oldFoto, e?.message);
      }
    }

    return res.status(200).json({
      message: "Tipo de taco actualizado exitosamente!",
      foto_key: newFotoKey || oldFoto || null,
      foto_url: urlFromKey(newFotoKey || oldFoto),
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateTipoTaco:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

export const deleteTipoTaco = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [rows] = await connection.query(
      `SELECT foto FROM tipo_tacos WHERE id_tipo_taco = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json("Tipo de taco no encontrado!");
    const fotoKey = rows[0].foto;

    await connection.beginTransaction();

    const [del] = await connection.query(
      `DELETE FROM tipo_tacos WHERE id_tipo_taco = ?`,
      [id]
    );
    if (del.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json("Tipo de taco no encontrado!");
    }

    await connection.commit();

    if (fotoKey) {
      try {
        await r2Delete(fotoKey);
      } catch (e) {
        console.warn("No se pudo borrar la foto en R2:", fotoKey, e?.message);
      }
    }

    return res.status(200).json("Tipo de taco eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteTipoTaco:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};
