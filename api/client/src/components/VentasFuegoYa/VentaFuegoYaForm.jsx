import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../../api";
import bgImg from "../../assets/tablasBackground.jpg";

const PAGO_OPCIONES = ["credito", "pago"];

const VentaFuegoYaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    fecha_realizada: "",
    precio_total: "",
    id_cliente: "",
    id_fuego_ya: "",
    cantidadbolsas: "",
    comentarios: "",
    estadopago: "credito",
    fechapago: "",
  });
  const [fechapagoView, setFechapagoView] = useState("");

  const [fotoFile, setFotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [borrarFoto, setBorrarFoto] = useState(false); 

  const [clientes, setClientes] = useState([]);
  const [fuegos, setFuegos] = useState([]);

  const [precioTouched, setPrecioTouched] = useState(false);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  const formatDateFromISO = (iso) => (iso ? iso.split("T")[0] : "");
  const formatDateTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUnitPrice = useMemo(() => {
    return (idFuego) => {
      const fy = fuegos.find((f) => String(f.id_fuego_ya) === String(idFuego));
      if (!fy) return null;
      if (fy.precio_unidad != null) return Number(fy.precio_unidad);
      return null;
    };
  }, [fuegos]);

  const getAxiosMessage = (error, fallback = "Error al guardar la venta.") => {
    if (error?.response?.data) {
      const data = error.response.data;
      if (typeof data === "string") return data;
      return data.error || data.message || fallback;
    }
    return fallback;
  };

  useEffect(() => {
    (async () => {
      try {
        const [cliRes, fyRes] = await Promise.all([
          api.get("/clientesfuegoya/listar"),
          api.get("/fuegoya/listar"),
        ]);
        setClientes(cliRes.data || []);
        setFuegos(fyRes.data || []);
      } catch (e) {
        console.error(e);
        setErr("No se pudieron cargar clientes / FuegoYa.");
        setMessageType("error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await api.get(`/ventafuegoya/${id}`);
        setInputs({
          fecha_realizada: formatDateFromISO(data.fecha_realizada),
          precio_total: data.precio_total != null ? String(data.precio_total) : "",
          id_cliente: data.id_cliente?.toString() || "",
          id_fuego_ya: data.id_fuego_ya?.toString() || "",
          cantidadbolsas: data.cantidadbolsas != null ? String(data.cantidadbolsas) : "",
          comentarios: data.comentarios || "",
          estadopago: data.estadopago || "credito",
          fechapago: formatDateFromISO(data.fechapago),
        });
        setFechapagoView(data.fechapago || "");
        setPreviewUrl(data.foto_url || null);
        setBorrarFoto(false);         
        setPrecioTouched(true);
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar la venta.");
        setMessageType("error");
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!inputs.id_fuego_ya) return;
    const unit = getUnitPrice(inputs.id_fuego_ya);
    const qty = parseInt(inputs.cantidadbolsas, 10);
    if (!precioTouched && unit != null && Number.isInteger(qty) && qty >= 0) {
      const calc = (unit * qty).toFixed(2);
      setInputs((prev) => ({ ...prev, precio_total: calc }));
    }
  }, [inputs.id_fuego_ya, inputs.cantidadbolsas, getUnitPrice, precioTouched]);

  useEffect(() => {
    const fySel = fuegos.find((f) => String(f.id_fuego_ya) === String(inputs.id_fuego_ya));
    const qty = parseInt(inputs.cantidadbolsas || "0", 10) || 0;

    if (fySel && Number.isFinite(fySel.stock) && qty > fySel.stock) {
      setErr(`Stock insuficiente. Disponible: ${fySel.stock}, solicitado: ${qty}.`);
      setMessageType("error");
    } else {
      if (/Stock insuficiente/.test(err)) {
        setErr("");
        setMessageType("");
      }
    }
  }, [fuegos, inputs.id_fuego_ya, inputs.cantidadbolsas]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setInputs((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "precio_total") {
        const raw = value.replace(/[^0-9.]/g, "");
        const parts = raw.split(".");
        const sane = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : raw;
        next.precio_total = sane;
        setPrecioTouched(true);
      }

      if (name === "cantidadbolsas") {
        next.cantidadbolsas = value.replace(/[^\d]/g, "");
      }

      return next;
    });
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0] || null;
    setFotoFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setBorrarFoto(false); 
    }
  };

  const clearPhoto = () => {
    setFotoFile(null);
    setPreviewUrl(null);
    setPrecioTouched(false);
    setBorrarFoto(!!id); 
  };

  const recalcPrecio = () => {
    const unit = getUnitPrice(inputs.id_fuego_ya);
    const qty = parseInt(inputs.cantidadbolsas, 10) || 0;
    if (unit != null) {
      setInputs((prev) => ({ ...prev, precio_total: (unit * qty).toFixed(2) }));
      setPrecioTouched(false);
    }
  };

  const validar = () => {
    if (!inputs.id_fuego_ya) return "Debe seleccionar un FuegoYa.";
    if (!inputs.fecha_realizada) return "La fecha de la venta es obligatoria.";
    if (inputs.cantidadbolsas !== "" && !/^\d+$/.test(inputs.cantidadbolsas)) {
      return "La cantidad de bolsas debe ser un entero mayor o igual a 0.";
    }
    if (inputs.precio_total && isNaN(parseFloat(inputs.precio_total))) {
      return "El precio total debe ser numérico.";
    }
    if (inputs.estadopago && !PAGO_OPCIONES.includes(inputs.estadopago)) {
      return "Estado de pago inválido.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fySel = fuegos.find((f) => String(f.id_fuego_ya) === String(inputs.id_fuego_ya));
    const qty = parseInt(inputs.cantidadbolsas || "0", 10) || 0;
    if (fySel && Number.isFinite(fySel.stock) && qty > fySel.stock) {
      setErr(`Stock insuficiente. Disponible: ${fySel.stock}, solicitado: ${qty}.`);
      setMessageType("error");
      return;
    }

    const v = validar();
    if (v) {
      setErr(v);
      setMessageType("error");
      return;
    }

    const fd = new FormData();
    fd.append("fecha_realizada", inputs.fecha_realizada);
    if (inputs.precio_total) fd.append("precio_total", inputs.precio_total);
    if (inputs.id_cliente) fd.append("id_cliente", inputs.id_cliente);
    fd.append("id_fuego_ya", inputs.id_fuego_ya);
    if (inputs.cantidadbolsas !== "") fd.append("cantidadbolsas", inputs.cantidadbolsas);
    if (inputs.comentarios) fd.append("comentarios", inputs.comentarios);
    if (inputs.estadopago) fd.append("estadopago", inputs.estadopago);

    if (fotoFile) {
      fd.append("foto", fotoFile);
    } else if (id && borrarFoto) {
      fd.append("borrar_foto", "1");
    }

    try {
      if (id) {
        await api.put(`/ventafuegoya/${id}`, fd);
        setErr("Venta Fuegoya actualizada correctamente.");
      } else {
        await api.post("/ventafuegoya/agregar", fd);
        setErr("Venta Fuegoya creada exitosamente.");
      }
      setMessageType("success");
      setTimeout(() => navigate("/ventafuegoya/listar"), 800);
    } catch (e) {
      console.error(e);
      setErr(getAxiosMessage(e, "Error al guardar la venta."));
      setMessageType("error");
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${bgImg})` }}
      />
      <div className="relative z-10 w-full sm:max-w-2xl p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link to="/ventafuegoya/listar" className="block mb-6 text-2xl font-semibold text-neutral-800 text-center">
          Imanod — Venta Fuegoya
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Venta" : "Nueva Venta"}
        </h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Fuego Ya */}
          <div>
            <label className="block mb-1 text-sm font-medium">Fuego Ya *</label>
            <select
              name="id_fuego_ya"
              value={inputs.id_fuego_ya}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
            >
              <option value="">Seleccionar Fuego Ya</option>
              {fuegos.map((f) => (
                <option key={f.id_fuego_ya} value={f.id_fuego_ya}>
                  {f.tipo || `FuegoYa #${f.id_fuego_ya}`}
                </option>
              ))}
            </select>
            {inputs.id_fuego_ya && (
              <p className="text-xs text-neutral-600 mt-1">
                Precio unitario:{" "}
                {(() => {
                  const u = getUnitPrice(inputs.id_fuego_ya);
                  return u != null ? u.toLocaleString("es-UY", { style: "currency", currency: "UYU" }) : "—";
                })()}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Cliente</label>
            <select
              name="id_cliente"
              value={inputs.id_cliente}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
            >
              <option value="">Sin cliente</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha realizada */}
          <div>
            <label className="block mb-1 text-sm font-medium">Fecha realizada *</label>
            <input
              type="date"
              name="fecha_realizada"
              value={inputs.fecha_realizada}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
            />
          </div>

          {/* Cantidad de bolsas */}
          <div>
            <label className="block mb-1 text-sm font-medium">Cantidad de bolsas</label>
            <input
              type="text"
              inputMode="numeric"
              name="cantidadbolsas"
              value={inputs.cantidadbolsas}
              onChange={handleChange}
              placeholder="Ej: 10"
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
            />
          </div>

          {/* Estado de pago */}
          <div>
            <label className="block mb-1 text-sm font-medium">Estado de pago</label>
            <select
              name="estadopago"
              value={inputs.estadopago}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
            >
              {PAGO_OPCIONES.map((p) => (
                <option key={p} value={p}>
                  {p === "pago" ? "Pagado" : "Crédito / Sin pagar"}
                </option>
              ))}
            </select>
            {id && (
              <p className="text-xs text-neutral-600 mt-1">
                {fechapagoView ? (
                  <>
                    Fecha de pago registrada:{" "}
                    <span className="font-medium">{formatDateTime(fechapagoView)}</span>
                  </>
                ) : (
                  "Aún en crédito / sin pagar"
                )}
              </p>
            )}
          </div>

          {/* Precio total */}
          <div>
            <label className="block mb-1 text-sm font-medium">Precio total</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                name="precio_total"
                value={inputs.precio_total}
                onChange={handleChange}
                placeholder="Ej: 1500.00"
                className="flex-1 p-2 rounded border border-neutral-300 bg-neutral-100"
              />
              <button
                type="button"
                onClick={recalcPrecio}
                className="px-3 py-2 rounded bg-neutral-200 hover:bg-neutral-300 text-sm"
                title="Recalcular según cantidad y precio unitario"
              >
                Recalcular
              </button>
            </div>
            {!precioTouched && inputs.id_fuego_ya && inputs.cantidadbolsas !== "" && (
              <p className="text-xs text-neutral-600 mt-1">
                (Se calcula automáticamente por cantidad × precio unitario)
              </p>
            )}
          </div>

          {/* Foto */}
          <div>
            <label className="block mb-1 text-sm font-medium">Foto (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
            />

            {previewUrl && (
              <div className="relative mt-2 inline-block">
                <img src={previewUrl} alt="Foto" className="max-h-48 rounded border" />
                {/* Botón quitar foto */}
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/60 text-white text-lg leading-7 text-center hover:bg-black/80"
                  title="Quitar foto"
                  aria-label="Quitar foto"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Mensajes */}
          {err && (
            <div className={`text-sm ${messageType === "error" ? "text-red-600" : "text-green-600"}`}>
              {err}
            </div>
          )}

          {/* Botón */}
          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            {id ? "Guardar Cambios" : "Crear Venta"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/ventafuegoya/listar" className="font-medium underline">
              Volver al listado
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default VentaFuegoYaForm;
