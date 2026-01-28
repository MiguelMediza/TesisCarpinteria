import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";

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

export default function EntregaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [entrega, setEntrega] = useState(null);
  const [detalles, setDetalles] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const { data } = await api.get(`/entregas/${id}`);
        if (!alive) return;

        setEntrega(data?.entrega || null);
        setDetalles(Array.isArray(data?.detalles) ? data.detalles : []);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setErr("No se pudo cargar la entrega.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const totalEnEntrega = useMemo(
    () => detalles.reduce((acc, d) => acc + Number(d.cantidad_entregada || 0), 0),
    [detalles]
  );

  if (loading) {
    return (
      <section className="min-h-screen bg-neutral-50 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 ring-1 ring-slate-900/5">
          Cargando entrega…
        </div>
      </section>
    );
  }

  if (err) {
    return (
      <section className="min-h-screen bg-neutral-50 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 ring-1 ring-slate-900/5">
          <p className="text-sm text-red-700">{err}</p>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              onClick={() => navigate("/entregas/listar")}
            >
              Volver
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!entrega) {
    return (
      <section className="min-h-screen bg-neutral-50 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 ring-1 ring-slate-900/5">
          Entrega no encontrada.
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
        <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Entrega #{entrega.id_entrega}
              </h1>
              <p className="text-sm text-slate-600">
                Pedido #{entrega.id_pedido} · {formatDateTime(entrega.fecha_entrega)}
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                to={`/pedidos/${entrega.id_pedido}`}
                className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Ir al pedido
              </Link>
              <Link
                to="/entregas/listar"
                className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                Volver al listado
              </Link>
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[12px] text-slate-500">Registros</p>
              <p className="text-sm font-semibold text-slate-900">{detalles.length}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[12px] text-slate-500">Total entregado</p>
              <p className="text-sm font-semibold text-slate-900">{totalEnEntrega} u.</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[12px] text-slate-500">Fecha</p>
              <p className="text-sm font-semibold text-slate-900">
                {String(entrega.fecha_entrega).split("T")[0]}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100">
            <div className="bg-white px-4 py-3">
              <p className="text-[12px] text-slate-500">Detalle</p>
            </div>

            {detalles.length ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Prototipo</th>
                    <th className="px-4 py-2 text-left font-medium">Medidas</th>
                    <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalles.map((d) => (
                    <tr key={`${entrega.id_entrega}-${d.id_entrega_detalle ?? d.id_prototipo}`}>
                      <td className="px-4 py-2 text-slate-800">
                        {d.prototipo_titulo || `Prototipo #${d.id_prototipo}`}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{d.medidas || "—"}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">
                        {Number(d.cantidad_entregada || 0)} u.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-4 text-sm text-slate-600">
                Sin ítems cargados en esta entrega.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
