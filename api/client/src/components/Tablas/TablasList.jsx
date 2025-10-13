import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import TablaCard from "./TablasCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const TablasList = () => {
  const [tablas, setTablas] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTablas = async () => {
      try {
        const res = await api.get("/tablas/listar");
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

  const handleDeleteClick = (tabla) => {
    setDeleteError("");
    setToDelete(tabla);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError("");

    try {
      await api.delete(`/tablas/${toDelete.id_materia_prima}`);
      setTablas((prev) =>
        prev.filter((t) => t.id_materia_prima !== toDelete.id_materia_prima)
      );
      setToDelete(null);
    } catch (err) {
      let msg = "No se pudo eliminar la tabla.";
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

  const filteredTablas = tablas.filter((t) =>
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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar tabla por título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
        imageSrc={toDelete?.foto_url || null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        error={deleteError}
        loading={deleting}
      />
    </section>
  );
};

export default TablasList;
