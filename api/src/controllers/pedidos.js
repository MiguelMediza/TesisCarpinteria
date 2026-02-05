import { pool } from "../db.js";

/* =========================================================================
   Constantes / helpers
============================================================================ */

const ESTADOS = new Set(["pendiente", "en_produccion", "listo", "entregado", "cancelado"]);
const isValidEstado = (v) => ESTADOS.has(v);
const isValidDate = (s) => !s || !Number.isNaN(new Date(s).getTime());

const isISODateOnly = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());

const toDateComparable = (s) => {
  const raw = String(s || "").trim();
  if (!raw) return null;

  // "YYYY-MM-DD"
  if (isISODateOnly(raw)) return new Date(`${raw}T00:00:00`);

  // "YYYY-MM-DD HH:mm:ss"
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    const norm = raw.replace(" ", "T");
    return new Date(norm.length === 16 ? `${norm}:00` : norm);
  }

  return new Date(raw);
};

const isStrictlyAfter = (a, b) => {
  if (!a || !b) return false;

  const A = String(a).trim();
  const B = String(b).trim();
  if (isISODateOnly(A) && isISODateOnly(B)) return A > B;

  const da = toDateComparable(A);
  const db = toDateComparable(B);
  if (!da || !db || Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;

  return da.getTime() > db.getTime();
};

const KERF_CM = 0.5;

const piezasPorPadre = (largoPadre, largoHijo) => {
  const Lp = Number(largoPadre || 0);
  const Lh = Number(largoHijo || 0);
  if (Lp <= 0 || Lh <= 0) return 1;

  const denom = Lh + KERF_CM;
  const n = Math.floor((Lp + KERF_CM) / denom);
  return Math.max(n, 1);
};

const ceilDiv = (a, b) => Math.ceil(Number(a) / Math.max(Number(b), 1));

/**
 * Totales por entregas (vista vw_pedido_entrega_resumen)
 */
async function getTotalesEntrega(conn, id_pedido) {
  const [tot] = await conn.query(
    `
    SELECT
      COALESCE(SUM(pedido),0)   AS total_pedido,
      COALESCE(SUM(entregado),0) AS total_entregado,
      COALESCE(SUM(faltante),0)  AS total_faltante
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
    completo: total_pedido > 0 && total_faltante <= 0,
    hayEntregas: total_entregado > 0,
  };
}

/**
 * ✅ Sincroniza estado del pedido según entregas:
 * - Sin entregas => pendiente
 * - Parcial => listo
 * - Completo => entregado
 * NO pisa cancelado.
 */
export async function syncEstadoPedidoPorEntregas(conn, id_pedido) {
  const tot = await getTotalesEntrega(conn, id_pedido);

  let nuevoEstado = "pendiente";
  if (tot.total_entregado > 0) {
    nuevoEstado = tot.completo ? "entregado" : "listo";
  }

  await conn.query(
    `
    UPDATE pedidos
    SET estado = ?
    WHERE id_pedido = ?
      AND eliminado = FALSE
      AND estado <> 'cancelado'
    `,
    [nuevoEstado, id_pedido]
  );

  return { nuevoEstado, totales: tot };
}

/**
 * Convierte insumos_stock del body a Map usable.
 * (Se mantiene por compatibilidad de tus endpoints de preview/requerimientos)
 */
function buildSelOverrideMap(insumos_stock) {
  const map = new Map();
  if (!Array.isArray(insumos_stock)) return map;

  for (const it of insumos_stock) {
    const cat = it?.categoria;
    const idItem = Number(it?.id_item);
    const qty = Number(it?.cantidad_desde_stock ?? 0);

    if (!["tabla", "taco"].includes(cat)) continue;
    if (!Number.isFinite(idItem) || idItem <= 0) continue;
    if (!Number.isFinite(qty) || qty < 0) continue;

    map.set(`${cat}:${idItem}`, Math.floor(qty));
  }
  return map;
}

/* =========================================================================
   BOM + expansión patín => (1 tabla + 3 tacos)
============================================================================ */

async function getReqBOMMaps(conn, id_pedido) {
  const [rows] = await conn.query(
    `
    SELECT
      bom.categoria,
      bom.id_item,
      bom.titulo,
      SUM(bom.cantidad * ppp.cantidad_a_producir) AS req
    FROM pedido_prototipo_pallet ppp
    JOIN vw_prototipo_bom_detalle bom
      ON bom.id_prototipo = ppp.id_prototipo
    WHERE ppp.id_pedido = ?
    GROUP BY bom.categoria, bom.id_item, bom.titulo
    `,
    [id_pedido]
  );

  const reqTabla = new Map();
  const reqTaco = new Map();
  const reqClavo = new Map();
  const reqFibra = new Map();
  const reqPatin = new Map();

  for (const r of rows) {
    const cat = r.categoria;
    const id = Number(r.id_item);
    const req = Number(r.req || 0);
    if (!Number.isFinite(req) || req <= 0) continue;

    if (cat === "tabla") reqTabla.set(id, { req: (reqTabla.get(id)?.req || 0) + req, titulo: r.titulo });
    else if (cat === "taco") reqTaco.set(id, { req: (reqTaco.get(id)?.req || 0) + req, titulo: r.titulo });
    else if (cat === "clavo") reqClavo.set(id, { req: (reqClavo.get(id)?.req || 0) + req, titulo: r.titulo });
    else if (cat === "fibra") reqFibra.set(id, { req: (reqFibra.get(id)?.req || 0) + req, titulo: r.titulo });
    else if (cat === "patin") reqPatin.set(id, { req: (reqPatin.get(id)?.req || 0) + req, titulo: r.titulo });
  }

  // Expandir patín => tabla + (3 tacos)
  if (reqPatin.size > 0) {
    const patinIds = Array.from(reqPatin.keys());
    const [mapRows] = await conn.query(
      `
      SELECT id_tipo_patin, id_tipo_tabla, id_tipo_taco
      FROM tipo_patines
      WHERE id_tipo_patin IN (?)
      `,
      [patinIds]
    );

    const byPatin = new Map(mapRows.map((x) => [Number(x.id_tipo_patin), x]));

    for (const [idPatin, info] of reqPatin.entries()) {
      const rel = byPatin.get(idPatin);
      if (!rel) continue;

      const cantPatines = Number(info.req || 0);
      if (!Number.isFinite(cantPatines) || cantPatines <= 0) continue;

      if (rel.id_tipo_tabla) {
        const idTT = Number(rel.id_tipo_tabla);
        const cur = reqTabla.get(idTT);
        reqTabla.set(idTT, {
          req: (cur?.req || 0) + cantPatines,
          titulo: cur?.titulo || `Tipo tabla #${idTT}`,
        });
      }

      if (rel.id_tipo_taco) {
        const idTK = Number(rel.id_tipo_taco);
        const cur = reqTaco.get(idTK);
        reqTaco.set(idTK, {
          req: (cur?.req || 0) + cantPatines * 3,
          titulo: cur?.titulo || `Tipo taco #${idTK}`,
        });
      }
    }
  }

  return { reqTabla, reqTaco, reqClavo, reqFibra };
}

