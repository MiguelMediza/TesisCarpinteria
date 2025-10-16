import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import encargosBackground from "../../assets/tablasBackground.jpg";
import { api } from "../../api";
import Alert from "../Modals/Alert";

const EncargosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    fecha_realizado: "",
    fecha_prevista_llegada: "",
    id_proveedor: "",
    comentarios: "",
  });

  const [proveedores, setProveedores] = useState([]);
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [detalles, setDetalles] = useState([{ id_materia_prima: "", cantidad: "" }]);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/proveedores/listar").then(({ data }) => setProveedores(data));
    api.get("/encargos/primas").then(({ data }) => setMateriasPrimas(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/encargos/${id}`)
      .then(({ data }) => {
        setInputs({
          fecha_realizado: formatDate(data.fecha_realizado),
          fecha_prevista_llegada: formatDate(data.fecha_prevista_llegada),
          id_proveedor: data.id_proveedor || "",
          comentarios: data.comentarios || "",
        });
        const detalleConvertido = data.detalles.map((d) => ({
          id_materia_prima: d.id_materia_prima?.toString() || "",
          cantidad: d.cantidad?.toString() || "",
        }));
        setDetalles(detalleConvertido);
      })
      .catch(() => {
        setErr("No se pudo cargar el encargo.");
        setMessageType("error");
      });
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "fecha_realizado" && next.fecha_prevista_llegada) {
        const fReal = new Date(value);
        const fPrev = new Date(next.fecha_prevista_llegada);
        if (fPrev <= fReal) next.fecha_prevista_llegada = "";
      }
      return next;
    });
  };

  const handleDetalleChange = (index, field, value) => {
    const nuevos = [...detalles];
    nuevos[index][field] = value;
    setDetalles(nuevos);
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    return isoString.split("T")[0];
  };

  const agregarDetalle = () => setDetalles([...detalles, { id_materia_prima: "", cantidad: "" }]);

  const quitarDetalle = (index) => {
    if (detalles.length === 1) return;
    const nuevos = detalles.filter((_, i) => i !== index);
    setDetalles(nuevos);
  };

  const validar = () => {
    if (!inputs.fecha_realizado) return "La fecha de realización es obligatoria.";
    if (!inputs.fecha_prevista_llegada) return "La fecha prevista de llegada es obligatoria.";
    if (inputs.fecha_prevista_llegada) {
      const fReal = new Date(inputs.fecha_realizado);
      const fPrev = new Date(inputs.fecha_prevista_llegada);
      if (fPrev <= fReal) return "La fecha prevista de llegada debe ser mayor a la fecha realizada.";
    }
    if (!inputs.id_proveedor) return "Debe seleccionar un proveedor.";
    for (let i = 0; i < detalles.length; i++) {
      const d = detalles[i];
      if (!d.id_materia_prima) return `Seleccione una materia prima en la fila ${i + 1}`;
      if (!d.cantidad || Number(d.cantidad) <= 0) return `Ingrese una cantidad válida en la fila ${i + 1}`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const error = validar();
    if (error) {
      setErr(error);
      setMessageType("error");
      return;
    }

    const payload = {
      ...inputs,
      materias_primas: detalles.map((d) => ({
        id_materia_prima: parseInt(d.id_materia_prima),
        cantidad: parseInt(d.cantidad),
      })),
    };

    try {
      setSubmitting(true);
      if (id) {
        await api.put(`/encargos/${id}`, payload);
        setErr("Encargo actualizado correctamente.");
      } else {
        await api.post("/encargos/agregar", payload);
        setErr("Encargo creado exitosamente.");
      }
      setMessageType("success");
      setTimeout(() => navigate("/encargos/listar"), 800);
    } catch {
      setErr("Error al guardar el encargo.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${encargosBackground})` }}
      />
      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">
          {id ? "Editar Encargo" : "Nuevo Encargo"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={submitting}>
          <fieldset disabled={submitting} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Fecha realizada *</label>
              <input
                type="date"
                name="fecha_realizado"
                value={inputs.fecha_realizado}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-neutral-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Fecha prevista de llegada *</label>
              <input
                type="date"
                name="fecha_prevista_llegada"
                value={inputs.fecha_prevista_llegada}
                onChange={handleChange}
                min={inputs.fecha_realizado || undefined}
                className="w-full p-2 border rounded bg-neutral-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Proveedor *</label>
              <select
                name="id_proveedor"
                value={inputs.id_proveedor}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-neutral-100"
              >
                <option value="">Seleccione un proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>
                    {p.nombre_empresa}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Comentarios</label>
              <textarea
                name="comentarios"
                value={inputs.comentarios}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-neutral-100"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Materias primas *</label>
              {detalles.map((detalle, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <select
                    value={detalle.id_materia_prima}
                    onChange={(e) => handleDetalleChange(index, "id_materia_prima", e.target.value)}
                    className="flex-1 p-2 border rounded bg-neutral-100"
                  >
                    <option value="">Materia prima</option>
                    {materiasPrimas.map((mp) => (
                      <option key={mp.id_materia_prima} value={mp.id_materia_prima}>
                        {mp.titulo} ({mp.categoria})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={detalle.cantidad}
                    onChange={(e) => handleDetalleChange(index, "cantidad", e.target.value)}
                    placeholder="Cantidad"
                    className="w-28 p-2 border rounded bg-neutral-100"
                  />

                  <button
                    type="button"
                    onClick={() => quitarDetalle(index)}
                    disabled={submitting || detalles.length === 1}
                    className="text-red-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Quitar"
                  >
                    🗑️
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={agregarDetalle}
                disabled={submitting}
                className="mt-1 text-sm text-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Agregar materia prima
              </button>
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
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {id
              ? submitting
                ? "Actualizando..."
                : "Guardar Cambios"
              : submitting
              ? "Agregando..."
              : "Crear Encargo"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/encargos/listar" className="font-medium underline">
              Volver al listado de encargos
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default EncargosForm;
