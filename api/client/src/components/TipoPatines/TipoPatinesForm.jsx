import React, { useEffect, useState, useRef, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";
import tablasBackground from "../../assets/tablasBackground.jpg";

const TABLES_PER_PATIN = 1; // Debe coincidir con el backend / triggers
const TACOS_PER_PATIN = 3;  // Debe coincidir con el backend / triggers

const TipoPatinesForm = () => {
  const { currentUser } = useContext(AuthContext);
  const { id } = useParams(); // id_tipo_patin
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    id_tipo_tabla: "",
    id_tipo_taco: "",
    titulo: "",
    medidas: "",
    stock: "",
    comentarios: ""
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [tablas, setTablas] = useState([]);
  const [tacos, setTacos] = useState([]);
  const [selectedTabla, setSelectedTabla] = useState(null);
  const [selectedTaco, setSelectedTaco] = useState(null);
  const [preview, setPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  // Fetch tablas y tacos
  useEffect(() => {
    api.get("/tipotablas/listar")
      .then(({ data }) => setTablas(data))
      .catch(() => console.error("❌ Error cargando tipo_tablas"));

    api.get("/tipotacos/listar")
      .then(({ data }) => setTacos(data))
      .catch(() => console.error("❌ Error cargando tipo_tacos"));
  }, []);

  // Si estamos editando, cargar el patín existente
  useEffect(() => {
    if (!id) return;
    api.get(`/tipopatines/${id}`)
      .then(({ data }) => {
        setInputs({
          id_tipo_tabla: data.id_tipo_tabla.toString(),
          id_tipo_taco: data.id_tipo_taco.toString(),
          titulo: data.titulo || "",
          medidas: data.medidas || "",
          stock: data.stock?.toString() || "",
          comentarios: data.comentarios || ""
        });
        // setear seleccionados cuando existan listas
        const tabla = tablas.find(t => t.id_tipo_tabla === data.id_tipo_tabla);
        const taco  = tacos.find(t => t.id_tipo_taco  === data.id_tipo_taco);
        if (tabla) setSelectedTabla(tabla);
        if (taco)  setSelectedTaco(taco);

        if (data.logo) setPreview(`/images/tipo_patines/${encodeURIComponent(data.logo)}`);
      })
      .catch(() => {
        setErr("No se pudo cargar el tipo de patín.");
        setMessageType("error");
      });
  }, [id, tablas, tacos]);

  // Validación de campos
  const validate = () => {
    if (!inputs.id_tipo_tabla) return "Selecciona una tabla.";
    if (!inputs.id_tipo_taco) return "Selecciona un taco.";
    if (!inputs.titulo) return "El título es requerido.";
    if (!inputs.medidas) return "La medida es requerida.";
    if (isNaN(inputs.medidas) || +inputs.medidas <= 0) return "Medida inválida.";
    if (!inputs.stock || !Number.isInteger(+inputs.stock) || +inputs.stock < 0)
      return "Stock inválido.";
    return null;
  };

  // Handlers
  const handleChange = e => {
    const { name, value } = e.target;
    // numeric fields
    if (["medidas","stock"].includes(name)) {
      if (!/^[0-9]*\.?[0-9]*$/.test(value)) return;
    }
    if (name === "stock" && !/^\d*$/.test(value)) return;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleParentTabla = e => {
    const tabla = tablas.find(t => t.id_tipo_tabla.toString() === e.target.value);
    setInputs(prev => ({ ...prev, id_tipo_tabla: e.target.value }));
    setSelectedTabla(tabla || null);
  };

  const handleParentTaco = e => {
    const taco = tacos.find(t => t.id_tipo_taco.toString() === e.target.value);
    setInputs(prev => ({ ...prev, id_tipo_taco: e.target.value }));
    setSelectedTaco(taco || null);
  };

  const handleLogoChange = e => {
    const f = e.target.files[0];
    if (!f) return;
    setLogoFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearLogo = () => {
    setLogoFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Control de stock disponible (usar mismas constantes)
  const stockMax = selectedTabla && selectedTaco
    ? Math.min(
        Math.floor((selectedTabla.stock ?? 0) / TABLES_PER_PATIN),
        Math.floor((selectedTaco.stock  ?? 0) / TACOS_PER_PATIN)
      )
    : 0;

  // Preview de precio calculado (solo visual)
  const precioPreview = (selectedTabla && selectedTaco)
    ? (
        (Number(selectedTabla?.precio_unidad || 0) * TABLES_PER_PATIN) +
        (Number(selectedTaco?.precio_unidad  || 0) * TACOS_PER_PATIN)
      ).toFixed(2)
    : null;

  // Enviar datos
  const handleSubmit = async e => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setErr(v);
      setMessageType("error");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("id_tipo_tabla", inputs.id_tipo_tabla);
      fd.append("id_tipo_taco", inputs.id_tipo_taco);
      fd.append("titulo", inputs.titulo);
      fd.append("medidas", inputs.medidas);
      // precio_unidad NO se envía: lo calcula el backend
      fd.append("stock", inputs.stock);
      fd.append("comentarios", inputs.comentarios);
      if (logoFile) fd.append("logo", logoFile);

      if (id) {
        await api.put(`/tipopatines/${id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setErr("Tipo de patín actualizado.");
      } else {
        await api.post("/tipopatines/agregar", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setErr("Tipo de patín creado.");
      }
      setMessageType("success");
      setTimeout(() => navigate("/tipopatines/listar"), 600);
    } catch (error) {
      // Muestra el error de la respuesta del servidor
      let mensaje = "Error al guardar.";
      if (error.response && error.response.data) {
        if (typeof error.response.data === "string") {
          mensaje = error.response.data;
        } else if (error.response.data.error) {
          mensaje = error.response.data.error;
        } else if (error.response.data.message) {
          mensaje = error.response.data.message;
        }
      }
      setErr(mensaje);
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
        <Link to="/tipopatines/listar" className="block mb-6 text-2xl font-semibold text-neutral-800 text-center">
          Imanod Control de Stock
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Tipo de Patín" : "Nuevo Tipo de Patín"}
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Selección tabla */}
          <div>
            <label className="block mb-1 text-sm font-medium">Tabla utilizada</label>
            <select value={inputs.id_tipo_tabla} onChange={handleParentTabla} className="w-full p-2 border rounded">
              <option value="" disabled>Selecciona tabla</option>
              {tablas.map(t => (
                <option key={t.id_tipo_tabla} value={t.id_tipo_tabla}>
                  {t.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Selección taco */}
          <div>
            <label className="block mb-1 text-sm font-medium">Taco utilizado</label>
            <select value={inputs.id_tipo_taco} onChange={handleParentTaco} className="w-full p-2 border rounded">
              <option value="" disabled>Selecciona taco</option>
              {tacos.map(tc => (
                <option key={tc.id_tipo_taco} value={tc.id_tipo_taco}>
                  {tc.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Información de stock */}
          {selectedTabla && selectedTaco && (
            <div className="text-sm text-gray-700">
              <p><strong>Stock Tabla:</strong> {selectedTabla.stock}</p>
              <p><strong>Stock Tacos:</strong> {selectedTaco.stock}</p>
              <p><strong>Máximo patines posible:</strong> {stockMax}</p>
            </div>
          )}

          {/* Precio calculado automáticamente (solo visual) */}
          {currentUser?.tipo === "admin" && (
          <div className="text-sm text-gray-700">
            <p>
              <strong>Precio calculado (auto): </strong>
              {precioPreview !== null ? `$ ${precioPreview}` : "—"}
            </p>
            <p className="text-xs text-gray-500">
              Se calcula como: precio tabla × {TABLES_PER_PATIN} + precio taco × {TACOS_PER_PATIN}.
            </p>
          </div>
          )}

          {/* Otros campos */}
          <input
            name="titulo"
            value={inputs.titulo}
            onChange={handleChange}
            placeholder="Título"
            className="w-full p-2 border rounded"
          />
          <input
            name="medidas"
            value={inputs.medidas}
            onChange={handleChange}
            placeholder="Medidas"
            className="w-full p-2 border rounded"
          />
          <input
            name="stock"
            value={inputs.stock}
            onChange={handleChange}
            placeholder="Stock"
            className="w-full p-2 border rounded"
          />
          <textarea
            name="comentarios"
            value={inputs.comentarios}
            onChange={handleChange}
            placeholder="Comentarios"
            className="w-full p-2 border rounded"
          />

          {/* Logo */}
          <div>
            <label>Logo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="w-full p-2 border rounded"
            />
            {preview && (
              <div className="relative mt-2">
                <img src={preview} alt="Preview" className="w-full rounded" />
                <button
                  type="button"
                  onClick={clearLogo}
                  className="absolute top-1 right-1 bg-gray-800 text-white rounded-full px-2"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Mensaje */}
          {err && (
            <p className={messageType === "error" ? "text-red-500" : "text-green-500"}>
              {err}
            </p>
          )}

          {/* Botón */}
          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {id ? "Guardar Cambios" : "Crear Tipo de Patín"}
          </button>
          <p className="mt-4 text-center text-sm">
            <Link to="/tipopatines/listar" className="underline">
              Volver al listado
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default TipoPatinesForm;
