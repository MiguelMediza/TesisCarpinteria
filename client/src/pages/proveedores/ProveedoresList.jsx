import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import ProveedorList from "../../components/ProveedorList";
import Nav from "../../components/Nav";
const ProveedoresList = () => {
  
  return (
    <>
      <Nav/>
      <ProveedorList/>
    </>
  )
}

export default ProveedoresList