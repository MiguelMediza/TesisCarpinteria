import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import  Nav  from "../../components/Nav";
import TablasForm from "../../components/Tablas/TablasForm";
const Tablas = () => {
  
  return (
    <>
      <Nav/>
      <TablasForm/>
    </>
  )
}

export default Tablas