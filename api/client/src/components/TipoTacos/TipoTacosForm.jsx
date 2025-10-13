import React, { useEffect, useState, useRef, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";
import tablasBackground from "../../assets/tablasBackground.jpg";
import Alert from "../Modals/Alert";
const TipoTacosForm = () => {
  const { currentUser } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialInputs = {
    id_materia_prima: "",
    titulo: "",
    largo_cm: "",
    ancho_cm: "",
    espesor_mm: "",
    precio_unidad: "",
    stock: "",
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [palos, setPalos] = useState([]);
  const [selectedPalo, setSelectedPalo] = useState(null);
  const [paloPreview, setPaloPreview] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [messageType, setMessageType] = useState("");

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
          precio_unidad: data.precio_unidad?.toString() || "",
          stock: data.stock?.toString() || "",
        });
        const parent = palos.find(
          (p) => p.id_materia_prima === data.id_materia_prima
        );
        if (parent) {
          setSelectedPalo(parent);
          const parentImg =
            parent.foto_url ||
            (typeof parent.foto === "string" && /^https?:\/\//.test(parent.foto)
              ? parent.foto
              : null);
          setPaloPreview(parentImg || null);
        }
        const ownImg =
          data.foto_url ||
          (typeof data.foto === "string" && /^https?:\/\//.test(data.foto)
            ? data.foto
            : null);
        if (ownImg) setPreview(ownImg);
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
    if (currentUser.tipo !== "encargado") {
      if (
        !inputs.precio_unidad ||
        isNaN(inputs.precio_unidad) ||
        +inputs.precio_unidad <= 0
      )
        return "Precio unitario inválido.";
    }
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
      (parent?.foto && /^https?:\/\//.test(parent.foto) ? parent.foto : null);
    setPaloPreview(parentImg || null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (
      ["largo_cm", "ancho_cm", "espesor_mm", "precio_unidad"].includes(name)
    ) {
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
  };

  const clearImage = () => {
    setFotoFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const MARGIN = 0.5;
  const piecesPerPalo =
    selectedPalo && inputs.largo_cm
      ? Math.floor(
          (selectedPalo.largo_cm + MARGIN) /
            (parseFloat(inputs.largo_cm) + MARGIN)
        )
      : 0;
  const totalPossible = piecesPerPalo * (selectedPalo?.stock ?? 0);

  const handleSubmit = async (e) => {
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
      fd.append("titulo", inputs.titulo);
      fd.append("largo_cm", inputs.largo_cm);
      fd.append("ancho_cm", inputs.ancho_cm);
      fd.append("espesor_mm", inputs.espesor_mm);
      const precio =
        currentUser.tipo === "encargado" ? "0" : inputs.precio_unidad;
      fd.append("precio_unidad", precio);
      fd.append("stock", inputs.stock);
      if (fotoFile) fd.append("foto", fotoFile);

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
        >
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
                  {currentUser.tipo !== "encargado" && (
                    <p>
                      <strong>Precio unidad:</strong>{" "}
                      {selectedPalo.precio_unidad}
                    </p>
                  )}
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
              className="w-full p-2 border rounded"
            />
          </div>
          {currentUser.tipo !== "encargado" && (
            <div>
              <label
                htmlFor="precio_unidad"
                className="block mb-1 text-sm font-medium text-neutral-800"
              >
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
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {id ? "Guardar Cambios" : "Crear Tipo de Taco"}
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
