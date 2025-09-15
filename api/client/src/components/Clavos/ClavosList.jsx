import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import ClavosCard from "./ClavosCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const ClavosList = () => {
  const [clavos, setClavos] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClavos = async () => {
      try {
        const { data } = await api.get("/clavos/listar");
        setClavos(data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los clavos.");
      }
    };
    fetchClavos();
  }, []);

  const handleEdit = (id) => navigate(`/clavos/${id}`);

  const handleDeleteClick = (clavo) => setToDelete(clavo);

  const confirmDelete = async () => {
    try {
      await api.delete(`/clavos/${toDelete.id_materia_prima}`);
      setClavos((prev) =>
        prev.filter((c) => c.id_materia_prima !== toDelete.id_materia_prima)
      );
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el clavo.");
    } finally {
      setToDelete(null);
    }
  };

  const cancelDelete = () => setToDelete(null);

  const filteredClavos = clavos.filter((c) =>
    (c.titulo || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clavos</h1>
        <Link
          to="/clavos"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Clavo
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar clavo por título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClavos.map((c) => (
          <ClavosCard
            key={c.id_materia_prima}
            clavo={c}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(c)}
          />
        ))}
        {filteredClavos.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron clavos.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.titulo}
        imageSrc={
          toDelete?.foto ? `/images/clavos/${encodeURIComponent(toDelete.foto)}` : null
        }
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default ClavosList;
