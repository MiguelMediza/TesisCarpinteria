import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import TablaCard from "./TablasCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const TablasList = () => {
  const [tablas, setTablas] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null); // tabla seleccionada para borrar
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTablas = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/src/tablas/listar");
        setTablas(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar las tablas.");
      }
    };
    fetchTablas();
  }, []);

  const handleEdit = (id) => {
    navigate(`/tablas/${id}`);
  };

  // Abrir modal
  const handleDeleteClick = (tabla) => {
    setToDelete(tabla);
  };

  // Confirmar borrado
  const confirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:4000/api/src/tablas/${toDelete.id_materia_prima}`);
      setTablas(prev =>
        prev.filter(t => t.id_materia_prima !== toDelete.id_materia_prima)
      );
    } catch (err) {
      console.error(err);
      setError("Error al eliminar la tabla.");
    } finally {
      setToDelete(null);
    }
  };

  // Cancelar borrado
  const cancelDelete = () => {
    setToDelete(null);
  };

  // Filtrar por título
  const filteredTablas = tablas.filter(t =>
    t.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tablas</h1>
        <Link
          to="/tablas"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nueva Tabla
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {/* Buscador de tablas */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar tabla por título..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTablas.map((t) => (
          <TablaCard
            key={t.id_materia_prima}
            tabla={t}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(t)}
          />
        ))}
        {filteredTablas.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron tablas.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.titulo}
        imageSrc={toDelete ? `http://localhost:4000/images/tablas/${toDelete.foto}` : null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default TablasList;
