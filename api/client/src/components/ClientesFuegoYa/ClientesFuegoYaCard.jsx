import React, { useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";

const formatMoney = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  });

const formatDate = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ClientesFuegoYaCard = ({ cliente, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.tipo === "admin";

  const { id_cliente, nombre, telefono, email } = cliente || {};

  const [loadingCred, setLoadingCred] = useState(false);
  const [credError, setCredError] = useState("");
  const [creditoData, setCreditoData] = useState(null); 

  useEffect(() => {
    if (!isAdmin || !id_cliente) return;

    let alive = true;
    (async () => {
      try {
        setLoadingCred(true);
        setCredError("");
        const { data } = await api.get(`/clientesfuegoya/${id_cliente}/credito`);
        if (!alive) return;
        setCreditoData(data || { creditos: [], credito_total: 0 });
      } catch (err) {
        if (!alive) return;
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "No se pudo cargar el crédito.";
        setCredError(msg);
      } finally {
        if (alive) setLoadingCred(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAdmin, id_cliente]);

  const resumen = useMemo(() => {
    if (!creditoData) return { lineas: 0, total: 0 };
    return {
      lineas: Array.isArray(creditoData.creditos)
        ? creditoData.creditos.length
        : 0,
      total: Number(creditoData.credito_total || 0),
    };
  }, [creditoData]);

  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>

        <p className="text-sm text-gray-600">Teléfono:</p>
        <p className="mb-2 text-gray-800">{telefono || "No especificado"}</p>

        <p className="text-sm text-gray-600">Email:</p>
        <p className="mb-2 text-gray-800">{email || "No especificado"}</p>

        {isAdmin && (
          <div className="mt-3 bg-gray-50 rounded">
            <div className="p-3">
              <p className="text-sm font-medium text-gray-800 mb-2">Crédito</p>

              {loadingCred && (
                <p className="text-sm text-gray-600">Cargando crédito…</p>
              )}

              {credError && (
                <p className="text-sm text-red-600">{credError}</p>
              )}

              {!loadingCred && !credError && creditoData && (
                <>
                  {Array.isArray(creditoData.creditos) &&
                  creditoData.creditos.length > 0 ? (
                    <ul className="space-y-2">
                      {creditoData.creditos.map((c) => (
                        <li
                          key={`${c.id_fuego_ya}-${c.tipo}`}
                          className="flex items-center justify-between rounded px-1 py-1"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {c.tipo || `FuegoYa #${c.id_fuego_ya}`}
                            </p>
                            <p className="text-xs text-gray-600">
                              Bolsas: <span className="font-medium">{c.bolsas}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">Monto</p>
                            <p className="text-sm font-semibold">
                              {formatMoney(c.monto)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Sin crédito pendiente.
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                      Líneas: <span className="font-medium">{resumen.lineas}</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Total crédito:{" "}
                      <span className="font-semibold">
                        {formatMoney(resumen.total)}
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => onEdit?.(id_cliente)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete?.(id_cliente)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default ClientesFuegoYaCard;
