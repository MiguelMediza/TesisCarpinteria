import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import  Nav  from "../../components/Nav";
import ProveedoresForm from "../../components/Proveedores/ProveedoresForm";
const Proveedores = () => {
  
  return (
    <>
      <Nav/>
      <ProveedoresForm/>
    </>
  )
}

export default Proveedores