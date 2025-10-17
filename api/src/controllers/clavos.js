import { pool } from "../db.js";
import { r2Delete } from "../lib/r2.js";


const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL || ""; 
const urlFromKey = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);


// Crear un nuevo clavo
export const createClavo = async (req, res) => {
  try {
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      tipo,
      medidas,
      material,
    } = req.body;

    const fotoKey = req.fileR2?.key || null;

    // Inserción en materiaprima
    const insertMP = `
      INSERT INTO materiaprima
        (categoria, titulo, precio_unidad, stock, foto, comentarios)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [mpResult] = await pool.query(insertMP, [
      "clavo",
      titulo,
      precio_unidad != null ? parseFloat(precio_unidad) : null,
      stock != null ? parseInt(stock, 10) : null,
      fotoKey,
      comentarios || null,
    ]);
    const id_materia_prima = mpResult.insertId;

    // Inserción en clavos
    const insertCl = `
      INSERT INTO clavos
        (id_materia_prima, tipo, medidas, material)
      VALUES (?, ?, ?, ?)
    `;
    await pool.query(insertCl, [id_materia_prima, tipo, medidas, material]);

    return res.status(201).json({
      id_materia_prima,
      message: "Clavo creado exitosamente!",
      foto_key: fotoKey,
      foto_url: urlFromKey(fotoKey),
    });
  } catch (err) {
    console.error("❌ Error en createClavo:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// Obtener un clavo por ID (id_materia_prima)
export const getClavoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.titulo,
        mp.precio_unidad,
        mp.stock,
        mp.foto,            -- guarda el KEY en R2
        mp.comentarios,
        c.tipo,
        c.medidas,
        c.material
      FROM materiaprima AS mp
      JOIN clavos AS c
        ON mp.id_materia_prima = c.id_materia_prima
      WHERE mp.id_materia_prima = ?
      `,
      [id]
    );

    if (rows.length === 0) return res.status(404).json("Clavo no encontrado!");

    const row = rows[0];
    return res.status(200).json({
      ...row,
      foto_url: urlFromKey(row.foto),
    });
  } catch (err) {
    console.error("❌ Error en getClavoById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// Modificar un clavo existente 
export const updateClavo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      titulo,
      precio_unidad,
      stock,
      comentarios,
      tipo,
      medidas,
      material,
      foto_remove,        
    } = req.body;

    const newFotoKey = req.fileR2?.key || null;

    // Verificar existencia y foto anterior
    const [exists] = await connection.query(
      `SELECT foto FROM materiaprima WHERE id_materia_prima = ?`,
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json("Clavo no encontrado!");
    }
    const oldFotoKey = exists[0].foto;

    await connection.beginTransaction();

    const setParts = [
      `titulo = ?`,
      `precio_unidad = ?`,
      `stock = ?`,
      `comentarios = ?`,
    ];
    const setVals = [
      titulo,
      precio_unidad != null ? parseFloat(precio_unidad) : null,
      stock != null ? parseInt(stock, 10) : null,
      comentarios || null,
    ];

    if (newFotoKey) {
      setParts.push(`foto = ?`);
      setVals.push(newFotoKey);
    } else if (String(foto_remove) === "1") {
      setParts.push(`foto = NULL`);
    }

    const updateMP = `
      UPDATE materiaprima
         SET ${setParts.join(", ")}
       WHERE id_materia_prima = ?
    `;
    setVals.push(id);
    await connection.query(updateMP, setVals);

    const updateCl = `
      UPDATE clavos
         SET tipo = ?, medidas = ?, material = ?
       WHERE id_materia_prima = ?
    `;
    await connection.query(updateCl, [tipo, medidas, material, id]);

    await connection.commit();

    const mustDeleteOld =
      (newFotoKey && oldFotoKey && newFotoKey !== oldFotoKey) ||
      (!newFotoKey && String(foto_remove) === "1" && oldFotoKey);

    if (mustDeleteOld) {
      try {
        await r2Delete(oldFotoKey);
      } catch (e) {
        console.warn("No se pudo borrar la imagen antigua en R2:", oldFotoKey, e?.message);
      }
    }

    const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL || "";
    const urlFromKey = (key) => (key ? `${PUBLIC_BASE}/${key}` : null);

    const currentKey =
      newFotoKey ? newFotoKey : String(foto_remove) === "1" ? null : oldFotoKey;

    return res.status(200).json({
      message: "Clavo modificado exitosamente!",
      foto_key: currentKey,
      foto_url: urlFromKey(currentKey),
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error en updateClavo:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};


export const deleteClavo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [[mpRow]] = await connection.query(
      `SELECT foto FROM materiaprima WHERE id_materia_prima = ?`,
      [id]
    );
    if (!mpRow) {
      return res.status(404).json({ message: "Clavo no encontrado!" });
    }
    const fotoKey = mpRow.foto || null;

    const [refs] = await connection.query(
      `
      SELECT
        pp.id_prototipo,
        COALESCE(NULLIF(TRIM(pp.titulo), ''), CONCAT('Prototipo #', pp.id_prototipo)) AS titulo
      FROM prototipo_clavos pc
      JOIN prototipo_pallet pp ON pp.id_prototipo = pc.id_prototipo
      WHERE pc.id_materia_prima = ?
      LIMIT 8
      `,
      [id]
    );
    if (refs.length > 0) {
      return res.status(409).json({
        code: "REFERENCED_IN_PROTOTIPO_CLAVOS",
        message: `No se puede eliminar: este clavo está usado por ${refs.length} prototipo(s).`,
        prototipos: refs.map(r => r.titulo),
        count: refs.length,
      });
    }

    await connection.beginTransaction();

    const [childRes] = await connection.query(
      `DELETE FROM clavos WHERE id_materia_prima = ?`,
      [id]
    );
    if (childRes.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Clavo no encontrado!" });
    }

    await connection.query(
      `DELETE FROM materiaprima WHERE id_materia_prima = ?`,
      [id]
    );

    await connection.commit();

    if (fotoKey) {
      try { await r2Delete(fotoKey); }
      catch (e) { console.warn("No se pudo borrar la imagen en R2:", fotoKey, e?.message); }
    }

    return res.status(200).json({ message: "Clavo eliminado exitosamente!" });
  } catch (err) {
    try { await connection.rollback(); } catch {}

  
    if (err?.errno === 1451 || err?.code === "ER_ROW_IS_REFERENCED_2") {
      try {
        const [refs] = await pool.query(
          `
          SELECT
            pp.id_prototipo,
            COALESCE(NULLIF(TRIM(pp.titulo), ''), CONCAT('Prototipo #', pp.id_prototipo)) AS titulo
          FROM prototipo_clavos pc
          JOIN prototipo_pallet pp ON pp.id_prototipo = pc.id_prototipo
          WHERE pc.id_materia_prima = ?
          LIMIT 8
          `,
          [req.params.id]
        );
        if (refs.length > 0) {
          return res.status(409).json({
            code: "REFERENCED_IN_PROTOTIPO_CLAVOS",
            message: `No se puede eliminar: este clavo está usado por ${refs.length} prototipo(s).`,
            prototipos: refs.map(r => r.titulo),
            count: refs.length,
          });
        }
      } catch {}
      return res.status(409).json({
        code: "ROW_REFERENCED",
        message: "No se puede eliminar: el clavo está referenciado por otros registros.",
      });
    }

    console.error("❌ Error en deleteClavo:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

export const listClavos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        mp.id_materia_prima,
        mp.titulo,
        mp.precio_unidad,
        mp.stock,
        mp.foto,            -- KEY en R2
        mp.comentarios,
        c.tipo,
        c.medidas,
        c.material
      FROM materiaprima AS mp
      JOIN clavos AS c
        ON mp.id_materia_prima = c.id_materia_prima
      WHERE mp.categoria = 'clavo'
      ORDER BY mp.titulo ASC
      `
    );

    const withUrls = rows.map((r) => ({
      ...r,
      foto_url: urlFromKey(r.foto),
    }));

    return res.status(200).json(withUrls);
  } catch (err) {
    console.error("❌ Error en listClavos:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};