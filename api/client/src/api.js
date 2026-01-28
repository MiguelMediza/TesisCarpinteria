import axios from "axios";

const baseURL = import.meta.env.PROD
  ? "/api/src"
  : "http://localhost:4000/api/src";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Cuando mandás FormData, NO fuerces Content-Type.
  // Axios/browser lo setea con el boundary correcto.
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }
  return config;
});