async function getSeleccionesStock(conn, id_pedido) {
  const [rows] = await conn.query(
    `SELECT categoria, id_item, cantidad_desde_stock FROM pedido_insumos_stock WHERE id_pedido = ?`,
    [id_pedido]
  );
  const map = new Map();
  for (const r of rows) {
    map.set(`${r.categoria}:${Number(r.id_item)}`, Number(r.cantidad_desde_stock || 0));
  }
  return map;
}

/**
 * Construye plan de consumo (se mantiene por compatibilidad de preview/requerimientos)
 */
async function buildPlanProduccion(conn, id_pedido, insumos_stock_override = null) {
  const { reqTabla, reqTaco, reqClavo, reqFibra } = await getReqBOMMaps(conn, id_pedido);

  const sel =
    Array.isArray(insumos_stock_override)
      ? buildSelOverrideMap(insumos_stock_override)
      : await getSeleccionesStock(conn, id_pedido);

  const tablaIds = Array.from(reqTabla.keys());
  const tacoIds = Array.from(reqTaco.keys());
  const clavoIds = Array.from(reqClavo.keys());
  const fibraIds = Array.from(reqFibra.keys());

  const tablasInfo = new Map();
  if (tablaIds.length) {
    const [rows] = await conn.query(
      `
      SELECT
        tt.id_tipo_tabla,
        tt.titulo AS tipo_titulo,
        COALESCE(tt.stock,0) AS stock_tipo,
        tt.largo_cm AS largo_hijo,
        mp.id_materia_prima AS id_padre,
        mp.titulo AS padre_titulo,
        COALESCE(mp.stock,0) AS stock_padre,
        tb.largo_cm AS largo_padre
      FROM tipo_tablas tt
      JOIN materiaprima mp ON mp.id_materia_prima = tt.id_materia_prima
      LEFT JOIN tablas tb ON tb.id_materia_prima = tt.id_materia_prima
      WHERE tt.id_tipo_tabla IN (?)
      `,
      [tablaIds]
    );
    for (const r of rows) tablasInfo.set(Number(r.id_tipo_tabla), r);
  }

  const tacosInfo = new Map();
  if (tacoIds.length) {
    const [rows] = await conn.query(
      `
      SELECT
        tk.id_tipo_taco,
        tk.titulo AS tipo_titulo,
        COALESCE(tk.stock,0) AS stock_tipo,
        tk.largo_cm AS largo_hijo,
        mp.id_materia_prima AS id_padre,
        mp.titulo AS padre_titulo,
        COALESCE(mp.stock,0) AS stock_padre,
        pl.largo_cm AS largo_padre
      FROM tipo_tacos tk
      JOIN materiaprima mp ON mp.id_materia_prima = tk.id_materia_prima
      LEFT JOIN palos pl ON pl.id_materia_prima = tk.id_materia_prima
      WHERE tk.id_tipo_taco IN (?)
      `,
      [tacoIds]
    );
    for (const r of rows) tacosInfo.set(Number(r.id_tipo_taco), r);
  }

  const mpInfo = new Map();
  const mpIds = Array.from(new Set([...clavoIds, ...fibraIds]));
  if (mpIds.length) {
    const [rows] = await conn.query(
      `SELECT id_materia_prima, titulo, COALESCE(stock,0) AS stock FROM materiaprima WHERE id_materia_prima IN (?)`,
      [mpIds]
    );
    for (const r of rows) mpInfo.set(Number(r.id_materia_prima), r);
  }

  const plan = {
    tablas: [],
    tacos: [],
    clavos: [],
    fibras: [],
    consumo_base: new Map(),
  };

  // TABLAS
  for (const [idTT, infoReq] of reqTabla.entries()) {
    const meta = tablasInfo.get(idTT);
    const req = Number(infoReq.req || 0);
    const selected = Math.max(0, Number(sel.get(`tabla:${idTT}`) || 0));
    const stockTipo = Number(meta?.stock_tipo ?? 0);

    const usarDesdeStock = Math.min(selected, stockTipo, req);
    const aProducirTipo = Math.max(req - usarDesdeStock, 0);

    const piezas = piezasPorPadre(meta?.largo_padre, meta?.largo_hijo);
    const padresNecesarios = ceilDiv(aProducirTipo, piezas);

    if (meta?.id_padre) {
      const k = Number(meta.id_padre);
      plan.consumo_base.set(k, (plan.consumo_base.get(k) || 0) + padresNecesarios);
    }

    plan.tablas.push({
      id_tipo_tabla: idTT,
      titulo: meta?.tipo_titulo || infoReq.titulo || `Tipo tabla #${idTT}`,
      requerido: req,
      stock_tipo: stockTipo,
      cantidad_desde_stock: usarDesdeStock,
      cantidad_a_producir: aProducirTipo,
      padre: meta?.id_padre
        ? {
            id_materia_prima: Number(meta.id_padre),
            titulo: meta.padre_titulo,
            stock: Number(meta.stock_padre ?? 0),
            piezas_por_padre: piezas,
            padres_necesarios: padresNecesarios,
          }
        : null,
    });
  }

  // TACOS
  for (const [idTK, infoReq] of reqTaco.entries()) {
    const meta = tacosInfo.get(idTK);
    const req = Number(infoReq.req || 0);
    const selected = Math.max(0, Number(sel.get(`taco:${idTK}`) || 0));
    const stockTipo = Number(meta?.stock_tipo ?? 0);

    const usarDesdeStock = Math.min(selected, stockTipo, req);
    const aProducirTipo = Math.max(req - usarDesdeStock, 0);

    const piezas = piezasPorPadre(meta?.largo_padre, meta?.largo_hijo);
    const padresNecesarios = ceilDiv(aProducirTipo, piezas);

    if (meta?.id_padre) {
      const k = Number(meta.id_padre);
      plan.consumo_base.set(k, (plan.consumo_base.get(k) || 0) + padresNecesarios);
    }

    plan.tacos.push({
      id_tipo_taco: idTK,
      titulo: meta?.tipo_titulo || infoReq.titulo || `Tipo taco #${idTK}`,
      requerido: req,
      stock_tipo: stockTipo,
      cantidad_desde_stock: usarDesdeStock,
      cantidad_a_producir: aProducirTipo,
      padre: meta?.id_padre
        ? {
            id_materia_prima: Number(meta.id_padre),
            titulo: meta.padre_titulo,
            stock: Number(meta.stock_padre ?? 0),
            piezas_por_padre: piezas,
            padres_necesarios: padresNecesarios,
          }
        : null,
    });
  }

  // CLAVOS / FIBRAS (directo)
  for (const [idMP, infoReq] of reqClavo.entries()) {
    const meta = mpInfo.get(idMP);
    plan.clavos.push({
      id_materia_prima: idMP,
      titulo: meta?.titulo || infoReq.titulo || `Clavo #${idMP}`,
      requerido: Number(infoReq.req || 0),
      stock: Number(meta?.stock ?? 0),
    });
  }
  for (const [idMP, infoReq] of reqFibra.entries()) {
    const meta = mpInfo.get(idMP);
    plan.fibras.push({
      id_materia_prima: idMP,
      titulo: meta?.titulo || infoReq.titulo || `Fibra #${idMP}`,
      requerido: Number(infoReq.req || 0),
      stock: Number(meta?.stock ?? 0),
    });
  }

  return plan;
}

