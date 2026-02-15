import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  Outlet,
  Navigate,
  useLocation,            
} from "react-router-dom";

import Nav from "./components/Nav";
import Home from "./pages/home/Home";
import FuegoYa from "./pages/fuegoYa/FuegoYa";
import FuegoYaList from "./pages/fuegoYa/FuegoYaList";
import { useContext, useState, useEffect } from "react";
import { DarkModeContext } from "./context/darkModeContext";
import { AuthContext } from "./context/authContext";
import VentaFuegoYa from "./pages/ventaFuegoYa/VentaFuegoYa";
import VentaFuegoYaList from "./pages/ventaFuegoYa/VentaFuegoYaList";
import ClientesFuegoYa from "./pages/clientesFuegoYa/ClientesFuegoYa";
import ClientesFuegoYaList from "./pages/clientesFuegoYa/ClientesFuegoYaList";

function App() {
  const { currentUser } = useContext(AuthContext);

  const { darkMode } = useContext(DarkModeContext);

  const Layout = () => {
  const [navH, setNavH] = useState(72);

  useEffect(() => {
    const el = document.getElementById("app-navbar");
    if (!el) return;

    const update = () => setNavH(el.offsetHeight || 72);

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className={`theme-${darkMode ? "dark" : "light"}`}>
      <Nav />
      <main className="min-h-screen" style={{ paddingTop: navH }}>
        <Outlet />
      </main>
    </div>
  );
};


  const ProtectedRoute = ({ children }) => {
    if (!currentUser) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  const AdminRoute = ({ children }) => {
    if (!currentUser) {
      return <Navigate to="/login" />;
    }
    if (currentUser.tipo !== "admin") {
      return <Navigate to="/" />;
    }
    return children;
  };

  const FuegoYaOrAdminRoute = ({ children }) => {
    if (!currentUser) return <Navigate to="/login" />;
    if (currentUser.tipo === "admin" || currentUser.tipo === "fuegoya") return children;
    return <Navigate to="/" />;
  };

  const FuegoYaGuard = ({ children }) => {
    const location = useLocation();
    if (!currentUser) return <Navigate to="/login" replace />;

    if (currentUser.tipo === "fuegoya") {
      const path = location.pathname || "/";
      const allowedPrefixes = ["/", "/ventafuegoya", "/fuegoya", "/clientesfuegoya"];
      const allowed = allowedPrefixes.some((p) =>
        p === "/" ? path === "/" : path.startsWith(p)
      );
      if (!allowed) {
        return <Navigate to="/ventafuegoya/listar" replace />;
      }
    }
    return children;
  };

  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <FuegoYaGuard>
            <Layout />
          </FuegoYaGuard>
        </ProtectedRoute>
      ),
      children: [
        {
          path: "/",
          element: <Home />,
        },

        // ——— Secciones de FUEGO YA: permitir admin o fuegoya ———
        {
          path: "/clientesfuegoya",
          element: (
            <FuegoYaOrAdminRoute>
              <ClientesFuegoYa />
            </FuegoYaOrAdminRoute>
          ),
        },
        {
          path: "/clientesfuegoya/listar",
          element: (
            <FuegoYaOrAdminRoute>
              <ClientesFuegoYaList />
            </FuegoYaOrAdminRoute>
          ),
        },
        {
          path: "/clientesfuegoya/:id",
          element: (
            <FuegoYaOrAdminRoute>
              <ClientesFuegoYa />
            </FuegoYaOrAdminRoute>
          ),
        },
        {
          path: "/fuegoya",
          element: (
            <FuegoYaOrAdminRoute>
              <FuegoYa />
            </FuegoYaOrAdminRoute>
          ),
        },
        {
          path: "/fuegoya/listar",
          element: (
            <FuegoYaOrAdminRoute>
              <FuegoYaList />
            </FuegoYaOrAdminRoute>
          ),
        },
        {
          path: "/fuegoya/:id",
          element: (
            <FuegoYaOrAdminRoute>
              <FuegoYa />
            </FuegoYaOrAdminRoute>
          ),
        },

        {
          path: "/ventafuegoya",
          element: (
            <FuegoYaOrAdminRoute>
              <VentaFuegoYa />
            </FuegoYaOrAdminRoute>
          ),
        },
        {
          path: "/ventafuegoya/listar",
          element: (
            <FuegoYaOrAdminRoute>
              <VentaFuegoYaList />
            </FuegoYaOrAdminRoute>
          ),
        },
        {
          path: "/ventafuegoya/:id",
          element: (
            <FuegoYaOrAdminRoute>
              <VentaFuegoYa />
            </FuegoYaOrAdminRoute>
          ),
        },
      ],
    },
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "/register",
      element: <Register />,
    },
  ]);

  return (
    <div>
      <RouterProvider router={router} />
    </div>
  );
}

export default App;