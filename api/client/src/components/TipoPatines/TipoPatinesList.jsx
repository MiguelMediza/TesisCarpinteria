import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import TipoPatinesCard from "./TipoPatinesCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const TipoPatinesList = () => {
  const [patines, setPatines] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  // Cargar todos los tipos de patines
  useEffect(() => {
    const fetchPatines = async () => {
      try {
        const res = await api.get("/tipopatines/listar");
        setPatines(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los tipos de patines.");
      }
    };
    fetchPatines();
  }, []);

  // Navegar a edición
  const handleEdit = (id) => {
    navigate(`/tipopatines/${id}`);
  };

  // Abrir modal
  const handleDeleteClick = (patin) => {
    setToDelete(patin);
  };

  // Confirmar eliminación
  const confirmDelete = async () => {
    try {
      await api.delete(`/tipopatines/${toDelete.id_tipo_patin}`);
      setPatines(prev => prev.filter(p => p.id_tipo_patin !== toDelete.id_tipo_patin));
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el tipo de patín.");
    } finally {
      setToDelete(null);
    }
  };

  // Cancelar eliminación
  const cancelDelete = () => {
    setToDelete(null);
  };

  // Filtrar resultados
  const filteredPatines = patines.filter(p =>
    p.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tipos de Patines</h1>
        <Link
          to="/tipopatines"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Patín
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar patín por título..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Listado */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPatines.map((p) => (
          <TipoPatinesCard
            key={p.id_tipo_patin}
            tipoPatin={p}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(p)}
          />
        ))}
        {filteredPatines.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron tipos de patines.
          </p>
        )}
      </div>

      {/* Modal Confirmación */}
      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.titulo}
        imageSrc={toDelete ? `/images/tipo_patines/${encodeURIComponent(toDelete.logo)}` : null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default TipoPatinesList;
