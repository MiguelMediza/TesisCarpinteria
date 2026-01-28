import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import encargosBackground from "../../assets/tablasBackground.jpg";
import { api } from "../../api";
import Alert from "../Modals/Alert";

const EncargosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    fecha_realizado: "",
    fecha_prevista_llegada: "",
    comentarios: "",
  });

  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [detalles, setDetalles] = useState([{ id_materia_prima: "", cantidad: "" }]);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const formatDate = (isoString) => {
    if (!isoString) return "";
    return String(isoString).split("T")[0];
  };

  const toIntOrNull = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s) return null;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };

  const getApiMsg = (e) => {
    const m =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      (typeof e?.response?.data === "string" ? e.response.data : null) ||
      e?.message;
    return m || "Error al guardar el encargo.";
  };

  // cargar materias primas
  useEffect(() => {
    api
      .get("/encargos/primas")
      .then(({ data }) => setMateriasPrimas(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // cargar encargo si edita
  useEffect(() => {
    if (!id) return;

    api
      .get(`/encargos/${id}`)
      .then(({ data }) => {
        setInputs({
          fecha_realizado: formatDate(data?.fecha_realizado),
          fecha_prevista_llegada: formatDate(data?.fecha_prevista_llegada),
          comentarios: data?.comentarios || "",
        });

        const detalleConvertido = (data?.detalles || []).map((d) => ({
          id_materia_prima: d?.id_materia_prima?.toString() || "",
          cantidad: d?.cantidad?.toString() || "",
        }));

        setDetalles(detalleConvertido.length ? detalleConvertido : [{ id_materia_prima: "", cantidad: "" }]);
      })
      .catch(() => {
        setErr("No se pudo cargar el encargo.");
        setMessageType("error");
      });
  }, [id]);

  // ids seleccionados (para bloquear duplicados en el select)
  const selectedIds = useMemo(() => {
    return detalles
      .map((d) => toIntOrNull(d.id_materia_prima))
      .filter((x) => Number.isInteger(x) && x > 0);
  }, [detalles]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setInputs((prev) => {
      const next = { ...prev, [name]: value };

      // si se cambia fecha_realizado y la prevista ya no cumple, la limpiamos
      if (name === "fecha_realizado" && next.fecha_prevista_llegada) {
        const fReal = new Date(value);
        const fPrev = new Date(next.fecha_prevista_llegada);
        if (Number.isFinite(fReal.getTime()) && Number.isFinite(fPrev.getTime()) && fPrev <= fReal) {
          next.fecha_prevista_llegada = "";
        }
      }

      return next;
    });
  };

  const handleDetalleChange = (index, field, value) => {
    setDetalles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const agregarDetalle = () => {
    setDetalles((prev) => [...prev, { id_materia_prima: "", cantidad: "" }]);
  };

  const quitarDetalle = (index) => {
    setDetalles((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const validar = () => {
    if (!inputs.fecha_realizado) return "La fecha de realización es obligatoria.";

    // ✅ fecha_prevista_llegada opcional:
    // Si querés obligatoria como antes, descomentá esta línea:
    // if (!inputs.fecha_prevista_llegada) return "La fecha prevista de llegada es obligatoria.";

    if (inputs.fecha_prevista_llegada) {
      const fReal = new Date(inputs.fecha_realizado);
      const fPrev = new Date(inputs.fecha_prevista_llegada);
      if (Number.isFinite(fReal.getTime()) && Number.isFinite(fPrev.getTime()) && fPrev <= fReal) {
        return "La fecha prevista de llegada debe ser mayor a la fecha realizada.";
      }
    }

    // validar filas + duplicados
    const seen = new Set();
    for (let i = 0; i < detalles.length; i++) {
      const d = detalles[i];

      const idMp = toIntOrNull(d.id_materia_prima);
      if (!idMp) return `Seleccione una materia prima en la fila ${i + 1}`;

      if (seen.has(idMp)) return `No puede repetir la misma materia prima (fila ${i + 1}).`;
      seen.add(idMp);

      const qty = toIntOrNull(d.cantidad);
      if (!qty || qty <= 0) return `Ingrese una cantidad válida en la fila ${i + 1}`;
    }

    return null;
  };

  // Consolida duplicados por seguridad (siempre manda limpio al backend)
  const buildMateriasPrimasPayload = () => {
    const map = new Map(); // id_materia_prima -> cantidad
    for (const d of detalles) {
      const idMp = toIntOrNull(d.id_materia_prima);
      const qty = toIntOrNull(d.cantidad);
      if (!idMp || !qty || qty <= 0) continue;
      map.set(idMp, (map.get(idMp) || 0) + qty);
    }

    return Array.from(map.entries()).map(([id_materia_prima, cantidad]) => ({
      id_materia_prima,
      cantidad,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const error = validar();
    if (error) {
      setErr(error);
      setMessageType("error");
      return;
    }

    const payload = {
      ...inputs,
      fecha_prevista_llegada: inputs.fecha_prevista_llegada || null, // ✅ opcional
      materias_primas: buildMateriasPrimasPayload(),
    };

    try {
      setSubmitting(true);

      if (id) {
        await api.put(`/encargos/${id}`, payload);
        setErr("Encargo actualizado correctamente.");
      } else {
        await api.post("/encargos/agregar", payload);
        setErr("Encargo creado exitosamente.");
      }

      setMessageType("success");
      setTimeout(() => navigate("/encargos/listar"), 800);
    } catch (e2) {
      setErr(getApiMsg(e2));
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50 overflow-x-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${encargosBackground})` }}
      />

      <div className="relative z-10 w-full sm:max-w-2xl mx-4 sm:mx-0 p-6 bg-white bg-opacity-80 rounded-lg shadow-md overflow-hidden">
        <h1 className="text-2xl font-bold text-center mb-4">
          {id ? "Editar Encargo" : "Nuevo Encargo"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={submitting}>
          <fieldset disabled={submitting} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Fecha realizada *</label>
              <input
                type="date"
                name="fecha_realizado"
                value={inputs.fecha_realizado}
                onChange={handleChange}
                className="w-full box-border p-2 border rounded bg-neutral-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Fecha prevista de llegada {/* (opcional) */}
              </label>
              <input
                type="date"
                name="fecha_prevista_llegada"
                value={inputs.fecha_prevista_llegada}
                onChange={handleChange}
                min={inputs.fecha_realizado || undefined}
                className="w-full box-border p-2 border rounded bg-neutral-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Comentarios</label>
              <textarea
                name="comentarios"
                value={inputs.comentarios}
                onChange={handleChange}
                className="w-full box-border p-2 border rounded bg-neutral-100"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Materias primas *</label>

              {detalles.map((detalle, index) => {
                const currentId = toIntOrNull(detalle.id_materia_prima);

                return (
                  <div key={`${detalle.id_materia_prima || "mp"}-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <select
                      value={detalle.id_materia_prima}
                      onChange={(e) => handleDetalleChange(index, "id_materia_prima", e.target.value)}
                      className="w-full sm:flex-1 sm:min-w-0 box-border p-2 border rounded bg-neutral-100"
                    >
                      <option value="">Materia prima</option>
                      {materiasPrimas.map((mp) => {
                        const mpId = Number(mp.id_materia_prima);
                        const alreadySelected = selectedIds.includes(mpId) && mpId !== currentId;

                        return (
                          <option key={mp.id_materia_prima} value={mp.id_materia_prima} disabled={alreadySelected}>
                            {mp.titulo} ({mp.categoria}){alreadySelected ? " — ya seleccionada" : ""}
                          </option>
                        );
                      })}
                    </select>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={detalle.cantidad}
                        onChange={(e) => handleDetalleChange(index, "cantidad", e.target.value)}
                        placeholder="Cantidad"
                        className="w-full sm:w-28 box-border p-2 border rounded bg-neutral-100"
                      />

                      <button
                        type="button"
                        onClick={() => quitarDetalle(index)}
                        disabled={submitting || detalles.length === 1}
                        className="shrink-0 text-red-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Quitar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={agregarDetalle}
                disabled={submitting}
                className="mt-1 text-sm text-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Agregar materia prima
              </button>
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

            {id ? (submitting ? "Actualizando..." : "Guardar Cambios") : submitting ? "Agregando..." : "Crear Encargo"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/encargos/listar" className="font-medium underline">
              Volver al listado de encargos
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default EncargosForm;
