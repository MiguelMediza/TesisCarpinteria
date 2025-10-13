import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import TipoTacoCard from "./TipoTacosCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const TipoTacosList = () => {
  const [tipos, setTipos] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTipos = async () => {
      try {
        const res = await api.get("/tipotacos/listar");
        setTipos(res.data);
      } catch (err) {
        setError("No se pudieron cargar los tipos de taco.");
      }
    };
    fetchTipos();
  }, []);

  const handleEdit = (id) => {
    navigate(`/tipotacos/${id}`);
  };

  const handleDeleteClick = (tipo) => {
    setDeleteError("");
    setToDelete(tipo);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/tipotacos/${toDelete.id_tipo_taco}`);
      setTipos((prev) =>
        prev.filter((t) => t.id_tipo_taco !== toDelete.id_tipo_taco)
      );
      setToDelete(null);
    } catch (err) {
      let msg = "No se pudo eliminar el tipo de taco.";
      const data = err?.response?.data;
      if (data) {
        if (typeof data === "string") msg = data;
        else if (data.message) msg = data.message;

        const partes = [];
        if (Array.isArray(data.prototipos) && data.prototipos.length) {
          partes.push(
            "Usado por prototipos:\n - " + data.prototipos.join("\n - ")
          );
        }
        if (Array.isArray(data.patines) && data.patines.length) {
          partes.push("Usado por patines:\n - " + data.patines.join("\n - "));
        }
        if (partes.length) msg += "\n" + partes.join("\n");
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

  const filteredTipos = tipos.filter((t) =>
    t.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const modalImg =
    toDelete?.foto_url ||
    (toDelete?.foto && /^https?:\/\//.test(toDelete.foto)
      ? toDelete.foto
      : null);

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tipos de Taco</h1>
        <Link
          to="/tipotacos"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Tipo de Taco
        </Link>
      </div>
      {error && <p className="mb-4 text-red-500">{error}</p>}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar tipo por título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTipos.map((t) => (
          <TipoTacoCard
            key={t.id_tipo_taco}
            tipoTaco={t}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(t)}
          />
        ))}
        {filteredTipos.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron tipos de taco.
          </p>
        )}
      </div>
      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.titulo}
        imageSrc={modalImg}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        error={deleteError}
        loading={deleting}
      />
    </section>
  );
};

export default TipoTacosList;
