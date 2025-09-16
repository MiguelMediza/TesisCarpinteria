import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import EncargosCard from "./EncargosCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const EncargosList = () => {
  const [encargos, setEncargos] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [markingId, setMarkingId] = useState(null); 
  const navigate = useNavigate();

  const fetchEncargos = useCallback(async () => {
    try {
      const res = await api.get("/encargos/listar");
      setEncargos(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los encargos.");
    }
  }, []);

  useEffect(() => {
    fetchEncargos();
  }, [fetchEncargos]);

  const handleEdit = (id) => {
    navigate(`/encargos/${id}`);
  };

  const handleDeleteClick = (encargo) => {
    setToDelete(encargo);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/encargos/${toDelete.id_encargo}`);
      setEncargos(prev => prev.filter(e => e.id_encargo !== toDelete.id_encargo));
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el encargo.");
    } finally {
      setToDelete(null);
    }
  };

  const cancelDelete = () => setToDelete(null);

  // Marcar como recibido 
  const markReceived = async (id) => {
    // estado previo para posible rollback
    const prev = encargos;

    
    setEncargos(curr =>
      curr.map(e => e.id_encargo === id ? { ...e, estado: "recibido" } : e)
    );
    setMarkingId(id);

    try {
      await api.put(`/encargos/${id}/recibido`);
    } catch (e) {
      console.error(e);
      setError("No se pudo marcar como recibido.");
      // rollback
      setEncargos(prev);
    } finally {
      setMarkingId(null);
    }
  };

  const filteredEncargos = encargos.filter(e =>
    (e.nombre_empresa || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Encargos</h1>
        <Link
          to="/encargos"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Encargo
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por proveedor..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEncargos.map((e) => (
          <EncargosCard
            key={e.id_encargo}
            encargo={e}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(e)}
            onMarkReceived={markReceived}              
            marking={markingId === e.id_encargo}    
          />
        ))}
        {filteredEncargos.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron encargos.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={`Encargo #${toDelete?.id_encargo}`}
        imageSrc={null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default EncargosList;
