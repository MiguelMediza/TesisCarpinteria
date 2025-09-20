import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ClientesFuegoYaCard from "./ClientesFuegoYaCard";
import DeleteConfirm from "../Modals/DeleteConfirm";
import { api } from "../../api";

const ClientesFuegoYaList = () => {
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await api.get("/clientesfuegoya/listar");
        if (isMounted) setClientes(data || []);
      } catch (err) {
        console.error("❌ Error al cargar clientes FuegoYa:", err);
        if (isMounted) setError("No se pudieron cargar los clientes de FuegoYa.");
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleEdit = (id) => {
    navigate(`/clientesfuegoya/${id}`);
  };

  const handleDeleteClick = (cliente) => setToDelete(cliente);

  const confirmDelete = async () => {
    try {
      await api.delete(`/clientesfuegoya/${toDelete.id_cliente}`);
      setClientes(prev => prev.filter(c => c.id_cliente !== toDelete.id_cliente));
    } catch (err) {
      console.error("❌ Error al eliminar cliente FuegoYa:", err);
      setError("Error al eliminar el cliente.");
    } finally {
      setToDelete(null);
    }
  };

  const cancelDelete = () => setToDelete(null);

  const filtered = clientes.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    return (
      (c.nombre || "").toLowerCase().includes(q) ||
      (c.telefono || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes FuegoYa</h1>
        <Link
          to="/clientesfuegoya"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Cliente
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <ClientesFuegoYaCard
            key={c.id_cliente}
            cliente={c}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(c)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron clientes.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.nombre || "Cliente"}
        imageSrc={null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default ClientesFuegoYaList;
