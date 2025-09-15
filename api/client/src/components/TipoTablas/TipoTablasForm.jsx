import React, { useEffect, useState, useRef, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../../context/authContext";
import tablasBackground from "../../assets/tablasBackground.jpg";

const TipoTablasForm = () => {
  const { currentUser } = useContext(AuthContext);
  const { id } = useParams();           // id_tipo_tabla
  const navigate = useNavigate();
  const fileInputRef = useRef(null);


  const initialInputs = {
    id_materia_prima: "",
    titulo: "",
    largo_cm: "",
    ancho_cm: "",
    espesor_mm: "",
    precio_unidad: "",
    cepillada: "",
    stock: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [tablas, setTablas]   = useState([]);
  const [tablaPreview, setTablaPreview] = useState(null);
  const [selectedTabla, setSelectedTabla] = useState(null);
  const [fotoFile, setFotoFile]         = useState(null);
  const [preview, setPreview]           = useState(null);
  const [err, setErr]                   = useState("");
  const [messageType, setMessageType]   = useState("");

  // Load tablas for parent-select
  useEffect(() => {
    axios.get("http://localhost:4000/api/src/tablas/listar")
      .then(({ data }) => setTablas(data))
      .catch(() => {/* ignore */});
  }, []);

  // Load existing tipo_tabla on edit
  useEffect(() => {
    if (!id) return;
     // espera a tener ya la lista de tablas para poder buscar en ella:
    if (tablas.length === 0) return;
    axios.get(`http://localhost:4000/api/src/tipotablas/${id}`)
      .then(({ data }) => {
        setInputs({
          id_materia_prima: data.id_materia_prima.toString(),
          titulo:           data.titulo           || "",
          largo_cm:         data.largo_cm?.toString() || "",
          ancho_cm:         data.ancho_cm?.toString() || "",
          espesor_mm:       data.espesor_mm?.toString() || "",
          precio_unidad:    data.precio_unidad?.toString() || "",
          cepillada:        data.cepillada ? "1" : "0",
          stock:            data.stock?.toString()     || "",
        });
     // — aquí guardamos **todo** el objeto padre —
     const parent = tablas.find(
        (t) => t.id_materia_prima === data.id_materia_prima
     );
      if (parent) {
        setSelectedTabla(parent);
        // carga su imagen de fondo
        setTablaPreview(
          parent.foto
            ? `http://localhost:4000/images/tablas/${parent.foto}`
            : null
        );
      }
        // show own foto
        if (data.foto) {
          setPreview(`http://localhost:4000/images/tipo_tablas/${data.foto}`);
        }
      })
      .catch(() => {
        setErr("No se pudo cargar el tipo de tabla.");
        setMessageType("error");
      });
  }, [id, tablas]);

  const validate = () => {
    if (!inputs.id_materia_prima) return "Selecciona una tabla padre.";
    if (!inputs.titulo)           return "El título es requerido.";
    if (!inputs.largo_cm)         return "El largo es requerido.";
    if (isNaN(inputs.largo_cm) || +inputs.largo_cm <= 0) return "Largo inválido.";
    if (!inputs.ancho_cm)         return "El ancho es requerido.";
    if (isNaN(inputs.ancho_cm) || +inputs.ancho_cm <= 0) return "Ancho inválido.";
    if (!inputs.espesor_mm)       return "El espesor es requerido.";
    if (isNaN(inputs.espesor_mm) || +inputs.espesor_mm <= 0) return "Espesor inválido.";
    if (currentUser.tipo !== "encargado") {
      if (!inputs.precio_unidad) return "El precio unitario es requerido.";
      if (isNaN(inputs.precio_unidad) || +inputs.precio_unidad <= 0) return "Precio inválido.";
    }
    if (!inputs.cepillada)        return "Selecciona cepillada si/no.";
    if (!inputs.stock)            return "El stock es requerido.";
    if (!Number.isInteger(+inputs.stock) || +inputs.stock < 0) return "Stock inválido.";
    return null;
  };

  const handleParentChange = e => {
    const idp = e.target.value;
    setInputs(prev => ({ ...prev, id_materia_prima: idp }));
    const parent = tablas.find(t => t.id_materia_prima.toString() === idp);
    setSelectedTabla(parent);
    setTablaPreview(parent?.foto
      ? `http://localhost:4000/images/tablas/${parent.foto}`
      : null);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    // numeric fields
    if (["largo_cm","ancho_cm","espesor_mm","precio_unidad"].includes(name)) {
      if (!/^[0-9]*\.?[0-9]*$/.test(value)) return;
    }
    if (name === "stock" && !/^\d*$/.test(value)) return;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleFotoChange = e => {
    const f = e.target.files[0];
    if (!f) return;
    setFotoFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearImage = () => {
    setFotoFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
      fd.append("id_materia_prima", inputs.id_materia_prima);
      fd.append("titulo",           inputs.titulo);
      fd.append("largo_cm",         inputs.largo_cm);
      fd.append("ancho_cm",         inputs.ancho_cm);
      fd.append("espesor_mm",       inputs.espesor_mm);
      const precio = currentUser.tipo==="encargado" ? "0" : inputs.precio_unidad;
      fd.append("precio_unidad",    precio);
      fd.append("cepillada",        inputs.cepillada);
      fd.append("stock",            inputs.stock);
      if (fotoFile) fd.append("foto", fotoFile);

      if (id) {
        await axios.put(
          `http://localhost:4000/api/src/tipotablas/${id}`,
          fd,
          { headers: { "Content-Type":"multipart/form-data" } }
        );
        setErr("Tipo de tabla actualizado.");
      } else {
        await axios.post(
          "http://localhost:4000/api/src/tipotablas/agregar",
          fd,
          { headers: { "Content-Type":"multipart/form-data" } }
        );
        setErr("Tipo de tabla creado.");
      }
      setMessageType("success");
      setTimeout(() => navigate("/tipotablas/listar"), 500);
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

  // Margen por corte
const MARGIN = 0.5;

// Número de piezas de tipoTabla que caben en una sola tabla padre
const piecesPerTabla = selectedTabla && inputs.largo_cm
  ? Math.floor(
      (selectedTabla.largo_cm + MARGIN) /
      (parseFloat(inputs.largo_cm) + MARGIN)
    )
  : 0;

// Cantidad total posible = piezas por tabla * número de tablas disponibles
const totalPossible = piecesPerTabla * (selectedTabla?.stock ?? 0);


  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
           style={{ backgroundImage:`url(${tablasBackground})` }}/>
      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link to="/tipotablas" className="block mb-6 text-2xl font-semibold text-neutral-800 text-center">
          Imanod Control de Stock
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Tipo de Tabla" : "Nuevo Tipo de Tabla"}
        </h1>
        <form className="space-y-4" onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Parent tabla */}
        <div>
        <label
            htmlFor="id_materia_prima"
            className="block mb-1 text-sm font-medium text-neutral-800"
        >
            De tabla
        </label>
        <select
            id="id_materia_prima"
            value={inputs.id_materia_prima}
            onChange={handleParentChange}
            className="w-full p-2 border rounded"
        >
            <option value="" disabled>
            Selecciona tabla
            </option>
            {tablas.map((t) => (
            <option key={t.id_materia_prima} value={t.id_materia_prima}>
                {t.titulo}
            </option>
            ))}
        </select>

        {selectedTabla && (
            <div className="mt-2 flex items-start space-x-4">
            {tablaPreview && (
                <img
                src={tablaPreview}
                alt={selectedTabla.titulo}
                className="w-24 h-16 object-cover rounded border"
                />
            )}
            <div className="text-sm text-gray-700">
                <p>
                    <strong>Stock actual:</strong> {selectedTabla.stock}
                </p>
                {currentUser.tipo !== "encargado" && (
                <p>
                    <strong>Precio unidad:</strong> {selectedTabla.precio_unidad}
                </p>
                )}
                <p>
                    <strong>Piezas por tabla:</strong> {piecesPerTabla}
                </p>
                <p>
                    <strong>Total posible:</strong> {totalPossible}
                </p>
            </div>
            </div>
        )}
        </div>

          {/* Título */}
          <div>
            <label htmlFor="titulo" className="block mb-1 text-sm font-medium text-neutral-800">
              Título
            </label>
            <input
              id="titulo"
              name="titulo"
              value={inputs.titulo}
              onChange={handleChange}
              placeholder="Ej: 2x4 cepillada"
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Largo, Ancho, Espesor */}
          {["largo_cm","ancho_cm","espesor_mm"].map(k => (
            <div key={k}>
              <label htmlFor={k} className="block mb-1 text-sm font-medium text-neutral-800">
                {k.replace("_cm"," (cm)").replace("espesor_mm","Espesor (mm)")}
              </label>
              <input
                id={k}
                name={k}
                value={inputs[k]}
                onChange={handleChange}
                placeholder="0"
                className="w-full p-2 border rounded"
              />
            </div>
          ))}

          {/* Precio */}
          {currentUser.tipo !== "encargado" && (
            <div>
              <label htmlFor="precio_unidad" className="block mb-1 text-sm font-medium text-neutral-800">
                Precio Unitario
              </label>
              <input
                id="precio_unidad"
                name="precio_unidad"
                value={inputs.precio_unidad}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full p-2 border rounded"
              />
            </div>
          )}

          {/* Cepillada */}
          <div>
            <label htmlFor="cepillada" className="block mb-1 text-sm font-medium text-neutral-800">
              Cepillada
            </label>
            <select
              id="cepillada"
              name="cepillada"
              value={inputs.cepillada}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="" disabled>Selecciona una opción</option>
              <option value="1">Sí</option>
              <option value="0">No</option>
            </select>
          </div>

          {/* Stock */}
          <div>
            <label htmlFor="stock" className="block mb-1 text-sm font-medium text-neutral-800">
              Stock
            </label>
            <input
              id="stock"
              name="stock"
              value={inputs.stock}
              onChange={handleChange}
              placeholder="0"
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Foto */}
          <div>
            <label htmlFor="foto" className="block mb-1 text-sm font-medium text-neutral-800">Foto</label>
            <input
              ref={fileInputRef}
              type="file" accept="image/*"
              name="foto" id="foto"
              onChange={handleFotoChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
            {preview && (
              <div className="relative mt-2">
                <img src={preview} alt="Preview" className="w-full h-auto rounded" />
                <button
                  type="button" onClick={clearImage}
                  className="absolute top-1 right-1 bg-gray-800 bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75"
                >&times;</button>
              </div>
            )}
          </div>

          {/* Error / Success */}
          {err && (
            <p className={messageType==="error" ? "text-red-500" : "text-green-500"}>
              {err}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {id ? "Guardar Cambios" : "Crear Tipo de Tabla"}
          </button>

          <p className="mt-4 text-center text-sm">
            <Link to="/tipotablas/listar" className="underline">
              Volver al listado
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default TipoTablasForm;
