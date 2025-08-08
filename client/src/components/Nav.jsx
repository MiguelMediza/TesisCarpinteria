import React from 'react'
import { useContext, useEffect } from "react";
import { AuthContext } from "../context/authContext";
import { Collapse, Dropdown } from 'flowbite';
import imanodLogo from '../assets/logoImanod.png';
import { Link } from 'react-router-dom';
const Nav = () =>{
    const { currentUser, logout } = useContext(AuthContext);

  useEffect(() => {
    // Collapse para menú hamburguesa
    const $targetEl = document.getElementById('navbar-default');
    const $triggerEl = document.getElementById('triggerEl');
    if ($targetEl && $triggerEl) {
      new Collapse($targetEl, $triggerEl);
    }

    // Dropdown Materia Prima
    const $materiaPrimaTrigger = document.getElementById('dropdownMateriaPrimaButton');
    const $materiaPrimaMenu = document.getElementById('dropdownMateriaPrimaMenu');
    if ($materiaPrimaTrigger && $materiaPrimaMenu) {
      new Dropdown($materiaPrimaMenu, $materiaPrimaTrigger);
    }

    // Sub-dropdowns para cada materia prima
    const materias = ['tablas', 'palos', 'clavos', 'fibras', 'tipostablas', 'tipostacos', 'tipospatines'];
    materias.forEach((mat) => {
      const trigger = document.getElementById(`dropdown-${mat}-button`);
      const menu = document.getElementById(`dropdown-${mat}-menu`);
      if (trigger && menu) {
        new Dropdown(menu, trigger, { placement: "right-start" });
      }
    });
  }, []);

  return (
    <nav className="bg-white border-gray-200 dark:bg-gray-900">
      <div className="max-w-screen-s flex flex-wrap items-center justify-between mx-auto p-4">
        <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img src={imanodLogo} className="h-15" alt="Flowbite Logo" />
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
            Imanod
          </span>
        </a>
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
          <ul className="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 md:justify-center items-center rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
            <li>
              <a
                href="/"
                className="block py-2 px-3 text-white bg-blue-700 rounded-sm md:bg-transparent md:text-blue-700 md:p-0 dark:text-white md:dark:text-blue-500"
                aria-current="page"
              >
                Inicio
              </a>
            </li>
            {/* Doble Dropdown Materia Prima */}
            <li className="relative">
              <button
                id="dropdownMateriaPrimaButton"
                data-dropdown-toggle="dropdownMateriaPrimaMenu"
                className="flex items-center justify-between w-full py-2 px-3 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent"
              >
                Materia Prima
                <svg
                  className="w-2.5 h-2.5 ms-2.5"
                  aria-hidden="true"
                  fill="none"
                  viewBox="0 0 10 6"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 1 4 4 4-4"
                  />
                </svg>
              </button>
              <div
                id="dropdownMateriaPrimaMenu"
                className="z-10 hidden font-normal bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700 dark:divide-gray-600"
              >
                <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                  {/* tablas */}
                  <li className="relative">
                    <button
                      id="dropdown-tablas-button"
                      data-dropdown-toggle="dropdown-tablas-menu"
                      data-dropdown-placement="right-start"
                      type="button"
                      className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                    >
                      Tablas
                      <svg
                        className="w-2.5 h-2.5 ms-2.5"
                        aria-hidden="true"
                        fill="none"
                        viewBox="0 0 10 6"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m1 1 4 4 4-4"
                        />
                      </svg>
                    </button>
                    <div
                      id="dropdown-tablas-menu"
                      className="z-20 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-40 dark:bg-gray-700"
                    >
                      <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                        <li>
                          <Link
                            to="/tablas"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Agregar
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/tablas/listar"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Listar
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </li>
                  {/* Palos */}
                  <li className="relative">
                    <button
                      id="dropdown-palos-button"
                      data-dropdown-toggle="dropdown-palos-menu"
                      data-dropdown-placement="right-start"
                      type="button"
                      className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                    >
                      Palos
                      <svg
                        className="w-2.5 h-2.5 ms-2.5"
                        aria-hidden="true"
                        fill="none"
                        viewBox="0 0 10 6"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m1 1 4 4 4-4"
                        />
                      </svg>
                    </button>
                    <div
                      id="dropdown-palos-menu"
                      className="z-20 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-40 dark:bg-gray-700"
                    >
                      <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                        <li>
                          <Link
                            to="/palos"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Agregar
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/palos/listar"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Listar
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </li>
                  {/* Clavos */}
                  <li className="relative">
                    <button
                      id="dropdown-clavos-button"
                      data-dropdown-toggle="dropdown-clavos-menu"
                      data-dropdown-placement="right-start"
                      type="button"
                      className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                    >
                      Clavos
                      <svg
                        className="w-2.5 h-2.5 ms-2.5"
                        aria-hidden="true"
                        fill="none"
                        viewBox="0 0 10 6"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m1 1 4 4 4-4"
                        />
                      </svg>
                    </button>
                    <div
                      id="dropdown-clavos-menu"
                      className="z-20 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-40 dark:bg-gray-700"
                    >
                      <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                        <li>
                          <Link
                            to="/clavos"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Agregar
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/clavos/listar"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Listar
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </li>
                  {/* Fibras */}
                  <li className="relative">
                    <button
                      id="dropdown-fibras-button"
                      data-dropdown-toggle="dropdown-fibras-menu"
                      data-dropdown-placement="right-start"
                      type="button"
                      className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                    >
                      Fibras
                      <svg
                        className="w-2.5 h-2.5 ms-2.5"
                        aria-hidden="true"
                        fill="none"
                        viewBox="0 0 10 6"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m1 1 4 4 4-4"
                        />
                      </svg>
                    </button>
                    <div
                      id="dropdown-fibras-menu"
                      className="z-20 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-40 dark:bg-gray-700"
                    >
                      <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                        <li>
                          <Link
                            to="/fibras"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Agregar
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/fibras/listar"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Listar
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </li>
                  {/* Tipos tablas */}
                  <li className="relative">
                    <button
                      id="dropdown-tipostablas-button"
                      data-dropdown-toggle="dropdown-tipostablas-menu"
                      data-dropdown-placement="right-start"
                      type="button"
                      className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                    >
                      Tipos de tablas
                      <svg
                        className="w-2.5 h-2.5 ms-2.5"
                        aria-hidden="true"
                        fill="none"
                        viewBox="0 0 10 6"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m1 1 4 4 4-4"
                        />
                      </svg>
                    </button>
                    <div
                      id="dropdown-tipostablas-menu"
                      className="z-20 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-40 dark:bg-gray-700"
                    >
                      <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                        <li>
                          <Link
                            to="/tipotablas"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Agregar
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/tipotablas/listar"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Listar
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </li>
                  {/* Tipos tacos */}
                  <li className="relative">
                    <button
                      id="dropdown-tipostacos-button"
                      data-dropdown-toggle="dropdown-tipostacos-menu"
                      data-dropdown-placement="right-start"
                      type="button"
                      className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                    >
                      Tipos de tacos
                      <svg
                        className="w-2.5 h-2.5 ms-2.5"
                        aria-hidden="true"
                        fill="none"
                        viewBox="0 0 10 6"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m1 1 4 4 4-4"
                        />
                      </svg>
                    </button>
                    <div
                      id="dropdown-tipostacos-menu"
                      className="z-20 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-40 dark:bg-gray-700"
                    >
                      <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                        <li>
                          <Link
                            to="/tipotacos"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Agregar
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/tipotacos/listar"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Listar
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </li>
                  {/* Tipos de patines */}
                  <li className="relative">
                    <button
                      id="dropdown-tipospatines-button"
                      data-dropdown-toggle="dropdown-tipospatines-menu"
                      data-dropdown-placement="right-start"
                      type="button"
                      className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                    >
                      Tipos de patines
                      <svg
                        className="w-2.5 h-2.5 ms-2.5"
                        aria-hidden="true"
                        fill="none"
                        viewBox="0 0 10 6"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m1 1 4 4 4-4"
                        />
                      </svg>
                    </button>
                    <div
                      id="dropdown-tipospatines-menu"
                      className="z-20 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-40 dark:bg-gray-700"
                    >
                      <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                        <li>
                          <Link
                            to="/tipopatines"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Agregar
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/tipopatines/listar"
                            className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
                          >
                            Listar
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </li>
                </ul>
              </div>
            </li>

            {/* Otros menús */}
            <li>
              <Link
                to="/proveedores"
                className="block py-2 px-3 text-gray-900 rounded-sm hover:bg-gray-100 
                          md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                          md:p-0 dark:text-white md:dark:hover:text-blue-500 
                          dark:hover:bg-gray-700 dark:hover:text-white 
                          md:dark:hover:bg-transparent"
              >
                Proveedores
              </Link>
            </li>
            <li>
              <Link
                to="/encargos"
                className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
              >
                Encargos
              </Link>
            </li>
            <li>
              <a
                href="#"
                className="block py-2 px-3 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent"
              >
                Prototipos
              </a>
            </li>
            <li>
              <a
                href="#"
                className="block py-2 px-3 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent"
              >
                Pedidos
              </a>
            </li>
            <li>
              <a
                href="#"
                className="block py-2 px-3 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent"
              >
                Entregas
              </a>
            </li>
            <li>
              <Link
                to="/clientes"
                className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
              >
                Clientes
              </Link>
            </li>
            {currentUser?.tipo !== "encargado" && (
            <li>
              <Link
                to="/ventas"
                className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
              >
                Ventas
              </Link>
            </li>
            )}

            <li>
              <Link
                to="/fuegoya"
                className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
              >
                Fuego Ya
              </Link>
            </li>
            <li>
              <Link
                to="/pellets"
                className="block py-2 px-1 text-gray-900 rounded-sm hover:bg-gray-100 
                                    md:hover:bg-transparent md:border-0 md:hover:text-blue-700 
                                    md:p-0 dark:text-white md:dark:hover:text-blue-500 
                                    dark:hover:bg-gray-700 dark:hover:text-white 
                                    md:dark:hover:bg-transparent"
              >
                Pellets
              </Link>
            </li>
            <li>
              {currentUser && (
                <button
                  onClick={logout}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded transition font-semibold shadow-sm focus:outline-none focus:ring-2 md:top-1/2 md:ml-10 focus:ring-red-400 focus:ring-opacity-50"
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
}

export default Nav