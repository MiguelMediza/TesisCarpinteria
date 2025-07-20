import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import ClavosCard from "./ClavosCard";

const ClavosList = () => {
  const [clavos, setClavos] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClavos = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/src/clavos/listar");
        setClavos(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los clavos.");
      }
    };
    fetchClavos();
  }, []);

  const handleEdit = (id) => {
    navigate(`/clavos/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este clavo?")) return;
    try {
      await axios.delete(`http://localhost:4000/api/src/clavos/${id}`);
      setClavos(prev => prev.filter(c => c.id_materia_prima !== id));
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el clavo.");
    }
  };

  // Filtrar clavos por título según searchTerm
  const filteredClavos = clavos.filter(c =>
    c.titulo.toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* Buscador de clavos */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar clavo por título..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClavos.map((c) => (
          <ClavosCard
            key={c.id_materia_prima}
            clavo={c}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        {filteredClavos.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron clavos.
          </p>
        )}
      </div>
    </section>
  );
};

export default ClavosList;
