// controllers/tipoTablas.js
import { pool } from "../db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear un nuevo tipo de tabla
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
      stock: cantidadDeseada,  // ahora es lo que el usuario desea
    } = req.body;
    const foto = req.file?.filename || null;

    await connection.beginTransaction();

    // 1) Bloqueamos la tabla padre y leemos su largo y stock actual
    const [[parent]] = await connection.query(
      ` SELECT
      t.largo_cm,
      mp.stock
    FROM tablas AS t
    JOIN materiaprima AS mp
      ON t.id_materia_prima = mp.id_materia_prima
    WHERE t.id_materia_prima = ?
    FOR UPDATE
  `,
  [id_materia_prima]
);
    if (!parent) throw new Error("Tabla padre no encontrada");

    const margen = 0.5;
    // 2) ¿Cuántas piezas (tipo) cabe extraer de UNA tabla?
    const piezasPorTabla = Math.floor(
      parent.largo_cm / (parseFloat(largo_cm) + margen)
    );
    if (piezasPorTabla <= 0) {
      throw new Error("El largo del tipo excede al de la tabla padre");
    }

    // 3) ¿Cuántas tablas necesitamos para producir la cantidad deseada?
    const tablasNecesarias = Math.ceil(cantidadDeseada / piezasPorTabla);
    if (parent.stock < tablasNecesarias) {
      throw new Error("No hay stock suficiente de tablas padre");
    }

    // 4) Insertamos el nuevo tipo de tabla con EXACTAMENTE la cantidad que pidió el usuario
    const insertSQL = `
      INSERT INTO tipo_tablas
        (id_materia_prima, titulo, largo_cm, ancho_cm, espesor_mm, foto,
         precio_unidad, cepillada, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.query(insertSQL, [
      id_materia_prima,
      titulo,
      parseFloat(largo_cm),
      parseFloat(ancho_cm),
      parseFloat(espesor_mm),
      foto,
      parseFloat(precio_unidad),
      cepillada === "1" ? 1 : 0,
      parseInt(cantidadDeseada, 10)
    ]);

    // 5) Descontamos de la tabla padre las tablas que consumimos
    await connection.query(
      `UPDATE materiaprima
          SET stock = stock - ?
        WHERE id_materia_prima = ?`,
      [tablasNecesarias, id_materia_prima]
    );

    await connection.commit();
    return res
      .status(201)
      .json({ message: "Tipo de tabla creado exitosamente!", tablasConsumidas: tablasNecesarias });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en createTipoTabla:", err);
    return res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// Obtener un tipo de tabla por ID
export const getTipoTablaById = async (req, res) => {
  try {
    const { id } = req.params; // id_tipo_tabla
    const [rows] = await pool.query(
      `
      SELECT
        tt.*,
        mp.titulo       AS tabla_padre,
        mp.foto         AS tabla_padre_foto
      FROM tipo_tablas AS tt
      JOIN materiaprima AS mp
        ON tt.id_materia_prima = mp.id_materia_prima
      WHERE tt.id_tipo_tabla = ?
      `,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Tipo de tabla no encontrado!");
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getTipoTablaById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// Modificar un tipo de tabla existente y ajustar stock de tabla padre
export const updateTipoTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // id_tipo_tabla
    const {
      titulo,
      largo_cm: newLargoCm,
      ancho_cm,
      espesor_mm,
      precio_unidad,
      cepillada,
      stock: newStock,
    } = req.body;
    const newFoto   = req.file?.filename || null;
    const newLargo  = parseFloat(newLargoCm);
    const newStockI = parseInt(newStock, 10);
    const cep       = cepillada === "1" ? 1 : 0;

    await connection.beginTransaction();

    // 1) Leer datos antiguos de tipo_tablas
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

    // 2) Leer datos de la tabla padre (materiaprima join tablas)
    const [[parent]] = await connection.query(
      `SELECT t.largo_cm AS parentLargo, mp.stock AS parentStock
         FROM tablas AS t
         JOIN materiaprima AS mp
           ON t.id_materia_prima = mp.id_materia_prima
        WHERE t.id_materia_prima = ?
        FOR UPDATE`,
      [id_materia_prima]
    );
    if (!parent) {
      await connection.rollback();
      return res.status(404).json("Tabla padre no encontrada!");
    }
    const { parentLargo, parentStock } = parent;

    // 3) Calcular cuántas piezas caben considerando 0.5 cm de descarte por corte
    const margin = 0.5;
    const piecesPerParentOld = Math.floor(
      (parentLargo + margin) / (oldLargo + margin)
    );
    const piecesPerParentNew = Math.floor(
      (parentLargo + margin) / (newLargo + margin)
    );
    if (piecesPerParentNew < 1) {
      await connection.rollback();
      return res.status(400).json("El largo solicitado supera al de la tabla padre.");
    }

    // 4) Cuántas tablas padre se usaban y se usarían ahora
    const parentsUsedOld = Math.ceil(oldStock / piecesPerParentOld);
    const parentsUsedNew = Math.ceil(newStockI / piecesPerParentNew);
    const deltaParents   = parentsUsedNew - parentsUsedOld;

    // 5) Actualizar stock en materiaprima (tabla padre)
    await connection.query(
      `UPDATE materiaprima
          SET stock = ?
        WHERE id_materia_prima = ?`,
      [parentStock - deltaParents, id_materia_prima]
    );

    // 6) Actualizar el propio registro en tipo_tablas
    await connection.query(
      `
      UPDATE tipo_tablas SET
        titulo        = ?,
        largo_cm      = ?,
        ancho_cm      = ?,
        espesor_mm    = ?,
        foto          = COALESCE(?, foto),
        precio_unidad = ?,
        cepillada     = ?,
        stock         = ?
      WHERE id_tipo_tabla = ?
      `,
      [
        titulo,
        newLargo,
        parseFloat(ancho_cm),
        parseFloat(espesor_mm),
        newFoto,
        parseFloat(precio_unidad),
        cep,
        newStockI,
        id,
      ]
    );

    await connection.commit();

    // 7) Borrar foto antigua si se reemplazó
    if (newFoto && oldFoto) {
      const oldPath = path.join(__dirname, "../images/tipo_tablas", oldFoto);
      fs.unlink(oldPath).catch(() => {
        console.warn("No se pudo borrar foto antigua:", oldFoto);
      });
    }

    return res.status(200).json("Tipo de tabla actualizado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateTipoTabla:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Eliminar un tipo de tabla y su foto
export const deleteTipoTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // id_tipo_tabla

    // 1) Leer nombre de foto
    const [rows] = await connection.query(
      "SELECT foto FROM tipo_tablas WHERE id_tipo_tabla = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Tipo de tabla no encontrado!");
    }
    const fotoNombre = rows[0].foto;

    await connection.beginTransaction();

    // 2) Borrar fila
    const [del] = await connection.query(
      "DELETE FROM tipo_tablas WHERE id_tipo_tabla = ?",
      [id]
    );
    if (del.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json("Tipo de tabla no encontrado!");
    }

    await connection.commit();

    // 3) Borrar archivo
    if (fotoNombre) {
      const filePath = path.join(__dirname, "../images/tipo_tablas", fotoNombre);
      fs.unlink(filePath).catch(() => {
        console.warn("No se pudo borrar la foto:", fotoNombre);
      });
    }

    return res.status(200).json("Tipo de tabla eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteTipoTabla:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

// Listar todos los tipos de tabla
export const listTipoTablas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        tt.*,
        mp.titulo AS tabla_padre
      FROM tipo_tablas AS tt
      JOIN materiaprima AS mp
        ON tt.id_materia_prima = mp.id_materia_prima
      ORDER BY tt.titulo ASC
      `
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listTipoTablas:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};
