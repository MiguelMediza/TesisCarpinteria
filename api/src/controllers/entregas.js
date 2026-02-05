import { pool } from "../db.js";

/**
 * Helpers
 */
const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const isPosInt = (v) => Number.isInteger(v) && v > 0;

const normalizeDateTime = (v) => {
  if (!v) return null;
  let s = String(v).trim();
  if (!s) return null;

  // "YYYY-MM-DD" => "YYYY-MM-DD 00:00:00"
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`;

  // "YYYY-MM-DDTHH:MM" (datetime-local) => "YYYY-MM-DD HH:MM:00"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    return s.replace("T", " ") + ":00";
  }

  // "YYYY-MM-DDTHH:MM:SS" => "YYYY-MM-DD HH:MM:SS"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace("T", " ");
  }

  return s;
};

const buildResumenMap = (rows) => {
  const map = new Map();
  for (const r of rows) {
    map.set(Number(r.id_prototipo), {
      id_pedido: Number(r.id_pedido),
      id_prototipo: Number(r.id_prototipo),
      titulo: r.titulo,
      pedido: Number(r.pedido || 0),
      entregado: Number(r.entregado || 0),
      faltante: Number(r.faltante || 0),
      stock_actual: Number(r.stock_actual || 0),
    });
  }
  return map;
};

const getResumenPedidoTx = async (connection, id_pedido) => {
  const [rows] = await connection.query(
    `
    SELECT
      r.id_pedido,
      r.id_prototipo,
      r.titulo,
      r.pedido,
      r.entregado,
      r.faltante,
      COALESCE(pp.stock,0) AS stock_actual
    FROM vw_pedido_entrega_resumen r
    LEFT JOIN prototipo_pallet pp ON pp.id_prototipo = r.id_prototipo
    WHERE r.id_pedido = ?
    ORDER BY r.titulo
    `,
    [id_pedido]
  );
  return rows || [];
};

const getTotalesTx = async (connection, id_pedido) => {
  const [tot] = await connection.query(
    `
    SELECT
      COALESCE(SUM(pedido),0) AS total_pedido,
      COALESCE(SUM(entregado),0) AS total_entregado,
      COALESCE(SUM(faltante),0) AS total_faltante
    FROM vw_pedido_entrega_resumen
    WHERE id_pedido = ?
    `,
    [id_pedido]
  );

  const total_pedido = Number(tot?.[0]?.total_pedido || 0);
  const total_entregado = Number(tot?.[0]?.total_entregado || 0);
  const total_faltante = Number(tot?.[0]?.total_faltante || 0);

  return {
    total_pedido,
    total_entregado,
    total_faltante,
    completo: total_faltante <= 0 && total_pedido > 0,
    hayEntregas: total_entregado > 0,
  };
};

/**
 * Sincroniza estado del pedido según entregas:
 * - Sin entregas => pendiente
 * - Parcial => listo
 * - Completo => entregado
 * NO pisa cancelado.
 */
const syncPedidoEstadoPorEntregasTx = async (connection, id_pedido) => {
  const tot = await getTotalesTx(connection, id_pedido);

  let nuevoEstado = "pendiente";
  if (tot.total_entregado > 0) {
    nuevoEstado = tot.completo ? "entregado" : "listo";
  }

  await connection.query(
    `
    UPDATE pedidos
    SET estado = ?
    WHERE id_pedido = ?
      AND eliminado = FALSE
      AND estado <> 'cancelado'
    `,
    [nuevoEstado, id_pedido]
  );

  return tot;
};

/**
 * Stock helpers (TX safe)
 */
const requireAndDiscountStockTx = async (connection, id_prototipo, qty, tituloForMsg = null) => {
  // Bloquear fila del prototipo para evitar carreras
  const [[pp]] = await connection.query(
    `SELECT stock, titulo FROM prototipo_pallet WHERE id_prototipo = ? FOR UPDATE`,
    [id_prototipo]
  );

  if (!pp) {
    return {
      ok: false,
      status: 404,
      payload: { message: `Prototipo #${id_prototipo} no existe.` },
    };
  }

  const stockActual = Number(pp.stock || 0);
  const titulo = tituloForMsg || pp.titulo || `Prototipo #${id_prototipo}`;

  if (stockActual < qty) {
    return {
      ok: false,
      status: 409,
      payload: {
        code: "STOCK_INSUFICIENTE_PALLET",
        message: `Stock insuficiente de "${titulo}". Stock: ${stockActual}, solicita: ${qty}.`,
        id_prototipo,
        titulo,
        stock_actual: stockActual,
        solicitado: qty,
      },
    };
  }

  const [u] = await connection.query(
    `UPDATE prototipo_pallet SET stock = stock - ? WHERE id_prototipo = ? AND stock >= ?`,
    [qty, id_prototipo, qty]
  );

  if (u.affectedRows !== 1) {
    return {
      ok: false,
      status: 500,
      payload: { message: `No se pudo descontar stock del prototipo #${id_prototipo}.` },
    };
  }

  return { ok: true };
};

