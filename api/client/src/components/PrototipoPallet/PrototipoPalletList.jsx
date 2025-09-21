import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import PrototipoPalletCard from "./PrototipoPalletCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const PrototipoPalletList = () => {
  const [prototipos, setPrototipos] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  // Carga de prototipos
  const fetchPrototipos = useCallback(async () => {
    try {
      const res = await api.get("/prototipos/listar");
      setPrototipos(res.data || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los prototipos.");
    }
  }, []);

  useEffect(() => {
    fetchPrototipos();
  }, [fetchPrototipos]);

  // Editar
  const handleEdit = (id) => {
    navigate(`/prototipos/${id}`);
  };

  // Borrar (abrir modal)
  const handleDeleteClick = (prototipo) => {
    setToDelete(prototipo);
  };

  // Confirmar borrado
  const confirmDelete = async () => {
    try {
      await api.delete(`/prototipos/${toDelete.id_prototipo}`);
      setPrototipos(prev => prev.filter(p => p.id_prototipo !== toDelete.id_prototipo));
      setError("");
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
     const apiMsg = err?.response?.data?.message || err?.response?.data?.error;
     const msg =
      apiMsg ||
       (status === 409
         ? "No se pudo eliminar el prototipo porque está asociado a uno o más pedidos."
         : "Error al eliminar el prototipo.");
     setError(msg);
    } finally {
      setToDelete(null);
    }
  };

  // Cancelar modal
  const cancelDelete = () => setToDelete(null);

  // Filtro por título o cliente
  const filtered = prototipos.filter(p => {
    const hay = (s) => (s || "").toLowerCase().includes(searchTerm.toLowerCase());
    return hay(p.titulo) || hay(p.cliente_empresa) || hay(`${p.cliente_nombre || ""} ${p.cliente_apellido || ""}`);
  });

  const modalImg = toDelete ? (toDelete.foto_url || toDelete.foto || null) : null;

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Prototipos de Pallets</h1>
        <Link
          to="/prototipos"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Prototipo
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por título o cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Grid responsivo */}
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        {filtered.map((p) => (
          <PrototipoPalletCard
            key={p.id_prototipo}
            prototipo={p}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(p)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron prototipos.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete ? (toDelete.titulo || `Prototipo #${toDelete.id_prototipo}`) : ""}
        imageSrc={modalImg}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default PrototipoPalletList;
