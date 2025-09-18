import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import PelletsCard from "./PelletsCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const PelletsList = () => {
  const [pellets, setPellets] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPellets = async () => {
      try {
        const res = await api.get("/pellets/listar");
        setPellets(res.data);
      } catch (err) {
        setError("No se pudieron cargar los pellets.");
      }
    };
    fetchPellets();
  }, []);

  const handleEdit = (id) => {
    navigate(`/pellets/${id}`);
  };

  const handleDeleteClick = (pellet) => {
    setToDelete(pellet);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/pellets/${toDelete.id_pellet}`);
      setPellets(prev => prev.filter(p => p.id_pellet !== toDelete.id_pellet));
    } catch (err) {
      setError("Error al eliminar el pellet.");
    } finally {
      setToDelete(null);
    }
  };

  const cancelDelete = () => setToDelete(null);

  const filteredPellets = pellets.filter(p =>
    (p.titulo || "").toLowerCase().includes(searchTerm.toLowerCase())
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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar pellet por título..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

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

      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.titulo}
        imageSrc={toDelete?.foto_url || null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default PelletsList;
