import React, { useEffect, useState, useRef, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";
import tablasBackground from "../../assets/tablasBackground.jpg";

const ClavosForm = () => {
  const { currentUser } = useContext(AuthContext);
  const { id } = useParams(); // id_materia_prima
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
        if (data.foto) {
          setPreview(`/images/clavos/${encodeURIComponent(data.foto)}`);
        }
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
      formData.append("categoria", "clavo");
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
        await api.put(`/clavos/${id}`, formData);
        setErr("Clavo actualizado correctamente.");
      } else {
        await api.post(`/clavos/agregar`, formData);
        setErr("Clavo creado exitosamente.");
      }

      setMessageType("success");
      setInputs(initialInputs);
      clearImage();
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
          {/* ...inputs... (sin cambios visuales) */}
          {err && (
            <span className={messageType === "error" ? "text-red-500" : "text-green-500"}>
              {err}
            </span>
          )}
          <button type="submit" className="w-full py-2.5 text-white bg-neutral-700 hover:bg-neutral-800 rounded transition">
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
