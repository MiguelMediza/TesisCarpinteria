import React, { useEffect, useState, useRef, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";
import tablasBackground from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";

const FibrasForm = () => {
  const { currentUser } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    titulo: "",
    ancho_cm: "",
    largo_cm: "",
    precio_unidad: "",
    stock: "",
    comentarios: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/fibras/${id}`)
      .then(({ data }) => {
        setInputs({
          titulo: data.titulo || "",
          ancho_cm: data.ancho_cm?.toString() || "",
          largo_cm: data.largo_cm?.toString() || "",
          precio_unidad: data.precio_unidad?.toString() || "",
          stock: data.stock?.toString() || "",
          comentarios: data.comentarios || "",
        });
        if (data.foto_url) setPreview(data.foto_url);
      })
      .catch(() => {
        setErr("No se pudo cargar la fibra.");
        setMessageType("error");
      });
  }, [id]);

  const validateInputs = () => {
    if (!inputs.titulo) return "El título es requerido.";
    if (!inputs.largo_cm) return "El largo es requerido.";
    if (isNaN(inputs.largo_cm) || Number(inputs.largo_cm) <= 0) return "Ingresa un largo válido.";
    if (!inputs.ancho_cm) return "El ancho es requerido.";
    if (isNaN(inputs.ancho_cm) || Number(inputs.ancho_cm) <= 0) return "Ingresa un ancho válido.";
    if (currentUser?.tipo !== "encargado") {
      if (!inputs.precio_unidad) return "El precio unitario es requerido.";
      if (isNaN(inputs.precio_unidad) || Number(inputs.precio_unidad) <= 0) return "Ingresa un precio válido.";
    }
    if (!inputs.stock) return "El stock es requerido.";
    if (!Number.isInteger(Number(inputs.stock)) || Number(inputs.stock) < 0) return "Ingresa un stock válido.";
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["ancho_cm", "largo_cm", "precio_unidad"].includes(name)) {
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
    if (submitting) return;

    const validationError = validateInputs();
    if (validationError) {
      setErr(validationError);
      setMessageType("error");
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("categoria", "fibra");
      Object.entries(inputs).forEach(([key, value]) => {
        if (key === "precio_unidad") {
          const precio = currentUser?.tipo === "encargado" ? "0" : value;
          formData.append(key, precio);
        } else {
          formData.append(key, value);
        }
      });
      if (fotoFile) formData.append("foto", fotoFile);

      if (id) {
        await api.put(`/fibras/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Fibra actualizada correctamente.");
      } else {
        await api.post("/fibras/agregar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Fibra creada exitosamente.");
      }

      setMessageType("success");
      setInputs(initialInputs);
      clearImage();
      setTimeout(() => navigate("/fibras/listar"), 500);
    } catch (error) {
      let msg = "Error al guardar la fibra.";
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
          to="/fibras"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod Control de Stock
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Fibra" : "Nueva Fibra"}
        </h1>
        <form
          className="space-y-4 md:space-y-6"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          aria-busy={submitting}
        >
          <fieldset disabled={submitting} className="space-y-4 md:space-y-6">
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
                placeholder="Título de la fibra"
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
                placeholder="Ej: 100"
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
                placeholder="Ej: 50"
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
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
                  placeholder="Ej: 1.25"
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
                placeholder="Ej: 200"
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
                    disabled={submitting}
                    className="absolute top-1 right-1 bg-gray-800 bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75 disabled:opacity-60 disabled:cursor-not-allowed"
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
            {id
              ? submitting
                ? "Actualizando..."
                : "Guardar Cambios"
              : submitting
              ? "Agregando..."
              : "Crear Fibra"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/fibras/listar" className="font-medium underline">
              Volver al listado de fibras
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default FibrasForm;
