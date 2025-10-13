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
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();

  const R2 = import.meta.env.VITE_R2_PUBLIC_BASE;
  const BASE = (R2 || "").replace(/\/+$/, "");

  useEffect(() => {
    const fetchPatines = async () => {
      try {
        const res = await api.get("/tipopatines/listar");
        setPatines(res.data);
      } catch (err) {
        setError("No se pudieron cargar los tipos de patines.");
      }
    };
    fetchPatines();
  }, []);

  const handleEdit = (id) => {
    navigate(`/tipopatines/${id}`);
  };

  const handleDeleteClick = (patin) => {
    setDeleteError("");
    setToDelete(patin);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/tipopatines/${toDelete.id_tipo_patin}`);
      setPatines((prev) =>
        prev.filter((p) => p.id_tipo_patin !== toDelete.id_tipo_patin)
      );
      setToDelete(null);
    } catch (err) {
      let msg = "No se pudo eliminar el patín.";
      const data = err?.response?.data;
      if (data) {
        if (typeof data === "string") msg = data;
        else if (data.message) msg = data.message;
        if (Array.isArray(data.prototipos) && data.prototipos.length) {
          msg += "\nUsado por:\n - " + data.prototipos.join("\n - ");
        }
      }
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    if (deleting) return;
    setDeleteError("");
    setToDelete(null);
  };

  const filteredPatines = patines.filter((p) =>
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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar patín por título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

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

      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.titulo}
        imageSrc={
          toDelete?.logo_url
            ? toDelete.logo_url
            : toDelete?.logo
            ? `${BASE}/${String(toDelete.logo).replace(/^\/+/, "")}`
            : null
        }
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        error={deleteError}
        loading={deleting}
      />
    </section>
  );
};

export default TipoPatinesList;
