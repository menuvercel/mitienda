import axios from 'axios';
import { Venta, Vendedor, Transaccion } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL
});

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

interface TransferProductParams {
  productId: string;
  fromVendorId: string;
  toVendorId: string;
  cantidad: number;
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
    
    // Verificar que response.data existe y tiene un id
    if (!response.data || !response.data.id) {
      throw new Error('Respuesta inválida del servidor: datos de usuario incompletos');
    }

    return {
      ...response.data,
      id: response.data.id.toString() // Ensure ID is always a string
    };
  } catch (error) {
    console.error('Error al obtener el usuario actual:', error);
    
    // Mejorar el mensaje de error basado en el tipo de error
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else if (error.response?.status === 404) {
        throw new Error('Usuario no encontrado. Por favor, inicia sesión nuevamente.');
      } else if (!error.response) {
        throw new Error('Error de conexión. Por favor, verifica tu conexión a internet.');
      }
    }
    
    throw new Error('No se pudo obtener la información del usuario. Por favor, inicia sesión nuevamente.');
  }
};


export const login = async (nombre: string, password: string): Promise<User> => {
  try {
    const response = await api.post('/auth/login', { nombre, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      return response.data;
    } else {
      throw new Error('No se recibió el token de autenticación');
    }
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
    localStorage.removeItem('token'); // Asegurarse de limpiar el token
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    localStorage.removeItem('token'); // Limpiar el token incluso si hay error
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
    console.error('Error al obtener productos del vendedor:', error);
    throw new Error('No se pudieron obtener los productos del vendedor');
  }
};

export const agregarProducto = async (formData: FormData) => {
  try {
    const parametrosRaw = formData.get('parametros');
    if (parametrosRaw) {
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
    throw new Error('Error al agregar el producto');
  }
};


export const editarProducto = async (id: string, formData: FormData) => {
  try {
    const response = await api.put(`/productos/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error al editar producto:', error);
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
      parametros
    });
    return response.data;
  } catch (error) {
    console.error('Error al entregar producto:', error);
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
  _parametrosVenta?: { nombre: string; cantidad: number; }[], // Lo mantenemos como parámetro opcional pero no lo usamos
  vendedorId?: string
) => {
  try {
    if (!vendedorId) {
      throw new Error('El ID del vendedor es requerido');
    }

    const fechaAjustada = new Date(fecha + 'T12:00:00');
    const fechaISO = fechaAjustada.toISOString();

    // Solo enviamos los campos necesarios
    const response = await api.post('/ventas', { 
      productoId, 
      cantidad, 
      fecha: fechaISO,
      vendedorId
    });
    
    return response.data;
  } catch (error) {
    console.error('Error al realizar la venta:', error);
    throw new Error('Error al crear venta');
  }
};




export const getVentasMes = async (vendedorId: string): Promise<Venta[]> => {

  // Eliminamos el cálculo de fechas y los parámetros de fecha en la solicitud
  const response = await api.get(`/ventas?vendedorId=${vendedorId}`);
  
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
      parametros
    });
    return response.data;
  } catch (error) {
    console.error('Error al reducir la cantidad del producto:', error);
    throw new Error('No se pudo reducir la cantidad del producto');
  }
};


export const getVentasVendedor = async (vendedorId: string): Promise<Venta[]> => {
  try {
    const response = await api.get(`/ventas?vendedorId=${vendedorId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    throw new Error('No se pudieron obtener las ventas');
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

export const deleteSale = async (saleId: string, vendedorId: string): Promise<void> => {
  if (!saleId) {
    throw new Error('El ID de la venta es requerido');
  }

  if (!vendedorId) {
    throw new Error('El ID del vendedor es requerido');
  }
  
  try {
    await api.delete(`/ventas/${saleId}?vendedorId=${vendedorId}`);
  } catch (error) {
    console.error('Error al eliminar la venta:', error);
    throw new Error('No se pudo eliminar la venta');
  }
};

export default api;

// merma
export const createMerma = async (
  producto_id: string,
  usuario_id: string,
  cantidad: number
) => {
  const response = await fetch('/api/merma', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      producto_id,
      usuario_id,
      cantidad
    }),
  });

  if (!response.ok) {
    throw new Error('Error al crear merma');
  }

  return response.json();
};


export const getMermas = async (usuario_id?: string) => {
  const response = await fetch(`/api/merma${usuario_id ? `?usuario_id=${usuario_id}` : ''}`);
  if (!response.ok) {
    throw new Error('Error al obtener mermas');
  }
  const data = await response.json();
  return data;
};


// En api.ts, agregar la siguiente función:



export const deleteMerma = async (productoId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/merma?producto_id=${productoId}`, {  // <- Cambio aquí
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al eliminar las mermas');
    }
  } catch (error) {
    console.error('Error en deleteMerma:', error);
    throw error;
  }
};



// transferencia

export const transferProduct = async ({
  productId,
  fromVendorId,
  toVendorId,
  cantidad
}: TransferProductParams) => {
  try {
    const response = await api.post('/transacciones/transfer', {
      productId,
      fromVendorId,
      toVendorId,
      cantidad,
      tipo: 'Transferencia'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error al transferir producto:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Error al transferir el producto');
      } else if (error.request) {
        throw new Error('No se recibió respuesta del servidor');
      }
    }
    throw new Error('No se pudo completar la transferencia del producto');
  }
};

