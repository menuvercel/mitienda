import api from './api'
import { AxiosError } from 'axios'

interface User {
  id: string;
  nombre: string;
  rol: string;
}

export const login = async (nombre: string, password: string): Promise<User> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Importante para manejar cookies
      body: JSON.stringify({ nombre, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error en el inicio de sesión');
    }

    const data = await response.json();
    
    // Guardar información relevante en localStorage
    localStorage.setItem('userId', data.id);
    localStorage.setItem('userRole', data.rol);
    localStorage.setItem('userName', data.nombre);
    
    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout', {}, { withCredentials: true });
    console.log('Usuario ha cerrado sesión');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await api.get('/auth/current-user', { withCredentials: true });
    if (response.data && response.data.id && response.data.nombre && response.data.rol) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener el usuario actual:', error);
    return null;
  }
};