/* =========================================================================
   ENDPOINTS (preview / requerimientos / selección)
============================================================================ */

export const produccionPreview = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    const [[pedido]] = await conn.query(
      `SELECT id_pedido, estado, eliminado FROM pedidos WHERE id_pedido = ?`,
      [id]
    );
    if (!pedido || pedido.eliminado) return res.status(404).json({ message: "Pedido no encontrado." });

    const { reqTabla, reqTaco } = await getReqBOMMaps(conn, id);

    const tablaIds = Array.from(reqTabla.keys());
    const tacoIds = Array.from(reqTaco.keys());

    const tablas = [];
    if (tablaIds.length) {
      const [rows] = await conn.query(
        `
        SELECT
          tt.id_tipo_tabla, tt.titulo AS tipo_titulo, COALESCE(tt.stock,0) AS stock_tipo,
          tt.largo_cm AS largo_hijo,
          mp.id_materia_prima AS id_padre, mp.titulo AS padre_titulo, COALESCE(mp.stock,0) AS stock_padre,
          tb.largo_cm AS largo_padre
        FROM tipo_tablas tt
        JOIN materiaprima mp ON mp.id_materia_prima = tt.id_materia_prima
        LEFT JOIN tablas tb ON tb.id_materia_prima = tt.id_materia_prima
        WHERE tt.id_tipo_tabla IN (?)
        `,
        [tablaIds]
      );

      for (const r of rows) {
        const req = Number(reqTabla.get(Number(r.id_tipo_tabla))?.req || 0);
        const piezas = piezasPorPadre(r.largo_padre, r.largo_hijo);

        tablas.push({
          categoria: "tabla",
          id_item: Number(r.id_tipo_tabla),
          titulo: r.tipo_titulo,
          requerido: req,
          stock_tipo: Number(r.stock_tipo || 0),
          sugerido_desde_stock: Math.min(req, Number(r.stock_tipo || 0)),
          padre: {
            id_materia_prima: Number(r.id_padre),
            titulo: r.padre_titulo,
            stock: Number(r.stock_padre || 0),
            piezas_por_padre: piezas,
          },
        });
      }
    }

    const tacos = [];
    if (tacoIds.length) {
      const [rows] = await conn.query(
        `
        SELECT
          tk.id_tipo_taco, tk.titulo AS tipo_titulo, COALESCE(tk.stock,0) AS stock_tipo,
          tk.largo_cm AS largo_hijo,
          mp.id_materia_prima AS id_padre, mp.titulo AS padre_titulo, COALESCE(mp.stock,0) AS stock_padre,
          pl.largo_cm AS largo_padre
        FROM tipo_tacos tk
        JOIN materiaprima mp ON mp.id_materia_prima = tk.id_materia_prima
        LEFT JOIN palos pl ON pl.id_materia_prima = tk.id_materia_prima
        WHERE tk.id_tipo_taco IN (?)
        `,
        [tacoIds]
      );

      for (const r of rows) {
        const req = Number(reqTaco.get(Number(r.id_tipo_taco))?.req || 0);
        const piezas = piezasPorPadre(r.largo_padre, r.largo_hijo);

        tacos.push({
          categoria: "taco",
          id_item: Number(r.id_tipo_taco),
          titulo: r.tipo_titulo,
          requerido: req,
          stock_tipo: Number(r.stock_tipo || 0),
          sugerido_desde_stock: Math.min(req, Number(r.stock_tipo || 0)),
          padre: {
            id_materia_prima: Number(r.id_padre),
            titulo: r.padre_titulo,
            stock: Number(r.stock_padre || 0),
            piezas_por_padre: piezas,
          },
        });
      }
    }

    return res.json({
      pedido: { id_pedido: pedido.id_pedido, estado: pedido.estado },
      insumos: { tabla: tablas, taco: tacos },
      meta: { kerf_cm: KERF_CM, patin_equiv: { tabla: 1, taco: 3 } },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error en produccionpreview." });
  } finally {
    conn.release();
  }
};

export const getRequerimientosProduccionPedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    const plan = await buildPlanProduccion(conn, id);

    const baseIds = Array.from(plan.consumo_base.keys()).map(Number);
    const clavoIds = (plan.clavos || []).map((c) => Number(c.id_materia_prima));
    const fibraIds = (plan.fibras || []).map((f) => Number(f.id_materia_prima));

    const mpIds = Array.from(new Set([...baseIds, ...clavoIds, ...fibraIds])).filter(
      (x) => Number.isFinite(x) && x > 0
    );

    const mpMap = new Map();
    if (mpIds.length) {
      const [rows] = await conn.query(
        `
        SELECT id_materia_prima, titulo, COALESCE(stock,0) AS stock
        FROM materiaprima
        WHERE id_materia_prima IN (?)
        `,
        [mpIds]
      );

      for (const r of rows) {
        mpMap.set(Number(r.id_materia_prima), {
          titulo: r.titulo,
          stock: Number(r.stock || 0),
        });
      }
    }

    const consumoBaseArr = [];
    const consumoBaseDetalle = [];

    for (const [id_mp_raw, cant_raw] of plan.consumo_base.entries()) {
      const id_materia_prima = Number(id_mp_raw);
      const requerido = Number(cant_raw || 0);

      const meta = mpMap.get(id_materia_prima);
      const titulo = meta?.titulo || `Materia prima #${id_materia_prima}`;
      const stock = Number(meta?.stock ?? 0);

      consumoBaseArr.push({ id_materia_prima, requerido });
      consumoBaseDetalle.push({
        id_materia_prima,
        titulo,
        stock,
        requerido,
        insuficiente: stock < requerido,
        deficit: Math.max(requerido - stock, 0),
      });
    }

    consumoBaseDetalle.sort((a, b) => String(a.titulo || "").localeCompare(String(b.titulo || "")));

    const clavos = (plan.clavos || []).map((c) => {
      const id_materia_prima = Number(c.id_materia_prima);
      const requerido = Number(c.requerido || 0);

      const meta = mpMap.get(id_materia_prima);
      const stock = Number(meta?.stock ?? c.stock ?? 0);
      const titulo = meta?.titulo || c.titulo || `Clavo #${id_materia_prima}`;

      return {
        ...c,
        id_materia_prima,
        titulo,
        stock,
        requerido,
        insuficiente: stock < requerido,
        deficit: Math.max(requerido - stock, 0),
      };
    });

    const fibras = (plan.fibras || []).map((f) => {
      const id_materia_prima = Number(f.id_materia_prima);
      const requerido = Number(f.requerido || 0);

      const meta = mpMap.get(id_materia_prima);
      const stock = Number(meta?.stock ?? f.stock ?? 0);
      const titulo = meta?.titulo || f.titulo || `Fibra #${id_materia_prima}`;

      return {
        ...f,
        id_materia_prima,
        titulo,
        stock,
        requerido,
        insuficiente: stock < requerido,
        deficit: Math.max(requerido - stock, 0),
      };
    });

    const faltantes = [
      ...consumoBaseDetalle
        .filter((x) => x.insuficiente)
        .map((x) => ({
          categoria: "base",
          id_item: x.id_materia_prima,
          requerido: x.requerido,
          disponible: x.stock,
          motivo: x.titulo,
        })),
      ...clavos
        .filter((x) => x.insuficiente)
        .map((x) => ({
          categoria: "clavo",
          id_item: x.id_materia_prima,
          requerido: x.requerido,
          disponible: x.stock,
          motivo: x.titulo,
        })),
      ...fibras
        .filter((x) => x.insuficiente)
        .map((x) => ({
          categoria: "fibra",
          id_item: x.id_materia_prima,
          requerido: x.requerido,
          disponible: x.stock,
          motivo: x.titulo,
        })),
    ];

    return res.status(200).json({
      tablas: plan.tablas,
      tacos: plan.tacos,
      clavos,
      fibras,

      consumo_base: consumoBaseArr,
      consumo_base_detalle: consumoBaseDetalle,
      faltantes,

      nota: "Los requerimientos se calculan sobre cantidad_a_producir del pedido.",
      meta: { kerf_cm: KERF_CM, patin_equiv: { tabla: 1, taco: 3 } },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error calculando requerimientos." });
  } finally {
    conn.release();
  }
};

