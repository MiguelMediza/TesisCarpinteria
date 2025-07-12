import { pool } from "../db.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Crear una nueva tabla
export const createTabla = async (req, res) => {
  try {
    const {
      titulo,
      largo_cm,
      ancho_cm,
      espesor_mm,
      tipo_madera,
      cepilladas,
      precio_unidad,
      stock,
      comentarios
    } = req.body;
    // si manejas upload de foto con multer, sería req.file.filename
    const foto = req.file?.filename || req.body.foto || null;

    console.log("🔔 createTabla hit:", req.body, "file:", req.file);

    // 1) Inserción en materiaprima
    const insertMP = `
      INSERT INTO materiaprima
        (categoria, titulo, precio_unidad, stock, foto, comentarios)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [mpResult] = await pool.query(insertMP, [
      'tabla',
      titulo,
      parseFloat(precio_unidad),
      parseInt(stock, 10),
      foto,
      comentarios || null
    ]);

    const id_materia_prima = mpResult.insertId;
    console.log("✅ Materia prima creada:", id_materia_prima);

    // 2) Inserción en tablas
    const cepValue = parseInt(req.body.cepilladas, 10) === 1 ? 1 : 0;
    const insertTablas = `
      INSERT INTO tablas
        (id_materia_prima, largo_cm, ancho_cm, espesor_mm, tipo_madera, cepilladas)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [tablaResult] = await pool.query(insertTablas, [
      id_materia_prima,
      parseFloat(largo_cm),
      parseFloat(ancho_cm),
      parseFloat(espesor_mm),
      tipo_madera,
      cepValue
    ]);

    console.log("✅ Tabla insertada:", tablaResult);

    return res.status(201).json({
      id_materia_prima,
      id_tabla: tablaResult.insertId,
      message: "Tabla creada exitosamente!"
    });
  } catch (err) {
    console.error("❌ Error en createTabla:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// Obtener una tabla por ID con todos sus datos
export const getTablaById = async (req, res) => {
  try {
    const { id } = req.params; // id_materia_prima

    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.categoria,
        mp.titulo,
        mp.precio_unidad,
        mp.stock,
        mp.foto,
        mp.comentarios,
        t.largo_cm,
        t.ancho_cm,
        t.espesor_mm,
        t.tipo_madera,
        t.cepilladas
      FROM materiaprima AS mp
      JOIN tablas AS t
        ON mp.id_materia_prima = t.id_materia_prima
      WHERE mp.id_materia_prima = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json("Tabla no encontrada!");
    }

    // Devuelve un único objeto con todos los campos
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error en getTablaById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};


//Modificar una tabla existente
export const updateTabla = async (req, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // este es id_materia_prima
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      largo_cm,
      ancho_cm,
      espesor_mm,
      tipo_madera,
      cepilladas
    } = req.body;

    // 1) Verificar que exista
    const [exists] = await connection.query(
      'SELECT foto FROM materiaprima WHERE id_materia_prima = ?',
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json('Tabla no encontrada!');
    }
    const oldFoto = exists[0].foto;

    await connection.beginTransaction();

    // 2) Actualizar materiaprima
    const updateMP = `
      UPDATE materiaprima SET
        titulo = ?,
        precio_unidad = ?,
        stock = ?,
        comentarios = ?,
        foto = COALESCE(?, foto)
      WHERE id_materia_prima = ?
    `;
    // si viene req.file, usamos req.file.filename, si no null (COALESCE deja el antiguo)
    const newFoto = req.file?.filename || null;
    await connection.query(updateMP, [
      titulo,
      parseFloat(precio_unidad),
      parseInt(stock, 10),
      comentarios || null,
      newFoto,
      id
    ]);

    // 3) Actualizar tablas
    const updateT = `
      UPDATE tablas SET
        largo_cm = ?,
        ancho_cm = ?,
        espesor_mm = ?,
        tipo_madera = ?,
        cepilladas = ?
      WHERE id_materia_prima = ?
    `;
    const cep = cepilladas === '1' || cepilladas === 1 ? 1 : 0;
    await connection.query(updateT, [
      parseFloat(largo_cm),
      parseFloat(ancho_cm),
      parseFloat(espesor_mm),
      tipo_madera,
      cep,
      id
    ]);

    await connection.commit();

    // 4) Borrar imagen antigua si reemplazamos
    if (newFoto && oldFoto) {
      const oldPath = path.join(__dirname, '../images/tablas', oldFoto);
      fs.unlink(oldPath).catch(() => {
        console.warn('No se pudo borrar la imagen antigua:', oldFoto);
      });
    }

    return res.status(200).json('Tabla modificada exitosamente!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Error en updateTabla:', err);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: err.message });
  } finally {
    connection.release();
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Eliminar una tabla y su imagen
export const deleteTabla = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // id_materia_prima

    // 1) Leer el nombre de la imagen antes de borrar
    const [rows] = await connection.query(
      'SELECT foto FROM materiaprima WHERE id_materia_prima = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json('Tabla no encontrada!');
    }
    const fotoNombre = rows[0].foto; // puede ser null o string

    // 2) Transacción para borrar hijo y padre
    await connection.beginTransaction();

    const [childResult] = await connection.query(
      'DELETE FROM tablas WHERE id_materia_prima = ?',
      [id]
    );
    if (childResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json('Tabla no encontrada!');
    }

    const [parentResult] = await connection.query(
      'DELETE FROM materiaprima WHERE id_materia_prima = ?',
      [id]
    );

    await connection.commit();

    // 3) Borrar el fichero de imágenes (ignorando errores)
    if (fotoNombre) {
      const filePath = path.join(__dirname, '../images/tablas', fotoNombre);
      try {
        await fs.unlink(filePath);
      } catch (fsErr) {
        console.warn('No se pudo borrar la imagen:', fsErr.message);
      }
    }

    console.log('✅ Tabla y materia prima eliminadas, imagen borrada si existía');
    return res.status(200).json('Tabla eliminada exitosamente!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Error en deleteTabla:', err);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: err.message });
  } finally {
    connection.release();
  }
};

// Obtener todas las tablas con sus datos respectivos en materiaprima
export const listTablas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.categoria,
        mp.titulo,
        mp.precio_unidad,
        mp.stock,
        mp.foto,
        mp.comentarios,
        t.largo_cm,
        t.ancho_cm,
        t.espesor_mm,
        t.tipo_madera,
        t.cepilladas
      FROM materiaprima AS mp
      JOIN tablas AS t
        ON mp.id_materia_prima = t.id_materia_prima
      WHERE mp.categoria = 'tabla'
      ORDER BY mp.titulo ASC
      `
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error en listTablas:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};