import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ClientesCard from "./ClientesCard";
import DeleteConfirm from "../Modals/DeleteConfirm";
import { api } from "../../api"; 

const ClientesList = () => {
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true; 
    const fetchClientes = async () => {
      try {
        const { data } = await api.get("/clientes/listar"); 
        if (isMounted) setClientes(data);
      } catch (err) {
        console.error("❌ Error al cargar clientes:", err);
        if (isMounted) setError("No se pudieron cargar los clientes.");
      }
    };
    fetchClientes();
    return () => { isMounted = false; };
  }, []);

  const handleEdit = (id) => {
    navigate(`/clientes/${id}`);
  };

  // Abrir modal
  const handleDeleteClick = (cliente) => {
    setToDelete(cliente);
  };

  // Confirmar eliminar
  const confirmDelete = async () => {
    try {
      await api.delete(`/clientes/${toDelete.id_cliente}`); 
      setClientes((prev) =>
        prev.filter((c) => c.id_cliente !== toDelete.id_cliente)
      );
    } catch (err) {
      console.error("❌ Error al eliminar cliente:", err);
      setError("Error al eliminar el cliente.");
    } finally {
      setToDelete(null);
    }
  };


  const cancelDelete = () => setToDelete(null);

  const filteredClientes = clientes.filter((c) =>
    `${c.nombre} ${c.apellido} ${c.nombre_empresa || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Link
          to="/clientes"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Cliente
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar cliente por nombre o empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClientes.map((cliente) => (
          <ClientesCard
            key={cliente.id_cliente}
            cliente={cliente}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(cliente)}
          />
        ))}
        {filteredClientes.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron clientes.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={
          toDelete?.es_empresa
            ? toDelete?.nombre_empresa
            : `${toDelete?.nombre || ""} ${toDelete?.apellido || ""}`.trim()
        }
        imageSrc={null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default ClientesList;
