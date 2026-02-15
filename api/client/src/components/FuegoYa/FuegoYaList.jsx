import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import FuegoYaCard from "./FuegoYaCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const FuegoYaList = () => {
  const [fuegoya, setFuegoYa] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  const [deleteErr, setDeleteErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchFuegoYa = async () => {
      try {
        const res = await api.get("/fuegoya/listar");
        setFuegoYa(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los fuegoya.");
      }
    };
    fetchFuegoYa();
  }, []);

  const handleEdit = (id) => navigate(`/fuegoya/${id}`);
  const handleDeleteClick = (f) => setToDelete(f);

  const cancelDelete = () => {
    setToDelete(null);
    setDeleteErr("");
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      setDeleteErr("");

      await api.delete(`/fuegoya/${toDelete.id_fuego_ya}`);

      setFuegoYa((prev) => prev.filter((t) => t.id_fuego_ya !== toDelete.id_fuego_ya));
      setToDelete(null);
    } catch (err) {
      console.error(err);

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : "") ||
        (err?.response?.status === 409
          ? "No se puede eliminar: el registro está referenciado por otras entidades."
          : "No se pudo eliminar la FuegoYa.");

      setDeleteErr(msg);
    } finally {
      setDeleting(false);
    }
  };

  const filteredFuegoYa = fuegoya.filter((t) =>
    (t.tipo || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const modalImgSrc = toDelete?.foto_url || toDelete?.foto || null;

  return (
    <section className="p-4 pb-24 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fuego Ya</h1>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar Fuego Ya por tipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFuegoYa.map((t) => (
          <FuegoYaCard
            key={t.id_fuego_ya}
            fuegoya={t}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(t)}
          />
        ))}
        {filteredFuegoYa.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron Fuegos Ya.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={toDelete?.tipo}
        imageSrc={modalImgSrc}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        error={deleteErr}
        loading={deleting}
      />

      {/* Botón flotante siempre visible */}
      <Link
        to="/fuegoya"
        className="
          fixed bottom-6 right-6 z-50
          inline-flex items-center gap-2
          rounded-full bg-green-600 px-5 py-3
          text-white font-semibold shadow-lg
          hover:bg-green-700 active:scale-[0.98]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300
        "
        title="Nuevo Fuego Ya"
        aria-label="Nuevo Fuego Ya"
      >
        <span className="text-lg leading-none">＋</span>
        <span>Nuevo Fuego Ya</span>
      </Link>
    </section>
  );
};

export default FuegoYaList;
