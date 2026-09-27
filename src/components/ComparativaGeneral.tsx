'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Producto, Vendedor } from '@/types'
import { getProductosVendedor } from '../app/services/api'
import { Users, ChevronDown, X, Filter } from 'lucide-react'

export default function ComparativaGeneral({
    inventario,
    vendedores
}: {
    inventario: Producto[]
    vendedores: Vendedor[]
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([])
    const [vendorSearchTerm, setVendorSearchTerm] = useState('')
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

    const toggleVendor = (id: string) => {
        setSelectedVendorIds(prev =>
            prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]
        )
    }

    const selectAllVendors = () => {
        setSelectedVendorIds(vendedores.map(v => String(v.id)))
    }

    const clearVendors = () => {
        setSelectedVendorIds([])
    }

    const filteredProducts = inventario.filter(producto => {
        const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStock = minStockFilter === null ||
            (producto.tiene_parametros && producto.parametros
                ? producto.parametros.reduce((sum, param) => sum + param.cantidad, 0) >= minStockFilter
                : producto.cantidad >= minStockFilter)
        return matchesSearch && matchesStock
    })

    const filteredVendors = selectedVendorIds.length > 0
        ? vendedores.filter(v => selectedVendorIds.includes(String(v.id)))
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                            <Filter className="h-5 w-5 text-indigo-600" />
                            Comparativa General de Productos
                        </CardTitle>
                        <Badge variant="outline" className="text-xs self-start sm:self-auto">
                            {filteredVendors.length} de {vendedores.length} puntos de venta comparados
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                placeholder="Buscar producto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-9 text-xs"
                            />

                            {/* Filtro Multi-Selección de Vendedores / Puntos de Venta */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between text-xs h-9 bg-white font-normal border-slate-200"
                                    >
                                        <div className="flex items-center gap-1.5 truncate">
                                            <Users className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                            <span className="truncate">
                                                {selectedVendorIds.length === 0
                                                    ? `Todos los puntos de venta (${vendedores.length})`
                                                    : `${selectedVendorIds.length} seleccionados`}
                                            </span>
                                        </div>
                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-3 bg-white shadow-lg border border-slate-200 z-50" align="start">
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <span className="text-xs font-bold text-slate-800">Puntos de Venta</span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={selectAllVendors}
                                                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                                                >
                                                    Todos
                                                </button>
                                                <span className="text-slate-300 text-xs">|</span>
                                                <button
                                                    type="button"
                                                    onClick={clearVendors}
                                                    className="text-[11px] text-slate-500 hover:underline font-semibold"
                                                >
                                                    Limpiar
                                                </button>
                                            </div>
                                        </div>
                                        <Input
                                            placeholder="Buscar vendedor..."
                                            value={vendorSearchTerm}
                                            onChange={(e) => setVendorSearchTerm(e.target.value)}
                                            className="h-8 text-xs bg-slate-50"
                                        />
                                        <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                                            {vendedores
                                                .filter(v => v.nombre.toLowerCase().includes(vendorSearchTerm.toLowerCase()))
                                                .map((vendedor) => {
                                                    const isChecked = selectedVendorIds.includes(String(vendedor.id));
                                                    return (
                                                        <label
                                                            key={vendedor.id}
                                                            className="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded-md cursor-pointer text-xs"
                                                        >
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onCheckedChange={() => toggleVendor(String(vendedor.id))}
                                                            />
                                                            <span className="flex-1 truncate font-medium text-slate-700">
                                                                {vendedor.nombre}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Select value={minStockFilter?.toString() || 'todos'} onValueChange={(value) => setMinStockFilter(value === 'todos' ? null : parseInt(value))}>
                                <SelectTrigger className="h-9 text-xs bg-white">
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

                        {/* Badges de vendedores seleccionados si hay filtro activo */}
                        {selectedVendorIds.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[11px] font-semibold text-slate-500">Comparando ({filteredVendors.length}):</span>
                                {filteredVendors.map(v => (
                                    <Badge
                                        key={v.id}
                                        variant="secondary"
                                        className="text-[11px] py-0.5 px-2 bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"
                                    >
                                        <span>{v.nombre}</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleVendor(String(v.id))}
                                            className="hover:text-blue-900 ml-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                                <button
                                    type="button"
                                    onClick={clearVendors}
                                    className="text-[11px] text-slate-500 hover:text-rose-600 underline ml-1"
                                >
                                    Ver todos
                                </button>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                <p className="ml-2">Cargando datos...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap font-bold text-slate-800">Nombre del Producto</TableHead>
                                            <TableHead className="whitespace-nowrap font-bold text-slate-800">Precio</TableHead>
                                            <TableHead className="whitespace-nowrap font-bold text-slate-800 bg-blue-50/50">Cantidad en Almacén</TableHead>
                                            {filteredVendors.map(vendedor => (
                                                <TableHead key={vendedor.id} className="whitespace-nowrap font-bold text-slate-700 text-center">
                                                    {vendedor.nombre}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3 + filteredVendors.length} className="text-center py-8 text-slate-500">
                                                    No se encontraron productos
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredProducts.map(producto => (
                                                <TableRow key={producto.id} className="hover:bg-slate-50/60">
                                                    <TableCell className="font-medium whitespace-nowrap">{producto.nombre}</TableCell>
                                                    <TableCell>${typeof producto.precio === 'number' ? producto.precio.toFixed(2) : parseFloat(producto.precio).toFixed(2)}</TableCell>
                                                    <TableCell className="bg-blue-50/30 font-semibold">{calculateTotalQuantity(producto)}</TableCell>
                                                    {filteredVendors.map(vendedor => {
                                                        const vendorProductQuantity = vendorProducts[vendedor.id]?.[producto.id] || 0
                                                        return (
                                                            <TableCell key={`${producto.id}-${vendedor.id}`} className="text-center font-medium">
                                                                <span className={vendorProductQuantity > 0 ? 'text-slate-800 font-semibold' : 'text-slate-300'}>
                                                                    {vendorProductQuantity}
                                                                </span>
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