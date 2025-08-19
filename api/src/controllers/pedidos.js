import { pool } from "../db.js";

/* -------------------- Helpers & Validaciones -------------------- */
const ESTADOS = new Set([
  "pendiente",
  "en_produccion",
  "listo",
  "entregado",
  "cancelado",
]);

const isValidEstado = (v) => ESTADOS.has(v);
const isValidDate = (s) => !s || !Number.isNaN(new Date(s).getTime());

/**
 * Recalcula y actualiza pedidos.precio_total en base a los ítems del pedido
 * usando la view vw_prototipo_costo_total (costos actuales de materiales).
 *
 * Fórmula:
 *   precio_total = SUM( cantidad_pallets * vw.costo_materiales ) por cada prototipo del pedido
 */
const recalcPrecioTotal = async (conn, id_pedido) => {
  // Sumatoria por ítem con costos vigentes del prototipo
  const [sumRows] = await conn.query(
    `
    SELECT
      COALESCE(SUM(ppp.cantidad_pallets * v.costo_materiales), 0) AS total
    FROM pedido_prototipo_pallet ppp
    JOIN vw_prototipo_costo_total v
      ON v.id_prototipo = ppp.id_prototipo
    WHERE ppp.id_pedido = ?
    `,
    [id_pedido]
  );

  const total = sumRows?.[0]?.total ?? 0;

  await conn.query(
    `UPDATE pedidos SET precio_total = ? WHERE id_pedido = ?`,
    [total, id_pedido]
  );

  return total;
};

/* ========================= CREATE ============================== */
/**
 * POST /api/src/pedidos/agregar
 * Body:
 * {
 *   id_cliente, fecha_realizado, fecha_de_entrega?, estado?, comentarios?,
 *   items?: [
 *     { id_prototipo, cantidad_pallets, numero_lote?, numero_tratamiento?, comentarios? }, ...
 *   ]
 * }
 */
export const createPedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      id_cliente,
      fecha_realizado,
      fecha_de_entrega = null,
      estado = "pendiente",
      comentarios = null,
      items = [],
    } = req.body;

    // Validaciones
    if (!id_cliente) return res.status(400).json("id_cliente es obligatorio.");
    if (!fecha_realizado)
      return res.status(400).json("fecha_realizado es obligatoria.");
    if (!isValidEstado(estado)) return res.status(400).json("Estado inválido.");
    if (!isValidDate(fecha_realizado) || !isValidDate(fecha_de_entrega)) {
      return res.status(400).json("Fecha inválida.");
    }
    if (
      fecha_de_entrega &&
      new Date(fecha_de_entrega) < new Date(fecha_realizado)
    ) {
      return res
        .status(400)
        .json("La fecha de entrega no puede ser menor a la fecha realizada.");
    }

    await conn.beginTransaction();

    // Insert cabecera
    const [ins] = await conn.query(
      `
      INSERT INTO pedidos
        (id_cliente, estado, fecha_realizado, fecha_de_entrega, precio_total, comentarios)
      VALUES (?, ?, ?, ?, 0, ?)
      `,
      [
        parseInt(id_cliente, 10),
        estado,
        fecha_realizado,
        fecha_de_entrega || null,
        comentarios || null,
      ]
    );

    const id_pedido = ins.insertId;

    // Insert items (si vienen)
    if (Array.isArray(items) && items.length > 0) {
      const values = [];
      for (const it of items) {
        if (!it?.id_prototipo || !it?.cantidad_pallets) {
          await conn.rollback();
          return res
            .status(400)
            .json(
              "Cada ítem requiere id_prototipo y cantidad_pallets (> 0)."
            );
        }
        const qty = parseInt(it.cantidad_pallets, 10);
        if (!Number.isInteger(qty) || qty <= 0) {
          await conn.rollback();
          return res
            .status(400)
            .json("cantidad_pallets debe ser entero > 0 en todos los ítems.");
        }

        values.push([
          id_pedido,
          parseInt(it.id_prototipo, 10),
          qty,
          it.numero_lote || null,
          it.numero_tratamiento || null,
          it.comentarios || null,
        ]);
      }

      await conn.query(
        `
        INSERT INTO pedido_prototipo_pallet
          (id_pedido, id_prototipo, cantidad_pallets, numero_lote, numero_tratamiento, comentarios)
        VALUES ?
        `,
        [values]
      );
    }

    // Recalcular total
    const total = await recalcPrecioTotal(conn, id_pedido);

    await conn.commit();
    return res.status(201).json({
      id_pedido,
      precio_total: total,
      message: "Pedido creado correctamente.",
    });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Error en createPedido:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    conn.release();
  }
};

