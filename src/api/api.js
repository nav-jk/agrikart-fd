import axios from 'axios';

// ✅ Set your actual backend URL here
const api = axios.create({
  baseURL: 'https://agrikart-ws-2a-8000.ml.iit-ropar.truefoundry.cloud/',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
