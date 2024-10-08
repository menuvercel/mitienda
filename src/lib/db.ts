import { sql } from '@vercel/postgres';

export async function query(text: string, params?: any[]) {
  try {
    const result = await sql.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    } else {
      throw new Error('An unknown database error occurred');
    }
  }
}