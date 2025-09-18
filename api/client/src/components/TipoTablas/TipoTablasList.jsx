import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import TipoTablasCard from "./TipoTablasCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const TipoTablasList = () => {
  const [tipos, setTipos] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTipos = async () => {
      try {
        const res = await api.get("/tipotablas/listar");
        setTipos(res.data);
      } catch (err) {
        setError("No se pudieron cargar los tipos de tabla.");
      }
    };
    fetchTipos();
  }, []);

  const handleEdit = (id) => {
    navigate(`/tipotablas/${id}`);
  };

  const handleDeleteClick = (tipo) => {
    setToDelete(tipo);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/tipotablas/${toDelete.id_tipo_tabla}`);
      setTipos(prev => prev.filter(t => t.id_tipo_tabla !== toDelete.id_tipo_tabla));
    } catch (err) {
      setError("Error al eliminar el tipo de tabla.");
    } finally {
      setToDelete(null);
    }
  };

  const cancelDelete = () => {
    setToDelete(null);
  };

  const filteredTipos = tipos.filter(t =>
    t.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tipos de Tabla</h1>
        <Link
          to="/tipotablas"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Tipo
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar tipo por título..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTipos.map((t) => (
          <TipoTablasCard
            key={t.id_tipo_tabla}
            tipoTabla={t}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(t)}
          />
        ))}
        {filteredTipos.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron tipos de tabla.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.titulo}
        imageSrc={toDelete ? toDelete.foto || null : null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default TipoTablasList;
