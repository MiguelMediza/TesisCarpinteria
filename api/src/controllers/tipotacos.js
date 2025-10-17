import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";
const MARGIN = 0.5; //Margen en cm entre piezas al cortar
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

    const piezasPorPalo = Math.floor(parent.largo_cm / (parseFloat(largo_cm) + MARGIN));
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


    const toFloatOrNull = (v) => (v == null || v === "" ? null : parseFloat(v));
    const toIntOrNull   = (v) => (v == null || v === "" ? null : parseInt(v, 10));

    const newLargo  = parseFloat(newLargoCm);
    const newAncho  = toFloatOrNull(ancho_cm);
    const newEspesor= toFloatOrNull(espesor_mm);
    const newPrecio = toFloatOrNull(precio_unidad);
    const newStockI = parseInt(newStock, 10);

    if (!Number.isFinite(newLargo) || newLargo <= 0) {
      return res.status(400).json({ message: "Largo inválido." });
    }
    if (!Number.isInteger(newStockI) || newStockI < 0) {
      return res.status(400).json({ message: "Stock inválido." });
    }

    await connection.beginTransaction();

    // Bloqueo el tipo a editar
    const [[oldRec]] = await connection.query(
      `SELECT id_materia_prima, largo_cm AS oldLargo, stock AS oldStock, foto AS oldFoto
       FROM tipo_tacos
       WHERE id_tipo_taco = ?
       FOR UPDATE`,
      [id]
    );
    if (!oldRec) {
      await connection.rollback();
      return res.status(404).json({ message: "Tipo de taco no encontrado!" });
    }
    const { id_materia_prima, oldLargo, oldStock, oldFoto } = oldRec;

    // Bloqueo el padre (palo) + stock actual
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
      return res.status(404).json({ message: "Palo padre no encontrado!" });
    }
    const parentLargo = parseFloat(parent.parentLargo);
    const parentStock = parseInt(parent.parentStock, 10);

    const piecesOld = Math.floor(parentLargo / (parseFloat(oldLargo) + MARGIN));
    const piecesNew = Math.floor(parentLargo / (newLargo + MARGIN));
    if (piecesNew < 1) {
      await connection.rollback();
      return res.status(400).json({ message: "El largo solicitado supera al del palo padre." });
    }
    if (piecesOld < 1 && oldStock > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Datos previos inválidos (piecesOld < 1 con stock existente)." });
    }

    // Tablas/palos usados antes vs después
    const usedOld = oldStock > 0 ? Math.ceil(oldStock / Math.max(piecesOld, 1)) : 0;
    const usedNew = newStockI > 0 ? Math.ceil(newStockI / Math.max(piecesNew, 1)) : 0;
    const delta   = usedNew - usedOld;

    if (delta > 0) {
      if (parentStock < delta) {
        await connection.rollback();
        return res.status(409).json({
          code: "STOCK_INSUFICIENTE",
          message: "Stock insuficiente de palos padre.",
          detalles: {
            requerido_adicional: delta,
            disponible: parentStock,
            piezas_por_palo_nueva: piecesNew
          }
        });
      }

      const [upd] = await connection.query(
        `UPDATE materiaprima
         SET stock = stock - ?
         WHERE id_materia_prima = ? AND stock >= ?`,
        [delta, id_materia_prima, delta]
      );
      if (upd.affectedRows !== 1) {
        await connection.rollback();
        return res.status(409).json({
          message: "Stock insuficiente de palos padre (carrera detectada). Intenta nuevamente."
        });
      }
    }

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
        newAncho,
        newEspesor,
        newPrecio,
        newFotoKey,
        newStockI,
        id,
      ]
    );

    await connection.commit();

    // Limpieza de foto vieja fuera de la tx
    if (newFotoKey && oldFoto && newFotoKey !== oldFoto) {
      try { await r2Delete(oldFoto); } catch (e) { console.warn("No se pudo borrar la foto antigua en R2:", oldFoto, e?.message); }
    }

    return res.status(200).json({
      message: "Tipo de taco actualizado exitosamente!",
      foto_key: newFotoKey || oldFoto || null,
      foto_url: urlFromKey(newFotoKey || oldFoto),
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
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

    const [[row]] = await connection.query(
      `SELECT foto FROM tipo_tacos WHERE id_tipo_taco = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ message: "Tipo de taco no encontrado!" });
    const fotoKey = row.foto || null;

    const [refsProt] = await connection.query(
      `
      SELECT 
        pp.id_prototipo,
        COALESCE(NULLIF(TRIM(pp.titulo), ''), CONCAT('Prototipo #', pp.id_prototipo)) AS titulo
      FROM prototipo_tipo_tacos ptt
      JOIN prototipo_pallet pp ON pp.id_prototipo = ptt.id_prototipo
      WHERE ptt.id_tipo_taco = ?
      LIMIT 12
      `,
      [id]
    );

    const [refsPat] = await connection.query(
      `
      SELECT 
        tp.id_tipo_patin,
        COALESCE(NULLIF(TRIM(tp.titulo), ''), CONCAT('Patín #', tp.id_tipo_patin)) AS titulo
      FROM tipo_patines tp
      WHERE tp.id_tipo_taco = ?
      LIMIT 12
      `,
      [id]
    );

    if (refsProt.length || refsPat.length) {
      return res.status(409).json({
        code: "ROW_REFERENCED",
        message: "No se puede eliminar: el tipo de taco está referenciado por otros registros.",
        prototipos: refsProt.map(r => r.titulo),  
        patines: refsPat.map(r => r.titulo),      
        count: refsProt.length + refsPat.length,
      });
    }

    await connection.beginTransaction();
    const [del] = await connection.query(
      `DELETE FROM tipo_tacos WHERE id_tipo_taco = ?`,
      [id]
    );
    if (del.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Tipo de taco no encontrado!" });
    }
    await connection.commit();

    if (fotoKey) {
      try { await r2Delete(fotoKey); }
      catch (e) { console.warn("No se pudo borrar la foto en R2:", fotoKey, e?.message); }
    }

    return res.status(200).json({ message: "Tipo de taco eliminado exitosamente!" });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    if (err?.errno === 1451 || err?.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        code: "ROW_REFERENCED",
        message: "No se puede eliminar: el tipo de taco está referenciado por otros registros.",
      });
    }
    console.error("❌ Error en deleteTipoTaco:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};
