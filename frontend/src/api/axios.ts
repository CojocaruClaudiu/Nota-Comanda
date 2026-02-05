import axios from "axios";
import { API_BASE_URL } from "./baseUrl";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
