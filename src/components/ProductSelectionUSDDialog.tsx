import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, Package, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Producto } from '@/types';

interface ProductSelectionUSDDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedProductIds: string[], valorUSD: number) => void;
  productos: Producto[];
  isLoading?: boolean;
}

export function ProductSelectionUSDDialog({
  isOpen,
  onClose,
  onConfirm,
  productos,
  isLoading = false
}: ProductSelectionUSDDialogProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [valorUSD, setValorUSD] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'id'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filtrar y ordenar productos basado en el término de búsqueda
  const filteredProductos = productos
    .filter(producto =>
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.nombre.localeCompare(b.nombre);
      } else {
        comparison = parseInt(a.id) - parseInt(b.id);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Manejar la selección/deselección de productos
  const handleProductToggle = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  // Seleccionar/deseleccionar todos los productos filtrados
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(filteredProductos.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  // Manejar cambio de ordenamiento
  const handleSortChange = (newSortBy: 'name' | 'id') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  // Obtener el icono de ordenamiento
  const getSortIcon = (sortType: 'name' | 'id') => {
    if (sortBy !== sortType) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Confirmar la selección
  const handleConfirm = () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos un producto",
        variant: "destructive",
      });
      return;
    }

    if (!valorUSD || isNaN(Number(valorUSD)) || Number(valorUSD) <= 0) {
      toast({
        title: "Error",
        description: "Debe ingresar un valor válido para el USD",
        variant: "destructive",
      });
      return;
    }

    onConfirm(Array.from(selectedProducts), Number(valorUSD));
  };

  // Limpiar estado al cerrar
  const handleClose = () => {
    setSelectedProducts(new Set());
    setValorUSD('');
    setSearchTerm('');
    onClose();
  };

  // Obtener el estado de "seleccionar todos"
  const isAllSelected = filteredProductos.length > 0 && filteredProductos.every(p => selectedProducts.has(p.id));
  const isSomeSelected = filteredProductos.some(p => selectedProducts.has(p.id));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Seleccionar Productos para Actualización USD
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Campo de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Botones de ordenamiento */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Ordenar por:</span>
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('name')}
              className="flex items-center gap-1"
            >
              Nombre {getSortIcon('name')}
            </Button>
            <Button
              variant={sortBy === 'id' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('id')}
              className="flex items-center gap-1"
            >
              Orden {getSortIcon('id')}
            </Button>
          </div>

          {/* Resumen de selección */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Seleccionados: <Badge variant="secondary">{selectedProducts.size}</Badge> de {filteredProductos.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleToggleAll}
              />
              <span className="text-sm">
                {isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </span>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="flex-1 overflow-y-auto border rounded-lg max-h-96">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Cargando productos...</p>
                </div>
              </div>
            ) : filteredProductos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No hay productos disponibles'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredProductos.map((producto) => (
                  <div
                    key={producto.id}
                    className={`p-3 hover:bg-gray-50 cursor-pointer ${selectedProducts.has(producto.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => handleProductToggle(producto.id, !selectedProducts.has(producto.id))}
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedProducts.has(producto.id)}
                        onCheckedChange={(checked) => handleProductToggle(producto.id, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {producto.nombre}
                          </h4>
                          <div className="flex items-center gap-2">
                            {producto.tiene_parametros && (
                              <Badge variant="outline" className="text-xs">
                                Con parámetros
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              Stock: {producto.cantidad}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-600">
                            Precio: ${Number(producto.precio || 0).toFixed(2)}
                          </span>
                          {producto.precio_compra && (
                            <span className="text-sm text-gray-600">
                              Compra: ${Number(producto.precio_compra).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campo de valor USD y botones */}
          <div className="flex-shrink-0 flex flex-col gap-4 pt-4 border-t">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Nuevo valor USD:
              </label>
              <Input
                type="number"
                placeholder="Ej: 120.50"
                value={valorUSD}
                onChange={(e) => setValorUSD(e.target.value)}
                step="0.01"
                min="0"
                className="flex-1 max-w-xs"
                disabled={isLoading}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading || selectedProducts.size === 0 || !valorUSD || isNaN(Number(valorUSD)) || Number(valorUSD) <= 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Actualizar {selectedProducts.size} productos
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductSelectionUSDDialog;