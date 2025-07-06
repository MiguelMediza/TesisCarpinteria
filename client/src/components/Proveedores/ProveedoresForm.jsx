import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import tablasBackground from "../../assets/tablasBackground.jpg"; 

const Proveedores = () => {
  const { id } = useParams();                
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    rut: "",
    nombre: "",
    nombre_empresa: "",
    telefono: "",
    correo_electronico: "",
    comentarios: "",
  });
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  const initialInputs = {
    rut: "",
    nombre: "",
    nombre_empresa: "",
    telefono: "",
    correo_electronico: "",
    comentarios: "",
  };
  // 2. Si hay id, cargamos datos para editar
  useEffect(() => {
    if (!id) return;
    axios.get(`http://localhost:4000/api/src/proveedores/${id}`)
      .then(({ data }) => setInputs(data))
      .catch(() => {
        setErr("No se pudo cargar el proveedor.");
        setMessageType("error");
      });
  }, [id]);

  const validateInputs = () => {
    if (!inputs.rut) return "El RUT es requerido.";
    if (inputs.rut.length !== 22) return "Ingresa un RUT válido (Debe tener 22 dígitos).";
    if (!inputs.nombre) return "El nombre es requerido.";
    if (!inputs.nombre_empresa) return "El nombre de la empresa es requerido.";
    if (!inputs.telefono) return "El teléfono es requerido.";
    if (inputs.telefono.length < 9) return "El teléfono debe tener 9 dígitos.";
    if (!inputs.correo_electronico) return "El correo electrónico es requerido.";
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if ((name === "rut" || name === "telefono") && !/^\d*$/.test(value)) return;
    if (name === "rut" && value.length > 22) return;
    if (name === "telefono" && value.length > 9) return;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateInputs();
    if (validationError) {
      setErr(validationError);
      setMessageType("error");
      return;
    }
    try {
      if (id) {
        // EDITAR
        await axios.put(
          `http://localhost:4000/api/src/proveedores/${id}`,
          inputs
        );
        setErr("Proveedor actualizado correctamente.");
        setInputs(initialInputs);
      } else {
        // CREAR
        await axios.post(
          "http://localhost:4000/api/src/proveedores/agregar",
          inputs
        );
        setErr("Proveedor creado exitosamente.");
        setInputs(initialInputs);
      }
      setMessageType("success");
      // Después de un breve delay o directamente:
      setTimeout(() => navigate("/proveedores"), 500);
    } catch (error) {
      let msg = "Error al guardar proveedor.";
      if (error.response) {
        const payload = error.response.data;
        if (typeof payload === "string")       msg = payload;
        else if (payload.message)              msg = payload.message;
      }
      setErr(msg);
      setMessageType("error");
      console.error(error);
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      {/* Fondo difuminado */}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${tablasBackground})` }}
      />

      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link
          to="/"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod Control de Stock
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Proveedor" : "Nuevo Proveedor"}
        </h1>

        <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
          {/* RUT */}
          <div>
            <label htmlFor="rut" className="block mb-1 text-sm font-medium text-neutral-800">
              RUT
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={22}
              name="rut"
              id="rut"
              value={inputs.rut}
              onChange={handleChange}
              placeholder="RUT del proveedor"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="block mb-1 text-sm font-medium text-neutral-800">
              Nombre
            </label>
            <input
              type="text"
              name="nombre"
              id="nombre"
              value={inputs.nombre}
              onChange={handleChange}
              placeholder="Nombre del contacto"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Empresa */}
          <div>
            <label htmlFor="nombre_empresa" className="block mb-1 text-sm font-medium text-neutral-800">
              Empresa
            </label>
            <input
              type="text"
              name="nombre_empresa"
              id="nombre_empresa"
              value={inputs.nombre_empresa}
              onChange={handleChange}
              placeholder="Nombre de la empresa"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="telefono" className="block mb-1 text-sm font-medium text-neutral-800">
              Teléfono
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={9}
              name="telefono"
              id="telefono"
              value={inputs.telefono}
              onChange={handleChange}
              placeholder="Teléfono del proveedor"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Correo */}
          <div>
            <label htmlFor="correo_electronico" className="block mb-1 text-sm font-medium text-neutral-800">
              Correo Electrónico
            </label>
            <input
              type="email"
              name="correo_electronico"
              id="correo_electronico"
              value={inputs.correo_electronico}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Comentarios */}
          <div>
            <label htmlFor="comentarios" className="block mb-1 text-sm font-medium text-neutral-800">
              Comentarios
            </label>
            <textarea
              name="comentarios"
              id="comentarios"
              value={inputs.comentarios}
              onChange={handleChange}
              placeholder="Comentarios adicionales"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              rows={3}
            />
          </div>

          {/* Mensaje */}
          {err && (
            <span className={messageType === "error" ? "text-red-500" : "text-green-500"}>
              {err}
            </span>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 text-white bg-neutral-700 hover:bg-neutral-800 rounded transition"
          >
            {id ? "Guardar Cambios" : "Crear Proveedor"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/proveedores/listar" className="font-medium underline">
              Volver al listado de proveedores
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default Proveedores;
