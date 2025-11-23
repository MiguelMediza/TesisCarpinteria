import React, { useContext, useState } from "react";
import { Image } from "antd";
import { AuthContext } from "../../context/authContext";

const moneyUYU = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", { style: "currency", currency: "UYU" });

const colorByStock = (stock) => {
  const n = Number(stock ?? 0);
  if (n < 100) return "bg-red-50 text-red-700 ring-red-200";
  if (n < 250) return "bg-yellow-50 text-yellow-800 ring-yellow-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
};

const TipoTablasCard = ({ tipoTabla, onEdit, onDelete, onAddStock }) => {
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.tipo === "admin";

  const {
    id_tipo_tabla,
    titulo,
    largo_cm,
    ancho_cm,
    espesor_mm,
    foto,
    foto_url,
    precio_unidad,
    cepillada,
    stock,
  } = tipoTabla || {};

  const R2 = (import.meta.env.VITE_R2_PUBLIC_BASE || "").replace(/\/+$/, "");
  const imageUrl = foto_url ?? (foto ? `${R2}/${String(foto).replace(/^\/+/, "")}` : null);

  const dimensiones =
    [largo_cm, ancho_cm, espesor_mm].some((v) => v != null)
      ? `${largo_cm ?? "—"} × ${ancho_cm ?? "—"} × ${espesor_mm ?? "—"}`
      : "—";

  // --- NUEVO: estados para suma de stock ---
  const [cantidadStock, setCantidadStock] = useState("");
  const [descontarPadre, setDescontarPadre] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [errorStock, setErrorStock] = useState("");
  const [successStock, setSuccessStock] = useState("");

  const handleAddStock = async () => {
    setErrorStock("");
    setSuccessStock("");

    const n = Number(cantidadStock);
    if (!n || n <= 0) {
      setErrorStock("Ingrese una cantidad mayor a 0.");
      return;
    }

    if (!id_tipo_tabla) {
      setErrorStock("No se encontró el ID del tipo de tabla.");
      return;
    }

    try {
      setLoadingStock(true);

      // El padre define qué hacer con esto (API, refrescar lista, etc.)
      if (typeof onAddStock === "function") {
        await onAddStock(id_tipo_tabla, n, descontarPadre);
      }

      setCantidadStock("");
      setSuccessStock("Stock actualizado correctamente.");
    } catch (err) {
      console.error(err);
      setErrorStock("Ocurrió un error al actualizar el stock.");
    } finally {
      setLoadingStock(false);
    }
  };

  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl bg-white
        shadow-sm ring-1 ring-slate-900/5 transition
        hover:-translate-y-0.5 hover:shadow-lg
        flex flex-col
      "
    >
      {/* Imagen (antd) */}
      {imageUrl ? (
        <div className="relative h-36 w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={titulo || "Tipo de tabla"}
            preview={{ mask: "Ver" }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            rootClassName="!block"
            className="!w-full !h-full !object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="h-36 w-full bg-gradient-to-b from-slate-100 to-slate-50 flex items-center justify-center">
          <div className="text-slate-400 text-sm select-none">Sin imagen</div>
        </div>
      )}

      <div
        className={`
          absolute top-3 right-3 px-2 py-0.5 text-[11px] font-medium
          rounded-full ring-1 shadow-sm ${colorByStock(stock)}
        `}
        title="Stock disponible"
      >
        Stock: {Number(stock ?? 0)}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
          {titulo || "Tipo de tabla"}
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Dimensiones (cm)</p>
            <p className="text-sm font-medium text-slate-800">{dimensiones}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Cepillada</p>
            <p className="text-sm font-medium text-slate-800">
              {Number(cepillada) ? "Sí" : "No"}
            </p>
          </div>

          {isAdmin && (
            <div className="col-span-2">
              <div
                className="
                  inline-flex items-center gap-2 rounded-full
                  bg-blue-50 text-blue-700 ring-1 ring-blue-200
                  px-2.5 py-1 text-[12px] font-medium
                "
                title="Precio unitario"
              >
                <span className="inline-block size-2.5 rounded-full bg-blue-400" />
                {precio_unidad != null ? `${moneyUYU(precio_unidad)} / unid.` : "—"}
              </div>
            </div>
          )}
        </div>

        {/* Botones editar / eliminar */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(id_tipo_tabla)}
            className="
              flex-1 inline-flex items-center justify-center rounded-lg
              bg-blue-600 text-white px-3 py-2 text-sm font-medium
              shadow-sm hover:bg-blue-700 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-400
            "
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(id_tipo_tabla)}
            className="
              flex-1 inline-flex items-center justify-center rounded-lg
              bg-red-50 text-red-700 ring-1 ring-red-200
              px-3 py-2 text-sm font-medium hover:bg-red-100
              focus:outline-none focus-visible:ring-2
              focus-visible:ring-red-300
            "
          >
            Eliminar
          </button>
        </div>

        {/* --- NUEVO: sección para sumar stock --- */}
        {isAdmin && (
          <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
            <p className="text-center text-[12px] font-medium text-slate-600">
              Ajustar stock
            </p>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={cantidadStock}
                onChange={(e) => setCantidadStock(e.target.value)}
                className="
                  w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-400
                "
                placeholder="+ unidades"
              />

              <label className="inline-flex items-center gap-1 text-[12px] text-slate-600">
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={descontarPadre}
                  onChange={(e) => setDescontarPadre(e.target.checked)}
                />
                <span>Descontar de tabla padre</span>
              </label>

              <button
                type="button"
                onClick={handleAddStock}
                disabled={loadingStock}
                className="
                  ml-auto inline-flex items-center justify-center rounded-lg
                  bg-emerald-600 text-white px-3 py-1.5 text-[12px] font-medium
                  shadow-sm hover:bg-emerald-700 disabled:opacity-60
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                "
              >
                {loadingStock ? "Guardando..." : "Aplicar"}
              </button>
            </div>

            {errorStock && (
              <p className="text-[11px] text-red-600">{errorStock}</p>
            )}
            {successStock && (
              <p className="text-[11px] text-emerald-600">{successStock}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TipoTablasCard;
