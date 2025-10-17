import { useState, useEffect, useContext } from "react";
import { api } from "../../api";
import StockBajo from "../../components/StockBajo/StockBajo";
import { AuthContext } from "../../context/authContext";
import StatsFuegoYaPanel from "../../components/Graficas/StatsFuegoYaPanel";

const Home = () => {
  const { currentUser } = useContext(AuthContext);

  const [items, setItems] = useState([]);
  const [threshold, setThreshold] = useState(500);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const isAdmin = currentUser?.tipo === "admin";

  const fetchLowStock = async (signal) => {
    try {
      setLoading(true);
      const { data } = await api.get("/stockbajo", {
        params: { threshold },
        signal,
      });
      setItems(data ?? []);
      setErr("");
    } catch (e) {
      if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
      console.error(e);
      setErr("No se pudieron cargar los materiales con stock bajo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchLowStock(controller.signal);
    return () => controller.abort();
  }, [threshold]);

  return (
    <section className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Resumen
          </h1>
        </div>

        {/* Panel de estadísticas Fuego Ya (admin) */}
        {isAdmin && <StatsFuegoYaPanel />}

        {/* Card: Stock bajo */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {/* Header de la card */}
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Stock bajo
              </h2>
              <p className="text-sm text-slate-500">
                Materiales por debajo del umbral configurado.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="umbral" className="text-sm text-slate-600">
                Umbral
              </label>
              <input
                id="umbral"
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value || 0))}
                className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm shadow-sm
                           focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                onClick={() => fetchLowStock()}
                disabled={loading}
                className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium
                           text-white shadow hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? "Actualizando…" : "Actualizar"}
              </button>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-4 sm:p-5">
            {err && (
              <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
                {err}
              </div>
            )}

            {loading ? (
              <p className="text-slate-600">Cargando…</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((it, idx) => (
                  <StockBajo key={`${it.origen}-${it.id}-${idx}`} item={it} />
                ))}

                {items.length === 0 && (
                  <p className="col-span-full text-center text-slate-500">
                    ¡Todo bien! No hay materiales bajo el umbral seleccionado.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;
