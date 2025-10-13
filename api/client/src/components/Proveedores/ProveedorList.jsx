import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import ProveedorCard from "./ProveedorCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const ProveedoresList = () => {
  const [proveedores, setProveedores] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null); 
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const res = await api.get("/proveedores/listar");
        setProveedores(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los proveedores.");
      }
    };
    fetchProveedores();
  }, []);

  const handleEdit = (id) => {
    navigate(`/proveedores/${id}`);
  };

  // Abrir modal
  const handleDeleteClick = (proveedor) => {
    setToDelete(proveedor);
  };

const [deleting, setDeleting] = useState(false);
const [deleteError, setDeleteError] = useState("");


const fmtDate = (s) => {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const confirmDelete = async () => {
  if (!toDelete) return;
  setDeleting(true);
  setDeleteError("");

  try {
    await api.delete(`/proveedores/${toDelete.id_proveedor}`);

    setProveedores(prev =>
      prev.filter(p => p.id_proveedor !== toDelete.id_proveedor)
    );
    setToDelete(null);
  } catch (err) {
    console.error(err);

    let msg = "No se pudo eliminar el proveedor.";
    const data = err?.response?.data;

    if (data) {
      if (typeof data === "string") msg = data;
      else if (data.message) msg = data.message;

      const partes = [];

      const enc = data.encargos || data?.referencias?.encargos || [];
      if (Array.isArray(enc) && enc.length) {
        const lines = enc.map(e => {
          if (e && typeof e === "object") {
            const id = e.id_encargo ?? e.id ?? "?";
            const prov = e.nombre_empresa || e.proveedor || "";
            const f = e.fecha_realizado || e.fecha || "";
            const fecha = fmtDate(f);
            return `#${id}${prov ? ` — ${prov}` : ""}${fecha ? ` — ${fecha}` : ""}`;
          }
          return `#${e}`;
        });
        partes.push(`Usado por encargos:\n - ${lines.join("\n - ")}`);
      }

      const comp = data.compras || data?.referencias?.compras || [];
      if (Array.isArray(comp) && comp.length) {
        const lines = comp.map(c => (typeof c === "object" ? `#${c.id_compra ?? c.id ?? "?"}` : `#${c}`));
        partes.push(`Usado por compras:\n - ${lines.join("\n - ")}`);
      }

      if (partes.length) msg += `\n${partes.join("\n")}`;
    }

    setDeleteError(msg);
  } finally {
    setDeleting(false);
  }
};


  // Cancelar borrado
  const cancelDelete = () => {
    setToDelete(null);
  };

  // Filtrar por nombre
  const filteredProveedores = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <Link
          to="/proveedores"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Proveedor
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {/* Buscador de proveedores */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar proveedor por nombre..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProveedores.map((p) => (
          <ProveedorCard
            key={p.id_proveedor}
            proveedor={p}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(p)}
          />
        ))}
        {filteredProveedores.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron proveedores.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.nombre}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        error={deleteError}
        loading={deleting}
      />
    </section>
  );
};

export default ProveedoresList;
