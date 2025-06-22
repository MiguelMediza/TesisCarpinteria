import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
const Home = () => {
  const { currentUser, logout } = useContext(AuthContext);
  
  return (
    <div className="home">
      <h1>Bienvenido, {currentUser ? currentUser.username : "Invitado"}!</h1>
      {currentUser && (
        <button onClick={logout} className="logout-button">
          Cerrar sesión
        </button>
      )}
      <p>Esta es la página de inicio.</p>
      <p>Contenido exclusivo para usuarios registrados.</p>
    </div>
  )
}

export default Home