import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import VentasCard from "./VentasCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const VentasList = () => {
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null); // venta seleccionada para borrar
  const navigate = useNavigate();

  // 🔹 Obtener todas las ventas
  useEffect(() => {
    const fetchVentas = async () => {
      try {
        const res = await api.get("/ventas/listar");
        setVentas(res.data);
      } catch (err) {
        console.error("❌ Error cargando ventas:", err);
        setError("No se pudieron cargar las ventas.");
      }
    };
    fetchVentas();
  }, []);

  // 🔹 Editar venta
  const handleEdit = (id) => {
    navigate(`/ventas/${id}`);
  };

  // 🔹 Abrir modal de confirmación
  const handleDeleteClick = (venta) => {
    setToDelete(venta);
  };

  // 🔹 Confirmar borrado
  const confirmDelete = async () => {
    try {
      await api.delete(`/ventas/${toDelete.id_venta}`);
      setVentas((prev) => prev.filter((v) => v.id_venta !== toDelete.id_venta));
    } catch (err) {
      console.error("❌ Error eliminando venta:", err);
      setError("Error al eliminar la venta.");
    } finally {
      setToDelete(null);
    }
  };

  // 🔹 Cancelar borrado
  const cancelDelete = () => {
    setToDelete(null);
  };

  // 🔹 Filtro por cliente o comentarios
  const filteredVentas = ventas.filter((v) => {
    const search = searchTerm.toLowerCase();
    return (
      (v.nombre_cliente && v.nombre_cliente.toLowerCase().includes(search)) ||
      (v.comentarios && v.comentarios.toLowerCase().includes(search))
    );
  });

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <Link
          to="/ventas"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nueva Venta
        </Link>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {/* 🔍 Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar venta por cliente o comentario..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 🔹 Grid de ventas */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVentas.map((venta) => (
          <VentasCard
            key={venta.id_venta}
            venta={venta}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(venta)}
          />
        ))}

        {filteredVentas.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron ventas.
          </p>
        )}
      </div>

      {/* 🔹 Modal de confirmación */}
      <DeleteConfirm
        isOpen={!!toDelete}
        title={`Venta #${toDelete?.id_venta}`}
        imageSrc={toDelete?.foto ? `/images/ventas/${encodeURIComponent(toDelete.foto)}` : null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default VentasList;
