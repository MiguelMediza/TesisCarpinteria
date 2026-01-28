import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../../api";
import pedidosBg from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";

const ESTADOS_SELECT = ["pendiente", "en_produccion", "listo", "cancelado"];

const PedidosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    id_cliente: "",
    estado: "pendiente", // ✅ siempre pendiente
    fecha_realizado: "",
    fecha_de_entrega: "",
    comentarios: "",
  });

  const [clientes, setClientes] = useState([]);
  const [prototipos, setPrototipos] = useState([]);
  const [items, setItems] = useState([
    {
      id_prototipo: "",
      cantidad_pallets: "",
      numero_lote: "",
      numero_tratamiento: "",
      comentarios: "",
    },
  ]);

  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const formatDateFromISO = (iso) => (iso ? String(iso).split("T")[0] : "");

  const nextDayISO = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return "";
    const d = new Date(yyyy_mm_dd);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  useEffect(() => {
    (async () => {
      try {
        const [cliRes, protRes] = await Promise.all([
          api.get("/clientes/listar"),
          api.get("/prototipos/listar"),
        ]);
        setClientes(cliRes.data || []);
        setPrototipos(protRes.data || []);
      } catch (e) {
        console.error(e);
        setErr("No se pudieron cargar clientes/prototipos.");
        setMessageType("error");
      }
    })();
  }, []);

  // ✅ editar: cargamos pedido, PERO forzamos estado pendiente igual (y no permitimos cambiarlo)
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await api.get(`/pedidos/${id}`);

        setInputs({
          id_cliente: data.id_cliente?.toString() || "",
          estado: "pendiente", // ✅ fijo
          fecha_realizado: formatDateFromISO(data.fecha_realizado),
          fecha_de_entrega: formatDateFromISO(data.fecha_de_entrega),
          comentarios: data.comentarios || "",
        });

        const its = (data.items || []).map((x) => ({
          id_prototipo: x.id_prototipo?.toString() || "",
          cantidad_pallets: x.cantidad_pallets?.toString() || "",
          numero_lote: x.numero_lote || "",
          numero_tratamiento: x.numero_tratamiento || "",
          comentarios: x.comentarios || "",
        }));

        setItems(
          its.length
            ? its
            : [
                {
                  id_prototipo: "",
                  cantidad_pallets: "",
                  numero_lote: "",
                  numero_tratamiento: "",
                  comentarios: "",
                },
              ]
        );
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar el pedido.");
        setMessageType("error");
      }
    })();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ estado NO se toca
    if (name === "estado") return;

    setInputs((prev) => {
      const next = { ...prev, [name]: value };

      // si cambia fecha_realizado y ya había fecha_de_entrega, validamos que sea posterior
      if (name === "fecha_realizado" && next.fecha_de_entrega) {
        const fReal = new Date(value);
        const fEnt = new Date(next.fecha_de_entrega);
        if (fEnt <= fReal) next.fecha_de_entrega = "";
      }

      return next;
    });
  };

  const handleItemChange = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx] };

      if (field === "cantidad_pallets") {
        // solo dígitos
        item.cantidad_pallets = value.replace(/[^\d]/g, "");
      } else {
        item[field] = value;
      }

      next[idx] = item;
      return next;
    });
  };

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id_prototipo: "",
        cantidad_pallets: "",
        numero_lote: "",
        numero_tratamiento: "",
        comentarios: "",
      },
    ]);

  const delItem = (idx) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const validar = () => {
    if (!inputs.id_cliente) return "Debe seleccionar un cliente.";
    if (!inputs.fecha_realizado) return "La fecha de realizado es obligatoria.";

    // ✅ fecha_de_entrega NO obligatoria
    if (inputs.fecha_de_entrega) {
      const fReal = new Date(inputs.fecha_realizado);
      const fEnt = new Date(inputs.fecha_de_entrega);
      if (fEnt <= fReal) {
        return "La fecha de entrega debe ser estrictamente posterior a la fecha realizado.";
      }
    }

    const isValidQty = (v) => /^[1-9]\d*$/.test(String(v).trim());

    const validItems = items.filter((it) => it.id_prototipo && isValidQty(it.cantidad_pallets));
    if (validItems.length === 0) return "Debe agregar al menos un prototipo con cantidad > 0.";

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.id_prototipo) continue;

      if (!isValidQty(it.cantidad_pallets)) {
        return `Ingrese una cantidad válida (> 0) en la fila ${i + 1}.`;
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const v = validar();
    if (v) {
      setErr(v);
      setMessageType("error");
      return;
    }

    const payload = {
      ...inputs,

      // ✅ estado fijo SIEMPRE
      estado: "pendiente",

      id_cliente: inputs.id_cliente ? parseInt(inputs.id_cliente, 10) : null,

      // ✅ si fecha_de_entrega viene vacía, mandamos null
      fecha_de_entrega: inputs.fecha_de_entrega ? inputs.fecha_de_entrega : null,

      items: items
        .filter((it) => it.id_prototipo && it.cantidad_pallets)
        .map((it) => ({
          id_prototipo: parseInt(it.id_prototipo, 10),
          cantidad_pallets: parseInt(it.cantidad_pallets, 10),

          // ✅ ya NO se usa stock existente aquí
          cantidad_desde_stock: 0,

          numero_lote: it.numero_lote?.trim() || null,
          numero_tratamiento: it.numero_tratamiento?.trim() || null,
          comentarios: it.comentarios?.trim() || null,
        })),
    };

    try {
      setSubmitting(true);

      if (id) {
        await api.put(`/pedidos/${id}`, payload);
        setErr("Pedido actualizado correctamente.");
      } else {
        await api.post(`/pedidos/agregar`, payload);
        setErr("Pedido creado exitosamente.");
      }

      setMessageType("success");
      setTimeout(() => navigate("/pedidos/listar"), 800);
    } catch (e) {
      console.error(e);
      setErr("Error al guardar el pedido.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedIdsExcept = (idx) =>
    new Set(
      items
        .map((it, i) => (i !== idx ? String(it.id_prototipo || "") : ""))
        .filter(Boolean)
    );

  const remainingForNewItem = prototipos.filter((p) => {
    const chosen = new Set(items.map((it) => String(it.id_prototipo || "")).filter(Boolean));
    return !chosen.has(String(p.id_prototipo));
  }).length;

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${pedidosBg})` }}
      />

      <div className="relative z-10 w-full sm:max-w-2xl p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link
          to="/pedidos/listar"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod Pedidos
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Pedido" : "Nuevo Pedido"}
        </h1>

        <form className="space-y-5" onSubmit={handleSubmit} aria-busy={submitting}>
          <fieldset disabled={submitting} className="space-y-5">
            <div>
              <label className="block mb-1 text-sm font-medium">Cliente *</label>
              <select
                name="id_cliente"
                value={inputs.id_cliente}
                onChange={handleChange}
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.es_empresa ? c.nombre_empresa : `${c.nombre} ${c.apellido || ""}`}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Estado fijo pendiente (no editable) */}
            <div>
              <label className="block mb-1 text-sm font-medium">Estado</label>
              <select
                name="estado"
                value={"pendiente"}
                disabled
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-200 cursor-not-allowed"
                title="El estado se gestiona automáticamente por el flujo del sistema"
              >
                <option value="pendiente">pendiente</option>
              </select>

              <p className="text-xs text-neutral-600 mt-1">
                El estado inicia en <b>pendiente</b>. Luego se gestiona desde el flujo del sistema (producción/entregas).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm font-medium">Fecha realizado *</label>
                <input
                  type="date"
                  name="fecha_realizado"
                  value={inputs.fecha_realizado}
                  onChange={handleChange}
                  className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Fecha de entrega (opcional)</label>
                <input
                  type="date"
                  name="fecha_de_entrega"
                  value={inputs.fecha_de_entrega}
                  onChange={handleChange}
                  min={inputs.fecha_realizado ? nextDayISO(inputs.fecha_realizado) : undefined}
                  className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium">Comentarios</label>
              <textarea
                name="comentarios"
                value={inputs.comentarios}
                onChange={handleChange}
                rows={3}
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
                placeholder="Notas del pedido (opcional)"
              />
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Ítems del pedido *</p>

              {items.map((it, i) => {
                return (
                  <fieldset
                    key={`it-${i}`}
                    className="border border-neutral-200 rounded-md p-2 md:p-3 mb-2 bg-neutral-50/70"
                  >
                    <legend className="text-xs font-semibold text-neutral-600 px-1">Ítem #{i + 1}</legend>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
                      <select
                        aria-label={`Prototipo para ítem ${i + 1}`}
                        value={it.id_prototipo}
                        onChange={(e) => handleItemChange(i, "id_prototipo", e.target.value)}
                        className="md:col-span-5 p-2 border rounded bg-neutral-100"
                      >
                        <option value="">Seleccionar prototipo</option>
                        {prototipos.map((p) => {
                          const yaElegido = selectedIdsExcept(i).has(String(p.id_prototipo));
                          return (
                            <option key={p.id_prototipo} value={p.id_prototipo} disabled={yaElegido}>
                              {p.titulo}
                              {p.medidas ? ` (${p.medidas})` : ""}
                              {yaElegido ? " — (ya seleccionado)" : ""}
                            </option>
                          );
                        })}
                      </select>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Cantidad total"
                        aria-label={`Cantidad total de pallets para ítem ${i + 1}`}
                        value={it.cantidad_pallets}
                        onChange={(e) => handleItemChange(i, "cantidad_pallets", e.target.value)}
                        className="md:col-span-2 p-2 border rounded bg-neutral-100"
                      />

                      <input
                        type="text"
                        value={it.numero_lote}
                        onChange={(e) => handleItemChange(i, "numero_lote", e.target.value)}
                        placeholder="Lote (opcional)"
                        aria-label={`Número de lote para ítem ${i + 1}`}
                        className="md:col-span-2 p-2 border rounded bg-neutral-100"
                      />

                      <input
                        type="text"
                        value={it.numero_tratamiento}
                        onChange={(e) => handleItemChange(i, "numero_tratamiento", e.target.value)}
                        placeholder="Tratamiento (opcional)"
                        aria-label={`Número de tratamiento para ítem ${i + 1}`}
                        className="md:col-span-2 p-2 border rounded bg-neutral-100"
                      />

                      <button
                        type="button"
                        onClick={() => delItem(i)}
                        className="md:col-span-1 text-red-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Quitar línea"
                        disabled={submitting}
                        aria-label={`Quitar ítem ${i + 1}`}
                      >
                        🗑️
                      </button>
                    </div>

                    <input
                      type="text"
                      value={it.comentarios}
                      onChange={(e) => handleItemChange(i, "comentarios", e.target.value)}
                      placeholder="Comentarios del ítem (opcional)"
                      aria-label={`Comentarios del ítem ${i + 1}`}
                      className="mt-2 md:mt-3 md:col-span-12 w-full p-2 border rounded bg-neutral-100"
                    />
                  </fieldset>
                );
              })}

              <button
                type="button"
                onClick={addItem}
                className="mt-1 text-sm text-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={remainingForNewItem === 0 || submitting}
                title={remainingForNewItem === 0 ? "No quedan prototipos disponibles" : "Agregar ítem"}
              >
                + Agregar ítem
              </button>

              {remainingForNewItem === 0 && (
                <p className="text-xs text-gray-500 mt-1">No quedan prototipos disponibles para agregar.</p>
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
            {submitting ? (id ? "Actualizando..." : "Agregando...") : id ? "Guardar Cambios" : "Crear Pedido"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/pedidos/listar" className="font-medium underline">
              Volver al listado de pedidos
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default PedidosForm;