export const setInsumosStockPedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { insumos } = req.body;

    if (!Array.isArray(insumos)) {
      return res.status(400).json({ message: "insumos debe ser un array." });
    }

    await conn.beginTransaction();

    await conn.query(`DELETE FROM pedido_insumos_stock WHERE id_pedido = ?`, [id]);

    const values = [];
    for (const it of insumos) {
      const cat = it?.categoria;
      const idItem = parseInt(it?.id_item, 10);
      const qty = parseInt(it?.cantidad_desde_stock ?? 0, 10);

      if (!["tabla", "taco"].includes(cat)) {
        await conn.rollback();
        return res.status(400).json({ message: `Categoría inválida: ${cat}` });
      }
      if (!Number.isInteger(idItem) || idItem <= 0) {
        await conn.rollback();
        return res.status(400).json({ message: `id_item inválido para ${cat}` });
      }
      if (!Number.isInteger(qty) || qty < 0) {
        await conn.rollback();
        return res.status(400).json({ message: "cantidad_desde_stock debe ser >= 0" });
      }

      values.push([id, cat, idItem, qty]);
    }

    if (values.length) {
      await conn.query(
        `
        INSERT INTO pedido_insumos_stock (id_pedido, categoria, id_item, cantidad_desde_stock)
        VALUES ?
        `,
        [values]
      );
    }

    await conn.commit();
    return res.status(200).json({ message: "Selección de stock guardada." });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    console.error(e);
    return res.status(500).json({ message: "Error guardando selección." });
  } finally {
    conn.release();
  }
};

/* =========================================================================
   PEDIDOS CRUD
============================================================================ */

