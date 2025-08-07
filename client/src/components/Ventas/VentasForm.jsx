import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ventasBackground from "../../assets/tablasBackground.jpg";

const VentasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    fecha_realizada: "",
    precio_total: "",
    id_cliente: "",
    comentarios: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [clientes, setClientes] = useState([]);
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  // 🔹 Cargar clientes para el select
  useEffect(() => {
    axios.get("http://localhost:4000/api/src/clientes/listar")
      .then(({ data }) => setClientes(data))
      .catch(() => console.error("❌ Error cargando clientes"));
  }, []);

  // 🔹 Si hay id, obtener datos de la venta
  useEffect(() => {
    if (!id) return;
    axios.get(`http://localhost:4000/api/src/ventas/${id}`)
      .then(({ data }) => {
        // ✅ Convertir fecha a YYYY-MM-DD
        const fechaFormateada = data.fecha_realizada
        ? new Date(data.fecha_realizada).toISOString().split("T")[0]
        : "";
        setInputs({
          fecha_realizada: fechaFormateada,   // ✅ Ahora el input la acepta
          precio_total: data.precio_total?.toString() || "",
          id_cliente: data.id_cliente?.toString() || "",
          comentarios: data.comentarios || "",
        });
        if (data.foto) setPreview(`http://localhost:4000/images/ventas/${data.foto}`);
      })
      .catch(() => {
        setErr("No se pudo cargar la venta.");
        setMessageType("error");
      });
  }, [id]);

  // ✅ Validación de campos
  const validateInputs = () => {
    if (!inputs.fecha_realizada) return "La fecha de la venta es obligatoria.";
    if (!inputs.precio_total) return "El precio total es obligatorio.";
    if (isNaN(inputs.precio_total) || Number(inputs.precio_total) <= 0) return "Ingresa un precio válido.";
    return null;
  };

  // ✅ Manejo de inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "precio_total" && !/^[0-9]*\.?[0-9]*$/.test(value)) return;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Manejo de imagen
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setFotoFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ✅ Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateInputs();
    if (validationError) {
      setErr(validationError);
      setMessageType("error");
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(inputs).forEach(([key, value]) => formData.append(key, value));
      if (fotoFile) formData.append("foto", fotoFile);

      if (id) {
        await axios.put(`http://localhost:4000/api/src/ventas/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Venta actualizada correctamente.");
      } else {
        await axios.post("http://localhost:4000/api/src/ventas/agregar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Venta creada exitosamente.");
      }

      setMessageType("success");
      setInputs(initialInputs);
      clearImage();
      setTimeout(() => navigate("/ventas/listar"), 800);

    } catch (error) {
      let msg = "Error al guardar la venta.";
      if (error.response) {
        const payload = error.response.data;
        msg = typeof payload === "string" ? payload : payload.error || payload.message || msg;
      }
      setErr(msg);
      setMessageType("error");
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${ventasBackground})` }}
      />
      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link to="/ventas/listar" className="block mb-6 text-2xl font-semibold text-neutral-800 text-center">
          Imanod Control de Ventas
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Venta" : "Nueva Venta"}
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Fecha */}
          <div>
            <label htmlFor="fecha_realizada" className="block mb-1 text-sm font-medium text-neutral-800">Fecha Realizada</label>
            <input type="date" name="fecha_realizada" value={inputs.fecha_realizada} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          {/* Precio Total */}
          <div>
            <label htmlFor="precio_total" className="block mb-1 text-sm font-medium text-neutral-800">Precio Total</label>
            <input type="text" inputMode="decimal" name="precio_total" value={inputs.precio_total} onChange={handleChange} placeholder="Ej: 250.00" className="w-full p-2 border rounded" />
          </div>

          {/* Cliente */}
          <div>
            <label htmlFor="id_cliente" className="block mb-1 text-sm font-medium text-neutral-800">Cliente</label>
            <select name="id_cliente" value={inputs.id_cliente} onChange={handleChange} className="w-full p-2 border rounded">
              <option value="">Selecciona un cliente (opcional)</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.nombre} {c.apellido} {c.es_empresa ? `- ${c.nombre_empresa}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Foto */}
          <div>
            <label htmlFor="foto" className="block mb-1 text-sm font-medium text-neutral-800">Comprobante / Foto</label>
            <input ref={fileInputRef} type="file" accept="image/*" name="foto" id="foto" onChange={handleFotoChange} className="w-full p-2 border rounded" />
            {preview && (
              <div className="relative mt-2">
                <img src={preview} alt="Preview" className="w-full h-auto rounded" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-1 right-1 bg-gray-800 bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75"
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          {/* Comentarios */}
          <div>
            <label htmlFor="comentarios" className="block mb-1 text-sm font-medium text-neutral-800">Comentarios</label>
            <textarea name="comentarios" value={inputs.comentarios} onChange={handleChange} placeholder="Comentarios adicionales" rows={3} className="w-full p-2 border rounded" />
          </div>

          {/* Mensaje */}
          {err && <span className={messageType === "error" ? "text-red-500" : "text-green-500"}>{err}</span>}

          {/* Botón */}
          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            {id ? "Guardar Cambios" : "Crear Venta"}
          </button>
            <p className="mt-4 text-sm text-neutral-700 text-center"><Link to="/ventas/listar" className="font-medium underline">Volver al listado de ventas</Link></p>
        </form>
      </div>
    </section>
  );
};

export default VentasForm;
