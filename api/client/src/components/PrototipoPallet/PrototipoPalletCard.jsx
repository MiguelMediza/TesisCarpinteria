import React, { useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";

const Badge = ({ children, className = "" }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

const SectionTitle = ({ children }) => (
  <p className="text-sm font-semibold text-gray-700 mt-4 mb-1">{children}</p>
);

const Line = () => <hr className="my-3 border-gray-200" />;

const PrototipoPalletCard = ({ prototipo, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);

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
  } = prototipo;

  const [bomDetalle, setBomDetalle] = useState([]);
  const [costoMateriales, setCostoMateriales] = useState(
    Number.isFinite(+prototipo?.costo_materiales) ? +prototipo.costo_materiales : null
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const imgSrc = foto_url || foto || null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/prototipos/${id_prototipo}`);
        if (!mounted) return;
        setBomDetalle(data.bom_detalle || []);
        setCostoMateriales(
          Number.isFinite(+data.costo_materiales) ? +data.costo_materiales : 0
        );
      } catch (e) {
        if (mounted) setErr("No se pudo cargar el detalle del prototipo.");
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id_prototipo]);

  const grouped = useMemo(() => {
    const acc = { tabla: [], taco: [], clavo: [], fibra: [], patin: [] };
    for (const item of bomDetalle) {
      const cat = item.categoria || "otro";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
    }
    return acc;
  }, [bomDetalle]);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm flex flex-col justify-between w-full h-full">
      <div>
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {imgSrc && (
            <img
              src={imgSrc}
              alt={titulo || `Prototipo #${id_prototipo}`}
              className="w-28 h-28 object-cover rounded"
              loading="lazy"
            />
          )}
          <div className="flex-1">
            <p className="text-lg font-semibold text-gray-800">
              {titulo || `Prototipo #${id_prototipo}`}
            </p>
            {medidas && (
              <p className="text-sm text-gray-600">Medidas: <span className="text-gray-800">{medidas}</span></p>
            )}
            {(cliente_nombre || cliente_empresa) && (
              <p className="text-sm text-gray-600">
                Cliente:
                <span className="text-gray-800">
                  {cliente_empresa || `${cliente_nombre || ""} ${cliente_apellido || ""}`.trim()}
                </span>
              </p>
            )}
            {(id_tipo_patin || cantidad_patines) && (
              <div className="mt-1 space-x-2">
                {id_tipo_patin && (
                  <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                    Tiene patín
                  </Badge>
                )}
                {Number.isFinite(+cantidad_patines) && +cantidad_patines > 0 && (
                  <Badge className="bg-slate-100 text-slate-800 border border-slate-200">
                    {cantidad_patines} patín(es)
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comentarios */}
        {comentarios && (
          <>
            <SectionTitle>Comentarios</SectionTitle>
            <p className="text-sm text-gray-800">{comentarios}</p>
            <Line />
          </>
        )}

        {/* Materias primas */}
        <SectionTitle>📦 Materiales del prototipo</SectionTitle>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando detalle...</p>
        ) : err ? (
          <p className="text-sm text-red-600">{err}</p>
        ) : (
          <div className="space-y-3">
            {/* Tablas */}
            {grouped.tabla?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Tablas</p>
                <ul className="list-disc pl-5 text-gray-800">
                  {grouped.tabla.map((it, idx) => (
                    <li key={`tab-${idx}`}>
                      {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                      {it.aclaraciones && (
                        <span className="text-gray-600"> — {it.aclaraciones}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tacos */}
            {grouped.taco?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Tacos</p>
                <ul className="list-disc pl-5 text-gray-800">
                  {grouped.taco.map((it, idx) => (
                    <li key={`tac-${idx}`}>
                      {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                      {it.aclaraciones && (
                        <span className="text-gray-600"> — {it.aclaraciones}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Clavos */}
            {grouped.clavo?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Clavos</p>
                <ul className="list-disc pl-5 text-gray-800">
                  {grouped.clavo.map((it, idx) => (
                    <li key={`cla-${idx}`}>
                      {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                      {it.aclaraciones && (
                        <span className="text-gray-600"> — {it.aclaraciones}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fibras */}
            {grouped.fibra?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Fibras</p>
                <ul className="list-disc pl-5 text-gray-800">
                  {grouped.fibra.map((it, idx) => (
                    <li key={`fib-${idx}`}>
                      {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                      {it.aclaraciones && (
                        <span className="text-gray-600"> — {it.aclaraciones}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Patines */}
            {grouped.patin?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Patines</p>
                <ul className="list-disc pl-5 text-gray-800">
                  {grouped.patin.map((it, idx) => (
                    <li key={`pat-${idx}`}>
                      {it.titulo} — <span className="font-medium">{it.cantidad}</span> unid.
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Si no hay nada */}
            {Object.values(grouped).every(arr => !arr || arr.length === 0) && (
              <p className="text-sm text-gray-600">No hay materiales cargados.</p>
            )}
          </div>
        )}

        {/* Precio para admin */}
        {currentUser?.tipo === "admin" && (
          <>
            <Line />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Costo (materiales):</p>
              <p className="text-base font-semibold text-gray-900">
                {loading ? "..." : `$ ${Number(costoMateriales || 0).toFixed(2)}`}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Botones */}
      <div className="mt-4 flex space-x-3">
        <button
          onClick={() => onEdit?.(id_prototipo)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          title="Editar"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete?.(id_prototipo)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          title="Eliminar"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default PrototipoPalletCard;
