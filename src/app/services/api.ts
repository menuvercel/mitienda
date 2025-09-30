//services/api.ts

import axios from 'axios';
import { Venta, Notificacion, Vendedor, Transaccion, VentaParametro, TransferProductParams, Seccion, Promocion } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({
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
      try {
        // Mantener el mismo nombre de variable
        const parametros = JSON.parse(parametrosRaw as string);

        // Validar que sea un array con la estructura correcta
        if (Array.isArray(parametros)) {
          const parametrosValidados = parametros.filter(p =>
            p && typeof p === 'object' &&
            'nombre' in p &&
            'cantidad' in p
          );

          // Volver a usar el mismo nombre de formData
          formData.set('parametros', JSON.stringify(parametrosValidados));
        }
      } catch (parseError) {
        console.error('Error al parsear parametros:', parseError);
        // En caso de error, mantener un array vacío
        formData.set('parametros', JSON.stringify([]));
      }
    }

    // No es necesario modificar esta parte, ya que formData ya incluirá el campo "precioCompra"
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
    // Procesar los parámetros como ya lo estás haciendo
    const parametrosRaw = formData.get('parametros');
    if (parametrosRaw) {
      try {
        const parametros = JSON.parse(parametrosRaw as string);

        // Validar que sea un array con la estructura correcta
        if (Array.isArray(parametros)) {
          const parametrosValidados = parametros.filter(p =>
            p && typeof p === 'object' &&
            'nombre' in p &&
            'cantidad' in p
          );

          formData.set('parametros', JSON.stringify(parametrosValidados));
        }
      } catch (parseError) {
        console.error('Error al parsear parametros en edición:', parseError);
        formData.set('parametros', JSON.stringify([]));
      }
    }

    // Para depuración - verificar si precio_compra está en el FormData
    console.log('FormData antes de enviar:', {
      precio_compra: formData.get('precio_compra'),
      nombre: formData.get('nombre'),
      precio: formData.get('precio')
    });

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
  parametros?: VentaParametro[],
  vendedorId?: string
): Promise<Venta> => {
  try {
    if (!vendedorId) {
      throw new Error('El ID del vendedor es requerido');
    }

    const fechaAjustada = new Date(fecha + 'T12:00:00');
    const fechaISO = fechaAjustada.toISOString();

    const response = await api.post<Venta>('/ventas', {
      productoId,
      cantidad,
      fecha: fechaISO,
      vendedorId,
      parametros
    });

    return response.data;
  } catch (error) {
    console.error('Error al realizar la venta:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      if (error.response?.status === 400) {
        throw new Error('Datos de venta inválidos');
      }
      if (error.response?.status === 404) {
        throw new Error('Producto no encontrado o no disponible');
      }
    }
    throw new Error('Error al crear la venta');
  }
};

