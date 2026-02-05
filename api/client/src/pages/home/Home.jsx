import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import StatsFuegoYaPanel from "../../components/Graficas/StatsFuegoYaPanel";

const Home = () => {
  const { currentUser } = useContext(AuthContext);

  const isFuegoYaUser = currentUser?.tipo === "fuegoya";

  return (
    <section className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Resumen Fuego Ya
          </h1>
        </div>

        {isFuegoYaUser ? (
          <StatsFuegoYaPanel />
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-700">
              No tenés permisos para ver el panel de Fuego Ya.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Home;
