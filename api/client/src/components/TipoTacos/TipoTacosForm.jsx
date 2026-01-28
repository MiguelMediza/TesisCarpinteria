import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../api";
import tablasBackground from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";
const TipoTacosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    id_materia_prima: "",
    titulo: "",
    largo_cm: "",
    ancho_cm: "",
    espesor_mm: "",
    stock: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [palos, setPalos] = useState([]);
  const [selectedPalo, setSelectedPalo] = useState(null);
  const [paloPreview, setPaloPreview] = useState(null);

  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [hadServerFoto, setHadServerFoto] = useState(false);
  const [borrarFoto, setBorrarFoto] = useState(false);

  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/palos/listar")
      .then(({ data }) => setPalos(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id || palos.length === 0) return;
    api
      .get(`/tipotacos/${id}`)
      .then(({ data }) => {
        setInputs({
          id_materia_prima: data.id_materia_prima.toString(),
          titulo: data.titulo || "",
          largo_cm: data.largo_cm?.toString() || "",
          ancho_cm: data.ancho_cm?.toString() || "",
          espesor_mm: data.espesor_mm?.toString() || "",
          stock: data.stock?.toString() || "",
        });

        const parent = palos.find(
          (p) => p.id_materia_prima === data.id_materia_prima
        );
        if (parent) {
          setSelectedPalo(parent);
          const parentImg =
            parent.foto_url ||
            (typeof parent.foto === "string" &&
            /^https?:\/\//.test(parent.foto)
              ? parent.foto
              : null);
          setPaloPreview(parentImg || null);
        }

        const ownImg =
          data.foto_url ||
          (typeof data.foto === "string" && /^https?:\/\//.test(data.foto)
            ? data.foto
            : null);

        if (ownImg) {
          setPreview(ownImg);
          setHadServerFoto(true);
          setBorrarFoto(false);
        } else {
          setPreview(null);
          setHadServerFoto(false);
          setBorrarFoto(false);
        }
      })
      .catch(() => {
        setErr("No se pudo cargar el tipo de taco.");
        setMessageType("error");
      });
  }, [id, palos]);

  const validate = () => {
    if (!inputs.id_materia_prima) return "Selecciona un tirante padre.";
    if (!inputs.titulo) return "El título es requerido.";
    if (!inputs.largo_cm || isNaN(inputs.largo_cm) || +inputs.largo_cm <= 0)
      return "Largo inválido.";
    if (!inputs.ancho_cm || isNaN(inputs.ancho_cm) || +inputs.ancho_cm <= 0)
      return "Ancho inválido.";
    if (
      !inputs.espesor_mm ||
      isNaN(inputs.espesor_mm) ||
      +inputs.espesor_mm <= 0
    )
      return "Espesor inválido.";
    if (!inputs.stock || !Number.isInteger(+inputs.stock) || +inputs.stock < 0)
      return "Stock inválido.";
    return null;
  };

  const handleParentChange = (e) => {
    const pid = e.target.value;
    setInputs((prev) => ({ ...prev, id_materia_prima: pid }));
    const parent = palos.find((p) => p.id_materia_prima.toString() === pid);
    setSelectedPalo(parent || null);
    const parentImg =
      parent?.foto_url ||
      (parent?.foto && /^https?:\/\//.test(parent.foto)
        ? parent.foto
        : null);
    setPaloPreview(parentImg || null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["largo_cm", "ancho_cm", "espesor_mm"].includes(name)) {
      if (!/^[0-9]*\.?[0-9]*$/.test(value)) return;
    }
    if (name === "stock" && !/^\d*$/.test(value)) return;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleFotoChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFotoFile(f);
    setPreview(URL.createObjectURL(f));
    // Si el usuario sube una nueva foto, ya no estamos "borrando" la del server
    setBorrarFoto(false);
  };

  const clearImage = () => {
    setFotoFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Si estamos editando y originalmente había foto en el server,
    // marcamos que queremos borrarla
    if (id && hadServerFoto) {
      setBorrarFoto(true);
    } else {
      setBorrarFoto(false);
    }
  };

  const MARGIN = 0.5;
  const piecesPerPalo =
    selectedPalo && inputs.largo_cm
      ? Math.floor(
          (Number(selectedPalo.largo_cm || 0) + MARGIN) /
            (parseFloat(inputs.largo_cm) + MARGIN)
        )
      : 0;
  const totalPossible = piecesPerPalo * (selectedPalo?.stock ?? 0);

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
      fd.append("stock", inputs.stock);

      if (fotoFile) {
        fd.append("foto", fotoFile);
      } else if (id && borrarFoto) {
        // Marca explícita para que el backend borre la foto
        fd.append("borrar_foto", "1");
      }

      if (id) {
        await api.put(`/tipotacos/${id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Tipo de taco actualizado.");
      } else {
        await api.post("/tipotacos/agregar", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Tipo de taco creado.");
      }
      setMessageType("success");
      setTimeout(() => navigate("/tipotacos/listar"), 500);
    } catch (error) {
      let m = "Error al guardar.";
      if (error.response) {
        const p = error.response.data;
        if (error.response.status === 409 && p?.code === "STOCK_INSUFICIENTE") {
          const d = p.detalles || {};
          const req = d.requerido_adicional ?? "?";
          const disp = d.disponible ?? "?";
          m = `Stock insuficiente: requiere ${req} tirante(s) adicionales (disponible ${disp}).`;
        } else {
          m = typeof p === "string" ? p : p.message || m;
        }
      }
      setErr(m);
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
          to="/tipotacos"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod Control de Stock
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Tipo de Taco" : "Nuevo Tipo de Taco"}
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
                De Tirante
              </label>
              <select
                id="id_materia_prima"
                value={inputs.id_materia_prima}
                onChange={handleParentChange}
                className="w-full p-2 border rounded"
              >
                <option value="" disabled>
                  Selecciona tirante
                </option>
                {palos.map((p) => (
                  <option key={p.id_materia_prima} value={p.id_materia_prima}>
                    {p.titulo}
                  </option>
                ))}
              </select>
              {selectedPalo && (
                <div className="mt-2 flex items-start space-x-4">
                  {paloPreview && (
                    <img
                      src={paloPreview}
                      alt={selectedPalo.titulo}
                      className="w-24 h-16 object-cover rounded border"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  <div className="text-sm text-gray-700">
                    <p>
                      <strong>Stock actual:</strong> {selectedPalo.stock}
                    </p>
                    <p>
                      <strong>Piezas por tirante:</strong> {piecesPerPalo}
                    </p>
                    <p>
                      <strong>Total posible:</strong> {totalPossible}
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
                placeholder="Ej: Taco largo"
                className="w-full p-2 border rounded"
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
                id="largo_cm"
                name="largo_cm"
                value={inputs.largo_cm}
                onChange={handleChange}
                placeholder="Ej: 10"
                inputMode="decimal"
                className="w-full p-2 border rounded"
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
                id="ancho_cm"
                name="ancho_cm"
                value={inputs.ancho_cm}
                onChange={handleChange}
                placeholder="Ej: 5"
                inputMode="decimal"
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="espesor_mm"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
                Espesor (cm)
              </label>
              <input
                id="espesor_mm"
                name="espesor_mm"
                value={inputs.espesor_mm}
                onChange={handleChange}
                placeholder="Ej: 25"
                inputMode="decimal"
                className="w-full p-2 border rounded"
              />
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
                className="w-full p-2 rounded border"
              />
              {preview && (
                <div className="relative mt-2">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-auto rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
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
              : "Crear Tipo de Taco"}
          </button>

          <p className="mt-4 text-center text-sm">
            <Link to="/tipotacos/listar" className="underline">
              Volver al listado
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default TipoTacosForm;
