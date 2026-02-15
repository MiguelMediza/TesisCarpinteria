import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../../api";
import tablasBackground from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";

const HorasMaquinasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const empleados = ["Miguel", "Jhon", "Richard", "William", "Juan", "Ruben"];

  const getTodayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const initialInputs = {
    empleado: "Miguel",
    fecha: getTodayISO(),
    horas: "",
    bolsones_cajones: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    api
      .get(`/horasmaquinas/${id}`)
      .then(({ data }) => {
        setInputs({
          empleado: data.empleado || "Miguel",
          fecha: (data.fecha || getTodayISO()).slice(0, 10), // por si viene con hora
          horas: data.horas?.toString() || "",
          bolsones_cajones: data.bolsones_cajones?.toString() || "",
        });
      })
      .catch(() => {
        setErr("No se pudo cargar el registro.");
        setMessageType("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const validateInputs = () => {
    if (!String(inputs.empleado || "").trim()) return "El empleado es requerido.";
    if (!inputs.fecha) return "La fecha es requerida.";

    if (!inputs.horas) return "La cantidad de horas es requerida.";
    if (!Number.isInteger(Number(inputs.horas)) || Number(inputs.horas) < 0)
      return "Ingresa horas válidas (entero >= 0).";

    if (!inputs.bolsones_cajones) return "La cantidad de bolsones/cajones es requerida.";
    if (
      !Number.isInteger(Number(inputs.bolsones_cajones)) ||
      Number(inputs.bolsones_cajones) < 0
    )
      return "Ingresa bolsones/cajones válidos (entero >= 0).";

    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // enteros para horas y bolsones_cajones
    if ((name === "horas" || name === "bolsones_cajones") && !/^\d*$/.test(value)) return;

    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const v = validateInputs();
    if (v) {
      setErr(v);
      setMessageType("error");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        empleado: inputs.empleado,
        fecha: inputs.fecha, // YYYY-MM-DD
        horas: Number(inputs.horas),
        bolsones_cajones: Number(inputs.bolsones_cajones),
      };

      if (id) {
        await api.put(`/horasmaquinas/${id}`, payload);
        setErr("Registro actualizado correctamente.");
      } else {
        await api.post(`/horasmaquinas/agregar`, payload);
        setErr("Registro creado exitosamente.");
      }

      setMessageType("success");
      setInputs({
        ...initialInputs,
        fecha: getTodayISO(), // recalcula por si cambió el día
      });

      setTimeout(() => navigate("/horasmaquinas/listar"), 500);
    } catch (error) {
      let msg = "Error al guardar el registro.";
      if (error.response) {
        const payload = error.response.data;
        msg = typeof payload === "string" ? payload : payload.message || msg;
      }
      setErr(msg);
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${tablasBackground})` }}
      />
      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link
          to="/horasmaquinas"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod Control de Producción
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Horas en Máquinas" : "Nueva Carga de Horas"}
        </h1>

        <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit} aria-busy={submitting}>
          <fieldset disabled={submitting} className="space-y-4 md:space-y-6">
            <div>
              <label className="block mb-1 text-sm font-medium text-neutral-800" htmlFor="empleado">
                Empleado
              </label>
              <select
                id="empleado"
                name="empleado"
                value={inputs.empleado}
                onChange={handleChange}
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              >
                {empleados.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-neutral-800" htmlFor="fecha">
                Fecha
              </label>
              <input
                type="date"
                id="fecha"
                name="fecha"
                value={inputs.fecha}
                onChange={handleChange}
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-neutral-800" htmlFor="horas">
                Cantidad de horas
              </label>
              <input
                type="text"
                inputMode="numeric"
                id="horas"
                name="horas"
                value={inputs.horas}
                onChange={handleChange}
                placeholder="Ej: 8"
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>

            <div>
              <label
                className="block mb-1 text-sm font-medium text-neutral-800"
                htmlFor="bolsones_cajones"
              >
                Cantidad de bolsones/cajones
              </label>
              <input
                type="text"
                inputMode="numeric"
                id="bolsones_cajones"
                name="bolsones_cajones"
                value={inputs.bolsones_cajones}
                onChange={handleChange}
                placeholder="Ej: 120"
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          </fieldset>

          {err && (
            <div className="mb-3">
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 text-white bg-neutral-700 hover:bg-neutral-800 rounded transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {id ? (submitting ? "Actualizando..." : "Guardar Cambios") : submitting ? "Agregando..." : "Crear Registro"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/horasmaquinas/listar" className="font-medium underline">
              Volver al listado
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default HorasMaquinasForm;
