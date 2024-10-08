import axios from 'axios';
import { Venta, Vendedor, Producto } from '@/types';


const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';



const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface User {
  id: string;
  nombre: string;
  rol: string;
  telefono?: string;
}

export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get<User>('/users/me');
    console.log('Raw user data:', response.data);
    return {
      ...response.data,
      id: response.data.id.toString() // Ensure ID is always a string
    };
  } catch (error) {
    console.error('Error al obtener el usuario actual:', error);
    throw new Error('No se pudo obtener la información del usuario. Por favor, inicia sesión nuevamente.');
  }
};

export const login = async (nombre: string, password: string): Promise<User> => {
  try {
    const response = await api.post('/auth/login', { nombre, password });
    localStorage.setItem('token', response.data.token); // Store the token
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error en la solicitud de login:', error.response?.data || error.message);
    } else {
      console.error('Error en la solicitud de login:', error);
    }
    throw new Error('Error de autenticación. Por favor, verifica tus credenciales e intenta de nuevo.');
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
};

export const getVendedores = async (): Promise<Vendedor[]> => {
  const response = await api.get('/users/vendedores');
  return response.data;
};

export const getInventario = async (): Promise<Producto[]> => {
  try {
    const response = await api.get<Producto[]>('/productos');
    console.log('Raw inventory data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
};

export const registerUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  const response = await api.post<User>('/auth/register', userData);
  return response.data;
};

export const getProductosVendedor = async (vendedorId: string) => {
  if (!vendedorId) {
    throw new Error('ID del vendedor no proporcionado');
  }
  try {
    const response = await api.get(`/users/productos/${vendedorId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'productos');
  }
};

export const agregarProducto = async (formData: FormData) => {
  const response = await api.post('/productos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const editarProducto = async (id: string, producto: Partial<Producto>, foto?: File) => {
  const formData = new FormData();
  Object.entries(producto).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value.toString());
    }
  });
  
  if (foto) {
    formData.append('foto', foto);
  }

  const response = await api.put(`/productos/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const entregarProducto = async (productoId: string, vendedorId: string, cantidad: number) => {
  const response = await api.post('/transacciones', { productoId, vendedorId, cantidad });
  return response.data;
};

export const getTransacciones = async () => {
  const response = await api.get('/transacciones');
  return response.data;
};

export const eliminarProducto = async (id: string): Promise<void> => {
  await api.delete(`/productos/${id}`);
};

export const realizarVenta = async (productoId: string, cantidad: number, fecha: string): Promise<void> => {
  console.log('Datos enviados a realizarVenta:', { productoId, cantidad, fecha });
  const response = await api.post('/ventas', { productoId, cantidad, fecha });
  if (!response.data) {
    throw new Error('Error al realizar la venta');
  }
};

export const getVentasDia = async (vendedorId: string): Promise<Venta[]> => {
  console.log('Solicitando ventas del día para vendedor:', vendedorId);
  try {
    const response = await api.get(`/ventas?vendedorId=${vendedorId}&startDate=${new Date().toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`);
    console.log('Respuesta de ventas del día:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al obtener ventas del día:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Respuesta del servidor:', error.response.data);
    }
    throw error;
  }
};

export const getVentasMes = async (vendedorId: string): Promise<Venta[]> => {
  console.log('Solicitando ventas del mes para vendedor:', vendedorId);
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
  const response = await api.get(`/ventas?vendedorId=${vendedorId}&startDate=${firstDayOfMonth}&endDate=${lastDayOfMonth}`);
  console.log('Respuesta de ventas del mes:', response.data);
  return response.data;
};

export const getTransaccionesVendedor = async (vendedorId: string) => {
  try {
    const response = await api.get(`/transacciones?vendedorId=${vendedorId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'transacciones');
  }
};

const handleApiError = (error: unknown, context: string) => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      console.error(`Error de respuesta del servidor (${context}):`, error.response.data);
      console.error('Estado HTTP:', error.response.status);
      if (error.response.status === 403) {
        console.error(`No tienes permiso para ver estos ${context}`);
        return [];
      }
      throw new Error(`Error de autenticación: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
      throw new Error('No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.');
    } else {
      console.error('Error al configurar la solicitud:', error.message);
      throw new Error('Error al intentar autenticar. Por favor, intenta de nuevo más tarde.');
    }
  } else {
    console.error('Error desconocido:', error);
    throw new Error('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
  }
};

export default api;