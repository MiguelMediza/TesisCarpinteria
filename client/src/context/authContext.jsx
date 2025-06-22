import { createContext, useEffect, useState } from "react";
import axios from "axios";
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

  const login = async(inputs) => {
    const res = await axios.post("http://localhost:4000/api/src/usuarios/login", inputs, {
      withCredentials: true,
    });

    setCurrentUser(res.data);
    console.log("Usuario logueado:", res.data);
  };

  const logout = async () => {
  try {
    await axios.post("http://localhost:4000/api/src/usuarios/logout", {}, { withCredentials: true });
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
