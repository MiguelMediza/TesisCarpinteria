import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useContext } from "react";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";
import tablasBackground from "../../assets/tablasBackground.jpg";

const PalosForm = () => {
  const { currentUser } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    titulo: "",
    largo_cm: "",
    diametro_mm: "",
    tipo_madera: "",
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
      .get(`/palos/${id}`)
      .then(({ data }) => {
        setInputs({
          titulo: data.titulo || "",
          largo_cm: data.largo_cm?.toString() || "",
          diametro_mm: data.diametro_mm?.toString() || "",
          tipo_madera: data.tipo_madera || "",
          precio_unidad: data.precio_unidad?.toString() || "",
          stock: data.stock?.toString() || "",
          comentarios: data.comentarios_mp || "",
        });
        if (data.foto) {
          setPreview(`/images/palos/${encodeURIComponent(data.foto)}`);
        }
      })
      .catch(() => {
        setErr("No se pudo cargar el palo.");
        setMessageType("error");
      });
  }, [id]);

  const validateInputs = () => {
    if (!inputs.titulo) return "El título es requerido.";
    if (!inputs.largo_cm) return "El largo es requerido.";
    if (isNaN(inputs.largo_cm) || Number(inputs.largo_cm) <= 0)
      return "Ingresa un largo válido.";
    if (!inputs.diametro_mm) return "El diámetro es requerido.";
    if (isNaN(inputs.diametro_mm) || Number(inputs.diametro_mm) <= 0)
      return "Ingresa un diámetro válido.";
    if (!inputs.tipo_madera) return "El tipo de madera es requerido.";
    if (currentUser?.tipo !== "encargado") {
      if (!inputs.precio_unidad) return "El precio unitario es requerido.";
      if (
        isNaN(inputs.precio_unidad) ||
        Number(inputs.precio_unidad) <= 0
      )
        return "Ingresa un precio válido.";
    }
    if (!inputs.stock) return "El stock es requerido.";
    if (!Number.isInteger(Number(inputs.stock)) || Number(inputs.stock) < 0)
      return "Ingresa un stock válido.";
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["largo_cm", "diametro_mm", "precio_unidad"].includes(name)) {
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
          const precio =
            currentUser?.tipo === "encargado" ? "0" : value;
          formData.append(key, precio);
        } else {
          formData.append(key, value);
        }
      });
      if (fotoFile) formData.append("foto", fotoFile);

      if (id) {
        await api.put(
          `/palos/${id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setErr("Palo actualizado correctamente.");
      } else {
        await api.post(
          "/palos/agregar",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setErr("Palo creado exitosamente.");
      }
      setMessageType("success");
      setInputs(initialInputs);
      clearImage();
      // navigate back after a moment
      setTimeout(() => navigate("/palos/listar"), 500);
    } catch (error) {
      let msg = "Error al guardar el palo.";
      if (error.response) {
        const payload = error.response.data;
        msg =
          typeof payload === "string"
            ? payload
            : payload.message || msg;
      }
      setErr(msg);
      setMessageType("error");
      console.error(error);
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
          to="/palos"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod Control de Stock
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Palo" : "Nuevo Palo"}
        </h1>
        <form
          className="space-y-4 md:space-y-6"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
        >
          {/* Título */}
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
              placeholder="Descripción del palo"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Largo */}
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
              placeholder="Ej: 100"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Diámetro */}
          <div>
            <label
              htmlFor="diametro_mm"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Diámetro (mm)
            </label>
            <input
              type="text"
              inputMode="decimal"
              name="diametro_mm"
              id="diametro_mm"
              value={inputs.diametro_mm}
              onChange={handleChange}
              placeholder="Ej: 50"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Tipo de madera */}
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

          {/* Precio unitario */}
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
                placeholder="Ej: 7.50"
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          )}

          {/* Stock */}
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
              placeholder="Ej: 20"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Foto */}
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

          {/* Comentarios */}
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

          {/* Mensaje */}
          {err && (
            <span
              className={
                messageType === "error"
                  ? "text-red-500"
                  : "text-green-500"
              }
            >
              {err}
            </span>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 text-white bg-neutral-700 hover:bg-neutral-800 rounded transition"
          >
            {id ? "Guardar Cambios" : "Crear Palo"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/palos/listar" className="font-medium underline">
              Volver al listado de palos
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default PalosForm;