export const createPedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      id_cliente,
      fecha_realizado,
      fecha_de_entrega = null,
      estado: _estadoIgnored,
      comentarios = null,
      items = [],
    } = req.body;

    if (!id_cliente) return res.status(400).json("id_cliente es obligatorio.");
    if (!fecha_realizado) return res.status(400).json("fecha_realizado es obligatoria.");

    if (!isValidDate(fecha_realizado) || !isValidDate(fecha_de_entrega)) {
      return res.status(400).json("Fecha inválida.");
    }

    if (fecha_de_entrega && !isStrictlyAfter(fecha_de_entrega, fecha_realizado)) {
      return res.status(400).json("La fecha de entrega debe ser posterior a la fecha realizada.");
    }

    const estadoFinal = "pendiente";

    await conn.beginTransaction();

    const [ins] = await conn.query(
      `
      INSERT INTO pedidos (id_cliente, estado, fecha_realizado, fecha_de_entrega, comentarios, eliminado)
      VALUES (?, ?, ?, ?, ?, FALSE)
      `,
      [parseInt(id_cliente, 10), estadoFinal, fecha_realizado, fecha_de_entrega || null, comentarios || null]
    );

    const id_pedido = ins.insertId;

    if (Array.isArray(items) && items.length > 0) {
      const values = [];

      for (const it of items) {
        if (!it?.id_prototipo || !it?.cantidad_pallets) {
          await conn.rollback();
          return res.status(400).json("Cada ítem requiere id_prototipo y cantidad_pallets (> 0).");
        }

        const idProt = parseInt(it.id_prototipo, 10);
        const qty = parseInt(it.cantidad_pallets, 10);

        if (!Number.isInteger(qty) || qty <= 0) {
          await conn.rollback();
          return res.status(400).json("cantidad_pallets debe ser entero > 0.");
        }

        // ✅ YA NO SE USA STOCK EXISTENTE EN PEDIDOS (se gestiona en ENTREGAS)
        const qtyStock = 0;

        // ⛔️ BLOQUE COMENTADO: validación y descuento de stock de prototipo al crear pedido
        /*
        if (qtyStock > 0) {
          const [[prot]] = await conn.query(
            `SELECT stock FROM prototipo_pallet WHERE id_prototipo = ? FOR UPDATE`,
            [idProt]
          );
          if (!prot) {
            await conn.rollback();
            return res.status(400).json(`Prototipo ${idProt} no existe.`);
          }
          const stockActual = Number(prot.stock ?? 0);
          if (stockActual < qtyStock) {
            await conn.rollback();
            return res.status(409).json({
              message: "Stock insuficiente de pallets terminados.",
              detalle: { id_prototipo: idProt, stock_actual: stockActual, solicitado_desde_stock: qtyStock },
            });
          }
          await conn.query(
            `UPDATE prototipo_pallet SET stock = stock - ? WHERE id_prototipo = ?`,
            [qtyStock, idProt]
          );
        }
        */

        values.push([
          id_pedido,
          idProt,
          qty,
          it.numero_lote || null,
          it.numero_tratamiento || null,
          it.comentarios || null,
          0, // ✅ cantidad_desde_stock siempre 0
        ]);
      }

      await conn.query(
        `
        INSERT INTO pedido_prototipo_pallet
          (id_pedido, id_prototipo, cantidad_pallets, numero_lote, numero_tratamiento, comentarios, cantidad_desde_stock)
        VALUES ?
        `,
        [values]
      );
    }

    await conn.commit();
    return res.status(201).json({ id_pedido, message: "Pedido creado correctamente." });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    console.error("❌ createPedido:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    conn.release();
  }
};

export const changeEstadoPedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { estado: nuevoEstado } = req.body;

    const id_pedido = parseInt(id, 10);
    if (!Number.isInteger(id_pedido) || id_pedido <= 0) {
      return res.status(400).json({ message: "id_pedido inválido." });
    }

    const [[pedido]] = await conn.query(
      `SELECT id_pedido, estado, eliminado FROM pedidos WHERE id_pedido = ?`,
      [id_pedido]
    );
    if (!pedido || pedido.eliminado) {
      return res.status(404).json({ message: "Pedido no encontrado o eliminado." });
    }

    await conn.beginTransaction();

    // ✅ Permitimos cancelar manualmente (si querés mantener esa acción)
    if (String(nuevoEstado || "").toLowerCase() === "cancelado") {
      await conn.query(
        `UPDATE pedidos SET estado = 'cancelado' WHERE id_pedido = ? AND eliminado = FALSE`,
        [id_pedido]
      );
      await conn.commit();
      return res.status(200).json({ message: "Pedido cancelado." });
    }

    // ✅ Para cualquier otro caso: estado AUTOMÁTICO por entregas
    const r = await syncEstadoPedidoPorEntregas(conn, id_pedido);

    await conn.commit();
    return res.status(200).json({
      message: "Estado gestionado automáticamente por entregas.",
      estado: r.nuevoEstado,
      totales: r.totales,
    });

    /**
     * ⛔️ BLOQUE COMENTADO (antes validabas stock y descontabas insumos acá):
     * - Validación de stock suficiente (tipo_tablas/tacos/materiaprima/clavos/fibras)
     * - Descuento de stock por cambio de estado
     * - Bloqueo de 'entregado' si no está completo
     *
     * Ahora:
     * - El stock se descuenta en ENTREGAS (sin validaciones)
     * - El estado se calcula desde vw_pedido_entrega_resumen
     */
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    console.error("❌ changeEstadoPedido:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    conn.release();
  }
};

