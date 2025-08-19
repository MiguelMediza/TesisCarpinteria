import { pool } from "../db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear un nuevo tipo de taco
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
    const foto = req.file?.filename || null;

    await connection.beginTransaction();

    // Obtener datos de la materia prima (palo)
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

    if (piezasPorPalo <= 0) {
      throw new Error("El largo del taco excede al del palo padre");
    }

    const palosNecesarios = Math.ceil(cantidadDeseada / piezasPorPalo);

    if (parent.stock < palosNecesarios) {
      throw new Error("No hay stock suficiente de palos padre");
    }

    await connection.query(
      `INSERT INTO tipo_tacos
         (id_materia_prima, titulo, largo_cm, ancho_cm, espesor_mm, foto,
          precio_unidad, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_materia_prima,
        titulo,
        parseFloat(largo_cm),
        parseFloat(ancho_cm),
        parseFloat(espesor_mm),
        foto,
        parseFloat(precio_unidad),
        parseInt(cantidadDeseada, 10)
      ]
    );

    await connection.query(
      `UPDATE materiaprima
       SET stock = stock - ?
       WHERE id_materia_prima = ?`,
      [palosNecesarios, id_materia_prima]
    );

    await connection.commit();
    return res.status(201).json({
      message: "Tipo de taco creado exitosamente!",
      palosConsumidos: palosNecesarios
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en createTipoTaco:", err);
    return res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// Listar todos los tipos de taco
export const listTipoTacos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        tt.*,
        mp.titulo AS palo_padre
      FROM tipo_tacos AS tt
      JOIN materiaprima AS mp
        ON tt.id_materia_prima = mp.id_materia_prima
      ORDER BY tt.titulo ASC
      `
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listTipoTacos:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};



// Obtener un tipo de taco por ID
export const getTipoTacoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        tt.*,
        mp.titulo AS palo_padre,
        mp.foto   AS palo_padre_foto
      FROM tipo_tacos AS tt
      JOIN materiaprima AS mp
        ON tt.id_materia_prima = mp.id_materia_prima
      WHERE tt.id_tipo_taco = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json("Tipo de taco no encontrado!");
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getTipoTacoById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};



// Modificar un tipo de taco existente y ajustar stock de palo padre
export const updateTipoTaco = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { largo_cm: newLargoCm, stock: newStock } = req.body;
    const newLargo = parseFloat(newLargoCm);
    const newStockI = parseInt(newStock, 10);

    await connection.beginTransaction();

    //Obtener datos antiguos de tipo_tacos
    const [[oldRec]] = await connection.query(
      `SELECT id_materia_prima, largo_cm AS oldLargo, stock AS oldStock
         FROM tipo_tacos
        WHERE id_tipo_taco = ?
        FOR UPDATE`,
      [id]
    );
    if (!oldRec) {
      await connection.rollback();
      return res.status(404).json("Tipo de taco no encontrado!");
    }
    const { id_materia_prima, oldLargo, oldStock } = oldRec;

    // Obtener datos de palo padre (palos + materiaprima)
    const [[parent]] = await connection.query(
      `SELECT p.largo_cm AS parentLargo, mp.stock AS parentStock
         FROM palos AS p
         JOIN materiaprima AS mp
           ON p.id_materia_prima = mp.id_materia_prima
        WHERE p.id_materia_prima = ?
        FOR UPDATE`,
      [id_materia_prima]
    );
    if (!parent) {
      await connection.rollback();
      return res.status(404).json("Palo padre no encontrado!");
    }
    const { parentLargo, parentStock } = parent;

    //Calcular piezas por palo considerando 0.5cm de descarte
    const margin = 0.5;
    const piecesOld = Math.floor((parentLargo + margin) / (oldLargo + margin));
    const piecesNew = Math.floor((parentLargo + margin) / (newLargo + margin));
    if (piecesNew < 1) {
      await connection.rollback();
      return res.status(400).json("El largo solicitado supera al del palo padre.");
    }

    // (palos) usados antes y ahora
    const usedOld = Math.ceil(oldStock / piecesOld);
    const usedNew = Math.ceil(newStockI / piecesNew);
    const delta = usedNew - usedOld;

    //Actualizar stock en materiaprima (palo)
    await connection.query(
      `UPDATE materiaprima
          SET stock = ?
        WHERE id_materia_prima = ?`,
      [parentStock - delta, id_materia_prima]
    );

    //Actualizar propio registro en tipo_tacos
    await connection.query(
      `UPDATE tipo_tacos SET
         largo_cm = ?,
         stock    = ?
       WHERE id_tipo_taco = ?`,
      [newLargo, newStockI, id]
    );

    await connection.commit();
    return res.status(200).json("Tipo de taco actualizado exitosamente!");
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

    //Leer nombre de la foto del tipo de taco
    const [rows] = await connection.query(
      "SELECT foto FROM tipo_tacos WHERE id_tipo_taco = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Tipo de taco no encontrado!");
    }
    const fotoNombre = rows[0].foto;

    await connection.beginTransaction();

    //Borrar fila
    const [del] = await connection.query(
      "DELETE FROM tipo_tacos WHERE id_tipo_taco = ?",
      [id]
    );
    if (del.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json("Tipo de taco no encontrado!");
    }

    await connection.commit();

    //Borrar archivo de imagen del disco
    if (fotoNombre) {
      const filePath = path.join(__dirname, "../images/tipo_tacos", fotoNombre);
      fs.unlink(filePath).catch(() => {
        console.warn("No se pudo borrar la foto de tipo de taco:", fotoNombre);
      });
    }

    return res.status(200).json("Tipo de taco eliminado exitosamente!");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en deleteTipoTaco:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};