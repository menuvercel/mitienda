import { query } from '@/lib/db';
import { IPromocion } from '@/models/Promocion';

export async function getAllPromociones(): Promise<IPromocion[]> {
  const result = await query('SELECT * FROM promociones ORDER BY fecha_inicio DESC');
  return result.rows;
}

export async function getPromocionById(id: string): Promise<IPromocion | null> {
  const result = await query('SELECT * FROM promociones WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createPromocion(promocion: Omit<IPromocion, 'id'>): Promise<IPromocion> {
  const { nombre, valor_descuento, fecha_inicio, fecha_fin, activa } = promocion;
  const result = await query(
    'INSERT INTO promociones (nombre, valor_descuento, fecha_inicio, fecha_fin, activa) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [nombre, valor_descuento, fecha_inicio, fecha_fin, activa]
  );
  return result.rows[0];
}

export async function updatePromocion(id: string, promocion: Partial<IPromocion>): Promise<IPromocion | null> {
  // Construir dinámicamente la consulta de actualización
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (promocion.nombre !== undefined) {
    updates.push(`nombre = $${paramIndex++}`);
    values.push(promocion.nombre);
  }

  if (promocion.valor_descuento !== undefined) {
    updates.push(`valor_descuento = $${paramIndex++}`);
    values.push(promocion.valor_descuento);
  }

  if (promocion.fecha_inicio !== undefined) {
    updates.push(`fecha_inicio = $${paramIndex++}`);
    values.push(promocion.fecha_inicio);
  }

  if (promocion.fecha_fin !== undefined) {
    updates.push(`fecha_fin = $${paramIndex++}`);
    values.push(promocion.fecha_fin);
  }

  if (promocion.activa !== undefined) {
    updates.push(`activa = $${paramIndex++}`);
    values.push(promocion.activa);
  }

  if (updates.length === 0) {
    return null; // No hay nada que actualizar
  }

  // Agregar el ID al final de los valores
  values.push(id);

  const result = await query(
    `UPDATE promociones SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  return result.rows[0] || null;
}

export async function deletePromocion(id: string): Promise<boolean> {
  const result = await query('DELETE FROM promociones WHERE id = $1', [id]);
  return result.rowCount ? result.rowCount > 0 : false;
}

export async function togglePromocionStatus(id: string, activa: boolean): Promise<IPromocion | null> {
  const result = await query(
    'UPDATE promociones SET activa = $1 WHERE id = $2 RETURNING *',
    [activa, id]
  );
  return result.rows[0] || null;
}

export async function getActivePromociones(): Promise<IPromocion[]> {
  const now = new Date();
  const result = await query(
    'SELECT * FROM promociones WHERE activa = true AND fecha_inicio <= $1 AND fecha_fin >= $1',
    [now]
  );
  return result.rows;
}