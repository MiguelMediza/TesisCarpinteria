import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../../api";
import clientesBackground from "../../assets/tablasBackground.jpg";

const ClientesForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const initialInputs = {
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    es_empresa: "0",           
    nombre_empresa: "",
    direccion_empresa: "",
    email_empresa: ""
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get(`/clientes/${id}`)
      .then(({ data }) => {
        setInputs({
          nombre: data?.nombre || "",
          apellido: data?.apellido || "",
          telefono: data?.telefono || "",
          email: data?.email || "",
          es_empresa: data?.es_empresa ? "1" : "0",
          nombre_empresa: data?.nombre_empresa || "",
          direccion_empresa: data?.direccion_empresa || "",
          email_empresa: data?.email_empresa || ""
        });
      })
      .catch(() => {
        setErr("No se pudo cargar el cliente.");
        setMessageType("error");
      });
  }, [id]);

  const validateInputs = () => {
    if (!inputs.nombre) return "El nombre es requerido.";
    if (!inputs.email) return "El email es requerido.";
    if (inputs.es_empresa === "1") {
      if (!inputs.nombre_empresa) return "El nombre de la empresa es requerido.";
      if (!inputs.direccion_empresa) return "La dirección de la empresa es requerida.";
      if (!inputs.email_empresa) return "El email de la empresa es requerido.";
    }
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateInputs();
    if (validationError) {
      setErr(validationError);
      setMessageType("error");
      return;
    }

    const payload = {
      ...inputs,
      es_empresa: inputs.es_empresa === "1" ? 1 : 0,
    };

    try {
      if (id) {
        await api.put(`/clientes/${id}`, payload);
        setErr("Cliente actualizado correctamente.");
      } else {
        await api.post(`/clientes/agregar`, payload);
        setErr("Cliente creado exitosamente.");
      }
      setMessageType("success");
      setTimeout(() => navigate("/clientes/listar"), 600);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data ||
        "Error al guardar el cliente.";
      setErr(msg);
      setMessageType("error");
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${clientesBackground})` }}
      />
      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link to="/clientes/listar" className="block mb-6 text-2xl font-semibold text-neutral-800 text-center">
          Imanod Control de Clientes
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Cliente" : "Nuevo Cliente"}
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 text-sm font-medium text-neutral-800">Nombre</label>
            <input type="text" name="nombre" value={inputs.nombre} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-neutral-800">Apellido</label>
            <input type="text" name="apellido" value={inputs.apellido} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-neutral-800">Teléfono</label>
            <input type="text" name="telefono" value={inputs.telefono} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-neutral-800">Email</label>
            <input type="email" name="email" value={inputs.email} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-neutral-800">¿Es empresa?</label>
            <select name="es_empresa" value={inputs.es_empresa} onChange={handleChange} className="w-full p-2 border rounded">
              <option value="0">No</option>
              <option value="1">Sí</option>
            </select>
          </div>

          {inputs.es_empresa === "1" && (
            <>
              <div>
                <label className="block mb-1 text-sm font-medium text-neutral-800">Nombre de Empresa</label>
                <input type="text" name="nombre_empresa" value={inputs.nombre_empresa} onChange={handleChange} className="w-full p-2 border rounded" />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-neutral-800">Dirección de Empresa</label>
                <input type="text" name="direccion_empresa" value={inputs.direccion_empresa} onChange={handleChange} className="w-full p-2 border rounded" />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-neutral-800">Email Empresa</label>
                <input type="email" name="email_empresa" value={inputs.email_empresa} onChange={handleChange} className="w-full p-2 border rounded" />
              </div>
            </>
          )}

          {err && (
            <span className={messageType === "error" ? "text-red-500" : "text-green-500"}>
              {err}
            </span>
          )}

          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            {id ? "Guardar Cambios" : "Crear Cliente"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/clientes/listar" className="font-medium underline">
              Volver al listado de clientes
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default ClientesForm;
