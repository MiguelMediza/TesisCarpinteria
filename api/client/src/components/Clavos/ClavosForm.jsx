import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../api";
import tablasBackground from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";

const ClavosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    titulo: "",
    tipo: "",
    medidas: "",
    material: "",
    stock: "",
    comentarios: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [serverFotoUrl, setServerFotoUrl] = useState(null);
  const [fotoRemove, setFotoRemove] = useState(false);

  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await api.get(`/clavos/${id}`);
        setInputs({
          titulo: data.titulo || "",
          tipo: data.tipo || "",
          medidas: data.medidas || "",
          material: data.material || "",
          stock: data.stock?.toString() || "",
          comentarios: data.comentarios || "",
        });

        if (data.foto_url) {
          setPreview(data.foto_url);
          setServerFotoUrl(data.foto_url);
        } else {
          setPreview(null);
          setServerFotoUrl(null);
        }
        setFotoRemove(false);
      } catch {
        setErr("No se pudo cargar el clavo.");
        setMessageType("error");
      }
    })();
  }, [id]);

  const validateInputs = () => {
    if (!inputs.titulo) return "El título es requerido.";
    if (!inputs.tipo?.trim()) return "El tipo es obligatorio.";
    if (!inputs.medidas) return "Las medidas son requeridas.";
    if (!inputs.material) return "El material es requerido.";
    if (!inputs.stock) return "El stock es requerido.";
    if (!Number.isInteger(Number(inputs.stock)) || Number(inputs.stock) < 0)
      return "Ingresa un stock válido.";
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "stock" && !/^\d*$/.test(value)) return;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setPreview(URL.createObjectURL(file));
    setFotoRemove(false);
  };

  const handleClearImage = () => {
    setFotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPreview(null);
    setFotoRemove(!!serverFotoUrl); 
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
      formData.append("categoria", "clavo"); 

      Object.entries(inputs).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });

      if (fotoFile) formData.append("foto", fotoFile);
      if (id && !fotoFile && fotoRemove) {
        formData.append("foto_remove", "1");
      }

      if (id) {
        await api.put(`/clavos/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Clavo actualizado correctamente.");
      } else {
        await api.post(`/clavos/agregar`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Clavo creado exitosamente.");
      }

      setMessageType("success");
      setInputs(initialInputs);
      setFotoFile(null);
      setPreview(null);
      setServerFotoUrl(null);
      setFotoRemove(false);

      setTimeout(() => navigate("/clavos/listar"), 500);
    } catch (error) {
      const payload = error?.response?.data;
      const msg =
        typeof payload === "string"
          ? payload
          : payload?.message || "Error al guardar el clavo.";
      setErr(msg);
      setMessageType("error");
      console.error(error);
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
          to="/clavos"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod Control de Stock
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Clavo" : "Nuevo Clavo"}
        </h1>

        <form
          className="space-y-4 md:space-y-6"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          aria-busy={submitting}
        >
          <fieldset disabled={submitting} className="space-y-4 md:space-y-6">
            <div>
              <label htmlFor="titulo" className="block mb-1 text-sm font-medium text-neutral-800">
                Título
              </label>
              <input
                type="text"
                name="titulo"
                id="titulo"
                value={inputs.titulo}
                onChange={handleChange}
                placeholder="Título del clavo"
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>

            <div>
              <label htmlFor="tipo" className="block mb-1 text-sm font-medium text-neutral-800">
                Tipo
              </label>
              <select
                name="tipo"
                id="tipo"
                value={inputs.tipo}
                onChange={handleChange}
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              >
                <option value="">Seleccione un tipo...</option>
                <option value="Para pistola">Para pistola</option>
                <option value="Sencillos">Sencillos</option>
              </select>
            </div>

            <div>
              <label htmlFor="medidas" className="block mb-1 text-sm font-medium text-neutral-800">
                Medidas
              </label>
              <input
                type="text"
                name="medidas"
                id="medidas"
                value={inputs.medidas}
                onChange={handleChange}
                placeholder="Ej: 5×100 mm"
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>

            <div>
              <label htmlFor="material" className="block mb-1 text-sm font-medium text-neutral-800">
                Material
              </label>
              <input
                type="text"
                name="material"
                id="material"
                value={inputs.material}
                onChange={handleChange}
                placeholder="Ej: Acero"
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>

            <div>
              <label htmlFor="stock" className="block mb-1 text-sm font-medium text-neutral-800">
                Stock
              </label>
              <input
                type="text"
                inputMode="numeric"
                name="stock"
                id="stock"
                value={inputs.stock}
                onChange={handleChange}
                placeholder="Ej: 1000"
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>

            <div>
              <label htmlFor="foto" className="block mb-1 text-sm font-medium text-neutral-800">
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
                  <img src={preview} alt="Preview" className="w-full h-auto rounded" />
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="absolute top-1 right-1 bg-gray-800 bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75"
                    title="Quitar imagen"
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>

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
            {id ? (submitting ? "Actualizando..." : "Guardar Cambios") : submitting ? "Agregando..." : "Crear Clavo"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/clavos/listar" className="font-medium underline">
              Volver al listado de clavos
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default ClavosForm;
