import { pool } from "../db.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Crear un nuevo fuegoYa
export const createFuegoYa = async (req, res) => {
    try{
        const{
            tipo,
            precio_unidad,
            stock
        } = req.body;
        const foto = req.file?.filename || req.body.foto || null;

    console.log("🔔 createFuegoYa hit:", req.body, "file:", req.file);

    const insertFuego = `
      INSERT INTO fuego_ya
        (tipo, precio_unidad, stock, foto)
      VALUES (?, ?, ?, ?)
    `;
    const [Result] = await pool.query(insertFuego, [
      tipo,
      parseFloat(precio_unidad),
      parseInt(stock, 10),
      foto
    ]);

    const idFuegoYa = Result.insertId;
    console.log("✅ Fuego Ya creado:", idFuegoYa);
    return res.status(201).json({
      id_fuego_ya: idFuegoYa,
      message: "Fuego Ya creado exitosamente!"
    });
    } catch (err) {
    console.error("❌ Error en create Fuego Ya:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
    }
};

// Obtener un fuego ya por ID con todos sus datos
export const getFuegoYaById = async (req, res) => {
  try {
    const { id } = req.params; 

    const [rows] = await pool.query(
      `
      SELECT
        id_fuego_ya
        tipo,
        precio_unidad,
        stock,
        foto
      FROM fuego_ya
      WHERE id_fuego_ya = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json("Fuego Ya no encontrado!");
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getFuegoYaById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

//Modificar un fuego ya existente
export const updateFuegoYa = async (req, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      tipo,
      precio_unidad,
      stock
    } = req.body;

    //Verificar que exista
    const [exists] = await connection.query(
      'SELECT foto FROM fuego_ya WHERE id_fuego_ya = ?',
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json('Fuego ya no encontrado!');
    }
    const oldFoto = exists[0].foto;

    await connection.beginTransaction();

    //Actualizar fuego Ya
    const updateMP = `
      UPDATE fuego_ya SET
        tipo = ?,
        precio_unidad = ?,
        stock = ?,
        foto = COALESCE(?, foto)
      WHERE id_fuego_ya = ?
    `;
    // si viene req.file, usamos req.file.filename, si no null (COALESCE deja el antiguo)
    const newFoto = req.file?.filename || null;
    await connection.query(updateMP, [
      tipo,
      parseFloat(precio_unidad),
      parseInt(stock, 10),
      newFoto,
      id
    ]);

    await connection.commit();

    //Borrar imagen antigua si reemplazamos
    if (newFoto && oldFoto) {
      const oldPath = path.join(__dirname, '../images/fuego_ya', oldFoto);
      fs.unlink(oldPath).catch(() => {
        console.warn('No se pudo borrar la imagen antigua:', oldFoto);
      });
    }

    return res.status(200).json('Fuego Ya modificado exitosamente!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Error en updateFuegoYa:', err);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: err.message });
  } finally {
    connection.release();
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Eliminar un fuego ya y su imagen
export const deleteFuegoYa = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    //Leer el nombre de la imagen antes de borrar
    const [rows] = await connection.query(
      'SELECT foto FROM fuego_ya WHERE id_fuego_ya = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json('Fuego Ya no encontrado!');
    }
    const fotoNombre = rows[0].foto; // puede ser null o string

    // Transacción para borrar hijo y padre
    await connection.beginTransaction();

    const [childResult] = await connection.query(
      'DELETE FROM fuego_ya WHERE id_fuego_ya = ?',
      [id]
    );
    if (childResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json('Fuego Ya no encontrado!');
    }

    await connection.commit();

    if (fotoNombre) {
      const filePath = path.join(__dirname, '../images/fuego_ya', fotoNombre);
      try {
        await fs.unlink(filePath);
      } catch (fsErr) {
        console.warn('No se pudo borrar la imagen:', fsErr.message);
      }
    }

    console.log('✅ Fuego Ya eliminado');
    return res.status(200).json('Fuego Ya eliminado exitosamente!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Error en deleteFuegoYa:', err);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: err.message });
  } finally {
    connection.release();
  }
};

export const listFuegoYa = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id_fuego_ya,
        tipo,
        precio_unidad,
        stock,
        foto
      FROM fuego_ya
      ORDER BY tipo ASC
      `
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listFuegoYa:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

