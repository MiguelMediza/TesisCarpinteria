import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import ProveedorCard from "../components/ProveedorCard";

const ProveedoresList = () => {
  const [proveedores, setProveedores] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/src/proveedores/listar");
        setProveedores(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los proveedores.");
      }
    };
    fetchProveedores();
  }, []);

  const handleEdit = (id) => {
    navigate(`/proveedores/${id}/editar`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este proveedor?")) return;
    try {
      await axios.delete(`http://localhost:4000/api/src/proveedores/${id}`);
      setProveedores(prev => prev.filter(p => p.id_proveedor !== id));
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el proveedor.");
    }
  };

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <Link
          to="/proveedores"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Proveedor
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {proveedores.map((p) => (
          <ProveedorCard
            key={p.id_proveedor}
            proveedor={p}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </section>
  );
};

export default ProveedoresList;
