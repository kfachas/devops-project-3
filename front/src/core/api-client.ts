import axios, { type AxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'datashare_token';
const USER_KEY = 'datashare_user';

export const apiInstance = axios.create({ baseURL: '/' });

apiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (window.location.pathname !== '/connexion') {
        window.location.assign('/connexion');
      }
    }
    return Promise.reject(error);
  },
);

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return apiInstance(config).then((response) => response.data);
};

export default customInstance;
