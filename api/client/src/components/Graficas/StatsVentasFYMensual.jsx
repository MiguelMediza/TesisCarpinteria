// StatsVentasFYMensual.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { api } from "../../api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

const MESES_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sept","oct","nov","dic"];
const currencyUYU = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", { style: "currency", currency: "UYU" });

function mapByMonth(rows = []) {
  const m = new Map();
  rows.forEach((r) => {
    let month = null;
    if (r?.ym) month = parseInt(String(r.ym).split("-")[1], 10);
    else if (r?.month != null) month = parseInt(r.month, 10);
    else if (r?.mes != null) month = parseInt(r.mes, 10);
    const total = Number(r?.total_uyu ?? r?.total ?? r?.importe ?? 0);
    if (month >= 1 && month <= 12) m.set(month, total);
  });
  return m;
}

const VentasFYMensual = ({
  year = new Date().getFullYear(),
  endpoint = "/ventafuegoya/stats/mensual",
  showTitle = true,
}) => {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  // ⬇️ ref del contenedor scrolleable
  const scrollRef = useRef(null);

  // Detecta mobile (para altura)
  useEffect(() => {
    const mq = window.matchMedia?.("(max-width: 640px)");
    const onChange = (e) => setIsNarrow(e.matches);
    setIsNarrow(mq?.matches ?? false);
    mq?.addEventListener?.("change", onChange);
    return () => mq?.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const desde = `${year}-01-01`;
        const hasta =
          new Date().getFullYear() > year
            ? `${year}-12-31`
            : new Date(year, new Date().getMonth() + 1, 0)
                .toISOString()
                .slice(0, 10);

        const { data } = await api.get(endpoint, {
          params: { desde, hasta },
          signal: controller.signal,
        });
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
        console.error(e);
        setErr("No se pudo cargar la serie mensual de FuegoYa.");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [year, endpoint]);

  const chartModel = useMemo(() => {
    const now = new Date();
    const byMonth = mapByMonth(rows);
    const monthNow = year === now.getFullYear() ? now.getMonth() + 1 : 12;

    const months = Array.from({ length: monthNow }, (_, i) => i + 1);
    const labels = months.map((m) => MESES_ES[m - 1]);
    const values = months.map((m) => byMonth.get(m) || 0);

    // Colores: último (mes actual) diferenciado
    const bg = months.map((_, idx) =>
      idx === months.length - 1 ? "rgba(34,197,94,0.75)" : "rgba(59,130,246,0.7)"
    );
    const border = months.map((_, idx) =>
      idx === months.length - 1 ? "rgba(22,163,74,1)" : "rgba(59,130,246,1)"
    );

    // Tamaños: ancho mínimo por barra para evitar “filerear” en móvil
    const BAR_PX = 36;
    const GAP_PX = 18;
    const minWidth = Math.max(360, months.length * (BAR_PX + GAP_PX));
    const height = isNarrow ? 320 : 440;

    return {
      labels,
      values,
      minWidth,
      height,
      data: {
        labels,
        datasets: [
          {
            label: `Total UYU ${year}`,
            data: values,
            backgroundColor: bg,
            borderColor: border,
            borderWidth: 1,
            barThickness: BAR_PX,
            maxBarThickness: BAR_PX,
            categoryPercentage: 1.0,
            barPercentage: 0.9,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          title: {
            display: showTitle,
            text: `Ventas Fuego Ya de ${year}`,
            font: { size: 16, weight: "bold" },
            padding: { bottom: 8 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => currencyUYU(ctx.parsed.y),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => currencyUYU(v) },
            grid: { color: "rgba(0,0,0,0.06)" },
          },
          x: {
            ticks: { maxRotation: 0, minRotation: 0, autoSkip: false },
            grid: { display: false },
          },
        },
        layout: { padding: { right: 8, left: 8 } },
      },
    };
  }, [rows, year, isNarrow]);

  // ⬇️ centramos el scroll cuando cambian datos/año o el contenedor cambia de tamaño
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const center = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max > 0) el.scrollLeft = Math.floor(max / 2);
    };

    // esperar a que el canvas calcule tamaño
    requestAnimationFrame(center);
    const t = setTimeout(center, 60);

    const ro = new ResizeObserver(center);
    ro.observe(el);

    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [year, rows.length]);

  if (loading) return <div className="text-gray-600">Cargando…</div>;
  if (err) return <div className="text-red-600">{err}</div>;

  return (
    // ⬇️ Wrapper scrolleable, centrado por defecto
    <div
      ref={scrollRef}
      className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
    >
      <div style={{ width: chartModel.minWidth, height: chartModel.height }}>
        <Bar data={chartModel.data} options={chartModel.options} />
      </div>
    </div>
  );
};

export default VentasFYMensual;
