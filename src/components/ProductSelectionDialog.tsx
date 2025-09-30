'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, X } from "lucide-react"
import Image from 'next/image'
import { toast } from "@/hooks/use-toast"

interface Producto {
    id: string
    nombre: string
    precio: number
    foto?: string
    seccion_id?: string | null
    subseccion_id?: string | null
    inventarios?: Array<{
        cantidad: number
        sucursal_id: string
    }>
}

interface ProductSelectionDialogProps {
    isOpen: boolean
    onClose: () => void
    allProductos: Producto[]
    currentProductos: Producto[]
    onProductosSelected: (selectedProductIds: string[]) => void
    subseccionId?: string | null
    seccionId?: string | null
}

const ProductSelectionDialog: React.FC<ProductSelectionDialogProps> = ({
    isOpen,
    onClose,
    allProductos,
    currentProductos,
    onProductosSelected,
    subseccionId,
    seccionId
}) => {
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
    const [isInitialized, setIsInitialized] = useState(false)

    // Función para calcular cantidad total de stock
    const calcularCantidadTotal = useCallback((producto: Producto) => {
        return producto.inventarios?.reduce((total, inv) => total + inv.cantidad, 0) || 0
    }, [])

    // Función helper para determinar el estado del producto
    const getProductStatus = useCallback((producto: Producto) => {
        if (seccionId && !subseccionId) {
            if (producto.seccion_id === seccionId && !producto.subseccion_id) {
                return { status: 'current', label: 'En esta sección', color: 'green' }
            }
            if (producto.seccion_id && producto.seccion_id !== seccionId) {
                return { status: 'other', label: 'En otra sección', color: 'yellow' }
            }
            if (producto.subseccion_id) {
                return { status: 'subsection', label: 'En subsección', color: 'blue' }
            }
        }

        if (subseccionId) {
            if (producto.subseccion_id === subseccionId) {
                return { status: 'current', label: 'En esta subsección', color: 'green' }
            }
            if (producto.subseccion_id && producto.subseccion_id !== subseccionId) {
                return { status: 'other', label: 'En otra subsección', color: 'yellow' }
            }
            if (producto.seccion_id && !producto.subseccion_id) {
                return { status: 'section', label: 'En sección padre', color: 'blue' }
            }
        }

        return { status: 'available', label: 'Disponible', color: 'gray' }
    }, [seccionId, subseccionId])

    // Verificar si la sección/subsección actual tiene productos asignados
    const hasCurrentProducts = useMemo(() => {
        if (!Array.isArray(currentProductos)) return false

        return currentProductos.some(p => {
            if (seccionId && !subseccionId) {
                return p.seccion_id === seccionId && !p.subseccion_id
            }
            if (subseccionId) {
                return p.subseccion_id === subseccionId
            }
            return false
        })
    }, [currentProductos, seccionId, subseccionId])

    // Filtrar productos según la lógica de negocio
    const filteredProductos = useMemo(() => {
        if (!Array.isArray(allProductos)) return []

        let availableProducts = allProductos.filter(producto => {
            // Filtro por búsqueda
            const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
            if (!matchesSearch) return false

            // Si la sección/subsección actual NO tiene productos asignados
            if (!hasCurrentProducts) {
                if (seccionId && !subseccionId) {
                    // Para sección: mostrar solo productos sin seccion_id y sin subseccion_id
                    return !producto.seccion_id && !producto.subseccion_id
                }
                if (subseccionId) {
                    // Para subsección: mostrar solo productos completamente libres
                    // NO mostrar productos que estén en la sección padre ni en otras subsecciones
                    return !producto.seccion_id && !producto.subseccion_id
                }
            } else {
                // Si la sección/subsección SÍ tiene productos asignados
                // Mostrar todos los productos (para permitir reasignaciones)
                return true
            }

            return false
        })

        return availableProducts
    }, [allProductos, searchTerm, hasCurrentProducts, seccionId, subseccionId])

    // Inicializar productos seleccionados solo cuando el diálogo se abre
    useEffect(() => {
        if (isOpen && !isInitialized) {
            const initialSelectedIds = currentProductos
                ?.filter(p => {
                    if (seccionId && !subseccionId) {
                        return p.seccion_id === seccionId && !p.subseccion_id
                    }
                    if (subseccionId) {
                        return p.subseccion_id === subseccionId
                    }
                    return false
                })
                ?.map(p => p.id) || []

            setSelectedProductIds(initialSelectedIds)
            setSearchTerm('')
            setIsInitialized(true)
        } else if (!isOpen) {
            setIsInitialized(false)
        }
    }, [isOpen, currentProductos, isInitialized, seccionId, subseccionId])

    // Manejar selección/deselección de productos individuales
    const handleProductToggle = useCallback((productId: string) => {
        const producto = allProductos.find(p => p.id === productId)

        if (!producto) return

        const isAssignedElsewhere = (
            (seccionId && !subseccionId && producto.seccion_id && producto.seccion_id !== seccionId) ||
            (subseccionId && producto.subseccion_id && producto.subseccion_id !== subseccionId) ||
            (subseccionId && producto.seccion_id && producto.seccion_id !== seccionId && !producto.subseccion_id)
        )

        if (isAssignedElsewhere) {
            toast({
                title: "Reasignación de producto",
                description: `El producto "${producto.nombre}" será movido desde su ubicación actual`,
                variant: "default",
            })
        }

        setSelectedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        )
    }, [allProductos, seccionId, subseccionId])

    // Manejar selección/deselección de todos los productos
    const handleSelectAll = useCallback(() => {
        const allFilteredIds = filteredProductos.map(producto => producto.id)
        const areAllSelected = allFilteredIds.every(id => selectedProductIds.includes(id))

        if (areAllSelected) {
            setSelectedProductIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
        } else {
            setSelectedProductIds(prev => {
                const newIds = [...prev]
                allFilteredIds.forEach(id => {
                    if (!newIds.includes(id)) {
                        newIds.push(id)
                    }
                })
                return newIds
            })

            const productsToReassign = filteredProductos.filter(producto => {
                const productStatus = getProductStatus(producto)
                return productStatus.status === 'other'
            })

            if (productsToReassign.length > 0) {
                toast({
                    title: "Reasignación masiva",
                    description: `${productsToReassign.length} productos serán movidos desde otras ubicaciones`,
                    variant: "default",
                })
            }
        }
    }, [filteredProductos, selectedProductIds, getProductStatus])

    // Manejar guardado de selección
    const handleSave = useCallback(() => {
        onProductosSelected(selectedProductIds)
        onClose()
    }, [selectedProductIds, onProductosSelected, onClose])

    // Limpiar búsqueda
    const clearSearch = useCallback(() => {
        setSearchTerm('')
    }, [])

    if (!isOpen) return null

    const allFilteredIds = filteredProductos.map(producto => producto.id)
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedProductIds.includes(id))
    const selectedCount = selectedProductIds.length

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>
                        Seleccionar Productos {subseccionId ? 'para Subsección' : 'para Sección'}
                        {!hasCurrentProducts && (
                            <span className="block text-sm font-normal text-gray-500 mt-1">
                                Mostrando solo productos disponibles (sin asignar)
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col space-y-4 flex-1 min-h-0">
                    {/* Barra de búsqueda */}
                    <div className="relative flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Buscar productos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-10"
                        />
                        {searchTerm && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Controles de selección */}
                    <div className="flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={areAllSelected}
                                onCheckedChange={handleSelectAll}
                                disabled={filteredProductos.length === 0}
                            />
                            <span className="text-sm font-medium">
                                Seleccionar todos ({filteredProductos.length} productos)
                            </span>
                        </div>
                        <span className="text-sm text-gray-500">
                            {selectedCount} producto{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Lista de productos con scroll nativo */}
                    <div className="flex-1 border rounded-lg overflow-hidden">
                        <div className="h-full overflow-y-auto">
                            <div className="p-4 space-y-2">
                                {filteredProductos.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        {searchTerm ? (
                                            'No se encontraron productos que coincidan con la búsqueda'
                                        ) : !hasCurrentProducts ? (
                                            'No hay productos disponibles sin asignar'
                                        ) : (
                                            'No hay productos disponibles'
                                        )}
                                    </div>
                                ) : (
                                    filteredProductos.map((producto) => {
                                        const productStatus = getProductStatus(producto)

                                        return (
                                            <div
                                                key={producto.id}
                                                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => handleProductToggle(producto.id)}
                                            >
                                                <Checkbox
                                                    checked={selectedProductIds.includes(producto.id)}
                                                    onCheckedChange={() => handleProductToggle(producto.id)}
                                                    onClick={(e) => e.stopPropagation()}
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
                                                            }))
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2 mb-1">
                                                        <h4 className="font-medium truncate">{producto.nombre}</h4>
                                                        {productStatus.status !== 'available' && (
                                                            <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${productStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                                                                    productStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                                                        productStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {productStatus.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">
                                                        ${producto.precio?.toLocaleString()} - Stock: {calcularCantidadTotal(producto)}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-shrink-0">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                        Guardar Selección ({selectedCount})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ProductSelectionDialog
