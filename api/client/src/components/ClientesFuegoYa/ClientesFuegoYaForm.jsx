import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../../api";
import bgImg from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";
const ClientesFuegoYaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const initialInputs = {
    nombre: "",
    telefono: "",
    email: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .get(`/clientesfuegoya/${id}`)
      .then(({ data }) => {
        setInputs({
          nombre: data?.nombre || "",
          telefono: data?.telefono || "",
          email: data?.email || "",
        });
      })
      .catch(() => {
        setErr("No se pudo cargar el cliente de FuegoYa.");
        setMessageType("error");
      });
  }, [id]);

  const validate = () => {
    if (!inputs.nombre?.trim()) return "El nombre es obligatorio.";
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const v = validate();
    if (v) {
      setErr(v);
      setMessageType("error");
      return;
    }

    const payload = {
      nombre: inputs.nombre.trim(),
      telefono: inputs.telefono?.trim() || null,
      email: inputs.email?.trim() || null,
    };

    try {
      if (id) {
        await api.put(`/clientesfuegoya/${id}`, payload);
        setErr("Cliente FuegoYa actualizado correctamente.");
      } else {
        await api.post(`/clientesfuegoya/agregar`, payload);
        setErr("Cliente FuegoYa creado exitosamente.");
      }
      setMessageType("success");
      setTimeout(() => navigate("/clientesfuegoya/listar"), 600);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data ||
        "Error al guardar el cliente de FuegoYa.";
      setErr(msg);
      setMessageType("error");
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${bgImg})` }}
      />
      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link
          to="/clientesfuegoya/listar"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod — Clientes FuegoYa
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Cliente FuegoYa" : "Nuevo Cliente FuegoYa"}
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 text-sm font-medium text-neutral-800">
              Nombre *
            </label>
            <input
              type="text"
              name="nombre"
              value={inputs.nombre}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Nombre"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-neutral-800">
              Teléfono
            </label>
            <input
              type="text"
              name="telefono"
              value={inputs.telefono}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="099 000 000"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-neutral-800">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={inputs.email}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="cliente@correo.com"
            />
          </div>

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
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {id ? "Guardar Cambios" : "Crear Cliente"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link
              to="/clientesfuegoya/listar"
              className="font-medium underline"
            >
              Volver al listado
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default ClientesFuegoYaForm;
