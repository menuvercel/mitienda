'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import Image from 'next/image'
import { Star, Search } from 'lucide-react'
import { Producto } from '@/types'

interface ProductosDestacadosSelectionDialogProps {
    isOpen: boolean
    onClose: () => void
    productos: Producto[]
    productosDestacados: Producto[]
    onSave: (selectedProductIds: string[]) => void
}

export default function ProductosDestacadosSelectionDialog({
    isOpen,
    onClose,
    productos,
    productosDestacados,
    onSave
}: ProductosDestacadosSelectionDialogProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

    useEffect(() => {
        if (isOpen) {
            setSelectedProductIds(productosDestacados.map(p => p.id))
        }
    }, [isOpen, productosDestacados])

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

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <Star className="mr-2 h-5 w-5 text-yellow-500" />
                        Seleccionar Productos Destacados
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Buscar productos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                        <p><strong>Tip:</strong> Los productos destacados aparecerán en la sección principal de tu tienda.</p>
                        <p>Selecciona hasta 12 productos para mejores resultados.</p>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredProductos.length === 0 ? (
                                <div className="col-span-2 text-center py-8 text-gray-500">
                                    No se encontraron productos
                                </div>
                            ) : (
                                filteredProductos.map((producto) => {
                                    const isSelected = selectedProductIds.includes(producto.id)
                                    const cantidadTotal = calcularCantidadTotal(producto)

                                    return (
                                        <div
                                            key={producto.id}
                                            className={`flex items-center space-x-3 p-3 border rounded-lg transition-all cursor-pointer ${isSelected
                                                    ? 'border-yellow-500 bg-yellow-50'
                                                    : 'hover:bg-gray-50 border-gray-200'
                                                }`}
                                            onClick={() => handleProductToggle(producto.id)}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleProductToggle(producto.id)}
                                            />

                                            <div className="w-16 h-16 relative rounded-md overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={producto.foto || '/placeholder.svg'}
                                                    alt={producto.nombre}
                                                    fill
                                                    className="object-cover"
                                                />
                                                {isSelected && (
                                                    <div className="absolute inset-0 bg-yellow-500 bg-opacity-20 flex items-center justify-center">
                                                        <Star className="h-6 w-6 text-yellow-600" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium truncate">{producto.nombre}</h4>
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className="text-sm font-semibold text-green-600">
                                                        ${producto.precio}
                                                    </p>
                                                    <div className="flex items-center space-x-2">
                                                        <p className={`text-xs ${cantidadTotal === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                                            Stock: {cantidadTotal}
                                                        </p>
                                                        {producto.tiene_parametros && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Variantes
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <p className="text-sm font-medium text-gray-700">
                                <Star className="inline h-4 w-4 text-yellow-500 mr-1" />
                                {selectedProductIds.length} productos destacados seleccionados
                            </p>
                            {selectedProductIds.length > 12 && (
                                <Badge variant="destructive" className="text-xs">
                                    Recomendado: máximo 12 productos
                                </Badge>
                            )}
                        </div>

                        <div className="flex space-x-2">
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600">
                                <Star className="mr-2 h-4 w-4" />
                                Guardar Destacados
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
