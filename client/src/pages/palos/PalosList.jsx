import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import Nav from "../../components/Nav";
import PaloList from "../../components/Palos/PalosList";
const PalosList = () => {
  
  return (
    <>
      <Nav/>
      <PaloList/>
    </>
  )
}

export default PalosList