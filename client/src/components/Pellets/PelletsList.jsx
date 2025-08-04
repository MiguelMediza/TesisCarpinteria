import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import PelletsCard from "./PelletsCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const PelletsList = () => {
  const [pellets, setPellets] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null); // pellet seleccionado para borrar
  const navigate = useNavigate();

  // 🔹 Cargar pellets al iniciar
  useEffect(() => {
    const fetchPellets = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/src/pellets/listar");
        setPellets(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los pellets.");
      }
    };
    fetchPellets();
  }, []);

  // 🔹 Editar pellet
  const handleEdit = (id) => {
    navigate(`/pellets/${id}`);
  };

  // 🔹 Abrir modal de confirmación
  const handleDeleteClick = (pellet) => {
    setToDelete(pellet);
  };

  // 🔹 Confirmar eliminación
  const confirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:4000/api/src/pellets/${toDelete.id_pellet}`);
      setPellets(prev => prev.filter(p => p.id_pellet !== toDelete.id_pellet));
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el pellet.");
    } finally {
      setToDelete(null);
    }
  };

  // 🔹 Cancelar eliminación
  const cancelDelete = () => {
    setToDelete(null);
  };

  // 🔹 Filtro de búsqueda
  const filteredPellets = pellets.filter(p =>
    p.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pellets</h1>
        <Link
          to="/pellets"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Pellet
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar pellet por título..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Listado de pellets */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPellets.map((p) => (
          <PelletsCard
            key={p.id_pellet}
            pellet={p}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(p)}
          />
        ))}
        {filteredPellets.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron pellets.
          </p>
        )}
      </div>

      {/* Modal de confirmación de borrado */}
      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.titulo}
        imageSrc={toDelete ? `http://localhost:4000/images/pellets/${toDelete.foto}` : null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default PelletsList;
