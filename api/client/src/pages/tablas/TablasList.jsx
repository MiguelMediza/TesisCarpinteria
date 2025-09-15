import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import Nav from "../../components/Nav";
import TablaList from "../../components/Tablas/TablasList";
const TablasList = () => {
  
  return (
    <>
      <Nav/>
      <TablaList/>
    </>
  )
}

export default TablasList