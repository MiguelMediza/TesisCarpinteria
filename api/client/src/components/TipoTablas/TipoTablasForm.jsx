import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../api";
import tablasBackground from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";

const MARGIN = 0.5;

const TipoTablasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    id_materia_prima: "",
    titulo: "",
    largo_cm: "",
    ancho_cm: "",
    espesor_mm: "",
    piezas_por_tabla: "", // ⭐ NUEVO
    cepillada: "",
    stock: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [tablas, setTablas] = useState([]);
  const [tablaPreview, setTablaPreview] = useState(null);
  const [selectedTabla, setSelectedTabla] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [hadServerFoto, setHadServerFoto] = useState(false);
  const [borrarFoto, setBorrarFoto] = useState(false);
  const [piezasTouched, setPiezasTouched] = useState(false); 
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/tablas/listar")
      .then(({ data }) => setTablas(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    if (tablas.length === 0) return;
    api
      .get(`/tipotablas/${id}`)
      .then(({ data }) => {
        setInputs({
          id_materia_prima: data.id_materia_prima?.toString() || "",
          titulo: data.titulo || "",
          largo_cm: data.largo_cm?.toString() || "",
          ancho_cm: data.ancho_cm?.toString() || "",
          espesor_mm: data.espesor_mm?.toString() || "",
          piezas_por_tabla: data.piezas_por_tabla?.toString() || "", 
          cepillada: data.cepillada ? "1" : "0",
          stock: data.stock?.toString() || "",
        });
        const parent = tablas.find(
          (t) => t.id_materia_prima === data.id_materia_prima
        );
        if (parent) {
          setSelectedTabla(parent);
          setTablaPreview(parent.foto_url || parent.foto || null);
        }
        if (data.foto_url) {
          setPreview(data.foto_url);
          setHadServerFoto(true);
          setBorrarFoto(false);
        } else {
          setPreview(null);
          setHadServerFoto(false);
          setBorrarFoto(false);
        }
        setPiezasTouched(true); 
      })
      .catch(() => {
        setErr("No se pudo cargar el tipo de tabla.");
        setMessageType("error");
      });
  }, [id, tablas]);

  const validate = () => {
    if (!inputs.id_materia_prima) return "Selecciona una tabla padre.";
    if (!inputs.titulo) return "El título es requerido.";
    if (!inputs.largo_cm) return "El largo es requerido.";
    if (isNaN(inputs.largo_cm) || +inputs.largo_cm <= 0) return "Largo inválido.";
    if (!inputs.ancho_cm) return "El ancho es requerido.";
    if (isNaN(inputs.ancho_cm) || +inputs.ancho_cm <= 0) return "Ancho inválido.";
    if (!inputs.espesor_mm) return "El espesor es requerido.";
    if (isNaN(inputs.espesor_mm) || +inputs.espesor_mm <= 0) return "Espesor inválido.";
    if (!inputs.cepillada) return "Selecciona cepillada si/no.";
    if (!inputs.stock) return "El stock es requerido.";
    if (!Number.isInteger(+inputs.stock) || +inputs.stock < 0) return "Stock inválido.";

    if (inputs.piezas_por_tabla) {
      const pz = parseInt(inputs.piezas_por_tabla, 10);
      if (!Number.isInteger(pz) || pz <= 0) {
        return "Piezas por tabla inválidas.";
      }
    }

    // Validar que realmente se pueda sacar al menos 1 pieza
    const parentLargo = selectedTabla ? Number(selectedTabla.largo_cm || 0) : 0;
    const childLargo = parseFloat(inputs.largo_cm);
    const autoPieces =
      parentLargo && childLargo
        ? Math.floor((parentLargo + MARGIN) / (childLargo + MARGIN))
        : 0;

    const manualPz = inputs.piezas_por_tabla
      ? parseInt(inputs.piezas_por_tabla, 10)
      : NaN;
    const effectivePieces =
      Number.isInteger(manualPz) && manualPz > 0 ? manualPz : autoPieces;

    if (effectivePieces <= 0) {
      return "No se pueden obtener piezas desde la tabla padre con el largo/piezas configurados.";
    }

    return null;
  };

  const handleParentChange = (e) => {
    const idp = e.target.value;
    setInputs((prev) => ({ ...prev, id_materia_prima: idp }));
    const parent = tablas.find((t) => t.id_materia_prima.toString() === idp);
    setSelectedTabla(parent || null);
    setTablaPreview(parent?.foto_url || parent?.foto || null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (["largo_cm", "ancho_cm", "espesor_mm"].includes(name)) {
      if (!/^[0-9]*\.?[0-9]*$/.test(value)) return;
    }
    if (name === "stock" && !/^\d*$/.test(value)) return;

    if (name === "piezas_por_tabla") {
      if (!/^\d*$/.test(value)) return;
      setPiezasTouched(true);
    }

    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleFotoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFotoFile(f);
    setPreview(URL.createObjectURL(f));
    setBorrarFoto(false);
  };

  const clearImage = () => {
    setFotoFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (id && hadServerFoto) {
      setBorrarFoto(true);
    } else {
      setBorrarFoto(false);
    }
  };

  // cálculo automático según largo padre/hijo
  const autoPieces =
    selectedTabla && inputs.largo_cm
      ? Math.floor(
          (Number(selectedTabla?.largo_cm || 0) + MARGIN) /
            (parseFloat(inputs.largo_cm) + MARGIN)
        )
      : 0;

  // autocompletar en ALTA si el usuario aún no tocó el campo
  useEffect(() => {
    if (!id && !piezasTouched) {
      setInputs((prev) => ({
        ...prev,
        piezas_por_tabla:
          autoPieces > 0 ? String(autoPieces) : "",
      }));
    }
  }, [autoPieces, id, piezasTouched]);

  const manualPz = inputs.piezas_por_tabla
    ? parseInt(inputs.piezas_por_tabla, 10)
    : NaN;
  const effectivePieces =
    Number.isInteger(manualPz) && manualPz > 0 ? manualPz : autoPieces;

  const totalPossible =
    effectivePieces * (selectedTabla?.stock ?? 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const v = validate();
    if (v) {
      setErr(v);
      setMessageType("error");
      return;
    }
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("id_materia_prima", inputs.id_materia_prima);
      fd.append("titulo", inputs.titulo);
      fd.append("largo_cm", inputs.largo_cm);
      fd.append("ancho_cm", inputs.ancho_cm);
      fd.append("espesor_mm", inputs.espesor_mm);
      fd.append("piezas_por_tabla", inputs.piezas_por_tabla || ""); // ⭐ NUEVO
      fd.append("cepillada", inputs.cepillada);
      fd.append("stock", inputs.stock);
      if (fotoFile) {
        fd.append("foto", fotoFile);
      } else if (id && borrarFoto) {
        fd.append("borrar_foto", "1");
      }
      if (id) {
        await api.put(`/tipotablas/${id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Tipo de tabla actualizado.");
      } else {
        await api.post("/tipotablas/agregar", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Tipo de tabla creado.");
      }
      setMessageType("success");
      setTimeout(() => navigate("/tipotablas/listar"), 500);
    } catch (error) {
      let mensaje = "Error al guardar.";
      if (error.response && error.response.data) {
        if (typeof error.response.data === "string") {
          mensaje = error.response.data;
        } else if (error.response.data.error) {
          mensaje = error.response.data.error;
        } else if (error.response.data.message) {
          mensaje = error.response.data.message;
        }
        if (error.response.status === 409 && error.response.data.detalles) {
          const d = error.response.data.detalles;
          mensaje += ` (Requiere +${d.requerido_adicional}, disponible ${d.disponible})`;
        }
      }
      setErr(mensaje);
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
          to="/tipotablas"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod Control de Stock
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Tipo de Tabla" : "Nuevo Tipo de Tabla"}
        </h1>

        <form
          className="space-y-4"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          aria-busy={submitting}
        >
          <fieldset disabled={submitting} className="space-y-4">
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
                    <p>
                      <strong>Piezas por tabla (sugeridas):</strong>{" "}
                      {autoPieces || 0}
                    </p>
                    <p>
                      <strong>Total posible (según piezas usadas):</strong>{" "}
                      {totalPossible}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="titulo"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
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

            {["largo_cm", "ancho_cm", "espesor_mm"].map((k) => (
              <div key={k}>
                <label
                  htmlFor={k}
                  className="block mb-1 text-sm font-medium text-neutral-800"
                >
                  {k === "largo_cm"
                    ? "Largo (cm)"
                    : k === "ancho_cm"
                    ? "Ancho (cm)"
                    : "Espesor (mm)"}
                </label>
                <input
                  id={k}
                  name={k}
                  value={inputs[k]}
                  onChange={handleChange}
                  placeholder="0"
                  inputMode="decimal"
                  className="w-full p-2 border rounded"
                />
              </div>
            ))}

            <div>
              <label
                htmlFor="piezas_por_tabla"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
                Piezas por tabla (unidades que salen del padre)
              </label>
              <input
                id="piezas_por_tabla"
                name="piezas_por_tabla"
                value={inputs.piezas_por_tabla}
                onChange={handleChange}
                placeholder={autoPieces > 0 ? String(autoPieces) : "Ej: 5"}
                inputMode="numeric"
                pattern="\d*"
                className="w-full p-2 border rounded"
              />
              <p className="mt-1 text-xs text-neutral-700">
                Sugerido según medidas: {autoPieces || 0} piezas. Podés
                ajustarlo manualmente si en la práctica se corta distinto.
              </p>
            </div>

            <div>
              <label
                htmlFor="cepillada"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
                Cepillada
              </label>
              <select
                id="cepillada"
                name="cepillada"
                value={inputs.cepillada}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="" disabled>
                  Selecciona una opción
                </option>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="stock"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
                Stock
              </label>
              <input
                id="stock"
                name="stock"
                value={inputs.stock}
                onChange={handleChange}
                placeholder="0"
                inputMode="numeric"
                pattern="\d*"
                max={totalPossible > 0 ? totalPossible : undefined}
                className="w-full p-2 border rounded"
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
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
            {id
              ? submitting
                ? "Actualizando..."
                : "Guardar Cambios"
              : submitting
              ? "Agregando..."
              : "Crear Tipo de Tabla"}
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
