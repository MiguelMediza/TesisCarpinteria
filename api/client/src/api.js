import axios from "axios";

// En desarrollo llama al backend local; en producción usa el mismo dominio (Railway)
const baseURL = import.meta.env.PROD
  ? "/api/src"
  : "http://localhost:4000/api/src";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});
