import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useContext } from "react";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";
import pelletsBackground from "../../assets/tablasBackground.jpg";

const PelletsForm = () => {
  const { currentUser } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    titulo: "",
    bolsa_kilogramos: "",
    precio_unidad: "",
    stock: ""
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [logoFile, setLogoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get(`/pellets/${id}`)
      .then(({ data }) => {
        setInputs({
          titulo: data.titulo || "",
          bolsa_kilogramos: data.bolsa_kilogramos?.toString() || "",
          precio_unidad: data.precio_unidad?.toString() || "",
          stock: data.stock?.toString() || ""
        });
        if (data.foto_url) setPreview(data.foto_url);
      })
      .catch(() => {
        setErr("No se pudo cargar el pellet.");
        setMessageType("error");
      });
  }, [id]);

  const validateInputs = () => {
    if (!inputs.titulo) return "El título es requerido.";
    if (!inputs.bolsa_kilogramos || isNaN(inputs.bolsa_kilogramos) || Number(inputs.bolsa_kilogramos) <= 0)
      return "Ingresa un peso de bolsa válido.";
    if (currentUser?.tipo !== "encargado") {
      if (!inputs.precio_unidad || isNaN(inputs.precio_unidad) || Number(inputs.precio_unidad) <= 0)
        return "Ingresa un precio válido.";
    }
    if (!inputs.stock || !Number.isInteger(Number(inputs.stock)) || Number(inputs.stock) < 0)
      return "Ingresa un stock válido.";
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["bolsa_kilogramos", "precio_unidad"].includes(name)) {
      if (!/^[0-9]*\.?[0-9]*$/.test(value)) return;
    }
    if (name === "stock" && !/^\d*$/.test(value)) return;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setLogoFile(null);
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
        } else {
          formData.append(key, value);
        }
      });
      if (logoFile) formData.append("foto", logoFile);

      if (id) {
        await api.put(`/pellets/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setErr("Pellet actualizado correctamente.");
      } else {
        await api.post(`/pellets/agregar`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setErr("Pellet creado exitosamente.");
      }
      setMessageType("success");
      setInputs(initialInputs);
      clearImage();
      setTimeout(() => navigate("/pellets/listar"), 700);
    } catch (error) {
      let msg = "Error al guardar el pellet.";
      if (error.response && error.response.data) {
        if (typeof error.response.data === "string") msg = error.response.data;
        else if (error.response.data.error) msg = error.response.data.error;
        else if (error.response.data.message) msg = error.response.data.message;
      }
      setErr(msg);
      setMessageType("error");
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${pelletsBackground})` }} />
      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link to="/pellets" className="block mb-6 text-2xl font-semibold text-neutral-800 text-center">
          Imanod Control de Stock
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Pellet" : "Nuevo Pellet"}
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit} encType="multipart/form-data">
          <div>
            <label className="block mb-1 text-sm font-medium">Título</label>
            <input name="titulo" value={inputs.titulo} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Bolsa (kg)</label>
            <input name="bolsa_kilogramos" value={inputs.bolsa_kilogramos} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          {currentUser?.tipo !== "encargado" && (
            <div>
              <label className="block mb-1 text-sm font-medium">Precio Unitario</label>
              <input name="precio_unidad" value={inputs.precio_unidad} onChange={handleChange} className="w-full p-2 border rounded" />
            </div>
          )}

          <div>
            <label className="block mb-1 text-sm font-medium">Stock</label>
            <input name="stock" value={inputs.stock} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Foto</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="w-full p-2 border rounded" />
            {preview && (
              <div className="relative mt-2">
                <img src={preview} alt="Preview" className="w-full h-auto rounded" />
                <button type="button" onClick={clearImage} className="absolute top-1 right-1 bg-gray-800 bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75">&times;</button>
              </div>
            )}
          </div>

          {err && <p className={messageType === "error" ? "text-red-500" : "text-green-500"}>{err}</p>}

          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            {id ? "Guardar Cambios" : "Crear Pellet"}
          </button>

          <p className="mt-4 text-center text-sm">
            <Link to="/pellets/listar" className="underline">Volver al listado</Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default PelletsForm;