export const getVentasMes = async (vendedorId: string): Promise<Venta[]> => {
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

export const reducirProductoVendedor = async (
  productoId: string,
  vendedorId: string,
  cantidad: number,
  parametros?: Array<{ nombre: string; cantidad: number }>
) => {
  try {
    const payload = {
      productoId,
      vendedorId,
      cantidad,
      parametros
    };

    console.log('Enviando datos:', payload); // Para depuración

    const response = await api.put(`/productos/reducir`, payload);
    return response.data;
  } catch (error: any) {
    console.error('Error al reducir la cantidad del producto:', error);
    // Mostrar más detalles del error
    if (error.response) {
      console.error('Respuesta del servidor:', error.response.data);
    }
    throw new Error('No se pudo reducir la cantidad del producto');
  }
};

export const getVentasVendedor = async (vendedorId: string): Promise<Venta[]> => {
  try {
    const response = await api.get<Venta[]>(`/ventas`, {
      params: { vendedorId }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return []; // Retorna array vacío si no hay ventas
      }
    }
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

export const getVentasProducto = async (
  productoId: string,
  startDate?: string,
  endDate?: string,
  vendedorId?: string
): Promise<Venta[]> => {
  try {
    const params: Record<string, string> = { productoId };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (vendedorId) params.vendedorId = vendedorId;

    const response = await api.get<Venta[]>(`/ventas`, { params });
    return response.data;
  } catch (error) {
    console.error('Error al obtener las ventas del producto:', error);
    handleApiError(error, 'ventas del producto');
    throw new Error('No se pudieron obtener las ventas del producto');
  }
};

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

export const createMerma = async (
  producto_id: string,
  usuario_id: string,
  cantidad: number,
  parametros?: { nombre: string; cantidad: number }[]
) => {
  const response = await fetch('/api/merma', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      producto_id,
      usuario_id,
      cantidad,
      parametros
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

export const deleteMerma = async (productoId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/merma?producto_id=${productoId}`, {
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

export const transferProduct = async ({
  productId,
  fromVendorId,
  toVendorId,
  cantidad,
  parametros
}: TransferProductParams) => {
  try {
    // Una única llamada que manejará ambas transacciones
    const response = await api.post('/transacciones/transfer', {
      productId,
      fromVendorId,
      toVendorId,
      cantidad,
      parametros
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

export const verificarNombreProducto = async (nombre: string): Promise<boolean> => {
  try {
    const response = await api.get(`/productos/verificar-nombre?nombre=${encodeURIComponent(nombre)}`);
    return response.data.exists;
  } catch (error) {
    console.error('Error al verificar nombre del producto:', error);
    throw new Error('Error al verificar el nombre del producto');
  }
};

export const deleteVendorData = async (vendorId: string): Promise<void> => {
  if (!vendorId) {
    throw new Error('El ID del vendedor es requerido');
  }

  try {
    await api.delete(`/users/vendedores?id=${vendorId}`);
  } catch (error) {
    console.error('Error al eliminar datos del vendedor:', error);
    throw new Error('No se pudo eliminar los datos del vendedor');
  }
};

export const deleteVendor = async (vendorId: string): Promise<void> => {
  if (!vendorId) {
    throw new Error('El ID del vendedor es requerido');
  }

  try {
    await api.delete(`/users/vendedores?id=${vendorId}&deleteCompleteVendor=true`);
  } catch (error) {
    console.error('Error al eliminar el vendedor:', error);
    throw new Error('No se pudo eliminar el vendedor');
  }
};

export const getAllNotificaciones = async (): Promise<Notificacion[]> => {
  try {
    const response = await api.get('/notificaciones');
    // ✅ Asegurar que la respuesta tenga la estructura correcta
    return response.data.notificaciones || response.data;
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    throw new Error('No se pudieron obtener las notificaciones');
  }
};

// Obtener notificaciones del usuario actual (para vendedores)
export const getNotificacionesUsuario = async (): Promise<Notificacion[]> => {
  try {
    const response = await api.get('/notificaciones/usuario');
    // ✅ Asegurar que la respuesta tenga la estructura correcta
    return response.data.notificaciones || response.data;
  } catch (error) {
    console.error('Error al obtener notificaciones del usuario:', error);
    throw new Error('No se pudieron obtener las notificaciones');
  }
};

// Crear una nueva notificación
export const crearNotificacion = async (texto: string, usuarioIds: string[]): Promise<Notificacion> => {
  try {
    const response = await api.post('/notificaciones', {
      texto,
      usuarioIds  // ✅ CAMBIO: era 'usuarios', ahora 'usuarioIds'
    });
    return response.data;
  } catch (error) {
    console.error('Error al crear notificación:', error);
    throw new Error('No se pudo crear la notificación');
  }
};

// Marcar notificación como leída
export const marcarComoLeida = async (notificacionId: string): Promise<void> => {
  try {
    await api.put(`/notificaciones/${notificacionId}`, {});
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    throw new Error('No se pudo actualizar la notificación');
  }
};

// Eliminar notificación
export const eliminarNotificacion = async (notificacionId: string): Promise<void> => {
  try {
    await api.delete(`/notificaciones/${notificacionId}`);
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    throw new Error('No se pudo eliminar la notificación');
  }
};


export const getNotificacionesVendedor = async (userId: string): Promise<Notificacion[]> => {
  try {
    const response = await api.get(`/notificaciones/usuario?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener notificaciones del vendedor:', error);
    throw new Error('No se pudieron obtener las notificaciones');
  }
};

// Marcar notificación como leída (para vendedores)
export const marcarComoLeidaVendedor = async (notificacionId: string, userId: string): Promise<void> => {
  try {
    await api.put(`/notificaciones/${notificacionId}`, { userId });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    throw new Error('No se pudo actualizar la notificación');
  }
};

export const eliminarNotificacionPorVendedores = async (
  notificacionId: string,
  vendedorIds: number[]
): Promise<void> => {
  try {
    const response = await fetch(`/api/notificaciones/${notificacionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vendedorIds }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar la notificación');
    }
  } catch (error) {
    console.error('Error al eliminar notificación por vendedores:', error);
    throw error;
  }
};

// ===== SECCIONES =====
export const getSecciones = async (): Promise<Seccion[]> => {
  try {
    const response = await api.get('/secciones');
    return response.data;
  } catch (error) {
    console.error('Error fetching secciones:', error);
    throw new Error('Error al obtener las secciones');
  }
};

export const createSeccion = async (seccionData: { nombre: string; foto: string }): Promise<Seccion> => {
  try {
    const response = await api.post('/secciones', seccionData);
    return response.data;
  } catch (error) {
    console.error('Error creating seccion:', error);
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      throw new Error('Ya existe una sección con ese nombre');
    }
    throw new Error('Error al crear la sección');
  }
};

export const updateSeccion = async (id: string, seccionData: { nombre: string; foto: string }): Promise<Seccion> => {
  try {
    const response = await api.put(`/secciones/${id}`, seccionData);
    return response.data;
  } catch (error) {
    console.error('Error updating seccion:', error);
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      throw new Error('Ya existe una sección con ese nombre');
    }
    throw new Error('Error al actualizar la sección');
  }
};

export const deleteSeccion = async (id: string): Promise<void> => {
  try {
    await api.delete(`/secciones/${id}`);
  } catch (error) {
    console.error('Error deleting seccion:', error);
    throw new Error('Error al eliminar la sección');
  }
};

export const getProductosBySeccion = async (seccionId: string): Promise<Producto[]> => {
  try {
    const response = await api.get(`/secciones/${seccionId}/productos`);
    return response.data;
  } catch (error) {
    console.error('Error fetching productos by seccion:', error);
    throw new Error('Error al obtener los productos de la sección');
  }
};

export const updateProductosEnSeccion = async (seccionId: string, productIds: string[]): Promise<void> => {
  try {
    await api.put(`/secciones/${seccionId}/productos`, { productIds });
  } catch (error) {
    console.error('Error updating productos in seccion:', error);
    throw new Error('Error al actualizar los productos de la sección');
  }
};

export const getProductosDestacados = async (): Promise<Producto[]> => {
  try {
    const response = await api.get('/productos/destacados');
    return response.data;
  } catch (error) {
    console.error('Error fetching productos destacados:', error);
    throw new Error('Error al obtener los productos destacados');
  }
};

export const updateProductosDestacados = async (productIds: string[]): Promise<void> => {
  try {
    console.log('Enviando productos destacados:', productIds);
    await api.put('/productos/destacados', { productIds });
  } catch (error) {
    console.error('Error updating productos destacados:', error);
    throw new Error('Error al actualizar los productos destacados');
  }
};


//promociones

export const getPromociones = async (): Promise<Promocion[]> => {
  try {
    const response = await api.get('/promociones');
    return response.data;
  } catch (error) {
    console.error('Error al obtener promociones:', error);
    throw new Error('No se pudieron obtener las promociones');
  }
};

export const getPromocionById = async (id: string): Promise<Promocion> => {
  try {
    const response = await api.get(`/promociones/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener promoción:', error);
    throw new Error('No se pudo obtener la promoción');
  }
};

export const createPromocion = async (promocion: Omit<Promocion, 'id'>): Promise<Promocion> => {
  try {
    const response = await api.post('/promociones', promocion);
    return response.data;
  } catch (error) {
    console.error('Error al crear promoción:', error);
    throw new Error('No se pudo crear la promoción');
  }
};

export const updatePromocion = async (id: string, promocion: Partial<Promocion>): Promise<Promocion> => {
  try {
    const response = await api.put(`/promociones/${id}`, promocion);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar promoción:', error);
    throw new Error('No se pudo actualizar la promoción');
  }
};

export const deletePromocion = async (id: string): Promise<void> => {
  try {
    await api.delete(`/promociones/${id}`);
  } catch (error) {
    console.error('Error al eliminar promoción:', error);
    throw new Error('No se pudo eliminar la promoción');
  }
};

export const togglePromocionStatus = async (id: string, activa: boolean): Promise<Promocion> => {
  try {
    const response = await api.patch(`/promociones/${id}`, { activa });
    return response.data;
  } catch (error) {
    console.error('Error al cambiar estado de promoción:', error);
    throw new Error('No se pudo cambiar el estado de la promoción');
  }
};