/* ====================== GET BY ID ============================== */
/**
 * GET /api/src/pedidos/:id
 * Devuelve cabecera, cliente y los ítems.
 */
export const getPedidoById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        p.*,
        c.es_empresa, c.nombre, c.apellido, c.nombre_empresa
      FROM pedidos p
      LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
      WHERE p.id_pedido = ?
      `,
      [id]
    );
    if (rows.length === 0) return res.status(404).json("Pedido no encontrado!");

    const pedido = rows[0];

    let items = [];
    try {
      const [it] = await pool.query(
        `
        SELECT
          ppp.id_prototipo,
          ppp.cantidad_pallets,
          ppp.numero_lote,
          ppp.numero_tratamiento,
          ppp.comentarios,
          pp.titulo AS prototipo_titulo,
          pp.medidas
        FROM pedido_prototipo_pallet ppp
        JOIN prototipo_pallet pp ON pp.id_prototipo = ppp.id_prototipo
        WHERE ppp.id_pedido = ?
        `,
        [id]
      );
      items = it;
    } catch {
      items = [];
    }

    return res.status(200).json({
      ...pedido,
      cliente_display: pedido.es_empresa
        ? pedido.nombre_empresa
        : [pedido.nombre, pedido.apellido].filter(Boolean).join(" "),
      items,
    });
  } catch (err) {
    console.error("❌ Error en getPedidoById:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};


export const listPedidos = async (req, res) => {
  try {
    const { estado, desde, hasta, cliente } = req.query;

    const where = [];
    const params = [];

    const ESTADOS = new Set(["pendiente","en_produccion","listo","entregado","cancelado"]);
    const isValidEstado = (v) => ESTADOS.has(v);
    const isValidDate   = (s) => !s || !Number.isNaN(new Date(s).getTime());

    if (estado && isValidEstado(estado)) {
      where.push("p.estado = ?");
      params.push(estado);
    }
    if (desde && isValidDate(desde)) {
      where.push("p.fecha_realizado >= ?");
      params.push(desde);
    }
    if (hasta && isValidDate(hasta)) {
      where.push("p.fecha_realizado <= ?");
      params.push(hasta);
    }
    if (cliente && cliente.trim()) {
      const like = `%${cliente.trim()}%`;
      where.push("(c.nombre_empresa LIKE ? OR c.nombre LIKE ? OR c.apellido LIKE ?)");
      params.push(like, like, like);
    }

    //Cabeceras
    const [pedidos] = await pool.query(
      `
      SELECT
        p.*,
        c.es_empresa, c.nombre, c.apellido, c.nombre_empresa
      FROM pedidos p
      LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY p.fecha_realizado DESC, p.id_pedido DESC
      `,
      params
    );

    //Por cada pedido, traer sus ítems (con costo actual y subtotal)
    for (const ped of pedidos) {
      const [items] = await pool.query(
        `
        SELECT
          ppp.id_prototipo,
          ppp.cantidad_pallets,
          ppp.numero_lote,
          ppp.numero_tratamiento,
          ppp.comentarios,
          pp.titulo      AS prototipo_titulo,
          pp.medidas,
          COALESCE(v.costo_materiales, 0) AS costo_materiales,
          (ppp.cantidad_pallets * COALESCE(v.costo_materiales, 0)) AS subtotal
        FROM pedido_prototipo_pallet ppp
        JOIN prototipo_pallet pp
          ON pp.id_prototipo = ppp.id_prototipo
        LEFT JOIN vw_prototipo_costo_total v
          ON v.id_prototipo = ppp.id_prototipo
        WHERE ppp.id_pedido = ?
        `,
        [ped.id_pedido]
      );

      ped.items = items;
      ped.cliente_display = ped.es_empresa
        ? ped.nombre_empresa
        : [ped.nombre, ped.apellido].filter(Boolean).join(" ");

      // Recalcular precio total si hay ítems
      ped.precio_total_calculado = items.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
    }

    return res.status(200).json(pedidos);
  } catch (err) {
    console.error("❌ Error en listPedidosConItems:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};


export const updatePedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      id_cliente,
      estado,
      fecha_realizado,
      fecha_de_entrega,
      comentarios,
      items,
    } = req.body;

    const [ex] = await conn.query(
      `SELECT 1 FROM pedidos WHERE id_pedido = ?`,
      [id]
    );
    if (ex.length === 0) {
      conn.release();
      return res.status(404).json("Pedido no encontrado!");
    }

    // Validaciones
    if (estado && !isValidEstado(estado))
      return res.status(400).json("Estado inválido.");
    if (fecha_realizado && !isValidDate(fecha_realizado))
      return res.status(400).json("fecha_realizado inválida.");
    if (fecha_de_entrega && !isValidDate(fecha_de_entrega))
      return res.status(400).json("fecha_de_entrega inválida.");
    if (
      fecha_realizado &&
      fecha_de_entrega &&
      new Date(fecha_de_entrega) < new Date(fecha_realizado)
    ) {
      return res
        .status(400)
        .json("La fecha de entrega no puede ser menor a la fecha realizada.");
    }

    await conn.beginTransaction();

    const fields = [];
    const values = [];
    if (id_cliente !== undefined) {
      fields.push("id_cliente = ?");
      values.push(parseInt(id_cliente, 10) || null);
    }
    if (estado !== undefined) {
      fields.push("estado = ?");
      values.push(estado || null);
    }
    if (fecha_realizado !== undefined) {
      fields.push("fecha_realizado = ?");
      values.push(fecha_realizado || null);
    }
    if (fecha_de_entrega !== undefined) {
      fields.push("fecha_de_entrega = ?");
      values.push(fecha_de_entrega || null);
    }
    if (comentarios !== undefined) {
      fields.push("comentarios = ?");
      values.push(comentarios || null);
    }

    if (fields.length > 0) {
      const sql = `UPDATE pedidos SET ${fields.join(", ")} WHERE id_pedido = ?`;
      values.push(id);
      await conn.query(sql, values);
    }

    if (Array.isArray(items)) {
      await conn.query(
        `DELETE FROM pedido_prototipo_pallet WHERE id_pedido = ?`,
        [id]
      );

      if (items.length > 0) {
        const valuesItems = [];
        for (const it of items) {
          if (!it?.id_prototipo || !it?.cantidad_pallets) {
            await conn.rollback();
            return res
              .status(400)
              .json(
                "Cada ítem requiere id_prototipo y cantidad_pallets (> 0)."
              );
          }
          const qty = parseInt(it.cantidad_pallets, 10);
          if (!Number.isInteger(qty) || qty <= 0) {
            await conn.rollback();
            return res
              .status(400)
              .json(
                "cantidad_pallets debe ser entero > 0 en todos los ítems."
              );
          }

          valuesItems.push([
            id,
            parseInt(it.id_prototipo, 10),
            qty,
            it.numero_lote || null,
            it.numero_tratamiento || null,
            it.comentarios || null,
          ]);
        }

        await conn.query(
          `
          INSERT INTO pedido_prototipo_pallet
            (id_pedido, id_prototipo, cantidad_pallets, numero_lote, numero_tratamiento, comentarios)
          VALUES ?
          `,
          [valuesItems]
        );
      }
    }

    // Recalcular total
    const total = await recalcPrecioTotal(conn, id);

    await conn.commit();
    return res.status(200).json({
      message: "Pedido actualizado correctamente.",
      precio_total: total,
    });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Error en updatePedido:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    conn.release();
  }
};


export const deletePedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    await conn.beginTransaction();

    await conn.query(
      `DELETE FROM pedido_prototipo_pallet WHERE id_pedido = ?`,
      [id]
    );
    const [del] = await conn.query(
      `DELETE FROM pedidos WHERE id_pedido = ?`,
      [id]
    );
    if (del.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json("Pedido no encontrado!");
    }

    await conn.commit();
    return res.status(200).json("Pedido eliminado correctamente.");
  } catch (err) {
    await conn.rollback();
    console.error("❌ Error en deletePedido:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    conn.release();
  }
};

//Cambiar estado de un pedido
export const changeEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!isValidEstado(estado)) return res.status(400).json("Estado inválido.");

    const [r] = await pool.query(
      `UPDATE pedidos SET estado = ? WHERE id_pedido = ?`,
      [estado, id]
    );
    if (r.affectedRows === 0) return res.status(404).json("Pedido no encontrado!");

    return res.status(200).json("Estado actualizado.");
  } catch (err) {
    console.error("❌ Error en changeEstadoPedido:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};
