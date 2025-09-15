import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import encargosBackground from "../../assets/tablasBackground.jpg";
import axios from "axios";

const EncargosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    fecha_realizado: "",
    fecha_prevista_llegada: "",
    id_proveedor: "",
    comentarios: ""
  });

  const [proveedores, setProveedores] = useState([]);
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [detalles, setDetalles] = useState([{ id_materia_prima: "", cantidad: "" }]);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  //Cargar proveedores y materias primas
  useEffect(() => {
    axios.get("http://localhost:4000/api/src/proveedores/listar").then(({ data }) => setProveedores(data));
    axios.get("http://localhost:4000/api/src/encargos/primas")
    .then(({ data }) => setMateriasPrimas(data))
    .catch(err => console.error("Error cargando materias primas:", err)); 
  }, []);

  //Cargar encargo si es edición
  useEffect(() => {
    if (!id) return;
    axios.get(`http://localhost:4000/api/src/encargos/${id}`)
      .then(({ data }) => {
        setInputs({
          fecha_realizado: formatDate(data.fecha_realizado),
          fecha_prevista_llegada: formatDate(data.fecha_prevista_llegada),
          id_proveedor: data.id_proveedor || "",
          comentarios: data.comentarios || ""
        });
        const detalleConvertido = data.detalles.map(d => ({
          id_materia_prima: d.id_materia_prima?.toString() || "",
          cantidad: d.cantidad?.toString() || ""
        }));
        setDetalles(detalleConvertido);
      })
      .catch(() => {
        setErr("No se pudo cargar el encargo.");
        setMessageType("error");
      });
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => {
      const next = { ...prev, [name]: value };

      if (name === "fecha_realizado" && next.fecha_prevista_llegada) {
        const fReal = new Date(value);
        const fPrev = new Date(next.fecha_prevista_llegada);
        if (fPrev <= fReal) next.fecha_prevista_llegada = "";
      }

      return next;
    });
  };


  const handleDetalleChange = (index, field, value) => {
    const nuevos = [...detalles];
    nuevos[index][field] = value;
    setDetalles(nuevos);
  };

  const formatDate = (isoString) => {
  if (!isoString) return "";
  return isoString.split("T")[0];
};

  const agregarDetalle = () => setDetalles([...detalles, { id_materia_prima: "", cantidad: "" }]);

  const quitarDetalle = index => {
    if (detalles.length === 1) return;
    const nuevos = detalles.filter((_, i) => i !== index);
    setDetalles(nuevos);
  };

  // Validación
  const validar = () => {
    if (!inputs.fecha_realizado) return "La fecha de realización es obligatoria.";
    if (!inputs.id_proveedor) return "Debe seleccionar un proveedor.";
    if (inputs.fecha_prevista_llegada) {
      const fReal = new Date(inputs.fecha_realizado);
      const fPrev = new Date(inputs.fecha_prevista_llegada);
      if (fPrev <= fReal) return "La fecha prevista de llegada debe ser mayor a la fecha realizada.";
    }
    for (let i = 0; i < detalles.length; i++) {
      const d = detalles[i];
      if (!d.id_materia_prima) return `Seleccione una materia prima en la fila ${i + 1}`;
      if (!d.cantidad || Number(d.cantidad) <= 0) return `Ingrese una cantidad válida en la fila ${i + 1}`;
    }
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const error = validar();
    if (error) {
      setErr(error);
      setMessageType("error");
      return;
    }

    const payload = {
      ...inputs,
      materias_primas: detalles.map(d => ({
        id_materia_prima: parseInt(d.id_materia_prima),
        cantidad: parseInt(d.cantidad)
      }))
    };

    try {
      if (id) {
        await axios.put(`http://localhost:4000/api/src/encargos/${id}`, payload);
        setErr("Encargo actualizado correctamente.");
      } else {
        await axios.post("http://localhost:4000/api/src/encargos/agregar", payload);
        setErr("Encargo creado exitosamente.");
      }
      setMessageType("success");
      setTimeout(() => navigate("/encargos/listar"), 800);
    } catch (err) {
      console.error(err);
      setErr("Error al guardar el encargo.");
      setMessageType("error");
    }
  };

  return (
        <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
          <div
            className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
            style={{ backgroundImage: `url(${encargosBackground})` }}
          />
      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">
          {id ? "Editar Encargo" : "Nuevo Encargo"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fecha realizada */}
          <div>
            <label className="block text-sm font-medium">Fecha realizada *</label>
            <input type="date" name="fecha_realizado" value={inputs.fecha_realizado} onChange={handleChange}
              className="w-full p-2 border rounded bg-neutral-100" />
          </div>

          {/* Fecha prevista */}
          <div>
            <label className="block text-sm font-medium">Fecha prevista de llegada *</label>
            <input
              type="date"
              name="fecha_prevista_llegada"
              value={inputs.fecha_prevista_llegada}
              onChange={handleChange}
              min={inputs.fecha_realizado || undefined}   
              className="w-full p-2 border rounded bg-neutral-100"
            />
          </div>

          {/* Proveedor */}
          <div>
            <label className="block text-sm font-medium">Proveedor *</label>
            <select name="id_proveedor" value={inputs.id_proveedor} onChange={handleChange}
              className="w-full p-2 border rounded bg-neutral-100">
              <option value="">Seleccione un proveedor</option>
              {proveedores.map(p => (
                <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_empresa}</option>
              ))}
            </select>
          </div>

          {/* Comentarios */}
          <div>
            <label className="block text-sm font-medium">Comentarios</label>
            <textarea name="comentarios" value={inputs.comentarios} onChange={handleChange}
              className="w-full p-2 border rounded bg-neutral-100" rows={3} />
          </div>

          {/* Lista dinámica de materias primas */}
          <div>
            <label className="block text-sm font-semibold mb-2">Materias primas *</label>
            {detalles.map((detalle, index) => (
              <div key={index} className="flex gap-2 mb-2">
              <select
                value={detalle.id_materia_prima}
                onChange={(e) => handleDetalleChange(index, "id_materia_prima", e.target.value)}
                className="flex-1 p-2 border rounded bg-neutral-100"
              >
                <option value="">Materia prima</option>
                {materiasPrimas.map(mp => (
                  <option key={mp.id_materia_prima} value={mp.id_materia_prima}>
                    {mp.titulo} ({mp.categoria})
                  </option>
                ))}
              </select>

                <input
                  type="number"
                  min="1"
                  value={detalle.cantidad}
                  onChange={(e) => handleDetalleChange(index, "cantidad", e.target.value)}
                  placeholder="Cantidad"
                  className="w-28 p-2 border rounded bg-neutral-100"
                />

                <button type="button" onClick={() => quitarDetalle(index)} className="text-red-600 font-bold">
                  🗑️
                </button>
              </div>
            ))}

            <button type="button" onClick={agregarDetalle} className="mt-1 text-sm text-blue-600 font-medium">
              + Agregar materia prima
            </button>
          </div>

          {/* Errores */}
          {err && (
            <div className={`text-sm mt-2 ${messageType === "error" ? "text-red-500" : "text-green-600"}`}>
              {err}
            </div>
          )}

          {/* Botón */}
          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            {id ? "Guardar Cambios" : "Crear Encargo"}
          </button>
            <p className="mt-4 text-sm text-neutral-700 text-center"><Link to="/encargos/listar" className="font-medium underline">Volver al listado de encargos</Link></p>
        </form>
      </div>
    </section>
  );
};

export default EncargosForm;
