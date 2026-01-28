import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import DeleteConfirm from "../Modals/DeleteConfirm";

const formatDateTime = (isoOrSql) => {
  if (!isoOrSql) return "";
  const d = new Date(isoOrSql);
  if (Number.isNaN(d.getTime())) return String(isoOrSql);
  return d.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toISODateOnly = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

const pill = (cls) =>
  `inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ring-1 ${cls}`;

const EntregasList = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // [{ id_entrega, id_pedido, fecha_entrega, cliente_display?, total_entregado?, items_count?, detalles? }]
  const [entregas, setEntregas] = useState([]);

  // { [id_pedido]: {total_pedido,total_entregado,total_faltante,completo} }
  const [totalesByPedido, setTotalesByPedido] = useState({});

  // filtros
  const [q, setQ] = useState("");
  const [pedidoId, setPedidoId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipo, setTipo] = useState("todas"); // todas | parciales | completas

  // acordeón: pedidos abiertos
  const [open, setOpen] = useState(() => new Set());

  // ✅ Modal eliminar entrega
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // { id_entrega, id_pedido, entrega_nro, title }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const openDeleteEntrega = ({ id_entrega, id_pedido, entrega_nro }) => {
    const ide = Number(id_entrega);
    const pid = Number(id_pedido);
    const nro = Number(entrega_nro);

    if (!ide || !pid || !nro) return;

    setDeleteError("");
    setDeleteTarget({
      id_entrega: ide,
      id_pedido: pid,
      entrega_nro: nro,
      title: `Entrega #${nro} (Pedido #${pid})`,
    });
    setDeleteOpen(true);
  };

  const closeDeleteEntrega = () => {
    if (deleteLoading) return;
    setDeleteOpen(false);
    setDeleteError("");
    setDeleteTarget(null);
  };

  const confirmDeleteEntrega = async () => {
    if (!deleteTarget?.id_entrega || !deleteTarget?.id_pedido) return;

    const idEntrega = Number(deleteTarget.id_entrega);
    const idPedido = Number(deleteTarget.id_pedido);

    try {
      setDeleteLoading(true);
      setDeleteError("");

      const { data } = await api.delete(`/entregas/${idEntrega}`);

      // 1) Sacar la entrega del estado local
      setEntregas((prev) => (prev || []).filter((x) => Number(x.id_entrega) !== idEntrega));

      // 2) Actualizar totales del pedido (tu API devuelve { totales })
      if (data?.totales) {
        setTotalesByPedido((prev) => ({
          ...(prev || {}),
          [idPedido]: data.totales,
        }));
      } else {
        // fallback
        try {
          const r = await api.get(`/entregas/pedido/${idPedido}/resumen`);
          if (r?.data?.totales) {
            setTotalesByPedido((prev) => ({
              ...(prev || {}),
              [idPedido]: r.data.totales,
            }));
          }
        } catch {}
      }

      // 3) Cerrar acordeón si ya no quedan entregas de ese pedido
      setOpen((prevOpen) => {
        const next = new Set(prevOpen);
        const quedaAlguna = (entregas || []).some(
          (x) => Number(x.id_pedido) === idPedido && Number(x.id_entrega) !== idEntrega
        );
        if (!quedaAlguna) next.delete(idPedido);
        return next;
      });

      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      setDeleteError(e?.response?.data?.message || "No se pudo eliminar la entrega.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchTotalesFaltantes = async (pedidoIds) => {
    const unique = Array.from(new Set(pedidoIds.filter(Boolean)));

    const pairs = await pMap(
      unique,
      async (pid) => {
        try {
          const { data } = await api.get(`/entregas/pedido/${pid}/resumen`);
          return [pid, data?.totales || null];
        } catch {
          return [pid, null];
        }
      },
      8
    );

    const next = {};
    for (const [pid, tot] of pairs) {
      if (tot) next[pid] = tot;
    }
    return next;
  };

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      // 1) endpoint global
      try {
        const { data } = await api.get("/entregas/listar");
        const list = Array.isArray(data) ? data : data?.entregas || [];
        const out = Array.isArray(list) ? list : [];

        // ordenar entregas (por fecha desc, id desc)
        out.sort((a, b) => {
          const da = new Date(a.fecha_entrega).getTime() || 0;
          const db = new Date(b.fecha_entrega).getTime() || 0;
          if (db !== da) return db - da;
          return Number(b.id_entrega || 0) - Number(a.id_entrega || 0);
        });

        setEntregas(out);

        const ids = out.map((e) => Number(e.id_pedido)).filter(Boolean);
        const tots = await fetchTotalesFaltantes(ids);
        setTotalesByPedido(tots);

        setLoading(false);
        return;
      } catch (e) {
        if (e?.response?.status !== 404) throw e;
      }

      // 2) fallback: por pedido
      const { data: pedidos } = await api.get("/pedidos/listar");
      const ids = (Array.isArray(pedidos) ? pedidos : [])
        .map((p) => Number(p.id_pedido))
        .filter(Boolean);

      const results = await pMap(
        ids,
        async (pid) => {
          try {
            const { data } = await api.get(`/entregas/pedido/${pid}/listar`);
            return { pid, data };
          } catch {
            return { pid, data: null };
          }
        },
        6
      );

      const allEntregas = [];
      const tots = {};

      for (const r of results) {
        const data = r?.data;
        if (!data) continue;

        const list = Array.isArray(data.entregas) ? data.entregas : [];
        for (const e of list) allEntregas.push(e);

        if (data?.totales) tots[r.pid] = data.totales;
      }

      allEntregas.sort((a, b) => {
        const da = new Date(a.fecha_entrega).getTime() || 0;
        const db = new Date(b.fecha_entrega).getTime() || 0;
        if (db !== da) return db - da;
        return Number(b.id_entrega || 0) - Number(a.id_entrega || 0);
      });

      setEntregas(allEntregas);
      setTotalesByPedido(tots);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar las entregas.");
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1) filtro de entregas
  const entregasFiltradas = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();
    const pid = String(pedidoId || "").trim();
    const dFrom = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
    const dTo = hasta ? new Date(`${hasta}T23:59:59`).getTime() : null;

    return (entregas || []).filter((e) => {
      const idPedido = String(e.id_pedido ?? "");
      const idEntrega = String(e.id_entrega ?? "");

      if (pid && idPedido !== pid) return false;

      const t = e?.fecha_entrega ? new Date(e.fecha_entrega).getTime() : null;
      if (dFrom != null && (t == null || t < dFrom)) return false;
      if (dTo !=null && (t == null || t > dTo)) return false;

      const tot = totalesByPedido?.[Number(e.id_pedido)];
      const esCompleta = !!tot?.completo;

      if (tipo === "completas" && !esCompleta) return false;
      if (tipo === "parciales" && esCompleta) return false;

      if (qq) {
        const cliente = String(e.cliente_display || "").toLowerCase();
        const totalEnEsta = String(e.total_entregado ?? "");
        if (
          !idPedido.includes(qq) &&
          !idEntrega.includes(qq) &&
          !cliente.includes(qq) &&
          !totalEnEsta.includes(qq)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [entregas, q, pedidoId, desde, hasta, tipo, totalesByPedido]);

  // 2) agrupar por pedido y ordenar entregas dentro (DESC)
  const pedidos = useMemo(() => {
    const map = new Map();

    for (const e of entregasFiltradas) {
      const pid = Number(e.id_pedido);
      if (!pid) continue;

      if (!map.has(pid)) {
        map.set(pid, {
          id_pedido: pid,
          cliente_display: e.cliente_display || "",
          entregas: [],
        });
      }

      const grp = map.get(pid);
      if (!grp.cliente_display && e.cliente_display) grp.cliente_display = e.cliente_display;

      grp.entregas.push(e);
    }

    const list = Array.from(map.values());

    for (const g of list) {
      g.entregas.sort((a, b) => {
        const da = new Date(a.fecha_entrega).getTime() || 0;
        const db = new Date(b.fecha_entrega).getTime() || 0;
        if (db !== da) return db - da;
        return Number(b.id_entrega || 0) - Number(a.id_entrega || 0);
      });
      g.lastEntrega = g.entregas[0] || null;
    }

    list.sort((a, b) => {
      const da = a.lastEntrega?.fecha_entrega ? new Date(a.lastEntrega.fecha_entrega).getTime() : 0;
      const db = b.lastEntrega?.fecha_entrega ? new Date(b.lastEntrega.fecha_entrega).getTime() : 0;
      if (db !== da) return db - da;
      return Number(b.id_pedido) - Number(a.id_pedido);
    });

    return list;
  }, [entregasFiltradas]);

  const totalShown = pedidos.length;

  const togglePedido = (pid) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const expandAll = () => setOpen(new Set(pedidos.map((p) => p.id_pedido)));
  const collapseAll = () => setOpen(new Set());

  return (
    <section className="relative min-h-screen bg-neutral-50">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          <div className="bg-gradient-to-r from-sky-50 to-indigo-50 px-5 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Entregas por pedido</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Abrí un pedido para ver todas sus entregas. El estado “Completado” se muestra solo en la última entrega.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => load()}
                  className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 transition"
                  disabled={loading}
                  title="Recargar"
                >
                  ↻ Recargar
                </button>

                <button
                  onClick={() => navigate("/entregas")}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
                  title="Registrar una nueva entrega"
                >
                  + Nueva entrega
                </button>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-slate-600 mb-1">Buscar</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Pedido #, Entrega ID, cliente, total…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Pedido #</label>
                <input
                  value={pedidoId}
                  onChange={(e) => setPedidoId(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 24"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  min={desde || undefined}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="todas">Todas</option>
                  <option value="parciales">Parciales</option>
                  <option value="completas">Completas</option>
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Mostrando <span className="font-medium text-slate-700">{totalShown}</span> pedido(s).
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={expandAll}
                  className="text-xs font-medium text-slate-600 hover:text-slate-800 underline"
                  type="button"
                >
                  Expandir todo
                </button>
                <button
                  onClick={collapseAll}
                  className="text-xs font-medium text-slate-600 hover:text-slate-800 underline"
                  type="button"
                >
                  Contraer todo
                </button>
                <button
                  onClick={() => {
                    setQ("");
                    setPedidoId("");
                    setDesde("");
                    setHasta("");
                    setTipo("todas");
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-slate-800 underline"
                  type="button"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Estado */}
        {err && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {err}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-900/5">
            Cargando entregas…
          </div>
        ) : pedidos.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-900/5">
            No hay pedidos/entregas para mostrar con los filtros actuales.
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => {
              const pid = p.id_pedido;
              const tot = totalesByPedido?.[pid];
              const estaAbierto = open.has(pid);

              const ultimo = p.lastEntrega;
              const pedidoCompleto = !!tot?.completo;
              const showCompletoEnUltimo = pedidoCompleto && !!ultimo;

              return (
                <div
                  key={`pedido-${pid}`}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5"
                >
                  {/* Header del acordeón */}
                  <button
                    type="button"
                    onClick={() => togglePedido(pid)}
                    className="w-full text-left"
                    aria-expanded={estaAbierto}
                  >
                    <div className="flex flex-col gap-2 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">Pedido #{pid}</h3>

                          {typeof p.cliente_display === "string" && p.cliente_display.trim() && (
                            <span className={pill("bg-amber-50 text-amber-800 ring-amber-200")}>
                              {p.cliente_display}
                            </span>
                          )}

                          {showCompletoEnUltimo ? (
                            <span className={pill("bg-emerald-50 text-emerald-700 ring-emerald-200")}>
                              <span className="inline-block size-2.5 rounded-full bg-emerald-400" />
                              Completado
                            </span>
                          ) : (
                            <span className={pill("bg-amber-50 text-amber-800 ring-amber-200")}>
                              <span className="inline-block size-2.5 rounded-full bg-amber-400" />
                              Con faltantes
                            </span>
                          )}

                          <span className="text-xs text-slate-500">
                            · Última entrega: {ultimo ? formatDateTime(ultimo.fecha_entrega) : "—"}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <p className="text-[12px] text-slate-500">Total pedido</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {Number(tot?.total_pedido ?? 0)} u.
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <p className="text-[12px] text-slate-500">Total entregado</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {Number(tot?.total_entregado ?? 0)} u.
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <p className="text-[12px] text-slate-500">Faltante</p>
                            <p
                              className={`text-sm font-semibold ${
                                Number(tot?.total_faltante ?? 0) > 0 ? "text-amber-700" : "text-emerald-700"
                              }`}
                            >
                              {Number(tot?.total_faltante ?? 0)} u.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/pedidos/${pid}`}
                          onClick={(ev) => ev.stopPropagation()}
                          className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 transition"
                          title="Ir al pedido"
                        >
                          Pedido
                        </Link>

                        <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                          {estaAbierto ? "▾" : "▸"} {p.entregas.length} entrega(s)
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Panel desplegable */}
                  {estaAbierto && (
                    <div className="px-5 pb-5">
                      <div className="mt-3 space-y-2">
                        {p.entregas.map((e, idx) => {
                          // ✅ numeración por pedido:
                          // como están en DESC (idx 0 = más nueva), la más vieja debe ser #1
                          const entregaNro = p.entregas.length - idx;

                          const esUltima = idx === 0;
                          const mostrarBadgeUltima = esUltima && showCompletoEnUltimo;

                          const totalEnEsta =
                            Number(e.total_entregado ?? 0) ||
                            (Array.isArray(e.detalles)
                              ? e.detalles.reduce((acc, d) => acc + Number(d.cantidad_entregada || 0), 0)
                              : 0);

                          const registros =
                            Number(e.items_count ?? 0) ||
                            (Array.isArray(e.detalles) ? e.detalles.length : 0);

                          return (
                            <div
                              key={`entrega-${e.id_entrega}`}
                              className="overflow-hidden rounded-xl border border-slate-100 bg-white"
                            >
                              <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* ✅ MOSTRAR NÚMERO POR PEDIDO */}
                                  <span className="text-sm font-semibold text-slate-900">
                                    Entrega #{entregaNro}
                                  </span>

                                  {/* opcional: mostrar el ID real de BD en chiquito */}
                                  <span className="text-xs text-slate-400">
                                    (ID: {e.id_entrega})
                                  </span>

                                  {mostrarBadgeUltima ? (
                                    <span className={pill("bg-emerald-50 text-emerald-700 ring-emerald-200")}>
                                      <span className="inline-block size-2.5 rounded-full bg-emerald-400" />
                                      Completado (última)
                                    </span>
                                  ) : null}

                                  <span className="text-xs text-slate-500">· {formatDateTime(e.fecha_entrega)}</span>

                                  <span className={pill("bg-indigo-50 text-indigo-700 ring-indigo-200")}>
                                    En esta entrega: {totalEnEsta} u.
                                  </span>

                                  <span className={pill("bg-slate-50 text-slate-700 ring-slate-200")}>
                                    Registros: {registros}
                                  </span>
                                </div>

                                <div className="flex gap-2">
                                  <Link
                                    to={`/entregas/${e.id_entrega}`}
                                    onClick={(ev) => ev.stopPropagation()}
                                    className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 transition"
                                    title="Ver detalle"
                                  >
                                    Ver
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      openDeleteEntrega({
                                        id_entrega: e.id_entrega,
                                        id_pedido: pid,
                                        entrega_nro: entregaNro,
                                      });
                                    }}
                                    className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition"
                                    title="Eliminar entrega"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>

                              <div className="px-4 pb-3 text-xs text-slate-500">
                                Fecha: {toISODateOnly(e.fecha_entrega)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <Link to="/pedidos/listar" className="underline font-medium">
            Volver a pedidos
          </Link>
        </div>
      </div>

      {/* ✅ Modal eliminar */}
      <DeleteConfirm
        isOpen={deleteOpen}
        title={deleteTarget?.title || "Entrega"}
        imageSrc={null}
        onCancel={closeDeleteEntrega}
        onConfirm={confirmDeleteEntrega}
        error={deleteError}
        loading={deleteLoading}
      />
    </section>
  );
};

export default EntregasList;
