import React, { useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/authContext";
import { Collapse } from "flowbite";
import imanodLogo from "../assets/logoImanod.png";
import { Link, useLocation } from "react-router-dom";

const Nav = () => {
  const { currentUser, logout } = useContext(AuthContext);

  const navRootRef = useRef(null);
  const collapseRef = useRef(null);

  const closeMenu = () => {
    const c = collapseRef.current;
    if (c && typeof c.hide === "function") {
      try {
        c.hide();
      } catch {}
    }
  };

  useEffect(() => {
    const handleDocClick = (e) => {
      const root = navRootRef.current;
      if (!root) return;
      if (!root.contains(e.target)) closeMenu();
    };

    const handleDocTouch = (e) => {
      const root = navRootRef.current;
      if (!root) return;
      if (!root.contains(e.target)) closeMenu();
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") closeMenu();
    };

    document.addEventListener("click", handleDocClick);
    document.addEventListener("touchstart", handleDocTouch, { passive: true });
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("touchstart", handleDocTouch);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const handleNavigate = () => {
    closeMenu();

    const el = document.getElementById("navbar-default");
    if (el && !el.classList.contains("hidden")) el.classList.add("hidden");

    const trig = document.getElementById("triggerEl");
    if (trig) trig.setAttribute("aria-expanded", "false");
  };

  useEffect(() => {
    const $targetEl = document.getElementById("navbar-default");
    const $triggerEl = document.getElementById("triggerEl");

    if ($targetEl && $triggerEl && !collapseRef.current) {
      const c = new Collapse($targetEl, $triggerEl);
      if (c && typeof c.hide === "function") {
        collapseRef.current = c;
      }
    }

    return () => {
      closeMenu();
      collapseRef.current = null;
    };
  }, []);

  const location = useLocation();
  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  const handleNavClick = (e) => {
    const link = e.target.closest("a[href], a[role='menuitem']");
    if (link) handleNavigate();
  };

const canSeeFuegoYa = currentUser?.tipo === "fuegoya";

  return (
    <nav
      id="app-navbar"
      ref={navRootRef}
      className="bg-white border-gray-200 dark:bg-gray-900 fixed top-0 left-0 right-0 z-50"
    >
      <div className="max-w-screen-s flex flex-wrap items-center justify-between mx-auto p-4">
        <Link
          to="/"
          onClick={handleNavigate}
          className="flex items-center space-x-3 rtl:space-x-reverse"
        >
          <img src={imanodLogo} className="h-12" alt="Imanod Logo" />
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
            Imanod
          </span>
        </Link>

        <button
          id="triggerEl"
          data-collapse-toggle="navbar-default"
          type="button"
          className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
          aria-controls="navbar-default"
          aria-expanded="false"
        >
          <span className="sr-only">Open main menu</span>
          <svg
            className="w-5 h-5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 17 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M1 1h15M1 7h15M1 13h15"
            />
          </svg>
        </button>

        <div className="hidden w-full md:block md:w-auto" id="navbar-default">
          <ul
            onClick={handleNavClick}
            className="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 
                       md:flex-row md:space-x-8 md:justify-center items-center rtl:space-x-reverse md:mt-0 md:border-0 
                       md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700"
          >
            <li>
              <Link
                to="/"
                onClick={handleNavigate}
                className="block py-2 px-3 text-white bg-blue-700 rounded-sm md:bg-transparent md:text-blue-700 md:p-0 dark:text-white md:dark:text-blue-500"
                aria-current="page"
              >
                Inicio
              </Link>
            </li>

            {canSeeFuegoYa && (
              <>
                <li>
                  <Link
                    to="/clientesfuegoya/listar"
                    onClick={handleNavigate}
                    className="block px-3 py-1 rounded border border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800 transition
                               dark:text-green-300 dark:border-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-200"
                  >
                    Clientes Fuego Ya
                  </Link>
                </li>

                <li>
                  <Link
                    to="/fuegoya/listar"
                    onClick={handleNavigate}
                    className="block px-3 py-1 rounded border border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800 transition
                               dark:text-green-300 dark:border-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-200"
                  >
                    Fuego Ya
                  </Link>
                </li>

                <li>
                  <Link
                    to="/ventafuegoya/listar"
                    onClick={handleNavigate}
                    className="block px-3 py-1 rounded border border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800 transition
                               dark:text-green-300 dark:border-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-200"
                  >
                    Venta FuegoYa
                  </Link>
                </li>
              </>
            )}

            <li>
              {currentUser && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await logout();
                    } finally {
                      handleNavigate();
                    }
                  }}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded transition font-semibold shadow-sm focus:outline-none focus:ring-2 md:ml-10 focus:ring-red-400 focus:ring-opacity-50"
                >
                  Cerrar sesión
                </button>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
