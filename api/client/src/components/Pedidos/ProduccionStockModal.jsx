import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

const clampInt = (v, min, max) => {
  const n = Number.parseInt(v ?? 0, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
};

const calcPadresNecesarios = (requerido, desdeStock, piezasPorPadre) => {
  const aProd = Math.max(Number(requerido || 0) - Number(desdeStock || 0), 0);
  const piezas = Math.max(Number(piezasPorPadre || 1), 1);
  return Math.ceil(aProd / piezas);
};

const buildFaltantesText = (faltantes) => {
  if (!Array.isArray(faltantes) || !faltantes.length) return "";
  return faltantes
    .map(
      (f) =>
        `• ${f.categoria} #${f.id_item}: requiere ${f.requerido}, disponible ${f.disponible}${
          f.motivo ? ` (${f.motivo})` : ""
        }`
    )
    .join("\n");
};

const isInsuf = (req, stock) => Number(stock || 0) < Number(req || 0);

export default function ProduccionStockModal({
  isOpen,
  pedidoId,
  onClose,
  onConfirm, // ({insumos_stock}) => Promise
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // preview editable (tabla/taco)
  const [preview, setPreview] = useState(null);
  const [rows, setRows] = useState([]); // [{categoria,id_item,titulo,requerido,stock_tipo,usar,qty,padre...}]

  // info extra (clavos/fibras + baseInfo confiable)
  const [extras, setExtras] = useState({ clavos: [], fibras: [], baseInfo: [] });

  useEffect(() => {
    if (!isOpen || !pedidoId) return;

    let alive = true;

    (async () => {
      try {
        setErr("");
        setLoading(true);
        setPreview(null);
        setRows([]);
        setExtras({ clavos: [], fibras: [], baseInfo: [] });

        const getWithFallback = async (path1, path2) => {
          try {
            const r = await api.get(path1);
            return r.data;
          } catch (e) {
            if (e?.response?.status === 404 && path2) {
              const r2 = await api.get(path2);
              return r2.data;
            }
            throw e;
          }
        };

        // 1) preview (tabla/taco editable)
        const previewData = await getWithFallback(
          `/pedidos/${pedidoId}/produccionpreview`,
          `/${pedidoId}/produccionpreview`
        );

        // 2) requerimientos (clavos/fibras + consumo_base_detalle confiable)
        const reqData = await getWithFallback(
          `/pedidos/${pedidoId}/requerimientosproduccion`,
          `/${pedidoId}/requerimientosproduccion`
        );

        if (!alive) return;

        setPreview(previewData);

        const ins = [
          ...(previewData?.insumos?.tabla || []),
          ...(previewData?.insumos?.taco || []),
        ];

        const initial = ins.map((x) => {
          const sugerido = Number(x.sugerido_desde_stock || 0);
          const usar = sugerido > 0;
          return { ...x, usar, qty: sugerido };
        });

        setRows(initial);

        setExtras({
          clavos: Array.isArray(reqData?.clavos) ? reqData.clavos : [],
          fibras: Array.isArray(reqData?.fibras) ? reqData.fibras : [],
          // ✅ NUEVO: esto lo tiene que mandar tu backend (consumo_base_detalle)
          baseInfo: Array.isArray(reqData?.consumo_base_detalle)
            ? reqData.consumo_base_detalle
            : [],
        });
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setErr("No se pudo cargar la vista previa de producción.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, pedidoId]);

  // ✅ Map confiable de materiaprima base: id -> {titulo, stock}
  const baseInfoMap = useMemo(() => {
    const m = new Map();
    for (const b of extras.baseInfo || []) {
      const id = Number(b?.id_materia_prima);
      if (!Number.isFinite(id) || id <= 0) continue;
      m.set(id, {
        titulo: b?.titulo || `Materia prima #${id}`,
        stock: Number(b?.stock ?? 0),
      });
    }
    return m;
  }, [extras.baseInfo]);

  // resumen de consumo base calculado según lo que el usuario elige “desde stock”
  // pero usando stock/título confiable desde baseInfoMap (si existe)
  const resumenBase = useMemo(() => {
    const base = new Map(); // id_mp -> {titulo, requeridoPadres, stock}

    for (const r of rows) {
      const req = Number(r.requerido || 0);
      const qty = r.usar ? Number(r.qty || 0) : 0;

      const padres = calcPadresNecesarios(req, qty, r?.padre?.piezas_por_padre);
      const p = r?.padre;
      if (!p) continue;

      const key = Number(p.id_materia_prima);
      if (!Number.isFinite(key) || key <= 0) continue;

      const meta = baseInfoMap.get(key);
      const titulo = meta?.titulo ?? p.titulo;
      const stock = meta?.stock ?? Number(p.stock || 0);

      const cur = base.get(key);
      base.set(key, {
        id_materia_prima: key,
        titulo,
        stock,
        requeridoPadres: (cur?.requeridoPadres || 0) + padres,
      });
    }

    return Array.from(base.values()).sort((a, b) =>
      String(a.titulo || "").localeCompare(String(b.titulo || ""))
    );
  }, [rows, baseInfoMap]);

  const faltanClavosFibras = useMemo(() => {
    const faltClavos = (extras.clavos || []).some((c) => isInsuf(c.requerido, c.stock));
    const faltFibras = (extras.fibras || []).some((f) => isInsuf(f.requerido, f.stock));
    return faltClavos || faltFibras;
  }, [extras]);

  const faltanBase = useMemo(() => {
    return (resumenBase || []).some((b) => isInsuf(b.requeridoPadres, b.stock));
  }, [resumenBase]);

  const setRow = (idx, patch) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const usarMaximo = () => {
    setRows((prev) =>
      prev.map((r) => {
        const max = Math.min(Number(r.requerido || 0), Number(r.stock_tipo || 0));
        return { ...r, usar: max > 0, qty: max };
      })
    );
  };

  const safeClose = () => {
    if (loading) return;
    onClose?.();
  };

  const handleConfirm = async () => {
    try {
      setErr("");
      setLoading(true);

      const insumos_stock = rows
        .filter((r) => r.usar && Number(r.qty || 0) > 0)
        .map((r) => {
          const req = Number(r.requerido || 0);
          const stock = Number(r.stock_tipo || 0);
          const max = Math.min(req, stock);
          return {
            categoria: r.categoria,
            id_item: Number(r.id_item),
            cantidad_desde_stock: clampInt(r.qty, 0, max),
          };
        });

      await onConfirm?.({ insumos_stock });
    } catch (e) {
      console.error(e);

      const msg =
        e?.response?.data?.message ||
        "No se pudo iniciar el cambio de estado. Verificá stock e intentá nuevamente.";

      const falt = e?.response?.data?.faltantes;
      const det = buildFaltantesText(falt);

      setErr(det ? `${msg}\n\n${det}` : msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40" onClick={safeClose} />

      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div
          className="
            w-full max-w-3xl
            max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]
            rounded-2xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden
            flex flex-col
          "
        >
          {/* Header fijo */}
          <div className="shrink-0 px-4 sm:px-5 py-4 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">
                Confirmar uso de stock
              </h2>
              <p className="text-sm text-slate-600 break-words">
                Elegí qué stock existente de <b>tipo tablas</b> y <b>tipo tacos</b>{" "}
                usar para este pedido. Abajo se muestran también <b>clavos</b> y{" "}
                <b>fibras</b> (informativo).
              </p>

              {(faltanBase || faltanClavosFibras) && (
                <p className="mt-1 text-xs text-red-700">
                  ⚠️ Hay insumos con stock insuficiente (marcados en rojo).
                </p>
              )}
            </div>

            <button
              onClick={safeClose}
              className="shrink-0 px-3 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-60"
              disabled={loading}
            >
              Cerrar
            </button>
          </div>

          {/* Body scrolleable */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {err && (
              <div className="mb-4 rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-700 whitespace-pre-line break-words">
                {err}
              </div>
            )}

            {loading && !preview ? (
              <p className="text-sm text-slate-600">Cargando…</p>
            ) : (
              <>
                {/* Controles */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <p className="text-sm text-slate-700">
                    Insumos con posibilidad de usar stock: <b>{rows.length}</b>
                  </p>

                  <button
                    onClick={usarMaximo}
                    className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                    disabled={loading || rows.length === 0}
                  >
                    Usar máximo posible
                  </button>
                </div>

                {/* TABLAS / TACOS (EDITABLE) */}
                {rows.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4 text-sm text-slate-700">
                    No hay tipo_tablas / tipo_tacos requeridos para producir (o el pedido no tiene nada a producir).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rows.map((r, idx) => {
                      const req = Number(r.requerido || 0);
                      const stockTipo = Number(r.stock_tipo || 0);
                      const max = Math.min(req, stockTipo);
                      const qty = r.usar ? clampInt(r.qty, 0, max) : 0;

                      const padres = calcPadresNecesarios(req, qty, r?.padre?.piezas_por_padre);

                      // ✅ Base confiable (si existe en reqData), si no fallback al preview
                      const baseId = Number(r?.padre?.id_materia_prima);
                      const baseMeta = baseInfoMap.get(baseId);
                      const baseTitulo = baseMeta?.titulo ?? r?.padre?.titulo;
                      const baseStock = baseMeta?.stock ?? Number(r?.padre?.stock ?? 0);

                      return (
                        <div
                          key={`${r.categoria}-${r.id_item}`}
                          className="rounded-xl ring-1 ring-slate-200 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 break-words">
                                {r.titulo}
                              </p>

                              <p className="text-xs text-slate-600 mt-0.5">
                                Requerido: <b>{req}</b> · Stock existente: <b>{stockTipo}</b>
                              </p>

                              {r?.padre && (
                                <div className="text-xs text-slate-600 mt-1 break-words">
                                  <div>
                                    Base: <b>{baseTitulo}</b> (stock <b>{baseStock}</b>)
                                  </div>
                                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                                    <span>
                                      piezas/padre: <b>{r.padre.piezas_por_padre}</b>
                                    </span>
                                    <span>
                                      padres necesarios: <b>{padres}</b>
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={!!r.usar}
                                  onChange={(e) =>
                                    setRow(idx, {
                                      usar: e.target.checked,
                                      qty: e.target.checked ? max : 0,
                                    })
                                  }
                                  disabled={loading || max <= 0}
                                />
                                Usar stock
                              </label>

                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={max}
                                value={qty}
                                onChange={(e) => setRow(idx, { qty: e.target.value })}
                                disabled={loading || !r.usar || max <= 0}
                                className="w-24 p-2 border rounded-lg text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* RESUMEN BASE (con rojo si falta stock) */}
                {resumenBase.length > 0 && (
                  <div className="mt-5 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900 mb-2">
                      Resumen de consumo base (materia prima padre)
                    </p>

                    <div className="space-y-2 text-sm">
                      {resumenBase.map((b) => {
                        const bad = isInsuf(b.requeridoPadres, b.stock);
                        return (
                          <div
                            key={b.id_materia_prima}
                            className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                              bad ? "text-red-700" : "text-slate-700"
                            }`}
                          >
                            <span className="break-words">
                              {bad ? "❌ " : "✅ "}
                              {b.titulo}
                            </span>
                            <span className="sm:whitespace-nowrap">
                              Requiere: <b>{b.requeridoPadres}</b> · Stock: <b>{b.stock}</b>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CLAVOS / FIBRAS (SOLO INFO + ROJO SI FALTA) */}
                {(extras.clavos.length > 0 || extras.fibras.length > 0) && (
                  <div className="mt-5 rounded-xl bg-white ring-1 ring-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900 mb-2">
                      Otros materiales del pedido (informativo)
                    </p>

                    {extras.clavos.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-600 mb-2">🔩 Clavos</p>
                        <div className="space-y-2">
                          {extras.clavos.map((c) => {
                            const bad = isInsuf(c.requerido, c.stock);
                            return (
                              <div
                                key={`clavo-${c.id_materia_prima}`}
                                className={`rounded-lg px-3 py-2 ring-1 ${
                                  bad
                                    ? "bg-red-50 ring-red-200 text-red-700"
                                    : "bg-slate-50 ring-slate-200 text-slate-700"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <span className="break-words font-medium">
                                    {bad ? "❌ " : "✅ "}
                                    {c.titulo}
                                  </span>
                                  <span className="text-sm sm:whitespace-nowrap">
                                    Requiere: <b>{c.requerido}</b> · Stock: <b>{c.stock}</b>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {extras.fibras.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">🧵 Fibras</p>
                        <div className="space-y-2">
                          {extras.fibras.map((f) => {
                            const bad = isInsuf(f.requerido, f.stock);
                            return (
                              <div
                                key={`fibra-${f.id_materia_prima}`}
                                className={`rounded-lg px-3 py-2 ring-1 ${
                                  bad
                                    ? "bg-red-50 ring-red-200 text-red-700"
                                    : "bg-slate-50 ring-slate-200 text-slate-700"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <span className="break-words font-medium">
                                    {bad ? "❌ " : "✅ "}
                                    {f.titulo}
                                  </span>
                                  <span className="text-sm sm:whitespace-nowrap">
                                    Requiere: <b>{f.requerido}</b> · Stock: <b>{f.stock}</b>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pb-[env(safe-area-inset-bottom)]">
                  <button
                    onClick={safeClose}
                    className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-60"
                    disabled={loading}
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleConfirm}
                    className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={loading}
                  >
                    Confirmar y cambiar estado
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
