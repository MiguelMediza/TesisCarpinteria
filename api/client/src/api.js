
import axios from "axios";

const baseURL = import.meta.env.PROD ? "/api/src" : "http://localhost:4000/api/src";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers?.["Content-Type"];
  }
  return config;
});
