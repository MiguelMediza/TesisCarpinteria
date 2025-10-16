import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";

/* ===== utilidades ===== */
const formatMoney = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  });

const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (nombre = "", apellido = "") => {
  const base = (nombre + " " + apellido).trim() || "C";
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
};

/* bloquear scroll del body cuando hay modal  */
function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [locked]);
}

/* MODAL: Registrar Entrega */
const EntregaModal = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  defaultMedio = "efectivo",
}) => {
  useBodyScrollLock(open);

  const [monto, setMonto] = useState("");
  const [medio, setMedio] = useState(defaultMedio);
  const [nota, setNota] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setMonto("");
      setMedio(defaultMedio);
      setNota("");
      setErr("");
    }
  }, [open, defaultMedio]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setErr("");
    const parsed = Number(String(monto).replace(/\./g, "").replace(",", "."));
    if (!(parsed > 0)) {
      setErr("Ingresá un monto válido mayor a 0.");
      return;
    }
    await onSubmit({ monto: parsed, medio, nota });
  };

  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-slate-900/40 backdrop-blur-sm px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose?.();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/5 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative">
          <div className="h-16 w-full bg-gradient-to-r from-emerald-50 to-sky-50" />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-800">
            Registrar entrega
          </div>
          <button
            type="button"
            className="absolute right-3 top-2.5 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
            title="Cerrar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.225 4.811l12.964 12.964-1.414 1.414L4.811 6.225l1.414-1.414z" />
              <path d="M19.189 6.225L6.225 19.189l-1.414-1.414L17.775 4.811l1.414 1.414z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 pt-3">
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Monto</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <p className="mt-1 text-[12px] text-slate-500">
                Se aplicará automáticamente a las ventas más antiguas.
              </p>
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-1">
                Medio de pago
              </label>
              <select
                value={medio}
                onChange={(e) => setMedio(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-1">
                Nota (opcional)
              </label>
              <textarea
                rows={3}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-y"
                placeholder="Referencia de transferencia, observaciones, etc."
              />
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-slate-50 text-slate-700 ring-1 ring-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-70"
            >
              {loading ? "Guardando…" : "Registrar entrega"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

/* MODAL: Listado de Pagos  */
const PagosModal = ({ open, onClose, idCliente }) => {
  useBodyScrollLock(open);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !idCliente) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const { data } = await api.get(`/clientesfuegoya/${idCliente}/pagos`);
        if (!alive) return;
        setRows(Array.isArray(data) ? data : []);
      } catch {
        setErr("No se pudieron cargar los pagos.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, idCliente]);

  if (!open) return null;

  const totalAbonado = rows.reduce((acc, r) => acc + Number(r?.monto ?? 0), 0);

  const node = (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-slate-900/40 backdrop-blur-sm px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* Dialog */}
      <div
        className="
          w-full max-w-xl rounded-2xl bg-white ring-1 ring-slate-900/5 shadow-xl
          flex flex-col overflow-hidden
        "
        // Altura máx siempre menor a la pantalla (svh para móviles + fallback vh)
        style={{ maxHeight: "min(90svh, 90vh)" }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header sticky */}
        <div className="sticky top-0 z-10">
          <div className="relative">
            <div className="h-16 w-full bg-gradient-to-r from-emerald-50 to-sky-50" />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-800">
              Pagos registrados
            </div>
            <button
              type="button"
              className="absolute right-3 top-2.5 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              onClick={onClose}
              aria-label="Cerrar"
              title="Cerrar"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.225 4.811l12.964 12.964-1.414 1.414L4.811 6.225l1.414-1.414z" />
                <path d="M19.189 6.225L6.225 19.189l-1.414-1.414L17.775 4.811l1.414 1.414z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido con scroll interno */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {loading && <p className="text-sm text-slate-600">Cargando pagos…</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}

          {!loading && !err && (
            <>
              {rows.length === 0 ? (
                <p className="text-sm text-slate-600">Sin pagos registrados.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200/60 overflow-hidden">
                  {rows
                    .sort(
                      (a, b) =>
                        new Date(b?.fecha ?? b?.created_at ?? 0) -
                        new Date(a?.fecha ?? a?.created_at ?? 0)
                    )
                    .map((p) => (
                      <li
                        key={p.id_pago ?? `${p.fecha}-${p.monto}`}
                        className="px-3 py-2.5 bg-white hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {formatMoney(p?.monto)}
                            </p>
                            <p className="text-[12px] text-slate-500">
                              {formatDateTime(p?.fecha ?? p?.created_at)}{" "}
                              {p?.medio ? `• ${p.medio}` : ""}
                            </p>
                            {p?.nota && (
                              <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">
                                {p.nota}
                              </p>
                            )}
                          </div>
                          {(p?.aplicado != null || p?.sin_aplicar != null) && (
                            <div className="text-right text-[12px] text-slate-600">
                              {p?.aplicado != null && (
                                <div>
                                  Aplicado:{" "}
                                  <span className="font-medium">
                                    {formatMoney(p.aplicado)}
                                  </span>
                                </div>
                              )}
                              {p?.sin_aplicar != null && p.sin_aplicar > 0 && (
                                <div>
                                  Sin aplicar:{" "}
                                  <span className="font-medium">
                                    {formatMoney(p.sin_aplicar)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              )}

              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-slate-700">Total abonado</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatMoney(totalAbonado)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer fijo visible */}
        <div className="shrink-0 border-t px-4 py-3 bg-white">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg bg-slate-50 text-slate-700 ring-1 ring-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(node, document.body);
};

/* ========== CARD ========== */
const ClientesFuegoYaCard = ({ cliente, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.tipo === "admin";

  const { id_cliente, nombre, apellido } = cliente || {};

  const [loadingCred, setLoadingCred] = useState(false);
  const [credError, setCredError] = useState("");
  const [creditoData, setCreditoData] = useState(null);

  const [pagosCount, setPagosCount] = useState(0);
  const [pagosModalOpen, setPagosModalOpen] = useState(false);

  const [saldoAFavor, setSaldoAFavor] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [savingEntrega, setSavingEntrega] = useState(false);
  const [flash, setFlash] = useState(null);

  const fetchCredito = useCallback(async () => {
    if (!isAdmin || !id_cliente) return;
    try {
      setLoadingCred(true);
      setCredError("");
      const { data } = await api.get(
        `/clientesfuegoya/${id_cliente}/credito`
      );
      setCreditoData(data || { creditos: [], credito_total: 0 });
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "No se pudo cargar el crédito.";
      setCredError(msg);
    } finally {
      setLoadingCred(false);
    }
  }, [isAdmin, id_cliente]);

  const fetchPagosCount = useCallback(async () => {
    if (!isAdmin || !id_cliente) return;
    try {
      const { data } = await api.get(
        `/clientesfuegoya/${id_cliente}/pagos`,
        { params: { limit: 1 } }
      );
      const count = Array.isArray(data) ? data.length : 0;
      setPagosCount(count > 0 ? 1 : 0);
    } catch {
      setPagosCount(0);
    }
  }, [isAdmin, id_cliente]);

  const fetchSaldoAFavor = useCallback(async () => {
    if (!isAdmin || !id_cliente) return;
    try {
      const { data } = await api.get(`/clientesfuegoya/${id_cliente}/pagos`, {
        params: { limit: 500, offset: 0 },
      });
      const totalSinAplicar = (Array.isArray(data) ? data : []).reduce(
        (acc, r) => acc + Number(r?.sin_aplicar ?? 0),
        0
      );
      setSaldoAFavor(Math.max(0, totalSinAplicar));
    } catch {
      setSaldoAFavor(0);
    }
  }, [isAdmin, id_cliente]);

  useEffect(() => {
    fetchCredito();
    fetchPagosCount();
    fetchSaldoAFavor();
  }, [fetchCredito, fetchPagosCount, fetchSaldoAFavor]);

  const resumen = useMemo(() => {
    if (!creditoData) return { lineas: 0, total: 0 };
    const lineas = Array.isArray(creditoData.creditos)
      ? creditoData.creditos.length
      : 0;
    const total =
      creditoData.credito_total != null
        ? Number(creditoData.credito_total)
        : Array.isArray(creditoData.creditos)
        ? creditoData.creditos.reduce(
            (acc, r) => acc + Number(r?.monto ?? 0),
            0
          )
        : 0;
    return { lineas, total: Math.max(0, Number(total || 0)) };
  }, [creditoData]);

  const handleNuevaEntrega = async ({ monto, medio, nota }) => {
    if (!id_cliente) return;
    try {
      setSavingEntrega(true);
      setFlash(null);

      const { data } = await api.post(
        `/clientesfuegoya/${id_cliente}/registrarentrega`,
        { monto, medio, nota }
      );

      const aplicado = Number(data?.aplicado ?? 0);

      setCreditoData((prev) => {
        if (!prev)
          return { creditos: [], credito_total: Math.max(0, 0 - aplicado) };
        const previo =
          prev.credito_total != null
            ? Number(prev.credito_total)
            : Array.isArray(prev.creditos)
            ? prev.creditos.reduce(
                (acc, r) => acc + Number(r?.monto ?? 0),
                0
              )
            : 0;
        return {
          ...prev,
          credito_total: Math.max(0, Number(previo) - aplicado),
        };
      });

      await Promise.all([fetchCredito(), fetchPagosCount(), fetchSaldoAFavor()]);

      const sin = Number(data?.sin_aplicar ?? 0);
      const msg = `Entrega registrada. Aplicado: ${formatMoney(
        aplicado
      )}${sin > 0 ? ` • Sin aplicar: ${formatMoney(sin)}` : ""}`;
      setFlash({ type: "ok", msg });
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "No se pudo registrar la entrega.";
      setFlash({ type: "err", msg });
    } finally {
      setSavingEntrega(false);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  return (
    <div
      className="
        relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/5
        shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg
        flex flex-col min-h-[260px]
      "
    >
      {/* Header */}
      <div className="relative">
        <div className="h-16 w-full bg-gradient-to-r from-emerald-50 to-sky-50" />
        <div
          className="
            absolute top-3 left-4 size-12 rounded-full
            bg-gradient-to-br from-sky-500 to-emerald-500 text-white
            grid place-items-center text-sm font-semibold ring-4 ring-white shadow-md
          "
        >
          {getInitials(nombre, apellido)}
        </div>
        <div
          className="
            absolute top-3 right-3 px-2 py-0.5 text-[11px] font-medium
            rounded-full ring-1 shadow-sm bg-sky-50 text-sky-700 ring-sky-200
          "
        >
          Cliente Fuego Ya
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 p-4 pt-6 flex flex-col">
        <h3 className="text-base font-semibold text-slate-900 leading-snug pr-14">
          {(nombre || "Cliente") + (apellido ? ` ${apellido}` : "")}
        </h3>

        {/* Chips contacto */}
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={cliente?.telefono ? `tel:${cliente.telefono}` : undefined}
            onClick={(e) => !cliente?.telefono && e.preventDefault()}
            className={`
              inline-flex items-center gap-2 rounded-full px-2.5 py-1
              text-[12px] ring-1 ring-slate-200
              ${
                cliente?.telefono
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-50 text-slate-500"
              }
            `}
            title={cliente?.telefono || "No especificado"}
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011.1-.23 11.7 11.7 0 003.7.6 1 1 0 011 1v3.6a1 1 0 01-1 1A18.9 18.9 0 013 5a1 1 0 011-1h3.6a1 1 0 011 1 11.7 11.7 0 00.6 3.7 1 1 0 01-.23 1.1l-2.37 2z" />
            </svg>
            <span className="truncate max-w-[50vw] sm:max-w-[220px]">
              {cliente?.telefono || "Sin teléfono"}
            </span>
          </a>

          <a
            href={cliente?.email ? `mailto:${cliente.email}` : undefined}
            onClick={(e) => !cliente?.email && e.preventDefault()}
            className={`
              inline-flex items-center gap-2 rounded-full px-2.5 py-1
              text-[12px] ring-1 ring-slate-200
              ${
                cliente?.email
                  ? "bg-blue-50 text-blue-700"
                  : "bg-slate-50 text-slate-500"
              }
            `}
            title={cliente?.email || "No especificado"}
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16a2 2 0 012 2v.4l-10 5.6L2 8.4V8a2 2 0 012-2zm18 4.2V16a2 2 0 01-2 2H4a2 2 0 01-2-2v-5.8l10 5.6 10-5.6z" />
            </svg>
            <span className="truncate max-w-[50vw] sm:max-w-[220px]">
              {cliente?.email || "Sin email"}
            </span>
          </a>
        </div>

        {/* Flash */}
        {flash?.msg && (
          <div
            className={`
              mt-3 rounded-lg px-3 py-2 text-sm
              ${
                flash.type === "ok"
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                  : "bg-red-50 text-red-700 ring-1 ring-red-200"
              }
            `}
          >
            {flash.msg}
          </div>
        )}

        {/* Crédito (solo admin) */}
        {isAdmin && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">Crédito</p>
              <div className="flex items-center gap-2">
                {pagosCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPagosModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 text-slate-700 ring-1 ring-slate-200 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    title="Ver pagos realizados"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
                    </svg>
                    Pagos
                  </button>
                )}

                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-2.5 py-1.5 text-xs font-medium shadow-sm hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    title="Registrar una nueva entrega"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
                    </svg>
                    Entrega
                  </button>

              </div>
            </div>

            {loadingCred && (
              <p className="mt-2 text-sm text-slate-600">Cargando crédito…</p>
            )}
            {credError && (
              <p className="mt-2 text-sm text-red-600">{credError}</p>
            )}

            {!loadingCred && !credError && creditoData && (
              <>
                {Array.isArray(creditoData.creditos) &&
                creditoData.creditos.length > 0 ? (
                  <>
                    <ul className="mt-2 space-y-2">
                      {creditoData.creditos.map((c, idx) => (
                        <li
                          key={`${c.id_fuego_ya}-${c.tipo}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white ring-1 ring-slate-200/60 px-3 py-2 hover:bg-slate-50 transition"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {c.tipo || `FuegoYa #${c.id_fuego_ya}`}
                            </p>
                            <p className="text-[12px] text-slate-500">
                              Bolsas:{" "}
                              <span className="font-medium">{c.bolsas}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[12px] text-slate-500">Monto</p>
                            <p className="text-sm font-semibold">
                              {formatMoney(c.monto)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-slate-700">
                        Líneas:{" "}
                        <span className="font-medium">{resumen.lineas}</span>
                      </p>
                      <p className="text-sm text-slate-700">
                        Total crédito:{" "}
                        <span className="font-semibold">
                          {formatMoney(resumen.total)}
                        </span>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-slate-600">
                      Sin crédito pendiente.
                    </p>

                    
                    {saldoAFavor > 0 && (
                      <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 px-3 py-1.5 text-sm font-medium">
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 1.75a10.25 10.25 0 1 0 0 20.5 10.25 10.25 0 0 0 0-20.5zm-1.25 5.5h2.5v2.25h-2.5V7.25zm0 4h2.5v7.5h-2.5v-7.5z" />
                        </svg>
                        Tiene un saldo a favor de{" "}
                        <span className="font-semibold">
                          {formatMoney(saldoAFavor)}
                        </span>
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Acciones base */}
        <div className="mt-auto pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(id_cliente)}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(id_cliente)}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 text-sm font-medium hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Modales (PORTAL) */}
      <EntregaModal
        open={modalOpen}
        onClose={() => (savingEntrega ? null : setModalOpen(false))}
        onSubmit={handleNuevaEntrega}
        loading={savingEntrega}
      />
      <PagosModal
        open={pagosModalOpen}
        onClose={() => setPagosModalOpen(false)}
        idCliente={id_cliente}
      />
    </div>
  );
};

export default ClientesFuegoYaCard;
