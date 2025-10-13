import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useContext } from "react";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";
import tablasBackground from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";
const TablasForm = () => {
  const { currentUser } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    titulo: "",
    largo_cm: "",
    ancho_cm: "",
    espesor_mm: "",
    tipo_madera: "",
    cepilladas: "",
    precio_unidad: "",
    stock: "",
    comentarios: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .get(`/tablas/${id}`)
      .then(({ data }) => {
        setInputs({
          titulo: data.titulo || "",
          largo_cm: data.largo_cm?.toString() || "",
          ancho_cm: data.ancho_cm?.toString() || "",
          espesor_mm: data.espesor_mm?.toString() || "",
          tipo_madera: data.tipo_madera || "",
          cepilladas: data.cepilladas === 1 ? "si" : "no",
          precio_unidad: data.precio_unidad?.toString() || "",
          stock: data.stock?.toString() || "",
          comentarios: data.comentarios || "",
        });
        if (data.foto_url) {
          setPreview(data.foto_url); 
        }
      })
      .catch(() => {
        setErr("No se pudo cargar la tabla.");
        setMessageType("error");
      });
  }, [id]);

  const validateInputs = () => {
    if (!inputs.titulo) return "El título es requerido.";
    if (!inputs.largo_cm) return "El largo es requerido.";
    if (isNaN(inputs.largo_cm) || Number(inputs.largo_cm) <= 0)
      return "Ingresa un largo válido.";
    if (!inputs.ancho_cm) return "El ancho es requerido.";
    if (isNaN(inputs.ancho_cm) || Number(inputs.ancho_cm) <= 0)
      return "Ingresa un ancho válido.";
    if (!inputs.espesor_mm) return "El espesor es requerido.";
    if (isNaN(inputs.espesor_mm) || Number(inputs.espesor_mm) <= 0)
      return "Ingresa un espesor válido.";
    if (!inputs.tipo_madera) return "El tipo de madera es requerido.";
    if (!inputs.cepilladas) return "Selecciona si está cepillada.";
    if (currentUser?.tipo !== "encargado") {
      if (!inputs.precio_unidad) return "El precio unitario es requerido.";
      if (isNaN(inputs.precio_unidad) || Number(inputs.precio_unidad) <= 0)
        return "Ingresa un precio válido.";
    }
    if (!inputs.stock) return "El stock es requerido.";
    if (!Number.isInteger(Number(inputs.stock)) || Number(inputs.stock) < 0)
      return "Ingresa un stock válido.";
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (
      ["largo_cm", "ancho_cm", "espesor_mm", "precio_unidad"].includes(name)
    ) {
      if (!/^[0-9]*\.?[0-9]*$/.test(value)) return;
    }
    if (name === "stock") {
      if (!/^\d*$/.test(value)) return;
    }
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

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
      Object.entries(inputs).forEach(([key, value]) => {
        if (key === "precio_unidad") {
          const precio = currentUser?.tipo === "encargado" ? "0" : value;
          formData.append(key, precio);
        } else if (key === "cepilladas") {
          formData.append(key, value === "si" ? "1" : "0");
        } else {
          formData.append(key, value);
        }
      });
      if (fotoFile) formData.append("foto", fotoFile);

      if (id) {
        await api.put(`/tablas/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Tabla actualizada correctamente.");
      } else {
        await api.post("/tablas/agregar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Tabla creada exitosamente.");
      }
      setMessageType("success");
      setInputs(initialInputs);
      clearImage();

      setTimeout(() => navigate("/tablas/listar"), 500);
    } catch (error) {
      let msg = "Error al guardar la tabla.";
      if (error.response) {
        const payload = error.response.data;
        msg = typeof payload === "string" ? payload : payload.message || msg;
      }
      setErr(msg);
      setMessageType("error");
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
          to="/tablas"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod Control de Stock
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Tabla" : "Nueva Tabla"}
        </h1>
        <form
          className="space-y-4 md:space-y-6"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
        >
          <div>
            <label
              htmlFor="titulo"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Título
            </label>
            <input
              type="text"
              name="titulo"
              id="titulo"
              value={inputs.titulo}
              onChange={handleChange}
              placeholder="Título de la tabla"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label
              htmlFor="largo_cm"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Largo (cm)
            </label>
            <input
              type="text"
              inputMode="decimal"
              name="largo_cm"
              id="largo_cm"
              value={inputs.largo_cm}
              onChange={handleChange}
              placeholder="Ej: 200"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label
              htmlFor="ancho_cm"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Ancho (cm)
            </label>
            <input
              type="text"
              inputMode="decimal"
              name="ancho_cm"
              id="ancho_cm"
              value={inputs.ancho_cm}
              onChange={handleChange}
              placeholder="Ej: 25"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label
              htmlFor="espesor_mm"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Espesor (mm)
            </label>
            <input
              type="text"
              inputMode="decimal"
              name="espesor_mm"
              id="espesor_mm"
              value={inputs.espesor_mm}
              onChange={handleChange}
              placeholder="Ej: 20"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label
              htmlFor="tipo_madera"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Tipo de Madera
            </label>
            <select
              name="tipo_madera"
              id="tipo_madera"
              value={inputs.tipo_madera}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              <option value="" disabled>
                Selecciona un tipo
              </option>
              <option value="pino">Pino</option>
              <option value="eucalipto">Eucalipto</option>
              <option value="álamo">Álamo</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="cepilladas"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Cepilladas
            </label>
            <select
              name="cepilladas"
              id="cepilladas"
              value={inputs.cepilladas}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              <option value="" disabled>
                Cepillada
              </option>
              <option value="si">Si</option>
              <option value="no">No</option>
            </select>
          </div>

          {currentUser?.tipo !== "encargado" && (
            <div>
              <label
                htmlFor="precio_unidad"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
                Precio Unitario
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="precio_unidad"
                id="precio_unidad"
                value={inputs.precio_unidad}
                onChange={handleChange}
                placeholder="Ej: 12.50"
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="stock"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Stock
            </label>
            <input
              type="text"
              inputMode="numeric"
              name="stock"
              id="stock"
              value={inputs.stock}
              onChange={handleChange}
              placeholder="Ej: 50"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label
              htmlFor="foto"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Foto
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              name="foto"
              id="foto"
              onChange={handleFotoChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
            {preview && (
              <div className="relative mt-2">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto rounded"
                />
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

          <div>
            <label
              htmlFor="comentarios"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Comentarios
            </label>
            <textarea
              name="comentarios"
              id="comentarios"
              value={inputs.comentarios}
              onChange={handleChange}
              placeholder="Comentarios adicionales"
              rows={3}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
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
            className="w-full py-2.5 text-white bg-neutral-700 hover:bg-neutral-800 rounded transition"
          >
            {id ? "Guardar Cambios" : "Crear Tabla"}
          </button>
          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/tablas/listar" className="font-medium underline">
              Volver al listado de tablas
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default TablasForm;
