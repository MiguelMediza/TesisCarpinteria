import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import FibrasCard from "./FibrasCard";

const FibrasList = () => {
  const [fibras, setFibras] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFibras = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/src/fibras/listar");
        setFibras(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar las fibras.");
      }
    };
    fetchFibras();
  }, []);

  const handleEdit = (id) => {
    navigate(`/fibras/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta fibra?")) return;
    try {
      await axios.delete(`http://localhost:4000/api/src/fibras/${id}`);
      setFibras(prev => prev.filter(f => f.id_materia_prima !== id));
    } catch (err) {
      console.error(err);
      setError("Error al eliminar la fibra.");
    }
  };

  // Filtrar fibras por título según searchTerm
  const filteredFibras = fibras.filter(f =>
    f.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fibras</h1>
        <Link
          to="/fibras"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nueva Fibra
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {/* Buscador de fibras */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar fibra por título..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFibras.map((f) => (
          <FibrasCard
            key={f.id_materia_prima}
            fibra={f}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        {filteredFibras.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron fibras.
          </p>
        )}
      </div>
    </section>
  );
};

export default FibrasList;
