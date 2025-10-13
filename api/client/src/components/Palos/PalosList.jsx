import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import PaloCard from "./PaloCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const PalosList = () => {
  const [palos, setPalos] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPalos = async () => {
      try {
        const res = await api.get("/palos/listar");
        setPalos(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los tirantes.");
      }
    };
    fetchPalos();
  }, []);

  const handleEdit = (id) => {
    navigate(`/palos/${id}`);
  };

  const handleDeleteClick = (palo) => {
    setDeleteError("");
    setToDelete(palo);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError("");

    try {
      await api.delete(`/palos/${toDelete.id_materia_prima}`);
      setPalos((prev) =>
        prev.filter((p) => p.id_materia_prima !== toDelete.id_materia_prima)
      );
      setToDelete(null);
    } catch (err) {
      console.error(err);
      let msg = "No se pudo eliminar el tirante.";
      const data = err?.response?.data;
      if (data) {
        if (typeof data === "string") msg = data;
        else if (data.message) msg = data.message;
        if (Array.isArray(data.tipos) && data.tipos.length) {
          msg += "\nUsado por:\n - " + data.tipos.join("\n - ");
        }
      }
      setDeleteError(msg); 
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteError("");
    setToDelete(null);
  };

  const filteredPalos = palos.filter((p) =>
    (p.titulo || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tirantes</h1>
        <Link
          to="/palos"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Tirante
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar tirante por título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPalos.map((p) => (
          <PaloCard
            key={p.id_materia_prima}
            palo={p}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(p)}
          />
        ))}
        {filteredPalos.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron tirantes.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.titulo}
        imageSrc={toDelete?.foto_url || null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        error={deleteError}      
        loading={deleting}       
      />
    </section>
  );
};

export default PalosList;
