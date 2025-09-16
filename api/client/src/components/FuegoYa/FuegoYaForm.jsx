import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useContext } from "react";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";
import tablasBackground from "../../assets/tablasBackground.jpg";

const FuegoYaForm = () => {
  const { currentUser } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    tipo: "",
    precio_unidad: "",
    stock: ""
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get(`/fuegoya/${id}`)
      .then(({ data }) => {
        setInputs({
          tipo: data.tipo || "",
          precio_unidad: data.precio_unidad?.toString() || "",
          stock: data.stock?.toString() || "",
        });
        if (data.foto) { setPreview(`/images/fuego_ya/${encodeURIComponent(data.foto)}`);}
      })
      .catch(() => {
        setErr("No se pudo cargar el Fuego Ya.");
        setMessageType("error");
      });
  }, [id]);

  const validateInputs = () => {
    if (!inputs.tipo) return "Selecciona un tipo.";
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
    // Validaciones numéricas
    if (["precio_unidad"].includes(name)) {
      if (!/^[0-9]*\.?[0-9]*$/.test(value)) return;
    }
    if (name === "stock") {
      if (!/^\d*$/.test(value)) return;
    }
    setInputs(prev => ({ ...prev, [name]: value }));
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
        if (key === 'precio_unidad') {
          const precio = currentUser?.tipo === 'encargado' ? '0' : value;
          formData.append(key, precio);
        } else {
          formData.append(key, value);
        }
      });
      if (fotoFile) formData.append('foto', fotoFile);

      if (id) {
        await api.put(
          `/fuegoya/${id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        setErr("Fuego Ya actualizado correctamente.");
      } else {
        await api.post(
          "/fuegoya/agregar",
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        setErr("Fuego Ya creado exitosamente.");
      }
      setMessageType("success");
      setInputs(initialInputs);
      clearImage();

      //setTimeout(() => navigate("/fuegoya/listar"), 500);
    } catch (error) {
      let msg = "Error al guardar el fuego ya.";
      if (error.response) {
        const payload = error.response.data;
        msg = typeof payload === 'string' ? payload : payload.message || msg;
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
        <Link to="/fuegoya" className="block mb-6 text-2xl font-semibold text-neutral-800 text-center">
          Imanod Control de Stock
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Fuego Ya" : "Nuevo Fuego Ya"}
        </h1>
        <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit} encType="multipart/form-data">

          {/* Tipo */}
          <div>
            <label htmlFor="tipo" className="block mb-1 text-sm font-medium text-neutral-800">Tipo</label>
            <select name="tipo" id="tipo" value={inputs.tipo} onChange={handleChange} className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400">
              <option value="" disabled>Selecciona un tipo</option>
              <option value="Clasica 22">Clasica 22</option>
              <option value="Clasica 12">Clasica 12</option>
              <option value="50mm">50mm Transparente</option>
              <option value="Clasica 12 granel">Clasica de 12 Granel</option>
            </select>
          </div>

          {/* Precio unitario */}
          {currentUser?.tipo !== "encargado" && (
            <div>
              <label htmlFor="precio_unidad" className="block mb-1 text-sm font-medium text-neutral-800">Precio Unitario</label>
              <input type="text" inputMode="decimal" name="precio_unidad" id="precio_unidad" value={inputs.precio_unidad} onChange={handleChange} placeholder="Ej: 12.50" className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </div>
          )}

          {/* Stock */}
          <div>
            <label htmlFor="stock" className="block mb-1 text-sm font-medium text-neutral-800">Stock</label>
            <input type="text" inputMode="numeric" name="stock" id="stock" value={inputs.stock} onChange={handleChange} placeholder="Ej: 50" className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400" />
          </div>

          {/* Foto */}
          <div>
            <label htmlFor="foto" className="block mb-1 text-sm font-medium text-neutral-800">Foto</label>
            <input ref={fileInputRef} type="file" accept="image/*" name="foto" id="foto" onChange={handleFotoChange} className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400" />
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

          {/* Mensaje */}
          {err && (<span className={messageType === "error" ? "text-red-500" : "text-green-500"}>{err}</span>)}

          {/* Submit */}
          <button type="submit" className="w-full py-2.5 text-white bg-neutral-700 hover:bg-neutral-800 rounded transition">{id ? "Guardar Cambios" : "Crear Fuego Ya"}</button>
          <p className="mt-4 text-sm text-neutral-700 text-center"><Link to="/fuegoya/listar" className="font-medium underline">Volver al listado de Fuego Ya</Link></p>
        </form>
      </div>
    </section>
  );
};

export default FuegoYaForm;