export const listPedidos = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM pedidos WHERE eliminado = FALSE ORDER BY id_pedido DESC`
    );
    return res.status(200).json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error listando pedidos." });
  } finally {
    conn.release();
  }
};

export const listPedidosFull = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { estado, id_cliente, desde, hasta } = req.query;

    const where = ["p.eliminado = FALSE"];
    const params = [];

    if (estado) {
      // OJO: ahora el estado real que usás para entregas es pendiente/listo/entregado/cancelado
      where.push("LOWER(p.estado) = LOWER(?)");
      params.push(String(estado));
    }
    if (id_cliente) {
      where.push("p.id_cliente = ?");
      params.push(Number(id_cliente));
    }
    if (desde) {
      where.push("DATE(p.fecha_realizado) >= DATE(?)");
      params.push(String(desde));
    }
    if (hasta) {
      where.push("DATE(p.fecha_realizado) <= DATE(?)");
      params.push(String(hasta));
    }

    const [rows] = await conn.query(
      `
      SELECT
        p.id_pedido,
        p.id_cliente,
        p.estado,
        p.fecha_realizado,
        p.fecha_de_entrega,
        p.comentarios,

        CASE
          WHEN c.es_empresa = 1 THEN COALESCE(c.nombre_empresa, 'Empresa')
          ELSE TRIM(CONCAT(COALESCE(c.nombre,''),' ',COALESCE(c.apellido,'')))
        END AS cliente_display,

        ppp.id_prototipo,
        pr.titulo AS prototipo_titulo,
        pr.medidas AS medidas,
        ppp.cantidad_pallets,
        ppp.cantidad_desde_stock,
        (ppp.cantidad_pallets - ppp.cantidad_desde_stock) AS cantidad_a_producir,
        ppp.numero_lote,
        ppp.numero_tratamiento,
        ppp.comentarios AS item_comentarios
      FROM pedidos p
      JOIN clientes c ON c.id_cliente = p.id_cliente
      LEFT JOIN pedido_prototipo_pallet ppp ON ppp.id_pedido = p.id_pedido
      LEFT JOIN prototipo_pallet pr ON pr.id_prototipo = ppp.id_prototipo
      WHERE ${where.join(" AND ")}
      ORDER BY p.id_pedido DESC
      `,
      params
    );

    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.id_pedido)) {
        map.set(r.id_pedido, {
          id_pedido: r.id_pedido,
          id_cliente: r.id_cliente,
          estado: r.estado,
          fecha_realizado: r.fecha_realizado,
          fecha_de_entrega: r.fecha_de_entrega,
          comentarios: r.comentarios,
          cliente_display: r.cliente_display,
          items: [],
        });
      }

      if (r.id_prototipo) {
        map.get(r.id_pedido).items.push({
          id_prototipo: r.id_prototipo,
          prototipo_titulo: r.prototipo_titulo,
          medidas: r.medidas,
          cantidad_pallets: r.cantidad_pallets,
          cantidad_desde_stock: r.cantidad_desde_stock,
          cantidad_a_producir: r.cantidad_a_producir,
          numero_lote: r.numero_lote,
          numero_tratamiento: r.numero_tratamiento,
          comentarios: r.item_comentarios,
        });
      }
    }

    return res.status(200).json(Array.from(map.values()));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error listando pedidos full." });
  } finally {
    conn.release();
  }
};

export const getPedidoById = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    const [[p]] = await conn.query(
      `SELECT * FROM pedidos WHERE id_pedido = ? AND eliminado = FALSE`,
      [id]
    );
    if (!p) return res.status(404).json({ message: "Pedido no encontrado." });

    const [items] = await conn.query(
      `
      SELECT
        ppp.*,
        pr.titulo AS prototipo_titulo,
        pr.medidas AS medidas
      FROM pedido_prototipo_pallet ppp
      LEFT JOIN prototipo_pallet pr ON pr.id_prototipo = ppp.id_prototipo
      WHERE ppp.id_pedido = ?
      `,
      [id]
    );

    return res.status(200).json({ ...p, items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error obteniendo pedido." });
  } finally {
    conn.release();
  }
};

export const updatePedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    const {
      id_cliente,
      fecha_realizado,
      fecha_de_entrega = null,
      comentarios = null,
      items = [],
      estado: _estadoIgnored,
    } = req.body;

    if (!id_cliente) return res.status(400).json("id_cliente es obligatorio.");
    if (!fecha_realizado) return res.status(400).json("fecha_realizado es obligatoria.");

    if (!isValidDate(fecha_realizado) || !isValidDate(fecha_de_entrega)) {
      return res.status(400).json("Fecha inválida.");
    }

    if (fecha_de_entrega && !isStrictlyAfter(fecha_de_entrega, fecha_realizado)) {
      return res.status(400).json("La fecha de entrega debe ser posterior a la fecha realizada.");
    }

    await conn.beginTransaction();

    const [[pedido]] = await conn.query(
      `SELECT id_pedido, estado, eliminado FROM pedidos WHERE id_pedido = ? FOR UPDATE`,
      [id]
    );

    if (!pedido || pedido.eliminado) {
      await conn.rollback();
      return res.status(404).json({ message: "Pedido no encontrado o eliminado." });
    }

    // Solo editable si está pendiente (sin entregas)
    if (pedido.estado !== "pendiente") {
      await conn.rollback();
      return res.status(409).json({ message: "Solo se puede editar un pedido sin entregas." });
    }

    // ⛔️ YA NO SE REPONE NI DESCUENTA STOCK DE PROTOTIPOS DESDE PEDIDOS
    /*
    const [oldItems] = await conn.query(
      `SELECT id_prototipo, cantidad_desde_stock FROM pedido_prototipo_pallet WHERE id_pedido = ?`,
      [id]
    );

    for (const oi of oldItems) {
      const qtyOld = Number(oi.cantidad_desde_stock || 0);
      if (qtyOld > 0) {
        await conn.query(
          `UPDATE prototipo_pallet SET stock = stock + ? WHERE id_prototipo = ?`,
          [qtyOld, oi.id_prototipo]
        );
      }
    }
    */

    await conn.query(`DELETE FROM pedido_prototipo_pallet WHERE id_pedido = ?`, [id]);

    if (Array.isArray(items) && items.length > 0) {
      const values = [];

      for (const it of items) {
        if (!it?.id_prototipo || !it?.cantidad_pallets) {
          await conn.rollback();
          return res.status(400).json("Cada ítem requiere id_prototipo y cantidad_pallets (> 0).");
        }

        const idProt = parseInt(it.id_prototipo, 10);
        const qty = parseInt(it.cantidad_pallets, 10);

        if (!Number.isInteger(qty) || qty <= 0) {
          await conn.rollback();
          return res.status(400).json("cantidad_pallets debe ser entero > 0.");
        }

        const qtyStock = 0; // ✅ siempre 0

        // ⛔️ BLOQUE COMENTADO: validar/descontar stock de prototipo aquí no va más
        /*
        if (qtyStock > 0) {
          ...
        }
        */

        values.push([
          id,
          idProt,
          qty,
          it.numero_lote || null,
          it.numero_tratamiento || null,
          it.comentarios || null,
          0, // ✅ cantidad_desde_stock siempre 0
        ]);
      }

      await conn.query(
        `
        INSERT INTO pedido_prototipo_pallet
          (id_pedido, id_prototipo, cantidad_pallets, numero_lote, numero_tratamiento, comentarios, cantidad_desde_stock)
        VALUES ?
        `,
        [values]
      );
    }

    await conn.query(
      `
      UPDATE pedidos
      SET id_cliente = ?, estado = 'pendiente', fecha_realizado = ?, fecha_de_entrega = ?, comentarios = ?
      WHERE id_pedido = ? AND eliminado = FALSE
      `,
      [parseInt(id_cliente, 10), fecha_realizado, fecha_de_entrega || null, comentarios || null, id]
    );

    await conn.commit();
    return res.status(200).json({ message: "Pedido actualizado." });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    console.error(e);
    return res.status(500).json({ message: "Error actualizando pedido.", details: e.message });
  } finally {
    conn.release();
  }
};

export const deletePedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    await conn.beginTransaction();

    const [[pedido]] = await conn.query(
      `SELECT id_pedido, eliminado FROM pedidos WHERE id_pedido = ? FOR UPDATE`,
      [id]
    );
    if (!pedido || pedido.eliminado) {
      await conn.rollback();
      return res.status(404).json({ message: "Pedido no encontrado o ya eliminado." });
    }

    // ⛔️ Ya no reponemos pallets “desde stock” al borrar
    /*
    const [items] = await conn.query(
      `SELECT id_prototipo, cantidad_desde_stock FROM pedido_prototipo_pallet WHERE id_pedido = ?`,
      [id]
    );

    for (const it of items) {
      const qty = Number(it.cantidad_desde_stock || 0);
      if (qty > 0) {
        await conn.query(
          `UPDATE prototipo_pallet SET stock = stock + ? WHERE id_prototipo = ?`,
          [qty, it.id_prototipo]
        );
      }
    }
    */

    await conn.query(`UPDATE pedidos SET eliminado = TRUE WHERE id_pedido = ?`, [id]);
    await conn.query(`DELETE FROM entregas_transporte WHERE id_pedido = ?`, [id]);
    await conn.query(`DELETE FROM pedido_insumos_stock WHERE id_pedido = ?`, [id]);

    await conn.commit();
    return res.status(200).json({ message: "Pedido eliminado." });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    console.error(e);
    return res.status(500).json({ message: "Error eliminando pedido.", details: e.message });
  } finally {
    conn.release();
  }
};
