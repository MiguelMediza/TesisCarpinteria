import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import VentasCard from "./VentasCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const VentasList = () => {
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        const res = await api.get("/ventas/listar");
        setVentas(res.data || []);
      } catch (err) {
        console.error("❌ Error cargando ventas:", err);
        setError("No se pudieron cargar las ventas.");
      }
    };
    fetchVentas();
  }, []);

  const handleEdit = (id) => navigate(`/ventas/${id}`);
  const handleDeleteClick = (venta) => setToDelete(venta);

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

  const cancelDelete = () => setToDelete(null);

  const filteredVentas = ventas.filter((v) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;

    const nombre = [
      v.cliente_display,
      v.nombre_cliente,
      v.empresa_cliente,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const comentarios = (v.comentarios || "").toLowerCase();
    return nombre.includes(search) || comentarios.includes(search);
  });

  const R2 = (import.meta.env.VITE_R2_PUBLIC_BASE || "").replace(/\/+$/, "");
  const imgFromVenta = (venta) =>
    venta?.foto_url ||
    (venta?.foto ? `${R2}/${String(venta.foto).replace(/^\/+/, "")}` : null);

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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar venta por cliente o comentario..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVentas.map((venta) => (
          <VentasCard
            key={venta.id_venta}
            venta={{
              ...venta,
              foto_url: imgFromVenta(venta),
            }}
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

      <DeleteConfirm
        isOpen={!!toDelete}
        title={`Venta #${toDelete?.id_venta}`}
        imageSrc={imgFromVenta(toDelete)}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default VentasList;
