import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import tablasBackground from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";

const HorasMaquinasList = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  // sorting
  const [sortKey, setSortKey] = useState("fecha"); // default
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    api
      .get("/horasmaquinas/listar")
      .then(({ data }) => {
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
        setErr("");
        setMessageType("");
      })
      .catch(() => {
        if (!mounted) return;
        setErr("No se pudo cargar el listado de Horas en Máquinas.");
        setMessageType("error");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleSort = (key) => {
    setSortKey((prev) => {
      if (prev !== key) {
        setSortDir("asc");
        return key;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prev;
    });
  };

  const sortedRows = useMemo(() => {
    const arr = [...rows];

    const dir = sortDir === "asc" ? 1 : -1;

    const getVal = (r) => {
      if (sortKey === "id") return Number(r.id ?? 0);
      if (sortKey === "horas") return Number(r.horas ?? 0);
      if (sortKey === "bolsones_cajones") return Number(r.bolsones_cajones ?? 0);
      if (sortKey === "fecha") return String(r.fecha ?? ""); // YYYY-MM-DD sortable as string
      if (sortKey === "empleado") return String(r.empleado ?? "");
      return String(r[sortKey] ?? "");
    };

    arr.sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);

      // number compare
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;

      // string compare (case-insensitive)
      return String(va).localeCompare(String(vb), undefined, { sensitivity: "base" }) * dir;
    });

    return arr;
  }, [rows, sortKey, sortDir]);

  const SortIcon = ({ active }) => (
    <span className={`ml-2 inline-flex items-center text-xs ${active ? "opacity-100" : "opacity-40"}`}>
      {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
    </span>
  );

  const HeaderBtn = ({ k, children, className = "" }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={`w-full text-left font-semibold text-neutral-800 hover:text-neutral-950 inline-flex items-center ${className}`}
      title="Ordenar"
    >
      {children}
      <SortIcon active={sortKey === k} />
    </button>
  );

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${tablasBackground})` }}
      />

      <div className="relative z-10 w-full max-w-5xl px-3 sm:px-6 py-6">
        <div className="bg-white bg-opacity-80 rounded-lg shadow-md p-4 sm:p-6">
          <Link
            to="/horasmaquinas"
            className="block mb-4 text-2xl font-semibold text-neutral-800 text-center"
          >
            Imanod Control de Producción
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h1 className="text-2xl font-bold text-neutral-900 text-center sm:text-left">
              Horas trabajadas en máquinas
            </h1>
            <p className="text-sm text-neutral-700 text-center sm:text-right">
              Total: <span className="font-semibold">{rows.length}</span>
            </p>
          </div>

          {err && (
            <div className="mb-4">
              <Alert
                type={messageType === "error" ? "error" : "success"}
                onClose={() => {
                  setErr("");
                  setMessageType("");
                }}
              >
                {err}
              </Alert>
            </div>
          )}

          <div className="overflow-x-auto rounded border border-neutral-200 bg-white bg-opacity-60">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-neutral-100">
                <tr className="text-neutral-800">
                  <th className="p-3 border-b border-neutral-200">
                    <HeaderBtn k="id">ID</HeaderBtn>
                  </th>
                  <th className="p-3 border-b border-neutral-200">
                    <HeaderBtn k="empleado">Empleado</HeaderBtn>
                  </th>
                  <th className="p-3 border-b border-neutral-200">
                    <HeaderBtn k="fecha">Fecha</HeaderBtn>
                  </th>
                  <th className="p-3 border-b border-neutral-200">
                    <HeaderBtn k="horas">Horas</HeaderBtn>
                  </th>
                  <th className="p-3 border-b border-neutral-200">
                    <HeaderBtn k="bolsones_cajones">Bolsones/Cajones</HeaderBtn>
                  </th>
                  <th className="p-3 border-b border-neutral-200 text-neutral-800 font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-neutral-700">
                      Cargando...
                    </td>
                  </tr>
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-neutral-700">
                      No hay registros todavía.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-50/60 transition">
                      <td className="p-3 border-b border-neutral-200">{r.id}</td>
                      <td className="p-3 border-b border-neutral-200">{r.empleado}</td>
                      <td className="p-3 border-b border-neutral-200">{r.fecha}</td>
                      <td className="p-3 border-b border-neutral-200">{r.horas}</td>
                      <td className="p-3 border-b border-neutral-200">{r.bolsones_cajones}</td>
                      <td className="p-3 border-b border-neutral-200">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/horasmaquinas/editar/${r.id}`)}
                            className="px-3 py-1.5 rounded bg-neutral-700 text-white hover:bg-neutral-800 transition"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/horasmaquinas/${r.id}`)}
                            className="px-3 py-1.5 rounded border border-neutral-300 bg-white hover:bg-neutral-100 transition"
                          >
                            Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/horasmaquinas" className="font-medium underline">
              Volver
            </Link>
          </p>
        </div>

        {/* Botón flotante */}
        <button
          type="button"
          onClick={() => navigate("/horasmaquinas/nuevo")}
          className="fixed bottom-6 right-6 z-50 shadow-lg rounded-full bg-neutral-800 text-white hover:bg-neutral-900 transition px-5 py-3 flex items-center gap-2"
          aria-label="Agregar nueva carga de horas"
          title="Agregar nueva carga"
        >
          <span className="text-lg leading-none">＋</span>
          <span className="hidden sm:inline font-medium">Agregar nueva carga</span>
        </button>
      </div>
    </section>
  );
};

export default HorasMaquinasList;
