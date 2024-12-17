import axios from 'axios';
import { Venta, Vendedor, Transaccion } from '@/types';

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
  password: string;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  foto?: string;
  tieneParametros: boolean;
  parametros?: Array<{
    nombre: string;
    cantidad: number;
  }>;
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
    console.log('Raw API response:', response);
    console.log('Productos del vendedor:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al obtener productos del vendedor:', error);
    throw new Error('No se pudieron obtener los productos del vendedor');
  }
};

export const agregarProducto = async (formData: FormData) => {
  try {
    // Si hay parámetros, necesitamos asegurarnos de que se envíen correctamente
    const parametrosRaw = formData.get('parametros');
    if (parametrosRaw) {
      // Asegurarnos de que los parámetros se envíen como string
      const parametros = JSON.parse(parametrosRaw as string);
      formData.set('parametros', JSON.stringify(parametros));
    }

    const response = await api.post('/productos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error al agregar producto:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Error al agregar el producto');
    }
    throw new Error('Error al agregar el producto');
  }
};


export const editarProducto = async (id: string, formData: FormData) => {
  try {
    // Obtener y verificar tieneParametros
    const tieneParametros = formData.get('tiene_parametros');
    console.log('tieneParametros antes de enviar:', tieneParametros);

    // Si hay parámetros, asegurarnos de que se envíen correctamente
    const parametrosRaw = formData.get('parametros');
    if (parametrosRaw) {
      // Asegurarnos de que los parámetros se envíen como string
      const parametros = JSON.parse(parametrosRaw as string);
      formData.set('parametros', JSON.stringify(parametros));
    }

    // Log de todos los datos que se están enviando
    const formDataObj: any = {};
    formData.forEach((value, key) => {
      formDataObj[key] = value;
    });
    console.log('Datos que se envían al servidor:', formDataObj);

    const response = await api.put(`/productos/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Respuesta del servidor:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al editar producto:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Respuesta de error del servidor:', error.response.data);
      throw new Error(error.response.data.message || 'Error al editar el producto');
    }
    throw new Error('Error al editar el producto');
  }
};


export const entregarProducto = async (
  productoId: string, 
  vendedorId: string, 
  cantidad: number,
  parametros?: Array<{ nombre: string; cantidad: number }>
) => {
  try {
    const response = await api.post('/transacciones', { 
      productoId, 
      vendedorId, 
      cantidad,
      tipo: 'Entrega',
      parametros: parametros // Agregamos los parámetros si existen
    });
    return response.data;
  } catch (error) {
    console.error('Error al entregar producto:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Error al entregar el producto');
    }
    throw new Error('Error al entregar el producto');
  }
};


export const getTransacciones = async () => {
  const response = await api.get('/transacciones');
  return response.data;
};

export const eliminarProducto = async (productId: string) => {
  try {
    const response = await api.delete(`/productos/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

export const crearBajaTransaccion = async (productoId: string, vendedorId: string, cantidad: number) => {
  try {
    const response = await api.post('/transacciones', {
      productoId,
      vendedorId,
      cantidad,
      tipo: 'Baja'
    });
    return response.data;
  } catch (error) {
    console.error('Error creating Baja transaction:', error);
    throw error;
  }
};

export const realizarVenta = async (
  productoId: string, 
  cantidad: number, 
  fecha: string,
  parametrosVenta?: { nombre: string; cantidad: number; }[]
) => {
  try {
    const fechaAjustada = new Date(fecha + 'T12:00:00');
    const fechaISO = fechaAjustada.toISOString();

    const response = await api.post('/ventas', { 
      productoId, 
      cantidad, 
      fecha: fechaISO,
      parametrosVenta // incluir los parámetros en la petición
    });
    return response.data;
  } catch (error) {
    console.error('Error al realizar la venta:', error);
    throw new Error('No se pudo realizar la venta');
  }
};


export const getVentasMes = async (vendedorId: string): Promise<Venta[]> => {
  console.log('Solicitando todas las ventas para vendedor:', vendedorId);

  // Eliminamos el cálculo de fechas y los parámetros de fecha en la solicitud
  const response = await api.get(`/ventas?vendedorId=${vendedorId}`);
  
  console.log('Respuesta de todas las ventas:', response.data);
  return response.data;
};

export const getTransaccionesVendedor = async (vendedorId: string) => {
  try {
    const response = await api.get(`/transacciones?vendedorId=${vendedorId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener transacciones del vendedor:', error);
    throw new Error('No se pudieron obtener las transacciones del vendedor');
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

/*estas son las funciones nuevas*/

export const reducirProductoVendedor = async (
  productoId: string, 
  vendedorId: string, 
  cantidad: number,
  parametros?: Array<{ nombre: string; cantidad: number }>
) => {
  try {
    const response = await api.put(`/productos/reducir`, { 
      productoId, 
      vendedorId, 
      cantidad,
      parametros // Agregamos los parámetros si existen
    });
    return response.data;
  } catch (error) {
    console.error('Error al reducir la cantidad del producto:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Error al reducir la cantidad del producto');
    }
    throw new Error('No se pudo reducir la cantidad del producto');
  }
};


export const getVentasVendedor = async (vendedorId: string): Promise<Venta[]> => {
  console.log('Solicitando todas las ventas para vendedor:', vendedorId);
  try {
    const response = await api.get(`/ventas?vendedorId=${vendedorId}`);
    console.log('Respuesta de ventas:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Respuesta del servidor:', error.response.data);
    }
    throw new Error(`No se pudieron obtener las ventas: ${(error as Error).message}`);
  }
};


export const editarVendedor = async (vendedorId: string, editedVendor: Vendedor & { newPassword?: string }): Promise<void> => {
  try {
    const vendorData: Vendedor = { ...editedVendor };
    
    // If a new password is provided, include it in the request
    if (editedVendor.newPassword) {
      vendorData.password = editedVendor.newPassword;
    }
    
    // Remove the newPassword field from the request payload
    delete (vendorData as any).newPassword;

    const response = await api.put(`/users/vendedores?id=${vendedorId}`, vendorData);
    console.log('Vendedor actualizado:', response.data);
  } catch (error) {
    console.error('Error al editar vendedor:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Respuesta del servidor:', error.response.data);
    }
    throw new Error(axios.isAxiosError(error) && error.response?.data?.message 
      ? error.response.data.message 
      : `No se pudo editar el vendedor: ${(error as Error).message}`);
  }
};

export default api;


/*panel individual del vendedor*/

// ... (existing imports and functions)

export const getTransaccionesProducto = async (productoId: string): Promise<Transaccion[]> => {
  try {
    const response = await api.get<Transaccion[]>(`/transacciones`, {
      params: { productoId }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener las transacciones del producto:', error);
    handleApiError(error, 'transacciones del producto');
    throw new Error('No se pudieron obtener las transacciones del producto');
  }
};

export const getVentasProducto = async (productoId: string, startDate: string, endDate: string): Promise<Venta[]> => {
  try {
    const response = await api.get<Venta[]>(`/ventas`, {
      params: { productoId, startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener las ventas del producto:', error);
    handleApiError(error, 'ventas del producto');
    throw new Error('No se pudieron obtener las ventas del producto');
  }
};


//ultimo edit

export const deleteSale = async (saleId: string): Promise<void> => {
  if (!saleId) {
    throw new Error('El ID de la venta es requerido');
  }
  
  try {
    await api.delete(`/ventas/${saleId}`);
  } catch (error) {
    console.error('Error al eliminar la venta:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Respuesta del servidor:', error.response.data);
    }
    throw new Error(`No se pudo eliminar la venta: ${(error as Error).message}`);
  }
};