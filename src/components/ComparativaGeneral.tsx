'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Producto, Vendedor } from '@/types'
import { getProductosVendedor } from '../app/services/api'

export default function ComparativaGeneral({
    inventario,
    vendedores
}: {
    inventario: Producto[]
    vendedores: Vendedor[]
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedVendorFilter, setSelectedVendorFilter] = useState<string | null>(null)
    const [minStockFilter, setMinStockFilter] = useState<number | null>(null)
    const [vendorProducts, setVendorProducts] = useState<Record<string, Record<string, number>>>(() => {
        const initial: Record<string, Record<string, number>> = {}
        vendedores.forEach(vendedor => {
            initial[vendedor.id] = {}
        })
        return initial
    })
    const [isLoading, setIsLoading] = useState(true)

    const fetchVendorProducts = useCallback(async () => {
        setIsLoading(true)
        try {
            const productsData: Record<string, Record<string, number>> = {}

            for (const vendedor of vendedores) {
                try {
                    const productos = await getProductosVendedor(vendedor.id)
                    const productMap: Record<string, number> = {}

                    productos.forEach((producto: Producto) => {
                      if (producto.tiene_parametros && producto.parametros) {
                        const total = producto.parametros.reduce((sum: number, param: any) => sum + param.cantidad, 0)
                        productMap[producto.id] = total
                      } else {
                        productMap[producto.id] = producto.cantidad
                      }
                    })

                    productsData[vendedor.id] = productMap
                } catch (error) {
                    console.error(`Error al obtener productos del vendedor ${vendedor.nombre}:`, error)
                    productsData[vendedor.id] = {}
                }
            }

            setVendorProducts(productsData)
        } catch (error) {
            console.error('Error al cargar datos de productos de vendedores:', error)
        } finally {
            setIsLoading(false)
        }
    }, [vendedores])

    useEffect(() => {
        fetchVendorProducts()
    }, [fetchVendorProducts])

    const filteredProducts = inventario.filter(producto => {
        const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStock = minStockFilter === null ||
            (producto.tiene_parametros && producto.parametros
                ? producto.parametros.reduce((sum, param) => sum + param.cantidad, 0) >= minStockFilter
                : producto.cantidad >= minStockFilter)
        return matchesSearch && matchesStock
    })

    const filteredVendors = selectedVendorFilter
        ? vendedores.filter(v => v.id === selectedVendorFilter)
        : vendedores

    const calculateTotalQuantity = (producto: Producto): number => {
        if (producto.tiene_parametros && producto.parametros) {
            return producto.parametros.reduce((sum, param) => sum + param.cantidad, 0)
        }
        return producto.cantidad
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Comparativa General de Productos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                placeholder="Buscar producto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Select value={selectedVendorFilter || 'todos'} onValueChange={(value) => setSelectedVendorFilter(value === 'todos' ? null : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filtrar por vendedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos los vendedores</SelectItem>
                                    {vendedores.map(vendedor => (
                                        <SelectItem key={vendedor.id} value={vendedor.id}>{vendedor.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={minStockFilter?.toString() || 'todos'} onValueChange={(value) => setMinStockFilter(value === 'todos' ? null : parseInt(value))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filtrar por stock mínimo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Cualquier cantidad</SelectItem>
                                    <SelectItem value="1">Al menos 1</SelectItem>
                                    <SelectItem value="5">Al menos 5</SelectItem>
                                    <SelectItem value="10">Al menos 10</SelectItem>
                                    <SelectItem value="20">Al menos 20</SelectItem>
                                    <SelectItem value="50">Al menos 50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                <p className="ml-2">Cargando datos...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">Nombre del Producto</TableHead>
                                            <TableHead className="whitespace-nowrap">Precio</TableHead>
                                            <TableHead className="whitespace-nowrap">Cantidad en Almacén</TableHead>
                                            {filteredVendors.map(vendedor => (
                                                <TableHead key={vendedor.id} className="whitespace-nowrap">{vendedor.nombre}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3 + filteredVendors.length} className="text-center">
                                                    No se encontraron productos
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredProducts.map(producto => (
                                                <TableRow key={producto.id}>
                                                    <TableCell className="font-medium whitespace-nowrap">{producto.nombre}</TableCell>
                                                    <TableCell>${typeof producto.precio === 'number' ? producto.precio.toFixed(2) : parseFloat(producto.precio).toFixed(2)}</TableCell>
                                                    <TableCell>{calculateTotalQuantity(producto)}</TableCell>
                                                    {filteredVendors.map(vendedor => {
                                                        const vendorProductQuantity = vendorProducts[vendedor.id]?.[producto.id] || 0
                                                        return (
                                                            <TableCell key={`${producto.id}-${vendedor.id}`}>
                                                                {vendorProductQuantity}
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}