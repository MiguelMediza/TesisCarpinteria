import React, { useEffect, useMemo, useState } from "react";
import { Image } from "antd";
import { api } from "../../api";

const chipBase =
  "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ring-1";
const Chip = ({ className = "", children, title }) => (
  <span className={`${chipBase} ${className}`} title={title}>
    {children}
  </span>
);

const KTitle = ({ children }) => (
  <p className="text-sm font-medium text-slate-700 mb-1">{children}</p>
);

const Divider = () => <div className="my-3 border-t border-slate-200" />;

const PrototipoPalletCard = ({ prototipo, onEdit, onDelete }) => {
  const {
    id_prototipo,
    titulo,
    medidas,
    foto,
    foto_url,
    cantidad_patines,
    id_tipo_patin,
    comentarios,
    cliente_nombre,
    cliente_apellido,
    cliente_empresa,
    stock
  } = prototipo || {};

  const imgSrc = foto_url || foto || null;

  const [bomDetalle, setBomDetalle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ---- estados para ajuste de stock ----
  const [cantidadStock, setCantidadStock] = useState("");
  const [descontarMP, setDescontarMP] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [errorStock, setErrorStock] = useState("");
  const [successStock, setSuccessStock] = useState("");
  const [stockLocal, setStockLocal] = useState(stock ?? 0);

  useEffect(() => {
    setStockLocal(stock ?? 0);
  }, [stock]);

  useEffect(() => {
    if (!id_prototipo) return;

    const loadBOM = async () => {
      try {
        setLoading(true);
        setErr("");

        const { data } = await api.get(`/prototipos/${id_prototipo}`);
        const bom = Array.isArray(data?.bom_detalle)
          ? data.bom_detalle
          : [];
        setBomDetalle(bom);
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar el detalle del prototipo.");
        setBomDetalle([]);
      } finally {
        setLoading(false);
      }
    };

    loadBOM();
  }, [id_prototipo]);

  const grouped = useMemo(() => {
    const acc = { tabla: [], taco: [], clavo: [], fibra: [], patin: [] };
    for (const item of bomDetalle || []) {
      const cat = item?.categoria || "otro";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
    }
    return acc;
  }, [bomDetalle]);

  const clienteLabel =
    cliente_empresa ||
    `${cliente_nombre || ""} ${cliente_apellido || ""}`.trim() ||
    null;

  const handleAddStock = async () => {
    setErrorStock("");
    setSuccessStock("");

    const n = Number(cantidadStock);
    if (!n || n <= 0) {
      setErrorStock("Ingrese una cantidad mayor a 0.");
      return;
    }

    try {
      setLoadingStock(true);

      const { data } = await api.post("/prototipos/ajustarstock", {
        id_prototipo,
        cantidad: n,
        descontarMateriaPrima: descontarMP
      });

      setStockLocal(data?.detalles?.nuevo_stock ?? (stockLocal + n));
      setCantidadStock("");
      setSuccessStock("Stock actualizado correctamente.");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        "Error al actualizar stock.";
      setErrorStock(msg);
    } finally {
      setLoadingStock(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-lg flex flex-col">

      {/* Header */}
      <div className="relative h-20 w-full bg-gradient-to-r from-sky-50 to-indigo-50">
        <h3 className="absolute inset-0 flex items-center justify-center px-4 text-center text-base font-semibold text-slate-900 leading-tight line-clamp-2">
          {titulo || `Prototipo #${id_prototipo}`}
        </h3>

        <div className="absolute top-3 right-3 px-2 py-0.5 text-[11px] font-medium rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200 shadow-sm">
          Stock: {stockLocal}
        </div>
      </div>

      <div className="p-4">

        {/* Chips */}
        <div className="mt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
          {medidas && <Chip className="bg-slate-50 text-slate-700 ring-slate-200">{medidas}</Chip>}
          {id_tipo_patin && <Chip className="bg-blue-50 text-blue-700 ring-blue-200">Con patín</Chip>}
          {Number.isFinite(+cantidad_patines) && +cantidad_patines > 0 && (
            <Chip className="bg-emerald-50 text-emerald-700 ring-emerald-200">
              {cantidad_patines} patín(es)
            </Chip>
          )}
          {clienteLabel && (
            <Chip className="bg-amber-50 text-amber-700 ring-amber-200">
              {clienteLabel}
            </Chip>
          )}
        </div>

        {/* Imagen */}
        {imgSrc && (
          <div className="mt-3">
            <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden bg-slate-50 grid place-items-center h-44 sm:h-52">
              <Image
                src={imgSrc}
                alt={titulo}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                preview={{ mask: <span style={{ fontSize: 12 }}>Click para ampliar</span> }}
              />
            </div>
          </div>
        )}

        {/* Comentarios */}
        {comentarios && (
          <>
            <Divider />
            <KTitle>Comentarios</KTitle>
            <p className="text-sm text-slate-800">{comentarios}</p>
          </>
        )}

        {/* Materiales */}
        <Divider />
        <KTitle>📦 Materiales del prototipo</KTitle>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando detalle…</p>
        ) : err ? (
          <p className="text-sm text-red-600">{err}</p>
        ) : (
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(grouped).flat().length === 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-sm text-slate-600">No hay materiales cargados.</p>
              </div>
            )}

            {Object.entries(grouped).map(([key, items]) => (
              items?.length > 0 && (
                <div key={key} className="rounded-xl border border-slate-100 bg-white p-3">
                  <p className="text-[12px] text-slate-500 mb-1 capitalize">{key}</p>
                  <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
                    {items.map((it, idx) => (
                      <li key={idx}>
                        {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                        {it.aclaraciones && (
                          <span className="text-slate-600"> — {it.aclaraciones}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        )}

        {/* Acciones */}
        <div className="mt-4 flex gap-2">
          <button onClick={() => onEdit?.(id_prototipo)} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg">Editar</button>
          <button onClick={() => onDelete?.(id_prototipo)} className="flex-1 bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 rounded-lg">Eliminar</button>
        </div>

        {/* Ajuste de stock */}
        <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
          <p className="text-center text-[12px] font-medium text-slate-600">Ajustar stock</p>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={cantidadStock}
              onChange={(e) => setCantidadStock(e.target.value)}
              className="w-24 rounded-lg border px-2 py-1 text-sm"
              placeholder="+ unidades"
            />

            <label className="inline-flex items-center gap-1 text-[12px] text-slate-600">
              <input
                type="checkbox"
                checked={descontarMP}
                onChange={(e) => setDescontarMP(e.target.checked)}
              />
              Descontar materia prima
            </label>

            <button
              onClick={handleAddStock}
              disabled={loadingStock}
              className="ml-auto bg-emerald-600 text-white px-3 py-1.5 rounded-lg"
            >
              {loadingStock ? "Guardando..." : "Aplicar"}
            </button>
          </div>

          {errorStock && <p className="text-[11px] text-red-600">{errorStock}</p>}
          {successStock && <p className="text-[11px] text-emerald-600">{successStock}</p>}
        </div>

      </div>
    </div>
  );
};

export default PrototipoPalletCard;
