import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";

import Nav from "./components/Nav";
import Home from "./pages/home/Home";
import Proveedores from "./pages/proveedores/Proveedores";
import ProveedoresList from "./pages/proveedores/ProveedoresList";
import Tablas from "./pages/tablas/Tablas";
import TablasList from "./pages/tablas/TablasList";
import Palos from "./pages/palos/Palos";
import PalosList from "./pages/palos/PalosList";
import Clavos from "./pages/clavos/Clavos";
import ClavosList from "./pages/clavos/ClavosList";
import Fibras from "./pages/fibras/Fibras";
import FibrasList from "./pages/fibras/FibrasList";
import TipoTablas from "./pages/tipoTablas/TipoTablas";
import TipoTablasList from "./pages/tipoTablas/TipoTablasList";
import TipoTacos from "./pages/tipoTacos/TipoTacos";
import TipoTacosList from "./pages/tipoTacos/TipoTacosList";
import TipoPatines from "./pages/tipoPatines/TipoPatines";
import TipoPatinesList from "./pages/tipoPatines/TipoPatinesList";
import FuegoYa from "./pages/fuegoYa/FuegoYa";
import FuegoYaList from "./pages/fuegoYa/FuegoYaList";
import Pellets from "./pages/pellets/Pellets";
import PelletsList from "./pages/pellets/PelletsList";
import Clientes from "./pages/clientes/Clientes";
import ClientesList from "./pages/clientes/ClientesList";
import Ventas from "./pages/ventas/Ventas";
import VentasList from "./pages/ventas/VentasList";
import { useContext, useState, useEffect } from "react";
import { DarkModeContext } from "./context/darkModeContext";
import { AuthContext } from "./context/authContext";
import Encargos from "./pages/encargos/Encargos";
import EncargosList from "./pages/encargos/EncargosList";
import PrototipoPallet from "./pages/prototipoPallet/PrototipoPallet";
import PrototipoPalletList from "./pages/prototipoPallet/PrototipoPalletList";
import Pedidos from "./pages/pedidos/Pedidos";
import PedidosList from "./pages/pedidos/PedidosList";
import VentaFuegoYa from "./pages/ventaFuegoYa/VentaFuegoYa";
import VentaFuegoYaList from "./pages/ventaFuegoYa/VentaFuegoYaList";

import ClientesFuegoYa from "./pages/clientesFuegoYa/ClientesFuegoYa";
import ClientesFuegoYaList from "./pages/clientesFuegoYa/ClientesFuegoYaList";




function App() {
  const {currentUser} = useContext(AuthContext);

  const { darkMode } = useContext(DarkModeContext);

const Layout = ({ darkMode }) => {
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


  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      children: [
        {
          path: "/",
          element: <Home />,
        },
        {
          path: "/proveedores",
          element: <Proveedores />,
        },
        {
          path: "/proveedores/listar",
          element: <ProveedoresList />,
        },
        { 
          path: "proveedores/:id", 
          element: <Proveedores />,
         },
        { 
          path: "/tablas", 
          element: <Tablas />,
         },
        { 
          path: "/tablas/listar", 
          element: <TablasList />,
         },
         {
          path: "/tablas/:id",
          element: <Tablas />,
         },
         {
          path: "/palos",
          element: <Palos/>
         },
         {
          path: "/palos/listar",
          element: <PalosList />,
         },
         {
          path: "/palos/:id",
          element: <Palos />,
         },
         {
          path: "/clavos",
          element: <Clavos />,
         },
         {
          path: "/clavos/listar",
          element: <ClavosList />,
         },
         {
          path: "/clavos/:id",
          element: <Clavos />,
         },
         {
          path: "/fibras",
          element: <Fibras />,
         },
         {
          path: "/fibras/listar",
          element: <FibrasList />,
         },
         {
          path: "/fibras/:id",
          element: <Fibras />,
         },
         {
          path: "/tipoTablas",
          element: <TipoTablas />,
         },
         {
          path: "/tipoTablas/listar",
          element: <TipoTablasList />,
         },
         {
          path: "/tipoTablas/:id",
          element: <TipoTablas />,
         },
         {
          path: "/tipotacos",
          element: <TipoTacos />,
         },
         {
          path: "/tipotacos/:id",
          element: <TipoTacos />,
         },
         {
           path: "/tipotacos/listar",
           element: <TipoTacosList />,
         },
         {
          path: "/tipopatines",
          element: <TipoPatines />,
         },
         {
          path: "/tipopatines/listar",
          element: <TipoPatinesList />,
         },
         {
          path: "/tipopatines/:id",
          element: <TipoPatines />,
         },
         {
          path: "/clientesfuegoya",
          element: <ClientesFuegoYa/>
         },
         {
          path: "/clientesfuegoya/listar",
          element: <ClientesFuegoYaList/>
         },
         {
          path: "/clientesfuegoya/:id",
          element: <ClientesFuegoYa/>
         },
         {
          path: "/fuegoya",
          element: <FuegoYa/>
         },
         {
          path: "/fuegoya/listar",
          element: <FuegoYaList/>
         },
         {
          path: "/fuegoya/:id",
          element: <FuegoYa/>
         },
         {
          path: "/pellets",
          element: <Pellets/>
         },
         {
          path: "/pellets/listar",
          element: <PelletsList/>
         },
         {
          path: "/pellets/:id",
          element: <Pellets/>
         },
         {
          path: "/clientes",
          element: <Clientes/>
         },
         {
          path: "/clientes/listar",
          element: <ClientesList/>
         },
         {
          path: "/clientes/:id",
          element: <Clientes/>
         },
         {
          path: "/prototipos",
          element: <PrototipoPallet/>
         },
         {
          path: "/prototipos/listar",
          element: <PrototipoPalletList/>
         },
         {
          path: "/prototipos/:id",
          element: <PrototipoPallet/>
         },
         {
          path: "/pedidos",
          element: <Pedidos/>,
         },
         {
          path: "/pedidos/listar",
          element: <PedidosList/>,
         },
         {
          path: "/pedidos/:id",
          element: <Pedidos/>,
         },
         {
          path: "/encargos",
          element: <Encargos/>,
         },
         {
          path: "/encargos/listar",
          element: <EncargosList/>,
         },
         {
          path: "/encargos/:id",
          element: <Encargos/>,
         },
         {
          path: "/ventas",
          element: (
            <AdminRoute>
              <Ventas/>
            </AdminRoute>
          ),
        },
        {
          path: "/ventas/listar",
          element: (
            <AdminRoute>
              <VentasList/>
            </AdminRoute>
          ),
        },
        {
          path: "/ventas/:id",
          element: (
            <AdminRoute>
              <Ventas/>
            </AdminRoute>
          ),
        },
        {
          path: "/ventafuegoya",
          element: (
            <AdminRoute>
              <VentaFuegoYa/>
            </AdminRoute>
          ),
        },
        {
          path: "/ventafuegoya/listar",
          element: (
            <AdminRoute>
              <VentaFuegoYaList/>
            </AdminRoute>
          ),
        },
        {
          path: "/ventafuegoya/:id",
          element: (
            <AdminRoute>
              <VentaFuegoYa/>
            </AdminRoute>
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
