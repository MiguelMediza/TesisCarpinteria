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

// LISTAR TODOS LOS TIPO_TACOS
export const listTipoTacos = (req, res) => {
  const q = `
    SELECT tt.*, p.titulo AS palo_padre, p.stock AS stock_palo
    FROM tipo_tacos tt
    JOIN palos p ON tt.id_materia_prima = p.id_materia_prima
  `;
  db.query(q, (err, data) => {
    if (err) return res.status(500).json(err);
    res.json(data);
  });
};

// OBTENER UN TIPO_TACO POR ID
export const getTipoTacoById = (req, res) => {
  const q = "SELECT * FROM tipo_tacos WHERE id_tipo_taco = ?";
  db.query(q, [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    if (data.length === 0) return res.status(404).json("Tipo de taco no encontrado.");
    res.json(data[0]);
  });
};


// Modificar un tipo de taco existente y ajustar stock de palo padre
export const updateTipoTaco = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // id_tipo_taco
    const { largo_cm: newLargoCm, stock: newStock } = req.body;
    const newLargo = parseFloat(newLargoCm);
    const newStockI = parseInt(newStock, 10);

    await connection.beginTransaction();

    // 1) Obtener datos antiguos de tipo_tacos
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

    // 2) Obtener datos de palo padre (palos + materiaprima)
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

    // 3) Calcular piezas por palo considerando 0.5cm de descarte
    const margin = 0.5;
    const piecesOld = Math.floor((parentLargo + margin) / (oldLargo + margin));
    const piecesNew = Math.floor((parentLargo + margin) / (newLargo + margin));
    if (piecesNew < 1) {
      await connection.rollback();
      return res.status(400).json("El largo solicitado supera al del palo padre.");
    }

    // 4) Tablas (palos) usados antes y ahora
    const usedOld = Math.ceil(oldStock / piecesOld);
    const usedNew = Math.ceil(newStockI / piecesNew);
    const delta = usedNew - usedOld;

    // 5) Actualizar stock en materiaprima (palo)
    await connection.query(
      `UPDATE materiaprima
          SET stock = ?
        WHERE id_materia_prima = ?`,
      [parentStock - delta, id_materia_prima]
    );

    // 6) Actualizar propio registro en tipo_tacos
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

// Eliminar un tipo de taco y su foto, sin ajustar stock del palo padre
export const deleteTipoTaco = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // id_tipo_taco

    // 1) Leer nombre de la foto del tipo de taco
    const [rows] = await connection.query(
      "SELECT foto FROM tipo_tacos WHERE id_tipo_taco = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json("Tipo de taco no encontrado!");
    }
    const fotoNombre = rows[0].foto;

    await connection.beginTransaction();

    // 2) Borrar fila
    const [del] = await connection.query(
      "DELETE FROM tipo_tacos WHERE id_tipo_taco = ?",
      [id]
    );
    if (del.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json("Tipo de taco no encontrado!");
    }

    await connection.commit();

    // 3) Borrar archivo de imagen del disco
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