import { useState, useEffect } from "react";
import { api } from "../../api";
import StockBajo from "../../components/StockBajo/StockBajo";

const Home = () => {
  const [items, setItems] = useState([]);
  const [threshold, setThreshold] = useState(500);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
    return () => controller.abort(); // cancelar si cambia el umbral o se desmonta
  }, [threshold]); 

  return (
    <>
      <section className="p-4 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Resumen</h1>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Umbral:</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value || 0))}
              className="w-24 p-1 border rounded"
              min={0}
            />
            <button
              onClick={() => fetchLowStock()}
              className="px-3 py-1 bg-neutral-200 rounded hover:bg-neutral-300 transition text-sm"
            >
              Actualizar
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-2">Stock bajo</h2>
        {err && <p className="text-red-600 mb-3">{err}</p>}
        {loading ? (
          <p className="text-gray-600">Cargando…</p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((it, idx) => (
              <StockBajo key={`${it.origen}-${it.id}-${idx}`} item={it} />
            ))}
            {items.length === 0 && (
              <p className="text-gray-500 col-span-full text-center">
                ¡Todo bien! No hay materiales bajo el umbral seleccionado.
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
};

export default Home;
