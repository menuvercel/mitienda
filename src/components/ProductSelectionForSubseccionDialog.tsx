'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Producto, Subseccion } from '@/types'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface ProductSelectionForSubseccionDialogProps {
    isOpen: boolean
    onClose: () => void
    productos: Producto[]
    productosEnSubseccion: Producto[]
    subseccion: Subseccion | null
    onSave: (productosIds: string[], forzarCambioSeccion: boolean) => Promise<{ success: boolean; error?: string; productosConflicto?: any[] }>
}

export default function ProductSelectionForSubseccionDialog({
    isOpen,
    onClose,
    productos,
    productosEnSubseccion,
    subseccion,
    onSave
}: ProductSelectionForSubseccionDialogProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProducts, setSelectedProducts] = useState<string[]>([])
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [conflictoSecciones, setConflictoSecciones] = useState(false)
    const [productosConflicto, setProductosConflicto] = useState<any[]>([])

    // Inicializar los productos seleccionados cuando se abre el diálogo
    useEffect(() => {
        if (isOpen && productosEnSubseccion.length > 0) {
            setSelectedProducts(productosEnSubseccion.map(p => p.id))
        } else {
            setSelectedProducts([])
        }
        setError(null)
        setConflictoSecciones(false)
        setProductosConflicto([])
    }, [isOpen, productosEnSubseccion])

    // Filtrar productos disponibles para esta subsección
    const filteredProducts = productos
        .filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
        // Mostrar productos que no tienen subsección o que pertenecen a la misma sección que la subsección
        .filter(p => !p.subseccion_id || p.subseccion_id === subseccion?.id || p.seccion_id === subseccion?.seccion_id || !p.seccion_id)
        .sort((a, b) => {
            // Ordenar primero los que ya están en la subsección
            const aInSubseccion = a.subseccion_id === subseccion?.id;
            const bInSubseccion = b.subseccion_id === subseccion?.id;

            if (aInSubseccion && !bInSubseccion) return -1;
            if (!aInSubseccion && bInSubseccion) return 1;

            // Luego ordenar por nombre
            return a.nombre.localeCompare(b.nombre);
        });

    const handleToggleProduct = (productId: string) => {
        setSelectedProducts(prev => {
            if (prev.includes(productId)) {
                return prev.filter(id => id !== productId)
            } else {
                return [...prev, productId]
            }
        })
    }

    const handleSave = async (forzarCambioSeccion = false) => {
        setIsLoading(true)
        setError(null)
        setConflictoSecciones(false)
        setProductosConflicto([])

        try {
            const result = await onSave(selectedProducts, forzarCambioSeccion)

            if (result.success) {
                onClose()
            } else if (result.productosConflicto) {
                setConflictoSecciones(true)
                setProductosConflicto(result.productosConflicto)
            } else {
                setError(result.error || 'Error al guardar los productos')
            }
        } catch (err) {
            setError('Error al guardar los productos')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCloseConflicto = () => {
        setConflictoSecciones(false)
        setProductosConflicto([])
    }

    const handleForzarCambio = () => {
        handleCloseConflicto()
        handleSave(true)
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>
                            Seleccionar Productos para {subseccion?.nombre || 'la Subsección'}
                        </DialogTitle>
                    </DialogHeader>

                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="mb-4">
                        <Input
                            placeholder="Buscar productos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                        <div className="space-y-2">
                            {filteredProducts.length === 0 ? (
                                <p className="text-center py-8 text-gray-500">
                                    No se encontraron productos disponibles para esta subsección
                                </p>
                            ) : (
                                filteredProducts.map((producto) => {
                                    const yaAsignado = producto.subseccion_id === subseccion?.id;
                                    const otraSeccion = producto.seccion_id && producto.seccion_id !== subseccion?.seccion_id;

                                    return (
                                        <div
                                            key={producto.id}
                                            className={`flex items-center p-3 rounded-lg border ${yaAsignado ? 'bg-blue-50 border-blue-200' : 'bg-white'} hover:bg-gray-50`}
                                        >
                                            <Checkbox
                                                checked={selectedProducts.includes(producto.id)}
                                                onCheckedChange={() => handleToggleProduct(producto.id)}
                                                id={`product-${producto.id}`}
                                                className="mr-4"
                                                disabled={isLoading}
                                            />
                                            <div className="w-12 h-12 flex-shrink-0 relative mr-4">
                                                <Image
                                                    src={imageErrors[producto.id] ? '/placeholder.svg' : (producto.foto || '/placeholder.svg')}
                                                    alt={producto.nombre}
                                                    fill
                                                    className="rounded-md object-cover"
                                                    onError={() => {
                                                        setImageErrors(prev => ({
                                                            ...prev,
                                                            [producto.id]: true
                                                        }));
                                                    }}
                                                />
                                            </div>
                                            <label
                                                htmlFor={`product-${producto.id}`}
                                                className="flex-1 cursor-pointer"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-medium text-gray-900 truncate">
                                                        {producto.nombre}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
                                                        <p>Precio: ${Number(producto.precio).toFixed(2)}</p>
                                                        <p>Cantidad: {producto.cantidad}</p>
                                                        {otraSeccion && (
                                                            <p className="text-amber-600">
                                                                ⚠️ Pertenece a otra sección
                                                            </p>
                                                        )}
                                                        {yaAsignado && (
                                                            <p className="text-blue-600">
                                                                Ya asignado a esta subsección
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
                        <Button variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button onClick={() => handleSave(false)} disabled={isLoading}>
                            {isLoading ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={conflictoSecciones} onOpenChange={handleCloseConflicto}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Conflicto de secciones</AlertDialogTitle>
                        <AlertDialogDescription>
                            Los siguientes productos pertenecen a otra sección:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                {productosConflicto.map(p => (
                                    <li key={p.id} className="text-sm">
                                        {p.nombre}
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-2">
                                Si continúas, estos productos serán movidos a la sección de esta subsección.
                                ¿Deseas continuar?
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleForzarCambio} className="bg-amber-600 hover:bg-amber-700">
                            Mover productos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}