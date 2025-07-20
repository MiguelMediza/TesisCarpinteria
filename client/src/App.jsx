import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";

import Home from "./pages/home/Home";
import Proveedores from "./pages/proveedores/proveedores";
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
import { useContext } from "react";
import { DarkModeContext } from "./context/darkModeContext";
import { AuthContext } from "./context/authContext";


function App() {
  const {currentUser} = useContext(AuthContext);

  const { darkMode } = useContext(DarkModeContext);

  const Layout = () => {
    return (
      <div className={`theme-${darkMode ? "dark" : "light"}`}>
        <div style={{ display: "flex" }}>
          <div style={{ flex: 6 }}>
            <Outlet /> {/* Esto renderiza las rutas hijas */}
          </div>
        </div>
      </div>
    );
  };

  const ProtectedRoute = ({ children }) => {
    if (!currentUser) {
      return <Navigate to="/login" />;
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
         }
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
