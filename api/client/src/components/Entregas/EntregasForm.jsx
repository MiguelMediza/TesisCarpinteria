import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import encargosBackground from "../../assets/tablasBackground.jpg";
import { api } from "../../api";
import Alert from "../../components/Modals/Alert";

const AJUSTAR_STOCK_URL = "/prototipos/ajustarstock";

/** Helpers */
const toMysqlDateTime = (dtLocal) => {
  if (!dtLocal) return null;
  const s = String(dtLocal).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s.replace("T", " ") + ":00";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + " 00:00:00";
  return s.replace("T", " ");
};

// mini helper para concurrencia limitada
async function pMap(list, mapper, concurrency = 6) {
  const ret = new Array(list.length);
  let idx = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (idx < list.length) {
      const i = idx++;
      ret[i] = await mapper(list[i], i);
    }
  });

  await Promise.all(workers);
  return ret;
}

/** Modal: Incrementar stock (con input + checkbox) */
const IncrementarStockModal = ({
  open,
  data,
  onClose,
  onStockUpdated, // (id_prototipo, nuevoStock) => void
}) => {
  if (!open) return null;

  const idp = Number(data?.id_prototipo || 0);
  const titulo = data?.titulo || `Prototipo #${idp}`;
  const stock = Number(data?.stock_actual || 0);
  const faltante = Number(data?.faltante ?? 0);
  const pedidoMax = Math.max(faltante, 0);

  // cantidad que el usuario “quería” entregar cuando saltó el modal (opcional)
  const desired = Number.isFinite(Number(data?.desired_qty))
    ? Math.max(Number(data.desired_qty), 0)
    : null;

  // Máximo incremento permitido: solo lo necesario para poder cumplir el pedido (no más)
  // si el pedido necesita 20 y stock actual es 5 => máximo incremento 15
  const maxIncremento = Math.max(pedidoMax - stock, 0);

  // Sugerencia (si el user intentó entregar X): se necesita al menos (X - stock)
  const needForDesired =
    desired == null ? null : Math.max(Math.min(desired, pedidoMax) - stock, 0);

  const [cantidad, setCantidad] = useState("");
  const [descontarMP, setDescontarMP] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [localOk, setLocalOk] = useState("");

  useEffect(() => {
    if (!open) return;
    setLocalErr("");
    setLocalOk("");
    setSaving(false);
    setDescontarMP(false);

    // si hay "needForDesired", sugerimos eso; si no, sugerimos el máximo posible (hasta cumplir pedido)
    const sug =
      needForDesired != null
        ? Math.min(needForDesired, maxIncremento)
        : Math.min(maxIncremento, 1); // por defecto 1 si se puede

    setCantidad(sug > 0 ? String(sug) : "");
  }, [open, idp, needForDesired, maxIncremento]);

  const parsePosInt = (v) => {
    const n = Number.parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  const handleInc = async () => {
    setLocalErr("");
    setLocalOk("");

    if (!idp) {
      setLocalErr("Prototipo inválido.");
      return;
    }

    const cant = parsePosInt(cantidad);
    if (!cant) {
      setLocalErr("Ingresá una cantidad válida (> 0).");
      return;
    }

    if (maxIncremento <= 0) {
      setLocalErr("No se puede incrementar: el pedido no requiere más stock para este prototipo.");
      return;
    }

    if (cant > maxIncremento) {
      setLocalErr(`Máximo incremento permitido: ${maxIncremento}.`);
      return;
    }

    try {
      setSaving(true);

      const { data: resp } = await api.post(AJUSTAR_STOCK_URL, {
        id_prototipo: idp,
        cantidad: cant,
        descontarMateriaPrima: descontarMP,
      });

      const stockNuevo = Number(resp?.stock_nuevo);
      const computed = Number.isFinite(stockNuevo) ? stockNuevo : stock + cant;

      onStockUpdated?.(idp, computed);

      setLocalOk(`Stock incrementado correctamente. Nuevo stock: ${computed}.`);
      // cerramos luego de un toque
      setTimeout(() => onClose?.(), 500);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "No se pudo incrementar el stock.";
      setLocalErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-[min(680px,92vw)] rounded-xl bg-white shadow-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Incrementar stock de dicho pallet</h3>
            <p className="text-sm text-neutral-700 mt-1">
              Para poder entregar más, incrementá el stock del pallet terminado de este prototipo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded hover:bg-neutral-100 text-neutral-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-lg border bg-neutral-50 p-3">
          <div className="font-medium text-neutral-900">{titulo}</div>
          <div className="text-xs text-neutral-600">#{idp}</div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded bg-white border p-2">
              <div className="text-xs text-neutral-600">Stock actual</div>
              <div className="font-semibold text-neutral-900">{stock}</div>
            </div>
            <div className="rounded bg-white border p-2">
              <div className="text-xs text-neutral-600">Faltante del pedido</div>
              <div className="font-semibold text-neutral-900">{pedidoMax}</div>
            </div>
            <div className="rounded bg-white border p-2">
              <div className="text-xs text-neutral-600">Máx incremento</div>
              <div className="font-semibold text-neutral-900">{maxIncremento}</div>
            </div>
          </div>

          {desired != null && (
            <div className="mt-3 text-xs text-neutral-700">
              Intentabas entregar <b>{Math.min(desired, pedidoMax)}</b>. Te faltan{" "}
              <b>{needForDesired ?? 0}</b> unidades de stock para eso.
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Cantidad a incrementar *</label>
              <input
                type="number"
                min="1"
                max={maxIncremento}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full box-border p-2 border rounded bg-white"
                placeholder="Ej: 10"
                disabled={saving || maxIncremento <= 0}
              />
              <div className="mt-1 text-[11px] text-neutral-600">
                No permite incrementar más de lo necesario para cumplir el pedido.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                id="chk-descmp"
                type="checkbox"
                checked={descontarMP}
                onChange={(e) => setDescontarMP(e.target.checked)}
                disabled={saving}
              />
              <label htmlFor="chk-descmp" className="text-sm text-neutral-800">
                Descontar materia prima
              </label>
            </div>
          </div>

          {localErr && (
            <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
              {localErr}
            </div>
          )}
          {localOk && (
            <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
              {localOk}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900"
            disabled={saving}
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleInc}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            disabled={saving || maxIncremento <= 0}
          >
            {saving ? "Incrementando..." : "Incrementar stock"}
          </button>
        </div>
      </div>
    </div>
  );
};

const EntregasForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState([]);
  const [idPedido, setIdPedido] = useState("");

  const [fechaEntrega, setFechaEntrega] = useState("");

  const [resumenRows, setResumenRows] = useState([]);
  const [totales, setTotales] = useState(null);

  const [cant, setCant] = useState({}); // { [id_prototipo]: "3" }

  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [totalesByPedido, setTotalesByPedido] = useState({});
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  // Modal incrementar stock
  const [incStockModal, setIncStockModal] = useState({ open: false, data: null });
  const closeIncStockModal = () => setIncStockModal({ open: false, data: null });

  const openIncStockModal = (row, desiredQty = null) => {
    setIncStockModal({
      open: true,
      data: {
        id_prototipo: Number(row?.id_prototipo || 0),
        titulo: row?.titulo,
        stock_actual: Number(row?.stock_actual || 0),
        faltante: Number(row?.faltante || 0),
        desired_qty: desiredQty, // <- lo que el user intentó poner
      },
    });
  };

  const handleStockUpdated = (id_prototipo, nuevoStock) => {
    // actualiza stock en tabla
    setResumenRows((prev) =>
      (prev || []).map((r) =>
        Number(r.id_prototipo) === Number(id_prototipo)
          ? { ...r, stock_actual: Number(nuevoStock) }
          : r
      )
    );

    // si el user había intentado entregar X, dejamos que el input pueda subir hasta ese X ahora
    const desired = incStockModal?.data?.desired_qty;
    if (desired != null) {
      setCant((prev) => {
        const current = Number.parseInt(String(prev?.[id_prototipo] ?? "0"), 10);
        const want = Math.max(Number(desired) || 0, 0);
        // no superamos faltante del pedido (lo controlamos también al tipear)
        return { ...prev, [id_prototipo]: String(Math.max(current, want)) };
      });
    }
  };

  // 1) Traer pedidos y totales por pedido
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingPedidos(true);
      try {
        const { data } = await api.get("/pedidos/listarfull");
        const list = Array.isArray(data) ? data : [];
        if (!alive) return;

        setPedidos(list);

        const ids = list
          .map((p) => Number(p?.id_pedido ?? p?.id ?? p?.pedido_id))
          .filter(Boolean);

        const pairs = await pMap(
          ids,
          async (pid) => {
            try {
              const { data: r } = await api.get(`/entregas/pedido/${pid}/resumen`);
              return [pid, r?.totales || null];
            } catch {
              return [pid, null];
            }
          },
          8
        );

        const map = {};
        for (const [pid, tot] of pairs) {
          if (tot) map[pid] = tot;
        }

        if (!alive) return;
        setTotalesByPedido(map);
      } catch {
        if (!alive) return;
        setPedidos([]);
        setTotalesByPedido({});
      } finally {
        if (!alive) return;
        setLoadingPedidos(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Opciones del select
  const pedidoOptions = useMemo(() => {
    const out = [];

    for (const p of pedidos || []) {
      const pid = Number(p?.id_pedido ?? p?.id ?? p?.pedido_id);
      if (!pid) continue;

      const estado = String(p?.estado || "").toLowerCase();
      if (estado === "entregado") continue;

      const tot = totalesByPedido?.[pid];
      const hasTot = !!tot;

      if (hasTot) {
        const total = Number(tot?.total_pedido ?? 0);
        const falt = Number(tot?.total_faltante ?? 0);
        if (total > 0 && falt <= 0) continue;

        out.push({
          id_pedido: pid,
          label: `#${pid} — ${p?.cliente_display || "Cliente"} — faltan ${falt} de ${total}`,
        });
      } else {
        out.push({
          id_pedido: pid,
          label: `#${pid} — ${p?.cliente_display || "Cliente"} — cargando faltante…`,
        });
      }
    }

    out.sort((a, b) => Number(b.id_pedido) - Number(a.id_pedido));
    return out;
  }, [pedidos, totalesByPedido]);

  // 3) Cargar resumen del pedido seleccionado
  const cargarResumen = async (pid) => {
    if (!pid) {
      setResumenRows([]);
      setTotales(null);
      setCant({});
      return;
    }

    const { data } = await api.get(`/entregas/pedido/${pid}/resumen`);
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    setResumenRows(rows);
    setTotales(data?.totales || null);

    const next = {};
    for (const r of rows) next[r.id_prototipo] = "";
    setCant(next);
  };

  useEffect(() => {
    if (!idPedido) return;

    cargarResumen(idPedido).catch(() => {
      setErr("No se pudo cargar el resumen del pedido.");
      setMessageType("error");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPedido]);

  // Helpers
  const parseQty = (v) => {
    const s = String(v ?? "").trim();
    if (s === "") return null;
    const n = Number.parseInt(s, 10);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const calcMaxPedido = (r) => Math.max(Number(r.faltante || 0), 0);
  const calcStock = (r) => Math.max(Number(r.stock_actual || 0), 0);
  const calcMaxEntregableAhora = (r) => Math.max(Math.min(calcStock(r), calcMaxPedido(r)), 0);

  const completarTodo = () => {
    const next = { ...cant };
    for (const r of resumenRows) {
      const max = calcMaxEntregableAhora(r);
      if (max > 0) next[r.id_prototipo] = String(max);
    }
    setCant(next);
  };

  const validarLocal = () => {
    if (!idPedido) return { error: "Debe seleccionar un pedido." };
    if (!fechaEntrega) return { error: "Debe ingresar la fecha/hora de entrega." };

    let any = false;

    for (const r of resumenRows) {
      const idp = r.id_prototipo;
      const v = parseQty(cant?.[idp]);

      if (v == null) continue;
      if (v < 0) return { error: "Cantidad inválida (use números positivos)." };
      if (v > 0) any = true;

      const maxPedido = calcMaxPedido(r);
      const stock = calcStock(r);

      if (v > maxPedido) {
        return { error: `No puede entregar más de ${maxPedido} de "${r.titulo}".` };
      }

      if (v > stock) {
        openIncStockModal(r, v);
        return { error: "La cantidad supera el stock actual del pallet." };
      }
    }

    if (!any) return { error: "Debe ingresar al menos una cantidad > 0." };
    return { ok: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const v = validarLocal();
    if (v?.error) {
      setErr(v.error);
      setMessageType("error");
      return;
    }

    const detalles = resumenRows
      .map((r) => ({
        id_prototipo: Number(r.id_prototipo),
        cantidad_entregada: parseQty(cant?.[r.id_prototipo]) || 0,
      }))
      .filter((d) => d.cantidad_entregada > 0);

    const payload = {
      id_pedido: Number(idPedido),
      fecha_entrega: toMysqlDateTime(fechaEntrega),
      detalles,
    };

    try {
      setSubmitting(true);

      if (!isEdit) {
        await api.post("/entregas/agregar", payload);

        // Reflejar descuento en UI (backend debería hacerlo también)
        const deliveredMap = new Map(
          detalles.map((d) => [Number(d.id_prototipo), Number(d.cantidad_entregada)])
        );

        setResumenRows((prev) =>
          (prev || []).map((r) => {
            const take = Number(deliveredMap.get(Number(r.id_prototipo)) || 0);
            if (!take) return r;
            return {
              ...r,
              stock_actual: Math.max(Number(r.stock_actual || 0) - take, 0),
              entregado: Number(r.entregado || 0) + take,
              faltante: Math.max(Number(r.faltante || 0) - take, 0),
            };
          })
        );

        setErr("Entrega registrada correctamente.");
      } else {
        setErr("Edición no implementada en esta pantalla (por ahora).");
      }

      setMessageType("success");
      setTimeout(() => navigate("/entregas/listar"), 800);
    } catch (e2) {
      const data = e2?.response?.data;
      const msg = data?.message || "Error al guardar la entrega.";
      setErr(msg);
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50 overflow-x-hidden">
      <IncrementarStockModal
        open={incStockModal.open}
        data={incStockModal.data}
        onClose={closeIncStockModal}
        onStockUpdated={handleStockUpdated}
      />

      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${encargosBackground})` }}
      />

      <div className="relative z-10 w-full sm:max-w-4xl mx-4 sm:mx-0 p-6 bg-white bg-opacity-80 rounded-lg shadow-md overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold">{isEdit ? "Editar Entrega" : "Nueva Entrega"}</h1>
          <Link to="/entregas/listar" className="text-sm font-medium underline text-neutral-700">
            Volver al listado
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={submitting}>
          <fieldset disabled={submitting} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Pedido *</label>
                <select
                  value={idPedido}
                  onChange={(e) => setIdPedido(e.target.value)}
                  className="w-full box-border p-2 border rounded bg-neutral-100"
                >
                  <option value="">{loadingPedidos ? "Cargando pedidos…" : "Seleccionar pedido…"}</option>
                  {pedidoOptions.map((p) => (
                    <option key={p.id_pedido} value={p.id_pedido}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="w-full box-border p-2 border rounded bg-neutral-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={completarTodo}
                disabled={!resumenRows.length}
                className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Completar entrega (todo lo posible)
              </button>

              {totales && (
                <div className="text-sm text-neutral-800">
                  <span className="font-semibold">Totales:</span> Pedido {totales.total_pedido} — Entregado{" "}
                  {totales.total_entregado} — Faltante {totales.total_faltante}
                </div>
              )}
            </div>

            <div className="mt-3">
              <label className="block text-sm font-semibold mb-2">Detalles (parcial o completa) *</label>

              {!resumenRows.length ? (
                <div className="text-sm text-neutral-700">Seleccioná un pedido para ver lo faltante.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm bg-white rounded">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-2">Prototipo</th>
                        <th className="py-2 pr-2">Pedido</th>
                        <th className="py-2 pr-2">Entregado</th>
                        <th className="py-2 pr-2">Faltante</th>
                        <th className="py-2 pr-2">Stock actual</th>
                        <th className="py-2 pr-2 w-56">Entregar ahora</th>
                      </tr>
                    </thead>

                    <tbody>
                      {resumenRows.map((r) => {
                        const idp = Number(r.id_prototipo);
                        const maxPedido = calcMaxPedido(r);
                        const stock = calcStock(r);
                        const maxEntregable = calcMaxEntregableAhora(r);

                        const current = parseQty(cant?.[idp]);
                        const needs = maxPedido > 0;

                        // ✅ SOLO bloqueamos si faltante 0 (no hay nada que entregar)
                        const disabled = !needs;

                        return (
                          <tr key={idp} className="border-b last:border-b-0">
                            <td className="py-2 pr-2">
                              <div className="font-medium">{r.titulo}</div>
                              <div className="text-xs text-neutral-600">#{idp}</div>
                            </td>

                            <td className="py-2 pr-2">{Number(r.pedido || 0)}</td>
                            <td className="py-2 pr-2">{Number(r.entregado || 0)}</td>

                            <td className="py-2 pr-2">
                              <span className={maxPedido > 0 ? "font-semibold text-amber-700" : "text-neutral-700"}>
                                {maxPedido}
                              </span>
                              <div className="text-[11px] text-neutral-500">Máx por pedido: {maxPedido}</div>
                            </td>

                            <td className="py-2 pr-2">
                              <span className={stock <= 0 ? "font-semibold text-rose-700" : "text-neutral-800"}>
                                {stock}
                              </span>
                              <div className="text-[11px] text-neutral-500">Stock actual de pallets</div>
                            </td>

                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={stock} // ✅ límite por stock (pedido se controla aparte)
                                  value={cant?.[idp] ?? ""}
                                  onFocus={() => {
                                    // ✅ si stock=0 y falta entregar => abrimos modal igual
                                    if (needs && stock <= 0) openIncStockModal(r, Math.min(1, maxPedido));
                                  }}
                                  onClick={() => {
                                    if (needs && stock <= 0) openIncStockModal(r, Math.min(1, maxPedido));
                                  }}
                                  onChange={(e) => {
                                    const raw = e.target.value;

                                    if (raw === "") {
                                      setCant((prev) => ({ ...prev, [idp]: "" }));
                                      return;
                                    }

                                    let n = Number.parseInt(raw, 10);
                                    if (!Number.isFinite(n)) n = 0;
                                    if (n < 0) n = 0;

                                    // si supera el pedido, clamp
                                    if (n > maxPedido) n = maxPedido;

                                    // si supera el stock, abrimos modal y clamp a stock
                                    if (n > stock) {
                                      const desired = Number.parseInt(raw, 10);
                                      openIncStockModal(r, desired);
                                      n = stock;
                                    }

                                    setCant((prev) => ({ ...prev, [idp]: String(n) }));
                                  }}
                                  className={`w-full box-border p-2 border rounded bg-neutral-100 ${
                                    current != null && (current > stock || current > maxPedido)
                                      ? "border-rose-500 bg-rose-50"
                                      : ""
                                  }`}
                                  placeholder="0"
                                  disabled={disabled}
                                />

                                {needs && stock <= 0 && (
                                  <button
                                    type="button"
                                    onClick={() => openIncStockModal(r, Math.min(1, maxPedido))}
                                    className="px-2 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs whitespace-nowrap"
                                  >
                                    Incrementar stock
                                  </button>
                                )}
                              </div>

                              <div className="mt-1 text-[11px] text-neutral-500">
                                Máximo entregable ahora: {maxEntregable}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </fieldset>

          {err && (
            <div className="mb-3">
              <Alert
                type={messageType === "error" ? "error" : "success"}
                onClose={() => {
                  setErr("");
                  setMessageType("");
                }}
              >
                {err}
              </Alert>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "Guardando..." : "Guardar entrega"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default EntregasForm;
