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

const [deleteErr, setDeleteErr] = useState("");
const [deleting, setDeleting] = useState(false);

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

    setFuegoYa(prev => prev.filter(t => t.id_fuego_ya !== toDelete.id_fuego_ya));
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
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fuego Ya</h1>
        <Link
          to="/fuegoya"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Fuego Ya
        </Link>
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
    </section>
  );
};

export default FuegoYaList;
