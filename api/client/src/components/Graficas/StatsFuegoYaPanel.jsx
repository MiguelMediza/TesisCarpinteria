import { useMemo, useState } from "react";
import VentasFYMensual from "./StatsVentasFYMensual";
import StatsTopClientesFY from "./StatsVentasFYClientes";

const StatsFuegoYaPanel = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const yearsBack = 7;
  const yearOptions = useMemo(
    () => Array.from({ length: yearsBack }, (_, i) => currentYear - i),
    [currentYear]
  );

  return (
    <div className="rounded-2xl bg-white shadow-xl p-6 md:p-7">
      {/* Barra superior con título + selector */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Estadísticas Fuego Ya
          </h2>
          <p className="text-sm text-slate-500">
            Ventas y mejores clientes del período seleccionado
          </p>
        </div>

        {/* Selector de año (custom select con chevron) */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="fy-year"
            className="text-sm font-medium text-slate-700"
          >
            Año
          </label>
          <div className="relative">
            <select
              id="fy-year"
              aria-label="Seleccionar año"
              className="appearance-none pr-10 pl-3 py-2 rounded-xl bg-white text-sm text-slate-800 border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500 transition"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {/* Chevron */}
            <svg
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.17l3.71-2.94a.75.75 0 111.04 1.08l-4.24 3.36a.75.75 0 01-.94 0L5.21 8.31a.75.75 0 01.02-1.1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Grilla de gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Card: Ventas mensuales */}
        <div className="rounded-2xl bg-white shadow-md p-4 lg:p-6">
          <VentasFYMensual
            endpoint="/ventafuegoya/stats/mensual"
            year={year}
            showTitle={true}
          />
        </div>

        {/* Card: Top clientes (donut) */}
        <div className="rounded-2xl bg-white shadow-md p-4 lg:p-6">
          <StatsTopClientesFY
            endpoint="/ventafuegoya/stats/topclientes" 
            year={year}
          />
        </div>
      </div>
    </div>
  );
};

export default StatsFuegoYaPanel;