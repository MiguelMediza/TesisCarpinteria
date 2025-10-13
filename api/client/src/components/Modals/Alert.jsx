  const Alert = ({ type = "error", title, children, onClose }) => {
  const variants = {
    error: {
      wrap: "border-red-200 bg-red-50 text-red-800",
      icon: "text-red-600",
      close: "hover:bg-red-100 focus:ring-red-500",
      title: title ?? "Error",
    },
    success: {
      wrap: "border-emerald-200 bg-emerald-50 text-emerald-800",
      icon: "text-emerald-600",
      close: "hover:bg-emerald-100 focus:ring-emerald-500",
      title: title ?? "Éxito",
    },
  };
  const v = variants[type] ?? variants.error;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-sm ${v.wrap}`}
    >
      {/* Icono */}
      <div className={`mt-0.5 ${v.icon}`}>
        {type === "success" ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 9.586 7.707 8.293a1 1 0 10-1.414 1.414L9 12.414l4.707-4.121z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 10-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      <div className="flex-1">
        <p className="font-semibold">{v.title}</p>
        <p className="text-sm whitespace-pre-line">{children}</p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={`ml-2 inline-flex h-6 w-6 items-center justify-center rounded focus:outline-none focus:ring-2 ${v.close}`}
          aria-label="Cerrar alerta"
          title="Cerrar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-80" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Alert;