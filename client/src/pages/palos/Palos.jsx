import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import  Nav  from "../../components/Nav";
import PalosForm from "../../components/Palos/PalosForm";
const Palos = () => {
  
  return (
    <>
      <Nav/>
      <PalosForm/>
    </>
  )
}

export default Palos