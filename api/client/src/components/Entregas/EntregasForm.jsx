import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import encargosBackground from "../../assets/tablasBackground.jpg";
import { api } from "../../api";
import Alert from "../../components/Modals/Alert";

/** Helpers */
const toMysqlDateTime = (dtLocal) => {
  if (!dtLocal) return null; // "2026-01-07T19:30"
  const s = String(dtLocal).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s.replace("T", " ") + ":00";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + " 00:00:00";
  return s.replace("T", " ");
};

const formatDateTimeLocal = (isoOrSql) => {
  if (!isoOrSql) return "";
  const s = String(isoOrSql).replace(" ", "T");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

// mini helper para concurrencia limitada (evita 200 requests al mismo tiempo)
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

/** Pequeño modal para stock insuficiente */
const StockInsuficienteModal = ({ open, data, onClose }) => {
  if (!open) return null;

  const items = Array.isArray(data?.items) ? data.items : [];
  const title = data?.title || "Stock insuficiente";
  const subtitle =
    data?.subtitle ||
    "No se puede registrar la entrega porque el stock disponible no alcanza para la cantidad ingresada.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-[min(680px,92vw)] rounded-xl bg-white shadow-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
            <p className="text-sm text-neutral-700 mt-1">{subtitle}</p>
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

        {items.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Prototipo</th>
                  <th className="py-2 pr-2">Solicitado</th>
                  <th className="py-2 pr-2">Stock</th>
                  <th className="py-2 pr-2">Máximo entregable</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id_prototipo} className="border-b last:border-b-0">
                    <td className="py-2 pr-2">
                      <div className="font-medium">{it.titulo || `#${it.id_prototipo}`}</div>
                      <div className="text-xs text-neutral-600">#{it.id_prototipo}</div>
                    </td>
                    <td className="py-2 pr-2">{it.solicitado}</td>
                    <td className="py-2 pr-2">{it.stock_actual}</td>
                    <td className="py-2 pr-2">
                      <span className="font-semibold text-amber-700">{it.max_entregable}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-xs text-neutral-600 mt-2">
              Sugerencia: ajustá las cantidades para no superar el <b>máximo entregable</b> por prototipo.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

const EntregasForm = () => {
  const { id } = useParams(); // opcional: si luego querés editar
  const isEdit = Boolean(id);

  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState([]);
  const [idPedido, setIdPedido] = useState("");

  const [fechaEntrega, setFechaEntrega] = useState(""); // datetime-local

  const [resumenRows, setResumenRows] = useState([]);
  const [totales, setTotales] = useState(null);

  const [cant, setCant] = useState({}); // { [id_prototipo]: "3" }
  const [initialCant, setInitialCant] = useState({}); // para editar cap (futuro)

  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // { [id_pedido]: { total_pedido, total_entregado, total_faltante, completo } }
  const [totalesByPedido, setTotalesByPedido] = useState({});
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  // Modal stock insuficiente
  const [stockModal, setStockModal] = useState({ open: false, data: null });

  const closeStockModal = () => setStockModal({ open: false, data: null });

  // 1) Traer pedidos y después traer totales por pedido
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

        // Traer totales por pedido (resumen)
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
      } catch (e) {
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

  // 2) Armar opciones del select
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

    // por defecto: vacíos
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

  // 4) Si el pedido quedó completo (faltante 0) por algún cambio externo, limpiamos selección
  useEffect(() => {
    if (!idPedido) return;

    const pid = Number(idPedido);
    const tot = totalesByPedido?.[pid];

    if (tot) {
      const total = Number(tot.total_pedido ?? 0);
      const falt = Number(tot.total_faltante ?? 0);
      if (total > 0 && falt <= 0) {
        setIdPedido("");
        setResumenRows([]);
        setTotales(null);
        setCant({});
      }
    }
  }, [idPedido, totalesByPedido]);

  // Helpers de UI/validación
  const parseQty = (v) => {
    const n = Number.parseInt(String(v ?? "0"), 10);
    if (!Number.isFinite(n)) return 0;
    return n;
  };

  const calcMaxNow = (r) => {
    const falt = Number(r.faltante || 0);
    const stock = Number(r.stock_actual || 0);
    const cap = falt + Number(initialCant?.[r.id_prototipo] || 0);
    // max efectivo: no superar faltante/cap, y no superar stock
    return Math.max(Math.min(cap, stock), 0);
  };

  const completarTodo = () => {
    const next = { ...cant };
    for (const r of resumenRows) {
      const maxNow = calcMaxNow(r);
      if (maxNow > 0) next[r.id_prototipo] = String(maxNow);
    }
    setCant(next);
  };

  const validarLocal = () => {
    if (!idPedido) return { error: "Debe seleccionar un pedido." };
    if (!fechaEntrega) return { error: "Debe ingresar la fecha/hora de entrega." };

    let any = false;
    const stockIssues = [];

    for (const r of resumenRows) {
      const idp = r.id_prototipo;
      const v = parseQty(cant?.[idp] || "0");
      if (v < 0) return { error: "Cantidad inválida (use números positivos)." };
      if (v > 0) any = true;

      const cap = Number(r.faltante || 0) + Number(initialCant?.[idp] || 0);
      if (v > cap) {
        return { error: `No puede entregar ${v} de "${r.titulo}". Máximo permitido: ${cap}.` };
      }

      const stock = Number(r.stock_actual || 0);
      if (v > stock) {
        stockIssues.push({
          id_prototipo: Number(idp),
          titulo: r.titulo,
          solicitado: v,
          stock_actual: stock,
          max_entregable: Math.max(Math.min(cap, stock), 0),
        });
      }
    }

    if (!any) return { error: "Debe ingresar al menos una cantidad > 0." };

    if (stockIssues.length) {
      return {
        stockIssues,
      };
    }

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
    if (v?.stockIssues?.length) {
      setStockModal({
        open: true,
        data: {
          title: "No alcanza el stock para esta entrega",
          subtitle:
            "Ajustá las cantidades para que no superen el stock disponible del pallet terminado.",
          items: v.stockIssues,
        },
      });
      return;
    }

    const detalles = resumenRows
      .map((r) => ({
        id_prototipo: Number(r.id_prototipo),
        cantidad_entregada: parseQty(cant?.[r.id_prototipo] || "0"),
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
        setErr("Entrega registrada correctamente.");
      } else {
        setErr("Edición no implementada en esta pantalla (por ahora).");
      }

      setMessageType("success");
      setTimeout(() => navigate("/entregas/listar"), 800);
    } catch (e2) {
      const data = e2?.response?.data;

      // ✅ Si el backend devuelve stock insuficiente, mostramos el modal
      if (data?.code === "STOCK_INSUFICIENTE_PALLET") {
        const it = {
          id_prototipo: Number(data?.id_prototipo || 0),
          titulo: data?.titulo || undefined,
          solicitado: Number(data?.solicitado || 0),
          stock_actual: Number(data?.stock_actual || 0),
          max_entregable: Number.isFinite(Number(data?.stock_actual))
            ? Number(data?.stock_actual)
            : 0,
        };

        setStockModal({
          open: true,
          data: {
            title: "Stock insuficiente",
            subtitle:
              "El stock cambió mientras estabas cargando la entrega o no alcanza para lo solicitado. Ajustá y reintentá.",
            items: [it].filter((x) => x.id_prototipo),
          },
        });
        return;
      }

      const msg = data?.message || "Error al guardar la entrega.";
      setErr(msg);
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50 overflow-x-hidden">
      <StockInsuficienteModal open={stockModal.open} data={stockModal.data} onClose={closeStockModal} />

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
                  <option value="">
                    {loadingPedidos ? "Cargando pedidos…" : "Seleccionar pedido…"}
                  </option>

                  {pedidoOptions.map((p) => (
                    <option key={p.id_pedido} value={p.id_pedido}>
                      {p.label}
                    </option>
                  ))}
                </select>

                {!loadingPedidos && pedidoOptions.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    No hay pedidos disponibles (o todos están entregados).
                  </p>
                )}
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
                  <span className="font-semibold">Totales:</span>{" "}
                  Pedido {totales.total_pedido} — Entregado {totales.total_entregado} — Faltante{" "}
                  {totales.total_faltante}
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
                        <th className="py-2 pr-2">Stock</th>
                        <th className="py-2 pr-2 w-44">Entregar ahora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenRows.map((r) => {
                        const falt = Number(r.faltante || 0);
                        const stock = Number(r.stock_actual || 0);
                        const idp = r.id_prototipo;

                        const cap = Number(r.faltante || 0) + Number(initialCant?.[idp] || 0);
                        const maxNow = calcMaxNow(r);

                        const current = parseQty(cant?.[idp] ?? "");
                        const overStock = current > stock && current > 0;

                        return (
                          <tr key={idp} className="border-b last:border-b-0">
                            <td className="py-2 pr-2">
                              <div className="font-medium">{r.titulo}</div>
                              <div className="text-xs text-neutral-600">#{idp}</div>
                            </td>

                            <td className="py-2 pr-2">{r.pedido}</td>

                            <td className="py-2 pr-2">{r.entregado}</td>

                            <td className="py-2 pr-2">
                              <span className={falt > 0 ? "font-semibold text-amber-700" : "text-neutral-700"}>
                                {falt}
                              </span>
                              <div className="text-[11px] text-neutral-500">Máx por pedido: {cap}</div>
                            </td>

                            <td className="py-2 pr-2">
                              <span className={stock <= 0 ? "font-semibold text-rose-700" : "text-neutral-800"}>
                                {stock}
                              </span>
                              <div className="text-[11px] text-neutral-500">Máx ahora: {maxNow}</div>
                            </td>

                            <td className="py-2 pr-2">
                              <input
                                type="number"
                                min="0"
                                max={maxNow}
                                value={cant?.[idp] ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  // permitimos vacío para UX
                                  if (raw === "") {
                                    setCant((prev) => ({ ...prev, [idp]: "" }));
                                    return;
                                  }

                                  let n = parseQty(raw);
                                  if (n < 0) n = 0;
                                  if (n > maxNow) n = maxNow;

                                  setCant((prev) => ({ ...prev, [idp]: String(n) }));
                                }}
                                className={`w-full box-border p-2 border rounded bg-neutral-100 ${
                                  overStock ? "border-rose-500 bg-rose-50" : ""
                                }`}
                                placeholder="0"
                              />

                              {overStock && (
                                <div className="mt-1 text-xs text-rose-700">
                                  Supera stock (stock {stock}). Máximo ahora: {maxNow}.
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <p className="text-xs text-neutral-600 mt-2">
                    * El <b>máximo ahora</b> es el menor entre lo que falta del pedido y el stock disponible del pallet.
                    <br />
                    * Si entregás todo lo faltante, el pedido se marcará como <b>entregado</b> automáticamente. Si queda
                    faltante, queda en <b>listo</b>.
                  </p>
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
