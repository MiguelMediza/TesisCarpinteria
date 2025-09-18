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
    setToDelete(tipo);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/tipotacos/${toDelete.id_tipo_taco}`);
      setTipos((prev) => prev.filter((t) => t.id_tipo_taco !== toDelete.id_tipo_taco));
    } catch {
      setError("Error al eliminar el tipo de taco.");
    } finally {
      setToDelete(null);
    }
  };

  const cancelDelete = () => {
    setToDelete(null);
  };

  const filteredTipos = tipos.filter((t) => t.titulo.toLowerCase().includes(searchTerm.toLowerCase()));

  const modalImg =
    toDelete?.foto_url ||
    (toDelete?.foto && /^https?:\/\//.test(toDelete.foto) ? toDelete.foto : null);

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tipos de Taco</h1>
        <Link to="/tipotacos" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
          + Nuevo Tipo
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
          <TipoTacoCard key={t.id_tipo_taco} tipoTaco={t} onEdit={handleEdit} onDelete={() => handleDeleteClick(t)} />
        ))}
        {filteredTipos.length === 0 && (
          <p className="col-span-full text-center text-gray-500">No se encontraron tipos de taco.</p>
        )}
      </div>
      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.titulo}
        imageSrc={modalImg}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default TipoTacosList;
