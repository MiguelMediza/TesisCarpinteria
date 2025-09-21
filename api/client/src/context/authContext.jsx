import { createContext, useEffect, useState } from "react";
import { api } from "../api"; 

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const login = async (inputs) => {
    const res = await api.post("/usuarios/login", inputs);
    setCurrentUser(res.data);
  };

  const logout = async () => {
    try {
      await api.post("/usuarios/logout");
      setCurrentUser(null);
      localStorage.removeItem("user");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  useEffect(() => {
    localStorage.setItem("user", JSON.stringify(currentUser));
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