const restoreStockTx = async (connection, id_prototipo, qty) => {
  const idp = Number(id_prototipo || 0);
  const q = Number(qty || 0);
  if (!idp || q <= 0) return;

  await connection.query(
    `UPDATE prototipo_pallet SET stock = stock + ? WHERE id_prototipo = ?`,
    [q, idp]
  );
};

/**
 * GET /entregas/listar?desde=&hasta=&id_pedido=&id_cliente=&estado=&q=
 * Devuelve también: detalles[] por entrega
 */
export const listEntregas = async (req, res) => {
  try {
    const { desde, hasta, id_pedido, id_cliente, estado, q } = req.query;

    const where = ["p.eliminado = FALSE"];
    const params = [];

    if (id_pedido) {
      const v = toInt(id_pedido);
      if (!v) return res.status(400).json({ message: "id_pedido inválido." });
      where.push("e.id_pedido = ?");
      params.push(v);
    }

    if (id_cliente) {
      const v = toInt(id_cliente);
      if (!v) return res.status(400).json({ message: "id_cliente inválido." });
      where.push("p.id_cliente = ?");
      params.push(v);
    }

    if (estado) {
      where.push("LOWER(p.estado) = LOWER(?)");
      params.push(String(estado));
    }

    if (desde) {
      where.push("DATE(e.fecha_entrega) >= DATE(?)");
      params.push(String(desde));
    }

    if (hasta) {
      where.push("DATE(e.fecha_entrega) <= DATE(?)");
      params.push(String(hasta));
    }

    if (q) {
      const like = `%${String(q).trim()}%`;
      where.push(`
        (
          CAST(e.id_entrega AS CHAR) LIKE ?
          OR CAST(e.id_pedido AS CHAR) LIKE ?
          OR CASE
              WHEN c.es_empresa = 1 THEN COALESCE(c.nombre_empresa, 'Empresa')
              ELSE TRIM(CONCAT(COALESCE(c.nombre,''),' ',COALESCE(c.apellido,'')))
            END LIKE ?
        )
      `);
      params.push(like, like, like);
    }

    const [rows] = await pool.query(
      `
      SELECT
        e.id_entrega,
        e.id_pedido,
        e.fecha_entrega,

        p.estado AS pedido_estado,
        p.id_cliente,

        CASE
          WHEN c.es_empresa = 1 THEN COALESCE(c.nombre_empresa, 'Empresa')
          ELSE TRIM(CONCAT(COALESCE(c.nombre,''),' ',COALESCE(c.apellido,'')))
        END AS cliente_display,

        ed.id_entrega_detalle,
        ed.id_prototipo,
        pp.titulo AS prototipo_titulo,
        pp.medidas,
        ed.cantidad_entregada

      FROM entregas_transporte e
      JOIN pedidos p ON p.id_pedido = e.id_pedido
      LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
      LEFT JOIN entrega_detalles ed ON ed.id_entrega = e.id_entrega
      LEFT JOIN prototipo_pallet pp ON pp.id_prototipo = ed.id_prototipo

      WHERE ${where.join(" AND ")}
      ORDER BY e.fecha_entrega DESC, e.id_entrega DESC, ed.id_entrega_detalle ASC
      `,
      params
    );

    const map = new Map();

    for (const r of rows || []) {
      const idEntrega = Number(r.id_entrega);

      if (!map.has(idEntrega)) {
        map.set(idEntrega, {
          id_entrega: idEntrega,
          id_pedido: Number(r.id_pedido),
          fecha_entrega: r.fecha_entrega,

          pedido_estado: r.pedido_estado,
          id_cliente: Number(r.id_cliente),
          cliente_display: r.cliente_display,

          items_count: 0,
          total_entregado: 0,
          detalles: [],
        });
      }

      if (r.id_entrega_detalle != null) {
        const qty = Number(r.cantidad_entregada || 0);
        const obj = map.get(idEntrega);

        obj.items_count += 1;
        obj.total_entregado += qty;

        obj.detalles.push({
          id_entrega_detalle: Number(r.id_entrega_detalle),
          id_prototipo: Number(r.id_prototipo),
          prototipo_titulo: r.prototipo_titulo,
          medidas: r.medidas,
          cantidad_entregada: qty,
        });
      }
    }

    return res.status(200).json(Array.from(map.values()));
  } catch (err) {
    console.error("❌ Error en listEntregas:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const getResumenPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const id_pedido = toInt(id);
    if (!id_pedido) return res.status(400).json({ message: "id_pedido inválido." });

    const [rows] = await pool.query(
      `
      SELECT
        r.id_pedido,
        r.id_prototipo,
        r.titulo,
        r.pedido,
        r.entregado,
        r.faltante,
        COALESCE(pp.stock,0) AS stock_actual
      FROM vw_pedido_entrega_resumen r
      LEFT JOIN prototipo_pallet pp ON pp.id_prototipo = r.id_prototipo
      WHERE r.id_pedido = ?
      ORDER BY r.titulo
      `,
      [id_pedido]
    );

    const [tot] = await pool.query(
      `
      SELECT
        COALESCE(SUM(pedido),0) AS total_pedido,
        COALESCE(SUM(entregado),0) AS total_entregado,
        COALESCE(SUM(faltante),0) AS total_faltante
      FROM vw_pedido_entrega_resumen
      WHERE id_pedido = ?
      `,
      [id_pedido]
    );

    const totales = {
      total_pedido: Number(tot?.[0]?.total_pedido || 0),
      total_entregado: Number(tot?.[0]?.total_entregado || 0),
      total_faltante: Number(tot?.[0]?.total_faltante || 0),
      completo:
        Number(tot?.[0]?.total_faltante || 0) <= 0 &&
        Number(tot?.[0]?.total_pedido || 0) > 0,
    };

    const total_stock = (rows || []).reduce((acc, r) => acc + Number(r.stock_actual || 0), 0);

    return res.status(200).json({ rows: rows || [], totales, meta: { total_stock } });
  } catch (err) {
    console.error("❌ Error en getResumenPedido:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

/**
 * GET /entregas/pedido/:id/listar
 */
export const listEntregasByPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const id_pedido = toInt(id);
    if (!id_pedido) return res.status(400).json({ message: "id_pedido inválido." });

    const [rows] = await pool.query(
      `
      SELECT
        e.id_entrega,
        e.id_pedido,
        e.fecha_entrega,
        ed.id_entrega_detalle,
        ed.id_prototipo,
        pp.titulo AS prototipo_titulo,
        pp.medidas,
        ed.cantidad_entregada
      FROM entregas_transporte e
      LEFT JOIN entrega_detalles ed ON ed.id_entrega = e.id_entrega
      LEFT JOIN prototipo_pallet pp ON pp.id_prototipo = ed.id_prototipo
      WHERE e.id_pedido = ?
      ORDER BY e.fecha_entrega DESC, e.id_entrega DESC, ed.id_entrega_detalle ASC
      `,
      [id_pedido]
    );

    const map = new Map();
    for (const r of rows || []) {
      const idEntrega = Number(r.id_entrega);

      if (!map.has(idEntrega)) {
        map.set(idEntrega, {
          id_entrega: idEntrega,
          id_pedido: Number(r.id_pedido),
          fecha_entrega: r.fecha_entrega,
          detalles: [],
        });
      }

      if (r.id_entrega_detalle != null) {
        map.get(idEntrega).detalles.push({
          id_entrega_detalle: Number(r.id_entrega_detalle),
          id_prototipo: Number(r.id_prototipo),
          prototipo_titulo: r.prototipo_titulo,
          medidas: r.medidas,
          cantidad_entregada: Number(r.cantidad_entregada || 0),
        });
      }
    }

    const entregas = Array.from(map.values());

    const [resumen] = await pool.query(
      `
      SELECT id_pedido, id_prototipo, titulo, pedido, entregado, faltante
      FROM vw_pedido_entrega_resumen
      WHERE id_pedido = ?
      ORDER BY titulo
      `,
      [id_pedido]
    );

    const [tot] = await pool.query(
      `
      SELECT
        COALESCE(SUM(pedido),0) AS total_pedido,
        COALESCE(SUM(entregado),0) AS total_entregado,
        COALESCE(SUM(faltante),0) AS total_faltante
      FROM vw_pedido_entrega_resumen
      WHERE id_pedido = ?
      `,
      [id_pedido]
    );

    const totales = {
      total_pedido: Number(tot?.[0]?.total_pedido || 0),
      total_entregado: Number(tot?.[0]?.total_entregado || 0),
      total_faltante: Number(tot?.[0]?.total_faltante || 0),
      completo:
        Number(tot?.[0]?.total_faltante || 0) <= 0 &&
        Number(tot?.[0]?.total_pedido || 0) > 0,
    };

    return res.status(200).json({ entregas, resumen: resumen || [], totales });
  } catch (err) {
    console.error("❌ Error en listEntregasByPedido:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

/**
 * GET /entregas/:id
 */
export const getEntregaById = async (req, res) => {
  try {
    const { id } = req.params;
    const id_entrega = toInt(id);
    if (!id_entrega) return res.status(400).json({ message: "id_entrega inválido." });

    const [head] = await pool.query(
      `SELECT id_entrega, id_pedido, fecha_entrega FROM entregas_transporte WHERE id_entrega = ?`,
      [id_entrega]
    );
    if (!head.length) return res.status(404).json({ message: "Entrega no encontrada." });

    const [det] = await pool.query(
      `
      SELECT
        ed.id_entrega_detalle,
        ed.id_entrega,
        ed.id_pedido,
        ed.id_prototipo,
        pp.titulo AS prototipo_titulo,
        pp.medidas,
        ed.cantidad_entregada
      FROM entrega_detalles ed
      LEFT JOIN prototipo_pallet pp ON pp.id_prototipo = ed.id_prototipo
      WHERE ed.id_entrega = ?
      ORDER BY ed.id_entrega_detalle ASC
      `,
      [id_entrega]
    );

    return res.status(200).json({
      entrega: {
        ...head[0],
        id_entrega: Number(head[0].id_entrega),
        id_pedido: Number(head[0].id_pedido),
      },
      detalles: (det || []).map((d) => ({
        ...d,
        id_entrega_detalle: Number(d.id_entrega_detalle),
        id_entrega: Number(d.id_entrega),
        id_pedido: Number(d.id_pedido),
        id_prototipo: Number(d.id_prototipo),
        cantidad_entregada: Number(d.cantidad_entregada || 0),
      })),
    });
  } catch (err) {
    console.error("❌ Error en getEntregaById:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

/**
 * POST /entregas/agregar
 * body: { id_pedido, fecha_entrega?, detalles:[{id_prototipo,cantidad_entregada}] }
 */
export const createEntrega = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id_pedido = toInt(req.body.id_pedido);
    const fecha_entrega = normalizeDateTime(req.body.fecha_entrega);
    const detallesIn = Array.isArray(req.body.detalles) ? req.body.detalles : [];

    if (!id_pedido) return res.status(400).json({ message: "id_pedido es obligatorio." });
    if (!detallesIn.length) return res.status(400).json({ message: "Debe enviar detalles." });

    // Duplicados en body
    const seen = new Set();
    for (const d of detallesIn) {
      const idp = toInt(d?.id_prototipo);
      if (idp) {
        const k = String(idp);
        if (seen.has(k)) {
          return res.status(409).json({
            code: "DUPLICATE_ITEM_IN_ENTREGA",
            message: "No puede repetir el mismo prototipo en la misma entrega.",
            id_prototipo: idp,
          });
        }
        seen.add(k);
      }
    }

    const [pedidoRows] = await connection.query(
      `SELECT id_pedido, estado FROM pedidos WHERE id_pedido = ? AND eliminado = FALSE`,
      [id_pedido]
    );
    if (!pedidoRows.length) return res.status(404).json({ message: "Pedido no encontrado." });
    if (pedidoRows[0].estado === "cancelado") {
      return res
        .status(409)
        .json({ message: "No se pueden registrar entregas para un pedido cancelado." });
    }

    await connection.beginTransaction();

    const [ins] = await connection.query(
      `
      INSERT INTO entregas_transporte (id_pedido, fecha_entrega)
      VALUES (?, COALESCE(?, CURRENT_TIMESTAMP))
      `,
      [id_pedido, fecha_entrega]
    );
    const id_entrega = ins.insertId;

    const resumenRows = await getResumenPedidoTx(connection, id_pedido);
    const resumenMap = buildResumenMap(resumenRows);

    for (const d of detallesIn) {
      const id_prototipo = toInt(d.id_prototipo);
      const qty = toInt(d.cantidad_entregada);

      if (!id_prototipo) {
        await connection.rollback();
        return res.status(400).json({ message: "id_prototipo inválido en detalles." });
      }
      if (!isPosInt(qty)) {
        await connection.rollback();
        return res.status(400).json({ message: "cantidad_entregada debe ser > 0." });
      }

      const info = resumenMap.get(Number(id_prototipo));
      if (!info) {
        await connection.rollback();
        return res.status(404).json({
          message: `El prototipo #${id_prototipo} no existe dentro del pedido #${id_pedido}.`,
        });
      }

      const faltante = Number(info.faltante || 0);

      // ✅ No más de lo necesario para cumplir el pedido
      if (qty > faltante) {
        await connection.rollback();
        return res.status(409).json({
          code: "ENTREGA_SUPERA_FALTANTE",
          message: `No puede entregar ${qty}. Faltante actual: ${faltante}.`,
          id_prototipo,
          faltante,
        });
      }

      // ✅ Validar y descontar stock real (pallet terminado)
      const chk = await requireAndDiscountStockTx(connection, id_prototipo, qty, info.titulo);
      if (!chk.ok) {
        await connection.rollback();
        return res.status(chk.status).json(chk.payload);
      }

      await connection.query(
        `
        INSERT INTO entrega_detalles (id_entrega, id_pedido, id_prototipo, cantidad_entregada)
        VALUES (?, ?, ?, ?)
        `,
        [id_entrega, id_pedido, id_prototipo, qty]
      );
    }

    const totales = await syncPedidoEstadoPorEntregasTx(connection, id_pedido);

    await connection.commit();

    return res.status(201).json({
      message: "Entrega registrada exitosamente.",
      id_entrega,
      totales,
    });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}
    console.error("❌ Error en createEntrega:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

/**
 * PUT /entregas/:id
 * body: { fecha_entrega }
 */
export const updateEntregaHeader = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const id_entrega = toInt(id);
    const fecha_entrega = normalizeDateTime(req.body.fecha_entrega);

    if (!id_entrega) return res.status(400).json({ message: "id_entrega inválido." });
    if (!fecha_entrega) return res.status(400).json({ message: "fecha_entrega es obligatoria." });

    await connection.beginTransaction();

    const [h] = await connection.query(
      `SELECT id_entrega, id_pedido FROM entregas_transporte WHERE id_entrega = ?`,
      [id_entrega]
    );
    if (!h.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Entrega no encontrada." });
    }
    const id_pedido = Number(h[0].id_pedido);

    await connection.query(`UPDATE entregas_transporte SET fecha_entrega = ? WHERE id_entrega = ?`, [
      fecha_entrega,
      id_entrega,
    ]);

    const totales = await syncPedidoEstadoPorEntregasTx(connection, id_pedido);

    await connection.commit();

    return res.status(200).json({ message: "Entrega actualizada.", totales });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}
    console.error("❌ Error en updateEntregaHeader:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

/**
 * PUT /entregas/:id/detalles
 * body: { detalles:[{id_prototipo,cantidad_entregada}] }
 */
export const replaceEntregaDetalles = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const id_entrega = toInt(id);
    const detallesIn = Array.isArray(req.body.detalles) ? req.body.detalles : [];

    if (!id_entrega) return res.status(400).json({ message: "id_entrega inválido." });
    if (!detallesIn.length) return res.status(400).json({ message: "Debe enviar detalles." });

    // Duplicados
    const seen = new Set();
    for (const d of detallesIn) {
      const idp = toInt(d?.id_prototipo);
      if (!idp) continue;
      const k = String(idp);
      if (seen.has(k)) {
        return res.status(409).json({
          code: "DUPLICATE_ITEM_IN_ENTREGA",
          message: "No puede repetir el mismo prototipo en la misma entrega.",
          id_prototipo: idp,
        });
      }
      seen.add(k);
    }

    await connection.beginTransaction();

    const [h] = await connection.query(
      `SELECT id_entrega, id_pedido FROM entregas_transporte WHERE id_entrega = ?`,
      [id_entrega]
    );
    if (!h.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Entrega no encontrada." });
    }
    const id_pedido = Number(h[0].id_pedido);

    const resumenRows = await getResumenPedidoTx(connection, id_pedido);
    const resumenMap = buildResumenMap(resumenRows);

    // Detalles actuales
    const [actualRows] = await connection.query(
      `
      SELECT id_prototipo, cantidad_entregada
      FROM entrega_detalles
      WHERE id_entrega = ?
      `,
      [id_entrega]
    );
    const actualMap = new Map(
      (actualRows || []).map((r) => [Number(r.id_prototipo), Number(r.cantidad_entregada || 0)])
    );

    // ✅ 1) Restaurar stock de lo que tenía esta entrega antes
    for (const r of actualRows || []) {
      const idp = Number(r.id_prototipo);
      const qtyOld = Number(r.cantidad_entregada || 0);
      if (idp > 0 && qtyOld > 0) {
        await restoreStockTx(connection, idp, qtyOld);
      }
    }

    // ✅ 2) Borrar detalles anteriores
    await connection.query(`DELETE FROM entrega_detalles WHERE id_entrega = ?`, [id_entrega]);

    // ✅ 3) Insertar nuevos detalles, validando:
    // - cap = faltanteActual + antesEnEsta (para permitir reponer/ajustar)
    // - stock real (después de restaurar)
    for (const d of detallesIn) {
      const id_prototipo = toInt(d.id_prototipo);
      const qty = toInt(d.cantidad_entregada);

      if (!id_prototipo) {
        await connection.rollback();
        return res.status(400).json({ message: "id_prototipo inválido en detalles." });
      }
      if (!isPosInt(qty)) {
        await connection.rollback();
        return res.status(400).json({ message: "cantidad_entregada debe ser > 0." });
      }

      const info = resumenMap.get(Number(id_prototipo));
      if (!info) {
        await connection.rollback();
        return res.status(404).json({
          message: `El prototipo #${id_prototipo} no existe dentro del pedido #${id_pedido}.`,
        });
      }

      const faltanteActual = Number(info.faltante || 0);
      const antesEnEsta = Number(actualMap.get(Number(id_prototipo)) || 0);
      const cap = faltanteActual + antesEnEsta;

      // ✅ No más de lo necesario para cumplir el pedido (cap)
      if (qty > cap) {
        await connection.rollback();
        return res.status(409).json({
          code: "ENTREGA_SUPERA_FALTANTE",
          message: `No puede entregar ${qty}. Faltante actual: ${cap}.`,
          id_prototipo,
          faltante: cap,
        });
      }

      // ✅ Validar y descontar stock real
      const chk = await requireAndDiscountStockTx(connection, id_prototipo, qty, info.titulo);
      if (!chk.ok) {
        await connection.rollback();
        return res.status(chk.status).json(chk.payload);
      }

      await connection.query(
        `
        INSERT INTO entrega_detalles (id_entrega, id_pedido, id_prototipo, cantidad_entregada)
        VALUES (?, ?, ?, ?)
        `,
        [id_entrega, id_pedido, id_prototipo, qty]
      );
    }

    const totales = await syncPedidoEstadoPorEntregasTx(connection, id_pedido);

    await connection.commit();

    return res.status(200).json({ message: "Detalles actualizados.", totales });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}
    console.error("❌ Error en replaceEntregaDetalles:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

/**
 * DELETE /entregas/:id
 */
export const deleteEntrega = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const id_entrega = toInt(id);
    if (!id_entrega) return res.status(400).json({ message: "id_entrega inválido." });

    await connection.beginTransaction();

    const [h] = await connection.query(
      `SELECT id_entrega, id_pedido FROM entregas_transporte WHERE id_entrega = ?`,
      [id_entrega]
    );
    if (!h.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Entrega no encontrada." });
    }
    const id_pedido = Number(h[0].id_pedido);

    // ✅ Restaurar stock de todos los detalles antes de borrar
    const [det] = await connection.query(
      `SELECT id_prototipo, cantidad_entregada FROM entrega_detalles WHERE id_entrega = ?`,
      [id_entrega]
    );

    for (const it of det || []) {
      const idp = Number(it.id_prototipo);
      const qty = Number(it.cantidad_entregada || 0);
      if (idp > 0 && qty > 0) {
        await restoreStockTx(connection, idp, qty);
      }
    }

    await connection.query(`DELETE FROM entrega_detalles WHERE id_entrega = ?`, [id_entrega]);
    await connection.query(`DELETE FROM entregas_transporte WHERE id_entrega = ?`, [id_entrega]);

    const totales = await syncPedidoEstadoPorEntregasTx(connection, id_pedido);

    await connection.commit();

    return res.status(200).json({ message: "Entrega eliminada.", totales });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}
    console.error("❌ Error en deleteEntrega:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};

/**
 * DELETE /entregas/:id/detalles/:id_prototipo
 */
export const deleteEntregaDetalle = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id, id_prototipo } = req.params;
    const id_entrega = toInt(id);
    const protId = toInt(id_prototipo);

    if (!id_entrega) return res.status(400).json({ message: "id_entrega inválido." });
    if (!protId) return res.status(400).json({ message: "id_prototipo inválido." });

    await connection.beginTransaction();

    const [h] = await connection.query(
      `SELECT id_entrega, id_pedido FROM entregas_transporte WHERE id_entrega = ?`,
      [id_entrega]
    );
    if (!h.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Entrega no encontrada." });
    }
    const id_pedido = Number(h[0].id_pedido);

    // ✅ traer qty para restaurar stock antes de borrar
    const [[row]] = await connection.query(
      `SELECT cantidad_entregada FROM entrega_detalles WHERE id_entrega = ? AND id_prototipo = ?`,
      [id_entrega, protId]
    );

    if (!row) {
      await connection.rollback();
      return res.status(404).json({ message: "Detalle no encontrado." });
    }

    const qtyOld = Number(row.cantidad_entregada || 0);
    if (qtyOld > 0) {
      await restoreStockTx(connection, protId, qtyOld);
    }

    const [del] = await connection.query(
      `DELETE FROM entrega_detalles WHERE id_entrega = ? AND id_prototipo = ?`,
      [id_entrega, protId]
    );
    if (!del.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ message: "Detalle no encontrado." });
    }

    // si quedó vacía, borrar cabecera
    const [[cnt]] = await connection.query(
      `SELECT COUNT(*) AS c FROM entrega_detalles WHERE id_entrega = ?`,
      [id_entrega]
    );
    if (Number(cnt?.c || 0) === 0) {
      await connection.query(`DELETE FROM entregas_transporte WHERE id_entrega = ?`, [id_entrega]);
    }

    const totales = await syncPedidoEstadoPorEntregasTx(connection, id_pedido);

    await connection.commit();

    return res.status(200).json({ message: "Detalle eliminado.", totales });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}
    console.error("❌ Error en deleteEntregaDetalle:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    connection.release();
  }
};
