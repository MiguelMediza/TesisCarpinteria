import React, { useContext, useEffect, useMemo, useState } from "react";
import { Image } from "antd";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";

const moneyUYU = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  });

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
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.tipo === "admin";

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
    costo_materiales,
  } = prototipo || {};

  const imgSrc = foto_url || foto || null;

  const [bomDetalle, setBomDetalle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [costo, setCosto] = useState(
    Number.isFinite(+costo_materiales) ? +costo_materiales : null
  );

  useEffect(() => {
    if (!id_prototipo) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const { data } = await api.get(`/prototipos/${id_prototipo}`);
        if (!alive) return;
        setBomDetalle(Array.isArray(data?.bom_detalle) ? data.bom_detalle : []);
        const c = Number.isFinite(+data?.costo_materiales)
          ? +data.costo_materiales
          : Number.isFinite(+costo) ? +costo : 0;
        setCosto(c);
      } catch (e) {
        if (!alive) return;
        setErr("No se pudo cargar el detalle del prototipo.");
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl bg-white
        shadow-sm ring-1 ring-slate-900/5 transition
        hover:-translate-y-0.5 hover:shadow-lg
        flex flex-col
      "
    >
      {/* HEADER con degradado y título centrado */}
      <div className="relative h-20 w-full bg-gradient-to-r from-sky-50 to-indigo-50">
        <h3
          className="
            absolute inset-0 flex items-center justify-center
            px-4 text-center text-base font-semibold text-slate-900
            leading-tight line-clamp-2
          "
        >
          {titulo || `Prototipo #${id_prototipo}`}
        </h3>

        <div
          className="
            absolute top-3 right-3 px-2 py-0.5 text-[11px] font-medium
            rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200 shadow-sm
          "
        >
          Prototipo
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="p-4">
        {/* Chips debajo del header */}
        <div className="mt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
          {medidas && (
            <Chip
              className="bg-slate-50 text-slate-700 ring-slate-200"
              title={`Medidas: ${medidas}`}
            >
              <span className="inline-block size-2.5 rounded-full bg-slate-400" />
              {medidas}
            </Chip>
          )}
          {id_tipo_patin && (
            <Chip
              className="bg-blue-50 text-blue-700 ring-blue-200"
              title="Usa patín"
            >
              <span className="inline-block size-2.5 rounded-full bg-blue-400" />
              Con patín
            </Chip>
          )}
          {Number.isFinite(+cantidad_patines) && +cantidad_patines > 0 && (
            <Chip
              className="bg-emerald-50 text-emerald-700 ring-emerald-200"
              title={`${cantidad_patines} patines`}
            >
              <span className="inline-block size-2.5 rounded-full bg-emerald-400" />
              {cantidad_patines} patín(es)
            </Chip>
          )}
          {clienteLabel && (
            <Chip
              className="bg-amber-50 text-amber-700 ring-amber-200"
              title={`Cliente: ${clienteLabel}`}
            >
              <span className="inline-block size-2.5 rounded-full bg-amber-400" />
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
                alt={titulo || `Prototipo #${id_prototipo}`}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
                preview={{
                  mask: <span style={{ fontSize: 12 }}>Click para ampliar</span>,
                }}
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
            {grouped.tabla?.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[12px] text-slate-500 mb-1">Tablas</p>
                <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
                  {grouped.tabla.map((it, idx) => (
                    <li key={`tab-${idx}`}>
                      {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                      {it.aclaraciones && (
                        <span className="text-slate-600"> — {it.aclaraciones}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {grouped.taco?.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[12px] text-slate-500 mb-1">Tacos</p>
                <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
                  {grouped.taco.map((it, idx) => (
                    <li key={`tac-${idx}`}>
                      {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                      {it.aclaraciones && (
                        <span className="text-slate-600"> — {it.aclaraciones}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {grouped.clavo?.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[12px] text-slate-500 mb-1">Clavos</p>
                <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
                  {grouped.clavo.map((it, idx) => (
                    <li key={`cla-${idx}`}>
                      {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                      {it.aclaraciones && (
                        <span className="text-slate-600"> — {it.aclaraciones}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {grouped.fibra?.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[12px] text-slate-500 mb-1">Fibras</p>
                <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
                  {grouped.fibra.map((it, idx) => (
                    <li key={`fib-${idx}`}>
                      {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                      {it.aclaraciones && (
                        <span className="text-slate-600"> — {it.aclaraciones}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {grouped.patin?.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[12px] text-slate-500 mb-1">Patines</p>
                <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
                  {grouped.patin.map((it, idx) => (
                    <li key={`pat-${idx}`}>
                      {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Object.values(grouped).every((a) => !a || a.length === 0) && (
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-sm text-slate-600">No hay materiales cargados.</p>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <>
            <Divider />
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Costo (materiales)</p>
              <p className="text-base font-semibold text-slate-900">
                {loading ? "…" : moneyUYU(costo ?? 0)}
              </p>
            </div>
          </>
        )}

        {/* Acciones */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(id_prototipo)}
            className="
              flex-1 inline-flex items-center justify-center rounded-lg
              bg-blue-600 text-white px-3 py-2 text-sm font-medium
              shadow-sm hover:bg-blue-700 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-400
            "
            title="Editar"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(id_prototipo)}
            className="
              flex-1 inline-flex items-center justify-center rounded-lg
              bg-red-50 text-red-700 ring-1 ring-red-200
              px-3 py-2 text-sm font-medium hover:bg-red-100
              focus:outline-none focus-visible:ring-2
              focus-visible:ring-red-300
            "
            title="Eliminar"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrototipoPalletCard;
