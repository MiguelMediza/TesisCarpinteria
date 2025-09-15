// ConfirmModal.jsx
import React from "react";

const DeleteConfirm = ({ isOpen, title, imageSrc, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm 
                      shadow-2xl ring-1 ring-red-700 ring-opacity-10">
        {imageSrc && (
          <div className="flex justify-center mb-4">
            <img
              src={imageSrc}
              alt={title}
              className="w-24 h-24 object-cover rounded"
            />
          </div>
        )}
        <h2 className="text-lg font-semibold mb-2">¿Eliminar “{title}”?</h2>
        <p className="mb-6 text-sm text-gray-600">
          Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirm;



