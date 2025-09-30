'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Image from 'next/image'
import { Producto } from '@/types'
import { toast } from "@/hooks/use-toast";


interface ProductSelectionDialogProps {
    isOpen: boolean
    onClose: () => void
    allProductos: Producto[] // Cambiado de productos a allProductos
    currentProductos: Producto[] // Cambiado de productosEnSeccion a currentProductos
    onProductosSelected: (selectedProductIds: string[]) => void // Cambiado de onSave a onProductosSelected
    subseccionId?: string | null // Nueva propiedad
    seccionId?: string | null
}

export default function ProductSelectionDialog({
    isOpen,
    onClose,
    allProductos = [], // Cambiado de productos a allProductos
    currentProductos = [], // Cambiado de productosEnSeccion a currentProductos
    onProductosSelected, // Cambiado de onSave a onProductosSelected
    subseccionId,
    seccionId
}: ProductSelectionDialogProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
    const [isInitialized, setIsInitialized] = useState(false)

    // Inicializar los productos seleccionados solo cuando el diálogo se abre
    useEffect(() => {
        if (isOpen && !isInitialized) {
            const initialSelectedIds = currentProductos?.map(p => p.id) || [];
            setSelectedProductIds(initialSelectedIds);
            setSearchTerm('');
            setIsInitialized(true);
        } else if (!isOpen) {
            setIsInitialized(false);
        }
    }, [isOpen, currentProductos, isInitialized]);

    // Memoizar el filtrado de productos para evitar cálculos innecesarios
    const filteredProductos = React.useMemo(() => {
        if (!Array.isArray(allProductos)) return [];

        return allProductos.filter(producto => {
            // Filtro por término de búsqueda
            const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase());

            // Filtro por sección (validación adicional por seguridad)
            const matchesSeccion = seccionId ? producto.seccion_id === seccionId : true;

            return matchesSearch && matchesSeccion;
        });
    }, [allProductos, searchTerm, seccionId]);


    const handleProductToggle = useCallback((productId: string) => {
        // Encontrar el producto
        const producto = allProductos.find(p => p.id === productId);

        // Validar que pertenece a la sección correcta
        if (seccionId && producto && producto.seccion_id !== seccionId) {
            toast({
                title: "Error",
                description: `El producto "${producto.nombre}" no pertenece a esta sección`,
                variant: "destructive",
            });
            return;
        }

        setSelectedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    }, [allProductos, seccionId]);


    const handleSelectAll = useCallback(() => {
        const allFilteredIds = filteredProductos.map(producto => producto.id);
        const areAllSelected = allFilteredIds.every(id => selectedProductIds.includes(id));

        if (areAllSelected) {
            setSelectedProductIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
        } else {
            setSelectedProductIds(prev => {
                const newIds = [...prev];
                allFilteredIds.forEach(id => {
                    if (!newIds.includes(id)) {
                        newIds.push(id);
                    }
                });
                return newIds;
            });
        }
    }, [filteredProductos, selectedProductIds]);

    const handleSave = useCallback(() => {
        onProductosSelected(selectedProductIds); // Cambiado de onSave a onProductosSelected
        onClose();
    }, [onProductosSelected, selectedProductIds, onClose]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const calcularCantidadTotal = useCallback((producto: Producto) => {
        if (producto.tiene_parametros && producto.parametros) {
            return producto.parametros.reduce((sum, param) => sum + param.cantidad, 0);
        }
        return producto.cantidad;
    }, []);

    // Memoizar este cálculo para evitar recálculos innecesarios
    const areAllFilteredSelected = React.useMemo(() => {
        return filteredProductos.length > 0 &&
            filteredProductos.every(producto => selectedProductIds.includes(producto.id));
    }, [filteredProductos, selectedProductIds]);

    // Renderizar null cuando no está abierto para evitar problemas de renderizado
    if (!isOpen) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) handleClose();
        }}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Seleccionar Productos para la {seccionId ? 'Sección' : 'Subsección'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Input
                        placeholder="Buscar productos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />

                    {/* Opción de Seleccionar Todos */}
                    {filteredProductos.length > 0 && (
                        <div className="flex items-center space-x-3 p-3 border rounded-lg bg-blue-50 border-blue-200">
                            <Checkbox
                                checked={areAllFilteredSelected}
                                onCheckedChange={handleSelectAll}
                            />
                            <span className="font-medium text-blue-700">
                                {areAllFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                {searchTerm && ` (${filteredProductos.length} productos filtrados)`}
                            </span>
                        </div>
                    )}

                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredProductos.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No se encontraron productos
                            </div>
                        ) : (
                            filteredProductos.map((producto) => (
                                <div
                                    key={producto.id}
                                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                                >
                                    <Checkbox
                                        checked={selectedProductIds.includes(producto.id)}
                                        onCheckedChange={() => handleProductToggle(producto.id)}
                                    />

                                    <div className="w-12 h-12 relative rounded-md overflow-hidden flex-shrink-0">
                                        <Image
                                            src={imageErrors[producto.id] ? '/placeholder.svg' : (producto.foto || '/placeholder.svg')}
                                            alt={producto.nombre}
                                            fill
                                            className="object-cover"
                                            onError={() => {
                                                setImageErrors(prev => ({
                                                    ...prev,
                                                    [producto.id]: true
                                                }));
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium truncate">{producto.nombre}</h4>
                                        <p className="text-sm text-gray-500">
                                            ${producto.precio} - Stock: {calcularCantidadTotal(producto)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <p className="text-sm text-gray-600">
                            {selectedProductIds.length} productos seleccionados
                        </p>

                        <div className="flex space-x-2">
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave}>
                                Guardar Selección
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}