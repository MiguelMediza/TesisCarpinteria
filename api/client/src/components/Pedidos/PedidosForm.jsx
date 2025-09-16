import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../../api";
import pedidosBg from "../../assets/tablasBackground.jpg";

const ESTADOS = ["pendiente","en_produccion","listo","entregado","cancelado"];

const PedidosForm = () => {
  const { id } = useParams(); // id_pedido si se edita
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    id_cliente: "",
    estado: "pendiente",
    fecha_realizado: "",
    fecha_de_entrega: "",
    comentarios: ""
  });

  const [clientes, setClientes] = useState([]);
  const [prototipos, setPrototipos] = useState([]);
  const [items, setItems] = useState([
    { id_prototipo: "", cantidad_pallets: "", numero_lote: "", numero_tratamiento: "", comentarios: "" }
  ]);

  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  // Helpers
  const formatDateFromISO = (iso) => (iso ? iso.split("T")[0] : "");

  const nextDayISO = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return "";
    const d = new Date(yyyy_mm_dd);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  // Cargar combos
  useEffect(() => {
    (async () => {
      try {
        const [cliRes, protRes] = await Promise.all([
          api.get("/clientes/listar"),
          api.get("/prototipos/listar") 
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

  // Cargar pedido si edición
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await api.get(`/pedidos/${id}`);
        setInputs({
          id_cliente: data.id_cliente?.toString() || "",
          estado: data.estado || "pendiente",
          fecha_realizado: formatDateFromISO(data.fecha_realizado),
          fecha_de_entrega: formatDateFromISO(data.fecha_de_entrega),
          comentarios: data.comentarios || ""
        });

        const its = (data.items || []).map(x => ({
          id_prototipo: x.id_prototipo?.toString() || "",
          cantidad_pallets: x.cantidad_pallets?.toString() || "",
          numero_lote: x.numero_lote || "",
          numero_tratamiento: x.numero_tratamiento || "",
          comentarios: x.comentarios || ""
        }));
        setItems(its.length ? its : [{ id_prototipo:"", cantidad_pallets:"", numero_lote:"", numero_tratamiento:"", comentarios:"" }]);
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar el pedido.");
        setMessageType("error");
      }
    })();
  }, [id]);

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => {
      const next = { ...prev, [name]: value };
      // si cambian realizado y entrega ya existe, forzar que entrega sea posterior
      if (name === "fecha_realizado" && next.fecha_de_entrega) {
        const fReal = new Date(value);
        const fEnt  = new Date(next.fecha_de_entrega);
        if (fEnt <= fReal) next.fecha_de_entrega = ""; 
      }
      return next;
    });
  };

  const handleItemChange = (idx, field, value) => {
    setItems(prev => {
      const next = [...prev];  
      if (field === "cantidad_pallets") {
        const v = value.replace(/[^\d]/g, ""); 
        next[idx][field] = v;
      } else {
        next[idx][field] = value;
      }
      return next;
    });
  };

  const addItem = () =>
    setItems(prev => [...prev, { id_prototipo: "", cantidad_pallets: "", numero_lote: "", numero_tratamiento: "", comentarios: "" }]);

  const delItem = (idx) =>
    setItems(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  // Validación
  const validar = () => {
    if (!inputs.id_cliente) return "Debe seleccionar un cliente.";
    if (!inputs.fecha_realizado) return "La fecha de realizado es obligatoria.";
    if (!inputs.fecha_de_entrega) return "La fecha de entrega es obligatoria.";

    const fReal = new Date(inputs.fecha_realizado);
    const fEnt  = new Date(inputs.fecha_de_entrega);
    if (fEnt <= fReal) return "La fecha de entrega debe ser estrictamente posterior a la fecha realizado.";

    const isValidQty = (v) => /^[1-9]\d*$/.test(String(v).trim());
    const validItems = items.filter(it => it.id_prototipo && isValidQty(it.cantidad_pallets));
    if (validItems.length === 0) return "Debe agregar al menos un prototipo con cantidad > 0.";

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.id_prototipo && !isValidQty(it.cantidad_pallets)) {
        return `Ingrese una cantidad válida (> 0) en la fila ${i + 1}.`;
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validar();
    if (v) {
      setErr(v);
      setMessageType("error");
      return;
    }

    const payload = {
      ...inputs,
      id_cliente: inputs.id_cliente ? parseInt(inputs.id_cliente, 10) : null,
      // el backend calculará el precio_total
      items: items
        .filter(it => it.id_prototipo && it.cantidad_pallets)
        .map(it => ({
          id_prototipo: parseInt(it.id_prototipo, 10),
          cantidad_pallets: parseInt(it.cantidad_pallets, 10),
          numero_lote: it.numero_lote?.trim() || null,
          numero_tratamiento: it.numero_tratamiento?.trim() || null,
          comentarios: it.comentarios?.trim() || null
        }))
    };

    try {
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
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${pedidosBg})` }}
      />
      <div className="relative z-10 w-full sm:max-w-2xl p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link to="/pedidos/listar" className="block mb-6 text-2xl font-semibold text-neutral-800 text-center">
          Imanod Pedidos
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Pedido" : "Nuevo Pedido"}
        </h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Cliente */}
          <div>
            <label className="block mb-1 text-sm font-medium">Cliente *</label>
            <select
              name="id_cliente"
              value={inputs.id_cliente}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
            >
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.es_empresa ? c.nombre_empresa : `${c.nombre} ${c.apellido || ""}`}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block mb-1 text-sm font-medium">Estado</label>
            <select
              name="estado"
              value={inputs.estado}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
            >
              {ESTADOS.map(e => (
                <option key={e} value={e}>{e.replace("_"," ")}</option>
              ))}
            </select>
          </div>

          {/* Fechas */}
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
              <label className="block mb-1 text-sm font-medium">Fecha de entrega *</label>
              <input
                type="date"
                name="fecha_de_entrega"
                value={inputs.fecha_de_entrega}
                onChange={handleChange}
                // opcional: ayuda visual (mínimo día siguiente)
                min={inputs.fecha_realizado ? nextDayISO(inputs.fecha_realizado) : undefined}
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
              />
            </div>
          </div>

          {/* Comentarios */}
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

          {/* Ítems */}
          <div>
            <p className="text-sm font-semibold mb-2">Ítems del pedido *</p>
            {items.map((it, i) => (
              <div key={`it-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
                <select
                  value={it.id_prototipo}
                  onChange={(e) => handleItemChange(i, "id_prototipo", e.target.value)}
                  className="md:col-span-5 p-2 border rounded bg-neutral-100"
                >
                  <option value="">Seleccionar prototipo</option>
                  {prototipos.map(p => (
                    <option key={p.id_prototipo} value={p.id_prototipo}>
                      {p.titulo} {p.medidas ? `(${p.medidas})` : ""}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Cantidad"
                  value={it.cantidad_pallets}
                  onChange={(e) => handleItemChange(i, "cantidad_pallets", e.target.value)}
                  className="md:col-span-2 p-2 border rounded bg-neutral-100"
                />

                <input
                  type="text"
                  value={it.numero_lote}
                  onChange={(e) => handleItemChange(i, "numero_lote", e.target.value)}
                  placeholder="Lote (opcional)"
                  className="md:col-span-2 p-2 border rounded bg-neutral-100"
                />
                <input
                  type="text"
                  value={it.numero_tratamiento}
                  onChange={(e) => handleItemChange(i, "numero_tratamiento", e.target.value)}
                  placeholder="Tratamiento (opcional)"
                  className="md:col-span-2 p-2 border rounded bg-neutral-100"
                />
                <button
                  type="button"
                  onClick={() => delItem(i)}
                  className="md:col-span-1 text-red-600 font-bold"
                  title="Quitar línea"
                >
                  🗑️
                </button>

                <input
                  type="text"
                  value={it.comentarios}
                  onChange={(e) => handleItemChange(i, "comentarios", e.target.value)}
                  placeholder="Comentarios del ítem (opcional)"
                  className="md:col-span-12 p-2 border rounded bg-neutral-100"
                />
              </div>
            ))}

            <button type="button" onClick={addItem} className="mt-1 text-sm text-blue-600 font-medium">
              + Agregar ítem
            </button>
          </div>

          {/* Mensajes */}
          {err && (
            <div className={`text-sm ${messageType === "error" ? "text-red-600" : "text-green-600"}`}>
              {err}
            </div>
          )}

          {/* Botón */}
          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            {id ? "Guardar Cambios" : "Crear Pedido"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/pedidos/listar" className="font-medium underline">Volver al listado de pedidos</Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default PedidosForm;
