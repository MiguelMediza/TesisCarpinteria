import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import ClientesCard from "./ClientesCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const ClientesList = () => {
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  // 🔹 Obtener clientes al montar el componente
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/src/clientes/listar");
        setClientes(res.data);
      } catch (err) {
        console.error("❌ Error al cargar clientes:", err);
        setError("No se pudieron cargar los clientes.");
      }
    };
    fetchClientes();
  }, []);

  // 🔹 Editar cliente
  const handleEdit = (id) => {
    navigate(`/clientes/${id}`);
  };

  // 🔹 Abrir modal de confirmación para eliminar
  const handleDeleteClick = (cliente) => {
    setToDelete(cliente);
  };

  // 🔹 Confirmar eliminación
  const confirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:4000/api/src/clientes/${toDelete.id_cliente}`);
      setClientes(prev => prev.filter(c => c.id_cliente !== toDelete.id_cliente));
    } catch (err) {
      console.error("❌ Error al eliminar cliente:", err);
      setError("Error al eliminar el cliente.");
    } finally {
      setToDelete(null);
    }
  };

  // 🔹 Cancelar eliminación
  const cancelDelete = () => {
    setToDelete(null);
  };

  // 🔹 Filtrar clientes por nombre, apellido o empresa
  const filteredClientes = clientes.filter(c =>
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

      {/* 🔹 Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar cliente por nombre o empresa..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 🔹 Lista de clientes */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClientes.map(cliente => (
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

      {/* 🔹 Modal de confirmación */}
      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.es_empresa ? toDelete?.nombre_empresa : `${toDelete?.nombre} ${toDelete?.apellido}`}
        imageSrc={null} // Clientes no tienen foto
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default ClientesList;
