import Notificacion, { INotificacion } from '../models/Notificacion';
import mongoose from 'mongoose';

// Crear una nueva notificación
export async function createNotificacion(notificacion: {
  texto: string;
  usuarios: string[];
}): Promise<INotificacion> {
  try {
    // Convertir los IDs de string a ObjectId
    const usuariosObjectId = notificacion.usuarios.map(id => new mongoose.Types.ObjectId(id));
    
    // Crear un mapa de leído inicializado en false para todos los usuarios
    const leidoMap = new Map();
    notificacion.usuarios.forEach(userId => {
      leidoMap.set(userId, false);
    });

    const nuevaNotificacion = new Notificacion({
      texto: notificacion.texto,
      usuarios: usuariosObjectId,
      leido: leidoMap
    });

    await nuevaNotificacion.save();
    return nuevaNotificacion;
  } catch (error) {
    console.error('Error al crear notificación:', error);
    throw error;
  }
}

// Obtener todas las notificaciones para un usuario específico
export async function getNotificacionesByUsuario(usuarioId: string): Promise<INotificacion[]> {
  try {
    const notificaciones = await Notificacion.find({
      usuarios: new mongoose.Types.ObjectId(usuarioId)
    }).sort({ fecha: -1 }); // Ordenar por fecha descendente (más recientes primero)
    
    return notificaciones;
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    throw error;
  }
}

// Marcar una notificación como leída para un usuario específico
export async function marcarNotificacionLeida(notificacionId: string, usuarioId: string): Promise<INotificacion | null> {
  try {
    const notificacion = await Notificacion.findById(notificacionId);
    
    if (!notificacion) {
      return null;
    }
    
    // Actualizar el estado de leído para este usuario
    notificacion.leido.set(usuarioId, true);
    await notificacion.save();
    
    return notificacion;
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    throw error;
  }
}

// Eliminar una notificación
export async function deleteNotificacion(notificacionId: string): Promise<boolean> {
  try {
    const resultado = await Notificacion.findByIdAndDelete(notificacionId);
    return !!resultado;
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    throw error;
  }
}

// Obtener todas las notificaciones (para el panel de administrador)
export async function getAllNotificaciones(): Promise<INotificacion[]> {
  try {
    const notificaciones = await Notificacion.find().sort({ fecha: -1 });
    return notificaciones;
  } catch (error) {
    console.error('Error al obtener todas las notificaciones:', error);
    throw error;
  }
}