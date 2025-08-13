import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import prototipoBg from "../../assets/tablasBackground.jpg";

const PrototipoPalletForm = () => {
  const { id } = useParams(); // id_prototipo si editar
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Cabecera
  const [inputs, setInputs] = useState({
    titulo: "",
    medidas: "",
    id_tipo_patin: "",     // opcional
    cantidad_patines: "",  // número
    comentarios: "",
    id_cliente: ""
  });

  // Listas para selects
  const [clientes, setClientes] = useState([]);
  const [tipoTablas, setTipoTablas] = useState([]);
  const [tipoTacos, setTipoTacos] = useState([]);
  const [tipoPatines, setTipoPatines] = useState([]);
  const [clavos, setClavos] = useState([]); // desde materiaprima (categoria clavo)
  const [fibras, setFibras] = useState([]); // desde materiaprima (categoria fibra)

  // Detalles dinámicos
  const [detTablas, setDetTablas] = useState([{ id_tipo_tabla: "", cantidad_lleva: "", aclaraciones: "" }]);
  const [detTacos, setDetTacos]   = useState([{ id_tipo_taco: "", cantidad_lleva: "", aclaraciones: "" }]);
  const [detClavos, setDetClavos] = useState([{ id_materia_prima: "", cantidad_lleva: "", aclaraciones: "" }]);
  const [detFibras, setDetFibras] = useState([{ id_materia_prima: "", cantidad_lleva: "", aclaraciones: "" }]);

  // Imagen
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // UI
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

  // ---------- Cargar listas ----------
  useEffect(() => {
    (async () => {
      try {
        const [
          ttabRes, ttacRes, tpatRes, mpRes, cliRes
        ] = await Promise.all([
          axios.get("http://localhost:4000/api/src/tipotablas/listar"),
          axios.get("http://localhost:4000/api/src/tipotacos/listar"),
          axios.get("http://localhost:4000/api/src/tipopatines/select"),
          axios.get("http://localhost:4000/api/src/materiaprima/listar"),
          axios.get("http://localhost:4000/api/src/clientes/listar"),
        ]);

        setTipoTablas(ttabRes.data || []);
        setTipoTacos(ttacRes.data || []);
        setTipoPatines(Array.isArray(tpatRes.data) ? tpatRes.data : []); 
        setClientes(cliRes.data || []);

        const mps = mpRes.data || [];
        setClavos(mps.filter(x => x.categoria === "clavo"));
        setFibras(mps.filter(x => x.categoria === "fibra"));
      } catch (e) {
        console.error(e);
        setErr("No se pudieron cargar listas de materiales/clientes.");
        setMessageType("error");
      }
    })();
  }, []);

  // ---------- Cargar prototipo si edición ----------
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await axios.get(`http://localhost:4000/api/src/prototipos/${id}`);
        // Cabecera
        setInputs({
          titulo: data.titulo || "",
          medidas: data.medidas || "",
          id_tipo_patin: data.id_tipo_patin?.toString() || "",
          cantidad_patines: data.cantidad_patines?.toString() || "",
          comentarios: data.comentarios || "",
          id_cliente: data.id_cliente?.toString() || ""
        });

        // Foto (si existiera)
        if (data.foto) setPreview(`http://localhost:4000/images/prototipos/${data.foto}`);

        // BOM -> repartir
        const bom = data.bom_detalle || [];
        const tabs = bom.filter(b => b.categoria === "tabla")
          .map(b => ({ id_tipo_tabla: b.id_item?.toString() || "", cantidad_lleva: b.cantidad?.toString() || "", aclaraciones: b.aclaraciones || "" }));
        const tacs = bom.filter(b => b.categoria === "taco")
          .map(b => ({ id_tipo_taco: b.id_item?.toString() || "", cantidad_lleva: b.cantidad?.toString() || "", aclaraciones: b.aclaraciones || "" }));
        const clas = bom.filter(b => b.categoria === "clavo")
          .map(b => ({ id_materia_prima: b.id_item?.toString() || "", cantidad_lleva: b.cantidad?.toString() || "", aclaraciones: b.aclaraciones || "" }));
        const fibs = bom.filter(b => b.categoria === "fibra")
          .map(b => ({ id_materia_prima: b.id_item?.toString() || "", cantidad_lleva: b.cantidad?.toString() || "", aclaraciones: b.aclaraciones || "" }));

        setDetTablas(tabs.length ? tabs : [{ id_tipo_tabla: "", cantidad_lleva: "", aclaraciones: "" }]);
        setDetTacos(tacs.length ? tacs : [{ id_tipo_taco: "", cantidad_lleva: "", aclaraciones: "" }]);
        setDetClavos(clas.length ? clas : [{ id_materia_prima: "", cantidad_lleva: "", aclaraciones: "" }]);
        setDetFibras(fibs.length ? fibs : [{ id_materia_prima: "", cantidad_lleva: "", aclaraciones: "" }]);
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar el prototipo.");
        setMessageType("error");
      }
    })();
  }, [id]);

  // ---------- Manejo de imagen ----------
  const handleFotoChange = (e) => {
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

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleArrChange = (setter) => (index, field, value) => {
    setter(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const addRow = (setter, emptyRow) => () => setter(prev => [...prev, emptyRow]);
  const removeRow = (setter) => (index) =>
    setter(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  // Helpers por sección
  const handleTablas = handleArrChange(setDetTablas);
  const handleTacos  = handleArrChange(setDetTacos);
  const handleClavos = handleArrChange(setDetClavos);
  const handleFibras = handleArrChange(setDetFibras);

  const addTabla = addRow(setDetTablas, { id_tipo_tabla: "", cantidad_lleva: "", aclaraciones: "" });
  const addTaco  = addRow(setDetTacos,   { id_tipo_taco: "", cantidad_lleva: "", aclaraciones: "" });
  const addClavo = addRow(setDetClavos,  { id_materia_prima: "", cantidad_lleva: "", aclaraciones: "" });
  const addFibra = addRow(setDetFibras,  { id_materia_prima: "", cantidad_lleva: "", aclaraciones: "" });

  const delTabla = removeRow(setDetTablas);
  const delTaco  = removeRow(setDetTacos);
  const delClavo = removeRow(setDetClavos);
  const delFibra = removeRow(setDetFibras);

const validar = () => {
  const isValidQty = (v) => /^\d+$/.test(String(v).trim()) && Number(v) > 0;

  if (!inputs.titulo?.trim()) return "El título es obligatorio.";
  if (!inputs.medidas?.trim()) return "Las medidas son obligatorias.";

  // Si hay selección, la cantidad debe ser > 0
  const mustBeValid = (rows, idField, qtyField, label) => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r[idField]) {
        if (!isValidQty(r[qtyField])) {
          return `Ingrese una cantidad válida (> 0) para ${label} en la fila ${i + 1}`;
        }
      }
    }
    return null;
  };

  const hasAtLeastOne = (rows, idField, qtyField) =>
    rows.some(r => r[idField] && isValidQty(r[qtyField]));

  // Reglas por sección (si selecciona algo, cantidad obligatoria)
  const errSel =
    mustBeValid(detTablas, "id_tipo_tabla", "cantidad_lleva", "tipo tabla") ||
    mustBeValid(detTacos,  "id_tipo_taco",  "cantidad_lleva", "tipo taco")  ||
    mustBeValid(detClavos, "id_materia_prima", "cantidad_lleva", "clavo")   ||
    mustBeValid(detFibras, "id_materia_prima", "cantidad_lleva", "fibra");
  if (errSel) return errSel;

  // Clavos: al menos uno
  if (!hasAtLeastOne(detClavos, "id_materia_prima", "cantidad_lleva")) {
    return "Debe seleccionar al menos un tipo de clavo con cantidad > 0.";
  }

  // Si NO hay patín: debe haber al menos una tabla y un taco
  const sinPatin = !inputs.id_tipo_patin;
  if (sinPatin) {
    if (!hasAtLeastOne(detTablas, "id_tipo_tabla", "cantidad_lleva")) {
      return "Si no selecciona patín, debe agregar al menos un tipo de tabla con cantidad > 0.";
    }
    if (!hasAtLeastOne(detTacos, "id_tipo_taco", "cantidad_lleva")) {
      return "Si no selecciona patín, debe agregar al menos un tipo de taco con cantidad > 0.";
    }
  } else {
    // (Opcional) exigir cantidad de patines > 0 si se eligió un patín
    if (!isValidQty(inputs.cantidad_patines)) {
      return "La cantidad de patines es obligatoria y debe ser mayor a 0.";
    }
  }

  return null;
};



  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validar();
    if (v) {
      setErr(v);
      setMessageType("error");
      return;
    }
    try {
      const formData = new FormData();

      // Cabecera
      Object.entries(inputs).forEach(([k, v]) => formData.append(k, v ?? ""));

      // Arrays -> JSON
      formData.append("tipo_tablas", JSON.stringify(
        detTablas.filter(r => r.id_tipo_tabla).map(r => ({
          id_tipo_tabla: parseInt(r.id_tipo_tabla, 10),
          cantidad_lleva: parseInt(r.cantidad_lleva, 10),
          aclaraciones: r.aclaraciones?.trim() || null
        }))
      ));
      formData.append("tipo_tacos", JSON.stringify(
        detTacos.filter(r => r.id_tipo_taco).map(r => ({
          id_tipo_taco: parseInt(r.id_tipo_taco, 10),
          cantidad_lleva: parseInt(r.cantidad_lleva, 10),
          aclaraciones: r.aclaraciones?.trim() || null
        }))
      ));
      formData.append("clavos", JSON.stringify(
        detClavos.filter(r => r.id_materia_prima).map(r => ({
          id_materia_prima: parseInt(r.id_materia_prima, 10),
          cantidad_lleva: parseInt(r.cantidad_lleva, 10),
          aclaraciones: r.aclaraciones?.trim() || null
        }))
      ));
      formData.append("fibras", JSON.stringify(
        detFibras.filter(r => r.id_materia_prima).map(r => ({
          id_materia_prima: parseInt(r.id_materia_prima, 10),
          cantidad_lleva: parseInt(r.cantidad_lleva, 10),
          aclaraciones: r.aclaraciones?.trim() || null
        }))
      ));

      if (fotoFile) formData.append("foto", fotoFile);

      if (id) {
        await axios.put(`http://localhost:4000/api/src/prototipos/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setErr("Prototipo actualizado correctamente.");
      } else {
        await axios.post(`http://localhost:4000/api/src/prototipos/agregar`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setErr("Prototipo creado exitosamente.");
      }

      setMessageType("success");
      setTimeout(() => navigate("/prototipos/listar"), 800);
    } catch (e) {
      console.error(e);
      setErr("Error al guardar el prototipo.");
      setMessageType("error");
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${prototipoBg})` }}
      />
      <div className="relative z-10 w-full sm:max-w-2xl p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link to="/prototipos/listar" className="block mb-6 text-2xl font-semibold text-neutral-800 text-center">
          Imanod Prototipos de Pallets
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          {id ? "Editar Prototipo" : "Nuevo Prototipo"}
        </h1>

        <form className="space-y-5" onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Título y medidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-sm font-medium">Título *</label>
              <input
                type="text"
                name="titulo"
                value={inputs.titulo}
                onChange={handleChange}
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
                placeholder="Ej: Pallet 120x100 EPAL"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Medidas</label>
              <input
                type="text"
                name="medidas"
                value={inputs.medidas}
                onChange={handleChange}
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
                placeholder="Ej: 120x100 cm"
              />
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="block mb-1 text-sm font-medium">Cliente</label>
            <select
              name="id_cliente"
              value={inputs.id_cliente}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
            >
              <option value="">Seleccionar cliente (opcional)</option>
              {clientes.map(c => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.es_empresa ? c.nombre_empresa : `${c.nombre} ${c.apellido || ""}`}
                </option>
              ))}
            </select>
          </div>

          {/* Patines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-sm font-medium">Tipo de patín</label>
              <select
                name="id_tipo_patin"
                value={inputs.id_tipo_patin}
                onChange={handleChange}
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
              >
                <option value="">Sin patín</option>
                {tipoPatines.map(tp => (
                  <option key={tp.id_tipo_patin} value={tp.id_tipo_patin}>
                    {tp.titulo || `Patín #${tp.id_tipo_patin}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Cantidad de patines</label>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                pattern="\d*"
                name="cantidad_patines"
                value={inputs.cantidad_patines}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, ""); // solo dígitos
                  handleChange({
                    target: { name: "cantidad_patines", value: onlyDigits }
                  });
                }}
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
                  handleChange({
                    target: { name: "cantidad_patines", value: pasted }
                  });
                }}
                className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
                placeholder="Ej: 3"
              />
            </div>
          </div>

          {/* Foto */}
          <div>
            <label className="block mb-1 text-sm font-medium">Foto</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              name="foto"
              onChange={handleFotoChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
            />
            {preview && (
              <div className="relative mt-2">
                <img src={preview} alt="Preview" className="w-full h-auto rounded" />
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

          {/* Comentarios */}
          <div>
            <label className="block mb-1 text-sm font-medium">Comentarios</label>
            <textarea
              name="comentarios"
              value={inputs.comentarios}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100"
              placeholder="Notas opcionales del prototipo"
            />
          </div>

          {/* ---------- Secciones dinámicas ---------- */}
          {/* Tipo Tablas */}
          <div>
            <p className="text-sm font-semibold mb-2">Tipo de tablas</p>
            {detTablas.map((r, i) => (
              <div key={`tt-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
                <select
                  value={r.id_tipo_tabla}
                  onChange={(e) => handleTablas(i, "id_tipo_tabla", e.target.value)}
                  className="md:col-span-6 p-2 border rounded bg-neutral-100"
                >
                  <option value="">Seleccionar tipo tabla</option>
                  {tipoTablas.map(tt => (
                    <option key={tt.id_tipo_tabla} value={tt.id_tipo_tabla}>
                      {tt.titulo} ({tt.largo_cm}×{tt.ancho_cm}×{tt.espesor_mm})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={r.cantidad_lleva}
                  inputMode="numeric"
                  pattern="\d*"
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, ""); 
                    handleTablas(i, "cantidad_lleva", onlyDigits);
                  }}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
                    handleClavos(i, "cantidad_lleva", pasted); 
                  }}
                  placeholder="Cantidad"
                  className="md:col-span-2 p-2 border rounded bg-neutral-100"
                />
                <input
                  type="text"
                  value={r.aclaraciones}
                  onChange={(e) => handleTablas(i, "aclaraciones", e.target.value)}
                  placeholder="Aclaraciones (opcional)"
                  className="md:col-span-3 p-2 border rounded bg-neutral-100"
                />
                <button type="button" onClick={() => delTabla(i)} className="md:col-span-1 text-red-600 font-bold">
                  🗑️
                </button>
              </div>
            ))}
            <button type="button" onClick={addTabla} className="mt-1 text-sm text-blue-600 font-medium">
              + Agregar tipo tabla
            </button>
          </div>

          {/* Tipo Tacos */}
          <div>
            <p className="text-sm font-semibold mb-2">Tipo de tacos</p>
            {detTacos.map((r, i) => (
              <div key={`tk-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
                <select
                  value={r.id_tipo_taco}
                  onChange={(e) => handleTacos(i, "id_tipo_taco", e.target.value)}
                  className="md:col-span-6 p-2 border rounded bg-neutral-100"
                >
                  <option value="">Seleccionar tipo taco</option>
                  {tipoTacos.map(tt => (
                    <option key={tt.id_tipo_taco} value={tt.id_tipo_taco}>
                      {tt.titulo} ({tt.largo_cm}×{tt.ancho_cm}×{tt.espesor_mm})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={r.cantidad_lleva}
                  inputMode="numeric"
                  pattern="\d*"
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, ""); 
                    handleFibras(i, "cantidad_lleva", onlyDigits);
                  }}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
                    handleTacos(i, "cantidad_lleva", pasted); 
                  }}
                  placeholder="Cantidad"
                  className="md:col-span-2 p-2 border rounded bg-neutral-100"
                />
                <input
                  type="text"
                  value={r.aclaraciones}
                  onChange={(e) => handleTacos(i, "aclaraciones", e.target.value)}
                  placeholder="Aclaraciones (opcional)"
                  className="md:col-span-3 p-2 border rounded bg-neutral-100"
                />
                <button type="button" onClick={() => delTaco(i)} className="md:col-span-1 text-red-600 font-bold">
                  🗑️
                </button>
              </div>
            ))}
            <button type="button" onClick={addTaco} className="mt-1 text-sm text-blue-600 font-medium">
              + Agregar tipo taco
            </button>
          </div>

          {/* Clavos */}
          <div>
            <p className="text-sm font-semibold mb-2">Clavos</p>
            {detClavos.map((r, i) => (
              <div key={`cl-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
                <select
                  value={r.id_materia_prima}
                  onChange={(e) => handleClavos(i, "id_materia_prima", e.target.value)}
                  className="md:col-span-6 p-2 border rounded bg-neutral-100"
                >
                  <option value="">Seleccionar clavo</option>
                  {clavos.map(c => (
                    <option key={c.id_materia_prima} value={c.id_materia_prima}>
                      {c.titulo} {c.medidas ? `(${c.medidas})` : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Cantidad"
                  value={r.cantidad_lleva}
                  inputMode="numeric"
                  pattern="\d*"
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, ""); // quita todo lo que no sea dígito
                    handleClavos(i, "cantidad_lleva", onlyDigits);
                  }}
                  onKeyDown={(e) => {
                    // bloquea teclas que algunos navegadores permiten en <input type="number">
                    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    // limpia el portapapeles para evitar pegar texto no numérico
                    e.preventDefault();
                    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
                    handleClavos(i, "cantidad_lleva", pasted); 
                  }}
                  className="md:col-span-2 p-2 border rounded bg-neutral-100"
                />
                <input
                  type="text"
                  value={r.aclaraciones}
                  onChange={(e) => handleClavos(i, "aclaraciones", e.target.value)}
                  placeholder="Aclaraciones (opcional)"
                  className="md:col-span-3 p-2 border rounded bg-neutral-100"
                />
                <button type="button" onClick={() => delClavo(i)} className="md:col-span-1 text-red-600 font-bold">
                  🗑️
                </button>
              </div>
            ))}
            <button type="button" onClick={addClavo} className="mt-1 text-sm text-blue-600 font-medium">
              + Agregar clavo
            </button>
          </div>

          {/* Fibras */}
          <div>
            <p className="text-sm font-semibold mb-2">Fibras</p>
            {detFibras.map((r, i) => (
              <div key={`fb-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
                <select
                  value={r.id_materia_prima}
                  onChange={(e) => handleFibras(i, "id_materia_prima", e.target.value)}
                  className="md:col-span-6 p-2 border rounded bg-neutral-100"
                >
                  <option value="">Seleccionar fibra</option>
                  {fibras.map(f => (
                    <option key={f.id_materia_prima} value={f.id_materia_prima}>
                      {f.titulo}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={r.cantidad_lleva}
                  inputMode="numeric"
                  pattern="\d*"
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, ""); 
                    handleFibras(i, "cantidad_lleva", onlyDigits);
                  }}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
                    handleClavos(i, "cantidad_lleva", pasted); 
                  }}
                  placeholder="Cantidad"
                  className="md:col-span-2 p-2 border rounded bg-neutral-100"
                />
                <input
                  type="text"
                  value={r.aclaraciones}
                  onChange={(e) => handleFibras(i, "aclaraciones", e.target.value)}
                  placeholder="Aclaraciones (opcional)"
                  className="md:col-span-3 p-2 border rounded bg-neutral-100"
                />
                <button type="button" onClick={() => delFibra(i)} className="md:col-span-1 text-red-600 font-bold">
                  🗑️
                </button>
              </div>
            ))}
            <button type="button" onClick={addFibra} className="mt-1 text-sm text-blue-600 font-medium">
              + Agregar fibra
            </button>
          </div>

          {/* Mensaje */}
          {err && (
            <div className={`text-sm ${messageType === "error" ? "text-red-600" : "text-green-600"}`}>
              {err}
            </div>
          )}

          {/* Botón */}
          <button type="submit" className="w-full py-2 bg-neutral-700 text-white rounded hover:bg-neutral-800 transition">
            {id ? "Guardar Cambios" : "Crear Prototipo"}
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            <Link to="/prototipos/listar" className="font-medium underline">
              Volver al listado de prototipos
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default PrototipoPalletForm;
