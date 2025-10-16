import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import ventasBackground from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";

const VentasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    fecha_realizada: "",
    precio_total: "",
    id_cliente: "",
    comentarios: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [clientes, setClientes] = useState([]);
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) return;
    api
      .get("/clientes/select")
      .then(({ data }) => setClientes(data))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/ventas/${id}`);
        const fechaFormateada = data.fecha_realizada
          ? new Date(data.fecha_realizada).toISOString().split("T")[0]
          : "";
        setInputs({
          fecha_realizada: fechaFormateada,
          precio_total: data.precio_total?.toString() || "",
          id_cliente: data.id_cliente?.toString() || "",
          comentarios: data.comentarios || "",
        });
        if (data.foto_url) {
          setPreview(data.foto_url);
        } else if (data.foto) {
          setPreview(`/images/ventas/${encodeURIComponent(data.foto)}`);
        }
        if (data.id_cliente) {
          const respClientes = await api.get(
            `/clientes/select?incluir_id=${data.id_cliente}`
          );
          setClientes(respClientes.data);
        } else {
          const respClientes = await api.get("/clientes/select");
          setClientes(respClientes.data);
        }
      } catch (e) {
        setErr("No se pudo cargar la venta.");
        setMessageType("error");
      }
    };
    fetchData();
  }, [id]);

  const validateInputs = () => {
    if (!inputs.fecha_realizada) return "La fecha de la venta es obligatoria.";
    if (!inputs.precio_total) return "El precio total es obligatorio.";
    if (isNaN(inputs.precio_total) || Number(inputs.precio_total) <= 0)
      return "Ingresa un precio válido.";
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "precio_total" && !/^[0-9]*\.?[0-9]*$/.test(value)) return;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handlePrecioKeyDown = (e) => {
    if (["e", "E", "+", "-", ","].includes(e.key)) e.preventDefault();
  };

  const handlePrecioPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/[^0-9.]/g, "");
    setInputs((prev) => ({ ...prev, precio_total: pasted }));
  };

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
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
      formData.append("fecha_realizada", inputs.fecha_realizada);
      formData.append("precio_total", inputs.precio_total);
      formData.append("id_cliente", inputs.id_cliente || "");
      formData.append("comentarios", inputs.comentarios || "");
      if (fotoFile) formData.append("foto", fotoFile);

      if (id) {
        await api.put(`/ventas/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Venta actualizada correctamente.");
      } else {
        await api.post("/ventas/agregar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setErr("Venta creada exitosamente.");
      }
      setMessageType("success");
      setInputs(initialInputs);
      clearImage();
      setTimeout(() => navigate("/ventas/listar"), 800);
    } catch (error) {
      let msg = "Error al guardar la venta.";
      if (error.response) {
        const payload = error.response.data;
        msg =
          typeof payload === "string"
            ? payload
            : payload.error || payload.message || msg;
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
        style={{ backgroundImage: `url(${ventasBackground})` }}
      />
      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link
          to="/ventas/listar"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod Control de Ventas
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Venta" : "Nueva Venta"}
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
                htmlFor="fecha_realizada"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
                Fecha Realizada
              </label>
              <input
                type="date"
                name="fecha_realizada"
                id="fecha_realizada"
                value={inputs.fecha_realizada}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="precio_total"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
                Precio Total
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="precio_total"
                id="precio_total"
                value={inputs.precio_total}
                onChange={handleChange}
                onKeyDown={handlePrecioKeyDown}
                onPaste={handlePrecioPaste}
                placeholder="Ej: 250.00"
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="id_cliente"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
                Cliente
              </label>
              <select
                name="id_cliente"
                id="id_cliente"
                value={inputs.id_cliente}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="">Selecciona un cliente (opcional)</option>
                {clientes.map((c) => (
                  <option key={c.id_cliente} value={String(c.id_cliente)}>
                    {c.eliminado ? `[ ELIMINADO ] ${c.display}` : c.display}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="foto"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
                Comprobante / Foto
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                name="foto"
                id="foto"
                onChange={handleFotoChange}
                className="w-full p-2 border rounded"
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
                className="w-full p-2 border rounded"
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
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {id ? (submitting ? "Actualizando..." : "Guardar Cambios") : submitting ? "Agregando..." : "Crear Venta"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/ventas/listar" className="font-medium underline">
              Volver al listado de ventas
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default VentasForm;
