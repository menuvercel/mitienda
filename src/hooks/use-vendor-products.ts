import { useState } from 'react';
import { toast } from './use-toast';
import { Parametro } from '@/types';

interface VendorProduct {
  id: string;
  nombre: string;
  cantidad: number;
  parametros?: Parametro[];
}

export function useVendorProducts() {
  const [isLoading, setIsLoading] = useState(false);

  const updateProductQuantity = async (
    vendorId: string,
    productId: string,
    newQuantity: number,
    parametros?: Parametro[]
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/productos/actualizar-cantidad', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorId,
          productId,
          newQuantity,
          parametros,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar la cantidad');
      }

      const data = await response.json();
      toast({
        title: 'Éxito',
        description: 'Cantidad actualizada correctamente',
      });

      return data;
    } catch (error) {
      console.error('Error al actualizar la cantidad:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al actualizar la cantidad',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    updateProductQuantity,
  };
} 