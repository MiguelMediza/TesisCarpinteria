import React, { useEffect } from "react";
import Alert from "./Alert"; 

const DeleteConfirm = ({ isOpen, title, imageSrc, onConfirm, onCancel, error, loading }) => {
  if (!isOpen) return null;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, onCancel]);

  const handleBackdropClick = () => {
    if (!loading) onCancel?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

      {/* Contenido */}
      <div
        className="relative z-10 bg-white rounded-lg p-6 w-full max-w-sm shadow-2xl ring-1 ring-red-700/10"
        onClick={(e) => e.stopPropagation()}
      >
        {imageSrc && (
          <div className="flex justify-center mb-4">
            <img src={imageSrc} alt={title} className="w-24 h-24 object-cover rounded" />
          </div>
        )}

        <h2 className="text-lg font-semibold mb-2">¿Eliminar “{title}”?</h2>
        <p className="mb-4 text-sm text-gray-600">Esta acción no se puede deshacer.</p>

        {error && (
          <div className="mb-4">
            <Alert type="error" title="No se puede eliminar">
              {error}
            </Alert>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirm;
