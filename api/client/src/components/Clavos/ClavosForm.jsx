import React, { useEffect, useState, useRef, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";
import tablasBackground from "../../assets/tablasBackground.jpg";

const ClavosForm = () => {
  const { currentUser } = useContext(AuthContext);
  const { id } = useParams(); 
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    titulo: "",
    tipo: "",
    medidas: "",
    material: "",
    precio_unidad: "",
    stock: "",
    comentarios: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  const [serverFotoUrl, setServerFotoUrl] = useState(null);
  const [fotoRemove, setFotoRemove] = useState(false);

  // Cargar datos al editar 
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
            precio_unidad: data.precio_unidad?.toString() || "",
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
    if (name === "precio_unidad" && !/^[0-9]*\.?[0-9]*$/.test(value)) return;
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

      formData.append("categoria", "clavo");

      Object.entries(inputs).forEach(([key, value]) => {
        if (key === "precio_unidad") {
          const precio = currentUser?.tipo === "encargado" ? "0" : value || "0";
          formData.append(key, precio);
        } else {
          formData.append(key, value ?? "");
        }
      });

      if (fotoFile) formData.append("foto", fotoFile);

      // ⬇️⬇️ IMPORTANTE: si estoy editando, no subí foto nueva y el user pidió borrar:
      if (id && !fotoFile && fotoRemove) {
        formData.append("foto_remove", "1");
      }

      if (id) {
        await api.put(`/clavos/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setErr("Clavo actualizado correctamente.");
      } else {
        await api.post(`/clavos/agregar`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setErr("Clavo creado exitosamente.");
      }

      setMessageType("success");
      setInputs(initialInputs);
      // limpiar estados de foto
      setFotoFile(null);
      setPreview(null);
      setServerFotoUrl(null);
      setFotoRemove(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setTimeout(() => navigate("/clavos/listar"), 500);
    } catch (error) {
      const payload = error?.response?.data;
      const msg = typeof payload === "string" ? payload : payload?.message || "Error al guardar el clavo.";
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
        <Link to="/clavos" className="block mb-6 text-2xl font-semibold text-neutral-800 text-center">
          Imanod Control de Stock
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Clavo" : "Nuevo Clavo"}
        </h1>

        <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Título */}
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

          {/* Tipo */}
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

          {/* Medidas */}
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

          {/* Material */}
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

          {/* Precio unitario */}
          {currentUser?.tipo !== "encargado" && (
            <div>
              <label htmlFor="precio_unidad" className="block mb-1 text-sm font-medium text-neutral-800">
                Precio Unitario
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="precio_unidad"
                id="precio_unidad"
                value={inputs.precio_unidad}
                onChange={handleChange}
                placeholder="Ej: 0.10"
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          )}

          {/* Stock */}
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

          {/* Foto */}
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
                  onClick={() => {
                    setFotoFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";

                    setPreview(null);

                    setFotoRemove(!!serverFotoUrl);
                  }}
                  className="absolute top-1 right-1 bg-gray-800 bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75"
                  title="Quitar imagen"
                >
                  &times;
                </button>
              </div>
            )}

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
              rows={3}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Mensaje */}
          {err && (
            <span className={messageType === "error" ? "text-red-500" : "text-green-500"}>
              {err}
            </span>
          )}

          {/* Submit new */}
          <button
            type="submit"
            className="w-full py-2.5 text-white bg-neutral-700 hover:bg-neutral-800 rounded transition"
          >
            {id ? "Guardar Cambios" : "Crear Clavo"}
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
