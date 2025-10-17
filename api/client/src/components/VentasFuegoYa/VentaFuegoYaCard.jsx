import React, { useContext, useMemo, useState } from "react";
import { Image } from "antd";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";

const moneyUYU = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  });

const formatDate = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatDateTime = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const badgePagoLook = (estado) =>
  estado === "pago"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-amber-50 text-amber-800 ring-amber-200";

const toggleBtnClasses = (estado, disabled) => {
  if (disabled) {
    return "bg-slate-200 text-slate-600 cursor-not-allowed";
  }
  return estado === "pago"
    ? "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
    : "bg-emerald-600 text-white hover:bg-emerald-700";
};

const chipBase =
  "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ring-1";

const VentaFuegoYaCard = ({ venta, onEdit, onDelete, onPagoChanged }) => {
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.tipo === "admin";

  const {
    id_ventaFuegoya,
    fecha_realizada,
    precio_total,
    comentarios,
    estadopago: estadoInicial = "credito",
    fechapago,
    cliente_display,
    fuego_ya_tipo,
    foto,
    foto_url,
    cantidadbolsas,
  } = venta || {};

  const R2_BASE = (import.meta.env.VITE_R2_PUBLIC_BASE || "").replace(/\/+$/, "");
  const imgSrc = useMemo(() => {
    if (foto_url) return foto_url;
    if (!foto) return null;
    if (/^https?:\/\//i.test(foto)) return foto;
    return R2_BASE ? `${R2_BASE}/venta_fuegoya/${encodeURIComponent(foto)}` : null;
  }, [foto, foto_url, R2_BASE]);

  const [estadopago, setEstadopago] = useState(estadoInicial);
  const [fechaPagoLocal, setFechaPagoLocal] = useState(fechapago || null);
  const [changing, setChanging] = useState(false);

  const handleTogglePago = async () => {
    if (!id_ventaFuegoya) return;
    const nuevo = estadopago === "pago" ? "credito" : "pago";

    const prevEstado = estadopago;
    const prevFecha = fechaPagoLocal;
    setChanging(true);
    setEstadopago(nuevo);

    const nowISO = new Date().toISOString();
    setFechaPagoLocal(nuevo === "pago" ? nowISO : null);

    try {
      await api.put(`/ventafuegoya/${id_ventaFuegoya}/estadopago`, { estadopago: nuevo });
      onPagoChanged?.(id_ventaFuegoya, nuevo, nuevo === "pago" ? nowISO : null);
    } catch (err) {
      console.error("Error cambiando estado de pago:", err);
      setEstadopago(prevEstado);
      setFechaPagoLocal(prevFecha);
      alert("No se pudo actualizar el estado de pago.");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl bg-white
        shadow-sm ring-1 ring-slate-900/5 transition
        hover:-translate-y-0.5 hover:shadow-lg flex flex-col
      "
    >
      <div className="relative h-20 w-full bg-gradient-to-r from-sky-50 to-indigo-50">
        <h3
          className="
            absolute inset-0 flex items-center justify-center
            px-4 text-center text-base font-semibold text-slate-900
            leading-tight line-clamp-2
          "
        >
          {`Venta Fuego Ya #${id_ventaFuegoya ?? "—"}`}
        </h3>

        <span
          className={`
            absolute top-3 right-3 px-2 py-0.5 text-[11px] font-medium
            rounded-full ring-1 shadow-sm ${badgePagoLook(estadopago)}
          `}
          title={`Estado: ${estadopago}`}
        >
          {estadopago === "pago" ? "Pagado" : "Crédito"}
        </span>
      </div>

      <div className="p-4">

        {imgSrc ? (
          <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-50 ring-1 ring-slate-200">
            <Image
              src={imgSrc}
              alt={`Venta ${id_ventaFuegoya ?? ""}`}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              loading="lazy"
              fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
              preview={{ mask: <span style={{ fontSize: 12 }}>Click para ampliar</span> }}
            />
          </div>
        ) : (
          <div className="w-full h-44 rounded-xl bg-slate-50 ring-1 ring-slate-200 grid place-items-center text-slate-400 text-sm select-none">
            Sin imagen
          </div>
        )}

        <div className="mt-3 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Cliente:</span>{" "}
          <span className="text-slate-800">
            {cliente_display?.trim() || "Sin cliente"}
          </span>
          {fuego_ya_tipo ? <span className="text-slate-500"> • {fuego_ya_tipo}</span> : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {/* Cantidad bolsas */}
          {(cantidadbolsas ?? null) !== null && (
            <span
              className={`${chipBase} bg-amber-50 text-amber-800 ring-amber-200`}
              title="Cantidad de bolsas"
            >
              <span className="inline-block size-2.5 rounded-full bg-amber-400" />
              🔥 {cantidadbolsas} {Number(cantidadbolsas) === 1 ? "bolsa" : "bolsas"}
            </span>
          )}

          {/* Total (solo admin) */}
          {isAdmin && (
            <span
              className={`${chipBase} bg-blue-50 text-blue-700 ring-blue-200`}
              title="Precio total"
            >
              <span className="inline-block size-2.5 rounded-full bg-blue-400" />
              {moneyUYU(precio_total)}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Fecha realizada</p>
            <p className="text-sm font-medium text-slate-800">
              {fecha_realizada ? formatDate(fecha_realizada) : "No especificada"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Fecha de pago</p>
            <p className="text-sm font-medium text-slate-800">
              {fechaPagoLocal ? formatDateTime(fechaPagoLocal) : "En crédito / Sin pagar"}
            </p>
          </div>
        </div>

        {(comentarios ?? "").toString().trim() && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <p className="text-[12px] text-slate-500">Comentarios</p>
            <p className="text-sm text-slate-800">{comentarios}</p>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <button
            onClick={handleTogglePago}
            disabled={changing}
            className={`
              px-3 py-2 text-sm rounded transition shadow-sm
              focus:outline-none focus-visible:ring-2
              ${toggleBtnClasses(estadopago, changing)}
              ${estadopago === "pago"
                ? "focus-visible:ring-red-300"
                : "focus-visible:ring-emerald-300"}
            `}
            title={estadopago === "pago" ? "Volver a crédito" : "Marcar como pagado"}
          >
            {changing
              ? "Guardando…"
              : estadopago === "pago"
              ? "Volver a crédito"
              : "Marcar como pagado"}
          </button>

          <button
            onClick={() => onEdit?.(id_ventaFuegoya)}
            className="
              px-3 py-2 text-sm rounded-lg
              bg-blue-600 text-white font-medium shadow-sm
              hover:bg-blue-700 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-400
              disabled:opacity-60
            "
            title="Editar"
            disabled={changing}
          >
            Editar
          </button>

          <button
            onClick={() => onDelete?.(id_ventaFuegoya)}
            className="
              px-3 py-2 text-sm rounded-lg
              bg-red-50 text-red-700 ring-1 ring-red-200
              font-medium hover:bg-red-100
              focus:outline-none focus-visible:ring-2
              focus-visible:ring-red-300 disabled:opacity-60
            "
            title="Eliminar"
            disabled={changing}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VentaFuegoYaCard;
