'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Image from 'next/image'
import { Producto } from '@/types'

interface ProductSelectionDialogProps {
    isOpen: boolean
    onClose: () => void
    productos: Producto[]
    productosEnSeccion: Producto[]
    onSave: (selectedProductIds: string[]) => void
}

export default function ProductSelectionDialog({
    isOpen,
    onClose,
    productos,
    productosEnSeccion,
    onSave
}: ProductSelectionDialogProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (isOpen) {
            // Inicializar con los productos que ya están en la sección
            setSelectedProductIds(productosEnSeccion.map(p => p.id))
        }
    }, [isOpen, productosEnSeccion])

    const filteredProductos = productos.filter(producto =>
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleProductToggle = (productId: string) => {
        setSelectedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        )
    }

    const handleSelectAll = () => {
        const allFilteredIds = filteredProductos.map(producto => producto.id)
        const areAllSelected = allFilteredIds.every(id => selectedProductIds.includes(id))

        if (areAllSelected) {
            // Deseleccionar todos los productos filtrados
            setSelectedProductIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
        } else {
            // Seleccionar todos los productos filtrados
            setSelectedProductIds(prev => {
                const newIds = [...prev]
                allFilteredIds.forEach(id => {
                    if (!newIds.includes(id)) {
                        newIds.push(id)
                    }
                })
                return newIds
            })
        }
    }

    const handleSave = () => {
        onSave(selectedProductIds)
        onClose()
    }

    const handleClose = () => {
        setSearchTerm('')
        setSelectedProductIds([])
        onClose()
    }

    const calcularCantidadTotal = (producto: Producto) => {
        if (producto.tiene_parametros && producto.parametros) {
            return producto.parametros.reduce((sum, param) => sum + param.cantidad, 0);
        }
        return producto.cantidad;
    };

    // Verificar si todos los productos filtrados están seleccionados
    const areAllFilteredSelected = filteredProductos.length > 0 &&
        filteredProductos.every(producto => selectedProductIds.includes(producto.id))

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Seleccionar Productos para la Sección</DialogTitle>
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
