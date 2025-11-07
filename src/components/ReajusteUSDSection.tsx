import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { DollarSign, RefreshCw, Users, CheckSquare } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductSelectionUSDDialog from './ProductSelectionUSDDialog';
import { Producto } from '@/types';
import { getInventario, updateUSDValorSelective } from '@/app/services/api';

interface ReajusteUSDSectionProps {
  // No necesita props específicas por ahora
}

export function ReajusteUSDSection({}: ReajusteUSDSectionProps) {
  const [valorUSD, setValorUSD] = useState<string>('');
  const [currentValorUSD, setCurrentValorUSD] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [productosCount, setProductosCount] = useState<number>(0);
  
  // Estados para la funcionalidad selectiva
  const [showProductSelectionDialog, setShowProductSelectionDialog] = useState<boolean>(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoadingProductos, setIsLoadingProductos] = useState<boolean>(false);

  // Obtener el valor actual de USD y contar productos
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Obtener el valor actual de USD (podría ser el más reciente usado en productos)
        const valorResponse = await fetch('/api/valor-usd/current');
        const valorData = await valorResponse.json();
        
        if (valorData.valor) {
          setCurrentValorUSD(valorData.valor);
        }
        
        // Contar productos
        const countResponse = await fetch('/api/productos/count');
        const countData = await countResponse.json();
        setProductosCount(countData.count || 0);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos actuales",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Función para cargar productos (para uso en el diálogo selectivo)
  const fetchProductos = async () => {
    setIsLoadingProductos(true);
    try {
      const productosData = await getInventario();
      // Mapear los productos para asegurar compatibilidad con el tipo Producto
      const productosMapped: Producto[] = productosData.map((producto: any) => ({
        ...producto,
        tiene_parametros: producto.tiene_parametros || producto.tieneParametros || false,
        parametros: producto.parametros || []
      }));
      setProductos(productosMapped);
      setShowProductSelectionDialog(true);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProductos(false);
    }
  };

  const handleReajustarUSD = async () => {
    setShowConfirmDialog(false);
    
    if (!valorUSD || isNaN(Number(valorUSD)) || Number(valorUSD) <= 0) {
      toast({
        title: "Error",
        description: "Por favor ingrese un valor válido para el USD",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/valor-usd/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valor: Number(valorUSD) }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Éxito",
          description: `Se actualizó el valor del USD para ${data.updatedCount} productos`,
          variant: "default",
        });
        setCurrentValorUSD(Number(valorUSD));
        setValorUSD('');
      } else {
        throw new Error(data.error || 'Error al actualizar el valor del USD');
      }
    } catch (error) {
      console.error('Error al reajustar USD:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el valor del USD",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar la actualización selectiva
  const handleSelectiveUSDUpdate = async (selectedProductIds: string[], valorUSD: number) => {
    setShowProductSelectionDialog(false);
    setIsLoading(true);
    
    try {
      const data = await updateUSDValorSelective(selectedProductIds, valorUSD);
      
      toast({
        title: "Éxito",
        description: `Se actualizó el valor del USD para ${data.updatedCount} productos seleccionados`,
        variant: "default",
      });
      setCurrentValorUSD(valorUSD);
    } catch (error) {
      console.error('Error al actualizar USD selectivamente:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el valor del USD para los productos seleccionados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <DollarSign className="mr-2 h-6 w-6" />
            Reajuste de Valor USD
          </CardTitle>
          <CardDescription>
            Actualiza el valor de compra del USD para productos en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="selective" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Selectiva
              </TabsTrigger>
            </TabsList>

            {/* Tab de Actualización General */}
            <TabsContent value="general">
              <div className="space-y-6">
                {/* Información actual */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Información actual</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Valor actual del USD:</p>
                      <p className="text-xl font-bold">
                        {isLoading ? (
                          <span className="text-gray-400">Cargando...</span>
                        ) : currentValorUSD ? (
                          `$${currentValorUSD.toFixed(2)}`
                        ) : (
                          <span className="text-gray-400">No definido</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Productos en el sistema:</p>
                      <p className="text-xl font-bold">
                        {isLoading ? (
                          <span className="text-gray-400">Cargando...</span>
                        ) : (
                          productosCount
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Formulario de actualización general */}
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-medium mb-4">Actualizar valor del USD para todos los productos</h3>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow">
                      <Input
                        type="number"
                        placeholder="Nuevo valor del USD"
                        value={valorUSD}
                        onChange={(e) => setValorUSD(e.target.value)}
                        step="0.01"
                        min="0"
                        disabled={isLoading}
                      />
                    </div>
                    <Button 
                      onClick={() => setShowConfirmDialog(true)} 
                      disabled={isLoading || !valorUSD || isNaN(Number(valorUSD)) || Number(valorUSD) <= 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Actualizando...
                        </>
                      ) : (
                        'Actualizar valor USD'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Esta acción actualizará el valor de compra del USD para todos los productos en el sistema.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Tab de Actualización Selectiva */}
            <TabsContent value="selective">
              <div className="space-y-6">
                {/* Información actual */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Selectiva</h3>
                  <p className="text-sm text-green-700">
                    Selecciona productos específicos para actualizar su valor de USD. Esta opción te permite elegir exactamente qué productos modificar.
                  </p>
                </div>

                {/* Botón para abrir diálogo de selección */}
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex flex-col items-center gap-4 py-8">
                    <CheckSquare className="h-12 w-12 text-green-600" />
                    <div className="text-center">
                      <h3 className="font-medium mb-2">Actualizar USD para productos seleccionados</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Selecciona los productos que deseas actualizar y define el nuevo valor USD
                      </p>
                    </div>
                    <Button 
                      onClick={fetchProductos}
                      disabled={isLoadingProductos}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoadingProductos ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Cargando productos...
                        </>
                      ) : (
                        <>
                          <Users className="mr-2 h-4 w-4" />
                          Seleccionar productos
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Diálogo de confirmación para actualización general */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar actualización?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de actualizar el valor de compra del USD a ${Number(valorUSD).toFixed(2)} para todos los productos.
              Esta acción no se puede deshacer y afectará a {productosCount} productos en el sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReajustarUSD}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar actualización
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de selección de productos */}
      <ProductSelectionUSDDialog
        isOpen={showProductSelectionDialog}
        onClose={() => setShowProductSelectionDialog(false)}
        onConfirm={handleSelectiveUSDUpdate}
        productos={productos}
        isLoading={isLoading}
      />
    </div>
  );
}

export default ReajusteUSDSection;