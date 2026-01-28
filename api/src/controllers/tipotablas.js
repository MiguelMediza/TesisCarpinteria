import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";

const MARGIN = 0.5; // Margen en cm entre piezas al cortar
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL || "";
const toPublicUrl = (v) => {
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `${PUBLIC_BASE.replace(/\/+$/, "")}/${String(v).replace(/^\/+/, "")}`;
};

export const createTipoTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      id_materia_prima,
      titulo,
      largo_cm,
      ancho_cm,
      espesor_mm,
      cepillada,
      stock,
      piezas_por_tabla, // ⭐ NUEVO
    } = req.body;

    const fotoKey = req.fileR2?.key || null;

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

    const parentLargo = parseFloat(parent.parentLargo);
    const parentStock = parseInt(parent.parentStock, 10);

    const largoHijo = parseFloat(largo_cm);
    if (!Number.isFinite(largoHijo) || largoHijo <= 0) {
      throw new Error("Largo inválido.");
    }

    const piezasCalc = Math.floor(
      parentLargo / (largoHijo + MARGIN)
    );
    if (piezasCalc <= 0) {
      throw new Error("El largo del tipo excede al de la tabla padre");
    }

    let piezasFinal = piezasCalc;
    const piezasBody = parseInt(piezas_por_tabla, 10);
    if (Number.isInteger(piezasBody) && piezasBody > 0) {
      piezasFinal = piezasBody;
    }

    const cantidadDeseada = parseInt(stock, 10);
    if (!Number.isInteger(cantidadDeseada) || cantidadDeseada < 0) {
      throw new Error("Stock inválido.");
    }

    const tablasNecesarias =
      piezasFinal > 0
        ? Math.ceil(cantidadDeseada / piezasFinal)
        : Infinity;

    if (!Number.isFinite(tablasNecesarias) || tablasNecesarias <= 0) {
      throw new Error(
        "No se pueden obtener piezas desde la tabla padre con los datos proporcionados."
      );
    }

    if (parentStock < tablasNecesarias) {
      throw new Error("No hay stock suficiente de tablas padre");
    }

    await connection.query(
      `INSERT INTO tipo_tablas
       (id_materia_prima, titulo, largo_cm, ancho_cm, espesor_mm, piezas_por_tabla, foto, cepillada, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_materia_prima,
        titulo,
        parseFloat(largo_cm),
        parseFloat(ancho_cm),
        parseFloat(espesor_mm),
        piezasFinal,
        fotoKey,
        cepillada === "1" ? 1 : 0,
        cantidadDeseada,
      ]
    );

    await connection.query(
      `UPDATE materiaprima SET stock = stock - ? WHERE id_materia_prima = ?`,
      [tablasNecesarias, id_materia_prima]
    );

    await connection.commit();
    return res.status(201).json({
      message: "Tipo de tabla creado exitosamente!",
      tablasConsumidas: tablasNecesarias,
      piezas_por_tabla: piezasFinal,
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ createTipoTabla:", err);
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
    if (rows.length === 0)
      return res.status(404).json("Tipo de tabla no encontrado!");

    const row = rows[0];
    return res.status(200).json({
      ...row,
      foto_url: toPublicUrl(row.foto),
      tabla_padre_foto_url: toPublicUrl(row.tabla_padre_foto),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
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
      cepillada,
      stock: newStock,
      borrar_foto,
      piezas_por_tabla: newPiezasBody, // ⭐ NUEVO
    } = req.body;

    const newFotoKey = req.fileR2?.key || null;
    const newLargo = parseFloat(newLargoCm);
    const newAncho = parseFloat(ancho_cm);
    const newEspesor = parseFloat(espesor_mm);
    const newStockI = parseInt(newStock, 10);
    const cep = cepillada === "1" ? 1 : 0;
    const newPiezasParsed = parseInt(newPiezasBody, 10);

    if (!Number.isFinite(newLargo) || newLargo <= 0) {
      return res.status(400).json({ message: "Largo inválido." });
    }
    if (!Number.isFinite(newAncho) || newAncho <= 0) {
      return res.status(400).json({ message: "Ancho inválido." });
    }
    if (!Number.isFinite(newEspesor) || newEspesor <= 0) {
      return res.status(400).json({ message: "Espesor inválido." });
    }
    if (!Number.isInteger(newStockI) || newStockI < 0) {
      return res.status(400).json({ message: "Stock inválido." });
    }

    await connection.beginTransaction();

    const [[old]] = await connection.query(
      `SELECT id_materia_prima, largo_cm AS oldLargo, stock AS oldStock, foto, piezas_por_tabla
       FROM tipo_tablas
       WHERE id_tipo_tabla = ?
       FOR UPDATE`,
      [id]
    );
    if (!old) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "Tipo de tabla no encontrado." });
    }

    const {
      id_materia_prima,
      oldLargo,
      oldStock,
      foto: oldFoto,
      piezas_por_tabla: oldPiezas,
    } = old;

    const [[parent]] = await connection.query(
      `SELECT t.largo_cm AS parentLargo, mp.stock AS parentStock
       FROM tablas t
       JOIN materiaprima mp ON mp.id_materia_prima = t.id_materia_prima
       WHERE t.id_materia_prima = ?
       FOR UPDATE`,
      [id_materia_prima]
    );
    if (!parent) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "Tabla padre no encontrada." });
    }

    const parentLargo = parseFloat(parent.parentLargo);
    const parentStock = parseInt(parent.parentStock, 10);

    // cálculo automático por largo (para fallback)
    const pOldCalc = Math.floor(
      parentLargo / (parseFloat(oldLargo) + MARGIN)
    );
    const pNewCalc = Math.floor(
      parentLargo / (newLargo + MARGIN)
    );

    if (pNewCalc < 1) {
      await connection.rollback();
      return res.status(400).json({
        message: "El largo solicitado supera al de la tabla padre.",
      });
    }
    if (pOldCalc < 1 && oldStock > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "Datos previos inválidos: pOld < 1 con stock existente.",
      });
    }

    const piezasOld =
      Number.isInteger(oldPiezas) && oldPiezas > 0 ? oldPiezas : pOldCalc;
    const piezasNewCandidate =
      Number.isInteger(newPiezasParsed) && newPiezasParsed > 0
        ? newPiezasParsed
        : pNewCalc;

    if (piezasNewCandidate <= 0) {
      await connection.rollback();
      return res.status(400).json({
        message:
          "Piezas por tabla resultante inválida. Verifique largo y piezas configuradas.",
      });
    }

    const parentsUsedOld =
      oldStock > 0 ? Math.ceil(oldStock / Math.max(piezasOld, 1)) : 0;
    const parentsUsedNew =
      newStockI > 0
        ? Math.ceil(newStockI / Math.max(piezasNewCandidate, 1))
        : 0;
    const deltaParents = parentsUsedNew - parentsUsedOld;

    if (deltaParents > 0) {
      if (parentStock < deltaParents) {
        await connection.rollback();
        return res.status(409).json({
          message: "Stock insuficiente de tablas padre.",
          detalles: {
            requerido_adicional: deltaParents,
            disponible: parentStock,
            piezas_por_tabla_nueva: piezasNewCandidate,
          },
        });
      }

      const [upd] = await connection.query(
        `UPDATE materiaprima
         SET stock = stock - ?
         WHERE id_materia_prima = ? AND stock >= ?`,
        [deltaParents, id_materia_prima, deltaParents]
      );
      if (upd.affectedRows !== 1) {
        await connection.rollback();
        return res.status(409).json({
          message:
            "Stock insuficiente de tablas padre (carrera detectada). Intenta nuevamente.",
        });
      }
    }

    const sets = [
      "titulo = ?",
      "largo_cm = ?",
      "ancho_cm = ?",
      "espesor_mm = ?",
      "piezas_por_tabla = ?",
      "cepillada = ?",
      "stock = ?",
    ];
    const vals = [
      titulo,
      newLargo,
      newAncho,
      newEspesor,
      piezasNewCandidate,
      cep,
      newStockI,
    ];

    if (borrar_foto === "1" && !newFotoKey) {
      sets.push("foto = NULL");
    } else if (newFotoKey) {
      sets.push("foto = ?");
      vals.push(newFotoKey);
    }

    const sqlUpd = `UPDATE tipo_tablas SET ${sets.join(
      ", "
    )} WHERE id_tipo_tabla = ?`;
    vals.push(id);
    await connection.query(sqlUpd, vals);

    await connection.commit();

    if (borrar_foto === "1" && oldFoto) {
      try {
        await r2Delete(oldFoto);
      } catch (e) {
        console.warn("R2 delete (borrar_foto):", e?.message);
      }
    } else if (newFotoKey && oldFoto && newFotoKey !== oldFoto) {
      try {
        await r2Delete(oldFoto);
      } catch (e) {
        console.warn("R2 delete (reemplazo):", e?.message);
      }
    }

    return res.status(200).json({
      message: "Tipo de tabla actualizado exitosamente!",
      piezas_por_tabla: piezasNewCandidate,
    });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}
    console.error("❌ updateTipoTabla error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};


export const deleteTipoTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [[row]] = await connection.query(
      "SELECT foto FROM tipo_tablas WHERE id_tipo_tabla = ?",
      [id]
    );
    if (!row)
      return res
        .status(404)
        .json({ message: "Tipo de tabla no encontrado!" });
    const fotoKey = row.foto || null;

    const [protRefs] = await connection.query(
      `
      SELECT pp.id_prototipo,
             COALESCE(NULLIF(TRIM(pp.titulo), ''), CONCAT('Prototipo #', pp.id_prototipo)) AS titulo
      FROM prototipo_tipo_tablas ptt
      JOIN prototipo_pallet pp ON pp.id_prototipo = ptt.id_prototipo
      WHERE ptt.id_tipo_tabla = ?
      LIMIT 5
      `,
      [id]
    );
    if (protRefs.length > 0) {
      const titulos = protRefs.map((r) => r.titulo).join(", ");
      return res.status(409).json({
        code: "REFERENCED_IN_PROTOTIPO",
        message: `No se puede eliminar: este tipo de tabla está usado en ${
          protRefs.length > 1 ? "los prototipos" : "el prototipo"
        } ${titulos}.`,
      });
    }

    const [patRefs] = await connection.query(
      `
      SELECT tp.id_tipo_patin,
             COALESCE(NULLIF(TRIM(tp.titulo), ''), CONCAT('Patín #', tp.id_tipo_patin)) AS titulo
      FROM tipo_patines tp
      WHERE tp.id_tipo_tabla = ?
      LIMIT 5
      `,
      [id]
    );
    if (patRefs.length > 0) {
      const titulos = patRefs.map((r) => r.titulo).join(", ");
      return res.status(409).json({
        code: "REFERENCED_IN_PATIN",
        message: `No se puede eliminar: este tipo de tabla está usado en ${
          patRefs.length > 1 ? "patines" : "un patín"
        }: ${titulos}.`,
      });
    }

    await connection.beginTransaction();
    const [del] = await connection.query(
      "DELETE FROM tipo_tablas WHERE id_tipo_tabla = ?",
      [id]
    );
    if (del.affectedRows === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "Tipo de tabla no encontrado!" });
    }
    await connection.commit();

    if (fotoKey) {
      try {
        await r2Delete(fotoKey);
      } catch (e) {
        console.warn("R2 delete:", e?.message);
      }
    }

    return res
      .status(200)
      .json({ message: "Tipo de tabla eliminado exitosamente!" });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}
    if (err?.errno === 1451 || err?.code === "ER_ROW_IS_REFERENCED_2") {
      try {
        const [protRefs] = await pool.query(
          `
          SELECT pp.id_prototipo,
                 COALESCE(NULLIF(TRIM(pp.titulo), ''), CONCAT('Prototipo #', pp.id_prototipo)) AS titulo
          FROM prototipo_tipo_tablas ptt
          JOIN prototipo_pallet pp ON pp.id_prototipo = ptt.id_prototipo
          WHERE ptt.id_tipo_tabla = ?
          LIMIT 5
          `,
          [req.params.id]
        );
        if (protRefs.length > 0) {
          const titulos = protRefs.map((r) => r.titulo).join(", ");
          return res.status(409).json({
            code: "REFERENCED_IN_PROTOTIPO",
            message: `No se puede eliminar: este tipo de tabla está usado en ${
              protRefs.length > 1 ? "los prototipos" : "el prototipo"
            } ${titulos}.`,
          });
        }
      } catch {}
      return res.status(409).json({
        code: "ROW_REFERENCED",
        message:
          "No se puede eliminar: el tipo de tabla está referenciado por otros registros.",
      });
    }
    console.error("❌ deleteTipoTabla error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
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

    const out = rows.map((r) => ({
      ...r,
      foto_url: toPublicUrl(r.foto),
    }));
    return res.status(200).json(out);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

export const ajustarStockTipoTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    let { id_tipo_tabla, cantidad, descontarPadre } = req.body;

    const idTipo = parseInt(id_tipo_tabla, 10);
    const cant = parseInt(cantidad, 10);

    if (!Number.isInteger(idTipo) || idTipo <= 0) {
      return res.status(400).json({ message: "ID de tipo de tabla inválido." });
    }

    if (!Number.isInteger(cant) || cant <= 0) {
      return res
        .status(400)
        .json({ message: "Cantidad a agregar inválida (debe ser > 0)." });
    }

    const descPadre =
      descontarPadre === true ||
      descontarPadre === "true" ||
      descontarPadre === 1 ||
      descontarPadre === "1";

    await connection.beginTransaction();

    const [[tipo]] = await connection.query(
      `SELECT id_materia_prima, largo_cm, stock, piezas_por_tabla
       FROM tipo_tablas
       WHERE id_tipo_tabla = ?
       FOR UPDATE`,
      [idTipo]
    );

    if (!tipo) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "Tipo de tabla no encontrado." });
    }

    const { id_materia_prima, largo_cm, stock: oldStock, piezas_por_tabla } =
      tipo;
    const largoTipo = parseFloat(largo_cm);

    if (!Number.isFinite(largoTipo) || largoTipo <= 0) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Datos de largo del tipo inválidos." });
    }

    let tablasConsumidas = 0;

    if (descPadre) {
      const [[parent]] = await connection.query(
        `SELECT t.largo_cm AS parentLargo, mp.stock AS parentStock
         FROM tablas t
         JOIN materiaprima mp ON mp.id_materia_prima = t.id_materia_prima
         WHERE t.id_materia_prima = ?
         FOR UPDATE`,
        [id_materia_prima]
      );

      if (!parent) {
        await connection.rollback();
        return res
          .status(404)
          .json({ message: "Tabla padre no encontrada." });
      }

      const parentLargo = parseFloat(parent.parentLargo);
      const parentStock = parseInt(parent.parentStock, 10);

      if (!Number.isFinite(parentLargo) || parentLargo <= 0) {
        await connection.rollback();
        return res.status(400).json({
          message: "Datos de largo de tabla padre inválidos.",
        });
      }

      const piezasPorTablaConfig =
        Number.isInteger(piezas_por_tabla) && piezas_por_tabla > 0
          ? piezas_por_tabla
          : Math.floor(parentLargo / (largoTipo + MARGIN));

      if (piezasPorTablaConfig < 1) {
        await connection.rollback();
        return res.status(400).json({
          message:
            "El largo del tipo excede al de la tabla padre (no se puede cortar).",
        });
      }

      tablasConsumidas = Math.ceil(cant / piezasPorTablaConfig);

      if (parentStock < tablasConsumidas) {
        await connection.rollback();
        return res.status(409).json({
          message: "Stock insuficiente de tablas padre.",
          detalles: {
            requerido_adicional: tablasConsumidas,
            disponible: parentStock,
            piezas_por_tabla: piezasPorTablaConfig,
          },
        });
      }

      const [updParent] = await connection.query(
        `UPDATE materiaprima
         SET stock = stock - ?
         WHERE id_materia_prima = ? AND stock >= ?`,
        [tablasConsumidas, id_materia_prima, tablasConsumidas]
      );

      if (updParent.affectedRows !== 1) {
        await connection.rollback();
        return res.status(409).json({
          message:
            "Stock insuficiente de tablas padre (posible condición de carrera). Intente nuevamente.",
        });
      }
    }

    const newStock = parseInt(oldStock, 10) + cant;

    await connection.query(
      `UPDATE tipo_tablas
       SET stock = ?
       WHERE id_tipo_tabla = ?`,
      [newStock, idTipo]
    );

    await connection.commit();

    return res.status(200).json({
      message: "Stock de tipo de tabla actualizado correctamente.",
      detalles: {
        id_tipo_tabla: idTipo,
        agregado: cant,
        nuevo_stock: newStock,
        descontarPadre: !!descPadre,
        tablasConsumidas,
      },
    });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}
    console.error("❌ ajustarStockTipoTabla error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};
