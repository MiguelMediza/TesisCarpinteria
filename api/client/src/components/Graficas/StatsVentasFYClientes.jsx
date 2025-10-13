// StatsTopClientesFY.jsx
import { useEffect, useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { api } from "../../api";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const currencyUYU = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
  });

function rangeForYear(y) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0..11
  const desde = `${y}-01-01`;
  const hasta =
    y < currentYear
      ? `${y}-12-31`
      : new Date(y, currentMonth + 1, 0).toISOString().slice(0, 10);
  return { desde, hasta };
}

const COLORS = [
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#f87171",
  "#a78bfa",
  "#4ade80",
  "#f59e0b",
  "#22d3ee",
  "#fb7185",
  "#93c5fd",
  "#86efac",
  "#fde68a",
  "#fda4af",
  "#c4b5fd",
];

// 👇 helper para partir el título del tooltip en varias líneas
const wrapTooltipTitle = (text, max = 28) => {
  if (!text) return [];
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > max) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const StatsTopClientesFY = ({
  year,
  endpoint = "/ventafuegoya/stats/top-clientes",
  limit = 8,
  showTitle = true,
}) => {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!year) return;
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const { desde, hasta } = rangeForYear(year);
        const { data } = await api.get(endpoint, {
          params: { desde, hasta, limit },
          signal: controller.signal,
        });
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
        console.error(e);
        setErr("No se pudieron cargar los clientes Top de FuegoYa.");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [year, endpoint, limit]);

  const model = useMemo(() => {
    const labels = rows.map(
      (r) => r?.nombre ?? `Cliente #${r?.id_cliente ?? "?"}`
    );
    const values = rows.map((r) => Number(r?.total_uyu ?? 0));
    const colors = labels.map((_, i) => COLORS[i % COLORS.length]);

    return {
      labels,
      values,
      colors,
      chartData: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: showTitle,
            text: `Top clientes Fuego Ya — ${year}`,
            font: { size: 16, weight: "bold" },
            padding: { top: 8, bottom: 16 },
          },
          legend: { display: false }, 
          tooltip: {
            displayColors: true,
            callbacks: {
              title: () => [],
              label: (ctx) => wrapTooltipTitle(ctx.label ?? "", 28),
              afterLabel: (ctx) => currencyUYU(ctx.parsed),
            },
          },
        },
        cutout: "60%",
      },
    };
  }, [rows, year, showTitle]);

  if (loading) return <div className="text-gray-600">Cargando…</div>;
  if (err) return <div className="text-red-600">{err}</div>;

  return (
    <div className="flex flex-col">
      {/* Gráfico centrado */}
      <div className="h-[340px] lg:h-[420px] flex items-center justify-center">
        <Doughnut data={model.chartData} options={model.options} />
      </div>

      {/* Leyenda custom debajo con nombre en múltiples líneas y monto siempre visible */}
      <div className="mt-4 flex flex-wrap items-start justify-center gap-2">
        {model.labels.map((label, i) => (
          <div
            key={i}
            className="flex items-start gap-2 px-3 py-2 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-800"
            title={`${label}: ${currencyUYU(model.values[i])}`}
          >
            <span
              className="mt-0.5 inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: model.colors[i] }}
            />
            <div className="flex flex-col leading-tight">
              {/* nombre: permite salto de línea y corte por palabra */}
              <span className="text-sm text-gray-700 whitespace-normal break-words max-w-[70vw] sm:max-w-[22rem]">
                {label}
              </span>
              {/* monto: siempre visible en segunda línea */}
              <span className="text-sm font-semibold text-gray-900">
                {currencyUYU(model.values[i])}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsTopClientesFY;
