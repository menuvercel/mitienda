import React, { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import Image from 'next/image'
import { Vendedor, Producto, Venta, Transaccion, TransaccionParametro } from '@/types'
import { Minus, DollarSign, ArrowLeftRight, Search, ChevronDown, ChevronUp, Loader2, ArrowUpDown, FileDown, X } from 'lucide-react'
import { format, parseISO, startOfWeek, endOfWeek, isValid, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'

interface VendorDialogProps {
  vendor: Vendedor
  onClose: () => void
  onEdit: (editedVendor: Vendedor) => Promise<void>
  productos: Producto[]
  transacciones: Transaccion[]
  ventas: Venta[]
  ventasSemanales: VentaSemana[]
  ventasDiarias: VentaDia[]
  onProductReduce: (
    productId: string,
    vendorId: string,
    cantidad: number,
    parametros?: { nombre: string; cantidad: number }[]
  ) => Promise<void>
  onDeleteSale: (saleId: string, vendedorId: string) => Promise<void>
  onProductMerma: (
    productId: string,
    vendorId: string,
    cantidad: number,
    parametros?: { nombre: string; cantidad: number }[]
  ) => Promise<void>
  vendedores: Vendedor[]
  onProductTransfer: (
    productId: string,
    fromVendorId: string,
    toVendorId: string,
    cantidad: number,
    parametros?: Array<{ nombre: string; cantidad: number }>
  ) => Promise<void>;
}


interface VentaSemana {
  fechaInicio: string
  fechaFin: string
  ventas: Venta[]
  total: number
  ganancia: number
}

interface VentaDia {
  fecha: string
  ventas: Venta[]
  total: number
}


export default function VendorDialog({ vendor, onClose, onEdit, productos, transacciones, ventas, ventasSemanales, ventasDiarias, onProductReduce, onDeleteSale, onProductMerma, vendedores, onProductTransfer }: VendorDialogProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'productos' | 'ventas' | 'transacciones'>('view')
  const [editedVendor, setEditedVendor] = useState(vendor)
  const [searchTerm, setSearchTerm] = useState('')
  const [ventasLocales, setVentasLocales] = useState<Venta[]>(ventas)
  const [reduceDialogOpen, setReduceDialogOpen] = useState(false)
  const [productToReduce, setProductToReduce] = useState<Producto | null>(null)
  const [quantityToReduce, setQuantityToReduce] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [ventasSemanalesState, setVentasSemanales] = useState<VentaSemana[]>([])
  const [sortBy, setSortBy] = useState<'nombre' | 'cantidad'>('nombre')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [ventasEspecificas, setVentasEspecificas] = useState<{ producto: string; cantidad: number }[]>([])
  const [sortByVentas, setSortByVentas] = useState<'asc' | 'desc'>('desc')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ventasDiariasLocales, setVentasDiariasLocales] = useState<VentaDia[]>(ventasDiarias)
  const [showDestinationDialog, setShowDestinationDialog] = useState(false)
  const [selectedDestination, setSelectedDestination] = useState<'almacen' | 'merma' | 'vendedor' | null>(null)
  const [showVendorSelectDialog, setShowVendorSelectDialog] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null)
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})
  const [parameterQuantities, setParameterQuantities] = useState<Record<string, number>>({})



  // En el componente VendorDialog
  const handleDeleteSale = async (saleId: string) => {
    try {
      await onDeleteSale(saleId, vendor.id)

      // Actualizar ventasLocales
      setVentasLocales(prevVentas => prevVentas.filter(v => v.id !== saleId))

      // Actualizar ventasDiariasLocales
      setVentasDiariasLocales(prevVentasDiarias =>
        prevVentasDiarias.map(ventaDia => ({
          ...ventaDia,
          ventas: ventaDia.ventas.filter(v => v.id !== saleId),
          total: ventaDia.ventas
            .filter(v => v.id !== saleId)
            .reduce((sum, v) => sum + parseFloat(v.total.toString()), 0)
        })).filter(ventaDia => ventaDia.ventas.length > 0)
      )

      // Recalcular ventas semanales
      const nuevasVentasLocales = ventasLocales.filter(v => v.id !== saleId)
      const nuevasVentasSemanales = agruparVentasPorSemana(nuevasVentasLocales)
      setVentasSemanales(nuevasVentasSemanales)

      // Recalcular ventas específicas
      calcularVentasEspecificas()

      toast({
        title: "Éxito",
        description: "La venta se ha eliminado correctamente.",
      })
    } catch (error) {
      console.error('Error al eliminar la venta:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la venta. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const calcularVentasEspecificas = useCallback(() => {
    const ventasPorProducto = ventasLocales.reduce((acc, venta) => {
      if (!acc[venta.producto_nombre]) {
        acc[venta.producto_nombre] = 0
      }
      acc[venta.producto_nombre] += venta.cantidad
      return acc
    }, {} as Record<string, number>)

    const ventasEspecificasArray = Object.entries(ventasPorProducto).map(([producto, cantidad]) => ({
      producto,
      cantidad
    }))

    setVentasEspecificas(ventasEspecificasArray)
  }, [ventasLocales])

  useEffect(() => {
    calcularVentasEspecificas()
  }, [ventas, calcularVentasEspecificas])

  const sortVentasEspecificas = () => {
    setSortByVentas(prev => prev === 'asc' ? 'desc' : 'asc')
    setVentasEspecificas(prev =>
      [...prev].sort((a, b) =>
        sortByVentas === 'asc' ? a.cantidad - b.cantidad : b.cantidad - a.cantidad
      )
    )
  }

  const renderVentasEspecificas = () => {
    return (
      <div className="space-y-4">
        <Button onClick={sortVentasEspecificas} className="mb-4">
          Ordenar por cantidad de ventas
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad Vendida</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventasEspecificas.map((venta) => (
              <TableRow key={venta.producto}>
                <TableCell>{venta.producto}</TableCell>
                <TableCell>{venta.cantidad}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const exportToExcel = useCallback(() => {
    let dataToExport: any[] = [];
    let fileName = '';

    if (mode === 'productos') {
      dataToExport = productos.map(producto => ({
        Nombre: producto.nombre,
        Precio: producto.precio,
        Cantidad: producto.cantidad
      }));
      fileName = `productos_${vendor.nombre}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    } else if (mode === 'ventas') {
      dataToExport = ventas.map(venta => ({
        Fecha: format(parseISO(venta.fecha), 'dd/MM/yyyy'),
        Producto: venta.producto_nombre,
        Cantidad: venta.cantidad,
        'Precio Unitario': venta.precio_unitario,
        Total: venta.total
      }));
      fileName = `ventas_${vendor.nombre}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    } else if (mode === 'transacciones') {
      dataToExport = transacciones.map(transaccion => ({
        Fecha: format(parseISO(transaccion.fecha), 'dd/MM/yyyy'),
        Producto: transaccion.producto,
        Cantidad: transaccion.cantidad,
        Tipo: transaccion.tipo || 'Normal',
        Precio: transaccion.precio
      }));
      fileName = `transacciones_${vendor.nombre}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, fileName);
  }, [mode, productos, ventas, transacciones, vendor.nombre]);

  const handleSort = (key: 'nombre' | 'cantidad') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  const sortAndFilterProducts = useCallback((products: Producto[]) => {
    const calcularCantidadTotal = (producto: Producto) => {
      if (producto.parametros && producto.parametros.length > 0) {
        return producto.parametros.reduce((total, param) => total + (param.cantidad || 0), 0)
      }
      return producto.cantidad
    }

    return products
      .filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'nombre') {
          return sortOrder === 'asc'
            ? a.nombre.localeCompare(b.nombre)
            : b.nombre.localeCompare(a.nombre)
        } else {
          const cantidadA = calcularCantidadTotal(a)
          const cantidadB = calcularCantidadTotal(b)
          return sortOrder === 'asc'
            ? cantidadA - cantidadB
            : cantidadB - cantidadA
        }
      })
  }, [searchTerm, sortBy, sortOrder])


  const formatDate = (dateString: string): string => {
    try {
      const date = parseISO(dateString)
      if (!isValid(date)) {
        console.error(`Invalid date string: ${dateString}`)
        return 'Fecha inválida'
      }
      return format(date, 'dd/MM/yyyy', { locale: es })
    } catch (error) {
      console.error(`Error formatting date: ${dateString}`, error)
      return 'Error en fecha'
    }
  }

  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)
  }

  const VentaDiaDesplegable = ({ venta }: { venta: VentaDia }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [saleToDelete, setSaleToDelete] = useState<string | null>(null)

    const handleDeleteClick = (saleId: string) => {
      setSaleToDelete(saleId)
      setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
      if (saleToDelete) {
        try {
          await handleDeleteSale(saleToDelete)
          setDeleteDialogOpen(false)
          setSaleToDelete(null)
        } catch (error) {
          console.error('Error al eliminar la venta:', error)
          toast({
            title: "Error",
            description: "No se pudo eliminar la venta. Por favor, inténtelo de nuevo.",
            variant: "destructive",
          })
        }
      }
    }

    const renderParametros = (venta: Venta) => {
      if (!venta.parametros || venta.parametros.length === 0) return null

      return (
        <div className="mt-1 text-sm text-gray-600">
          {venta.parametros.map((param, index) => (
            <div key={index} className="flex space-x-2">
              <span>{param.nombre}:</span>
              <span>{param.cantidad}</span>
            </div>
          ))}
        </div>
      )
    }

    const calcularCantidadTotal = (venta: Venta) => {
      if (venta.parametros && venta.parametros.length > 0) {
        return venta.parametros.reduce((acc, param) => acc + param.cantidad, 0)
      }
      return venta.cantidad
    }

    return (
      <div className="border rounded-lg mb-2">
        <div
          className="flex justify-between items-center p-4 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{formatDate(venta.fecha)}</span>
          <div className="flex items-center">
            <span className="mr-2">${formatPrice(venta.total)}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        {isOpen && (
          <div className="p-4 bg-gray-50">
            {venta.ventas.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2">
                <div className="flex items-center flex-grow">
                  <Image
                    src={v.producto_foto || '/placeholder.svg'}
                    alt={v.producto_nombre}
                    width={40}
                    height={40}
                    className="rounded-md mr-4"
                  />
                  <div>
                    <span className="font-medium">{v.producto_nombre}</span>
                    {renderParametros(v)}
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-right mr-4">
                    <div>Cantidad: {calcularCantidadTotal(v)}</div>
                    <div>${formatPrice(v.precio_unitario)}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(v.id)
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
            </DialogHeader>
            <p>¿Está seguro de que desea eliminar esta venta?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const VentaSemanaDesplegable = ({ venta }: { venta: VentaSemana }) => {
    const [isOpen, setIsOpen] = useState(false)

    const parsePrice = (price: number | string): number => {
      if (typeof price === 'number') return price
      const parsed = parseFloat(price)
      return isNaN(parsed) ? 0 : parsed
    }

    const calcularTotalVenta = (venta: Venta) => {
      const cantidadTotal = venta.parametros && venta.parametros.length > 0
        ? venta.parametros.reduce((acc, param) => acc + param.cantidad, 0)
        : venta.cantidad
      return cantidadTotal * parsePrice(venta.precio_unitario)
    }

    const ventasPorDia = venta.ventas.reduce((acc: Record<string, Venta[]>, v) => {
      const fecha = parseISO(v.fecha)
      if (!isValid(fecha)) {
        console.error(`Invalid date in venta: ${v.fecha}`)
        return acc
      }
      const fechaStr = format(fecha, 'yyyy-MM-dd')
      if (!acc[fechaStr]) {
        acc[fechaStr] = []
      }
      acc[fechaStr].push(v)
      return acc
    }, {})

    return (
      <div className="border rounded-lg mb-2">
        <div
          className="flex justify-between items-center p-4 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>Semana {formatDate(venta.fechaInicio)} - {formatDate(venta.fechaFin)}</span>
          <div className="flex items-center space-x-4">
            <span>${formatPrice(venta.total)}</span>
            <span className="text-green-600">Ganancia: ${formatPrice(venta.ganancia)}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        {isOpen && (
          <div className="p-4 bg-gray-50">
            {Object.entries(ventasPorDia)
              .sort(([dateA], [dateB]) => {
                const a = parseISO(dateA)
                const b = parseISO(dateB)
                return isValid(a) && isValid(b) ? a.getTime() - b.getTime() : 0
              })
              .map(([fecha, ventasDia]) => {
                const fechaVenta = parseISO(fecha)
                const fechaInicio = parseISO(venta.fechaInicio)
                const fechaFin = parseISO(venta.fechaFin)
                if (isValid(fechaVenta) && isValid(fechaInicio) && isValid(fechaFin) &&
                  fechaVenta >= fechaInicio && fechaVenta <= fechaFin) {
                  return (
                    <VentaDiaDesplegable
                      key={fecha}
                      venta={{
                        fecha,
                        ventas: ventasDia,
                        total: ventasDia.reduce((sum, v) => sum + calcularTotalVenta(v), 0)
                      }}
                    />
                  )
                }
                return null
              })}
          </div>
        )}
      </div>
    )
  }



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'newPassword') {
      setNewPassword(value)
    } else if (name === 'confirmPassword') {
      setConfirmPassword(value)
    } else {
      setEditedVendor(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleEdit = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const updatedVendor = {
        ...editedVendor,
        ...(newPassword && { password: newPassword }),
      }
      await onEdit(updatedVendor)
      setMode('view')
      setNewPassword('')
      setConfirmPassword('')
      toast({
        title: "Éxito",
        description: "Los datos del vendedor se han actualizado correctamente.",
      })
    } catch (error) {
      console.error('Error al editar el vendedor:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar los datos del vendedor. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // En VendorDialog
  const handleReduceProduct = async () => {
    if (!productToReduce || !selectedDestination) return;

    setIsLoading(true);
    try {
      const parametrosReduccion = productToReduce.tiene_parametros && productToReduce.parametros
        ? Object.entries(parameterQuantities)
          .filter(([_, cantidad]) => cantidad > 0)
          .map(([nombre, cantidad]) => ({
            nombre,
            cantidad
          }))
        : undefined;

      if (selectedDestination === 'merma') {
        // Solo llamar a onProductMerma
        await onProductMerma(
          productToReduce.id,
          vendor.id,
          productToReduce.tiene_parametros ? 0 : quantityToReduce,
          parametrosReduccion
        );
      } else if (selectedDestination === 'almacen') {
        // Para devolución al almacén, usar onProductReduce
        await onProductReduce(
          productToReduce.id,
          vendor.id,
          productToReduce.tiene_parametros ? 0 : quantityToReduce,
          parametrosReduccion
        );
      }

      setShowDestinationDialog(false);
      setSelectedDestination(null);
      setProductToReduce(null);
      setQuantityToReduce(0);
      setParameterQuantities({});

      toast({
        title: "Éxito",
        description: `Producto ${selectedDestination === 'merma' ? 'enviado a merma' : 'reducido'} correctamente.`,
      });
    } catch (error) {
      console.error('Error al procesar la operación:', error);
      toast({
        title: "Error",
        description: `No se pudo ${selectedDestination === 'merma' ? 'enviar a merma' : 'reducir'} el producto.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  const filterItems = useCallback((items: any[], term: string) => {
    return items.filter(item =>
      Object.values(item).some(value =>
        value && value.toString().toLowerCase().includes(term.toLowerCase())
      )
    )
  }, [])

  const toggleExpand = useCallback((productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }, [])

  const renderProductList = useCallback((products: Producto[]) => {
    const filteredAndSortedProducts = sortAndFilterProducts(products)

    const calcularCantidadTotal = (producto: Producto) => {
      if (producto.parametros && producto.parametros.length > 0) {
        return producto.parametros.reduce((total, param) => total + (param.cantidad || 0), 0)
      }
      return producto.cantidad
    }

    return (
      <div className="space-y-2">
        {filteredAndSortedProducts.map(producto => {
          const hasParameters = producto.parametros && producto.parametros.length > 0
          const isExpanded = expandedProducts[producto.id] || false
          const cantidadTotal = calcularCantidadTotal(producto)

          return (
            <div
              key={producto.id}
              className={`bg-white rounded-lg shadow overflow-hidden ${hasParameters ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => hasParameters && toggleExpand(producto.id)}
            >
              <div className="flex items-center p-4">
                <Image
                  src={producto.foto || '/placeholder.svg'}
                  alt={producto.nombre}
                  width={50}
                  height={50}
                  className="object-cover rounded mr-4"
                />
                <div className="flex-grow">
                  <div className="flex items-center">
                    <h3 className="font-bold">{producto.nombre}</h3>
                    {hasParameters && (
                      <ChevronDown
                        className={`ml-2 h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    ${formatPrice(producto.precio)} - Cantidad total: {cantidadTotal}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Aquí establecemos el producto a reducir y abrimos el diálogo
                    setProductToReduce(producto)
                    setReduceDialogOpen(true)
                  }}
                  disabled={isLoading || cantidadTotal === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
              {isExpanded && producto.parametros && (
                <div className="px-4 pb-4 bg-gray-50 border-t">
                  <div className="space-y-2 mt-2">
                    {producto.parametros.map((parametro, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-white rounded-md"
                      >
                        <span className="font-medium text-sm">{parametro.nombre}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            Cantidad: {parametro.cantidad}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }, [expandedProducts, handleReduceProduct, isLoading, toggleExpand, setProductToReduce, setReduceDialogOpen])

  const renderVentasList = () => {
    return (
      <Tabs defaultValue="por-dia">
        <TabsList>
          <TabsTrigger value="por-dia">Por día</TabsTrigger>
          <TabsTrigger value="por-semana">Por semana</TabsTrigger>
          <TabsTrigger value="especificas">Ventas Específicas</TabsTrigger>
        </TabsList>
        <TabsContent value="por-dia">
          <div className="space-y-4">
            <div className="relative mb-4">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar ventas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {ventasDiariasLocales.length > 0 ? (
              ventasDiariasLocales.map((venta) => (
                <VentaDiaDesplegable
                  key={venta.fecha}
                  venta={venta}
                />
              ))
            ) : (
              <div className="text-center py-4">No hay ventas registradas</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="por-semana">
          <div className="space-y-4">
            <div className="relative mb-4">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar ventas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {ventasSemanalesState.length > 0 ? (
              ventasSemanalesState.map((venta) => (
                <VentaSemanaDesplegable key={`${venta.fechaInicio}-${venta.fechaFin}`} venta={venta} />
              ))
            ) : (
              <div className="text-center py-4">No hay ventas registradas</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="especificas">
          {renderVentasEspecificas()}
        </TabsContent>
      </Tabs>
    )
  }

  const renderTransaccionesList = () => {
    const vendorId = vendor.id.toString(); // Aseguramos que el ID del vendedor sea string

    const filteredTransacciones = filterItems(transacciones, searchTerm).filter(transaccion => {
      const transaccionDesde = transaccion.desde?.toString();
      const transaccionHacia = transaccion.hacia?.toString();

      // Si es el vendedor origen, solo mostrar las Bajas
      if (transaccionDesde === vendorId && transaccion.tipo === 'Baja') {
        return true;
      }

      // Si es el vendedor destino, solo mostrar las Entregas
      if (transaccionHacia === vendorId && transaccion.tipo === 'Entrega') {
        return true;
      }

      return false;
    });

    return (
      <div className="space-y-2">
        {filteredTransacciones.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No hay transacciones para mostrar
          </div>
        ) : (
          filteredTransacciones.map((transaccion: Transaccion) => {
            const transactionType = transaccion.tipo || 'Normal'
            const borderColor =
              transactionType === 'Baja' ? 'border-red-500' :
                transactionType === 'Entrega' ? 'border-green-500' :
                  'border-blue-500'

            const precioFormateado = parseFloat(transaccion.precio?.toString() || '0').toFixed(2)

            return (
              <div key={transaccion.id} className={`bg-white p-2 rounded-lg shadow border-l-4 ${borderColor}`}>
                <div className="flex items-center">
                  <ArrowLeftRight className="w-6 h-6 text-blue-500 mr-2 flex-shrink-0" />
                  <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-sm truncate">{transaccion.producto}</p>
                      <p className="text-sm font-semibold text-green-600">
                        ${precioFormateado}
                      </p>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-600">
                      <span>{format(parseISO(transaccion.fecha), 'dd/MM/yyyy')}</span>
                      {!transaccion.parametros ? (
                        <span>Cantidad: {transaccion.cantidad}</span>
                      ) : (
                        <span></span>
                      )}
                    </div>
                    <p className="text-xs font-semibold">{transactionType}</p>

                    {transaccion.parametros && transaccion.parametros.length > 0 && (
                      <div className="mt-2 border-t pt-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Parámetros:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            {transaccion.parametros.map((param: TransaccionParametro, index: number) => (
                              <div key={`${transaccion.id}-param-${index}`} className="flex justify-between text-xs">
                                <span className="text-gray-600">{param.nombre}:</span>
                                <span className="font-medium">{param.cantidad}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }





  const agruparVentasPorSemana = useCallback((ventas: Venta[]) => {
    const weekMap = new Map<string, VentaSemana>()

    const getWeekKey = (date: Date) => {
      const mondayOfWeek = startOfWeek(date, { weekStartsOn: 1 })
      const sundayOfWeek = endOfWeek(date, { weekStartsOn: 1 })
      return `${format(mondayOfWeek, 'yyyy-MM-dd')}_${format(sundayOfWeek, 'yyyy-MM-dd')}`
    }

    ventas.forEach((venta) => {
      const ventaDate = parseISO(venta.fecha)
      if (!isValid(ventaDate)) {
        console.error(`Invalid date in venta: ${venta.fecha}`)
        return
      }
      const weekKey = getWeekKey(ventaDate)

      if (!weekMap.has(weekKey)) {
        const mondayOfWeek = startOfWeek(ventaDate, { weekStartsOn: 1 })
        const sundayOfWeek = endOfWeek(ventaDate, { weekStartsOn: 1 })
        weekMap.set(weekKey, {
          fechaInicio: format(mondayOfWeek, 'yyyy-MM-dd'),
          fechaFin: format(sundayOfWeek, 'yyyy-MM-dd'),
          ventas: [],
          total: 0,
          ganancia: 0
        })
      }

      const currentWeek = weekMap.get(weekKey)!
      currentWeek.ventas.push(venta)
      currentWeek.total += typeof venta.total === 'number' ? venta.total : parseFloat(venta.total) || 0
      currentWeek.ganancia = parseFloat((currentWeek.total * 0.08).toFixed(2))
    })

    const ventasSemanales = Array.from(weekMap.values())

    return ventasSemanales.sort((a, b) => {
      const dateA = parseISO(a.fechaInicio)
      const dateB = parseISO(b.fechaInicio)
      return isValid(dateB) && isValid(dateA) ? dateB.getTime() - dateA.getTime() : 0
    })
  }, [])

  useEffect(() => {
    setVentasSemanales(agruparVentasPorSemana(ventasLocales))
  }, [ventasLocales, agruparVentasPorSemana])


  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]"> {/* Cambiado de w-full max-w-full sm:max-w-[90vw] */}
        <DialogHeader className="p-4">
          <DialogTitle>{vendor.nombre}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-4">
          {mode === 'edit' ? (
            <div className="space-y-4">
              <Input
                name="nombre"
                value={editedVendor.nombre}
                onChange={handleInputChange}
                placeholder="Nombre del vendedor"
              />
              <Input
                name="telefono"
                value={editedVendor.telefono}
                onChange={handleInputChange}
                placeholder="Teléfono"
              />
              <Input
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={handleInputChange}
                placeholder="Nueva contraseña (dejar en blanco para no cambiar)"
              />
              <Input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirmar nueva contraseña"
              />
              <Button onClick={handleEdit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </div>
          ) : mode === 'productos' ? (
            <div className="max-h-[600px] overflow-y-auto">
              <Tabs defaultValue="disponibles" className="w-full">
                <div className="flex justify-center mb-4">
                  <Button onClick={exportToExcel} className="bg-green-500 hover:bg-green-600 text-white">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="disponibles">Disponibles</TabsTrigger>
                  <TabsTrigger value="agotados">Agotados</TabsTrigger>
                </TabsList>
                <div className="space-y-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex justify-start space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSort('nombre')}
                      className="flex items-center"
                    >
                      Nombre
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSort('cantidad')}
                      className="flex items-center"
                    >
                      Cantidad
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <TabsContent value="disponibles">
                  {renderProductList(productos.filter(p => {
                    const cantidadTotal = p.parametros && p.parametros.length > 0
                      ? p.parametros.reduce((total, param) => total + (param.cantidad || 0), 0)
                      : p.cantidad
                    return cantidadTotal > 0
                  }))}
                </TabsContent>
                <TabsContent value="agotados">
                  {renderProductList(productos.filter(p => {
                    const cantidadTotal = p.parametros && p.parametros.length > 0
                      ? p.parametros.reduce((total, param) => total + (param.cantidad || 0), 0)
                      : p.cantidad
                    return cantidadTotal === 0
                  }))}
                </TabsContent>

              </Tabs>
            </div>
          ) : mode === 'ventas' ? (
            <div className="max-h-[600px] overflow-y-auto">
              <div>
                <h2 className="text-lg font-bold mb-4">Ventas</h2>
                {renderVentasList()}
              </div>
            </div>
          ) : mode === 'transacciones' ? (
            <div className="max-h-[600px] overflow-y-auto">
              <div>
                <h2 className="text-lg font-bold mb-4">Transacciones</h2>
                <div className="relative mb-4">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Buscar transacciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {renderTransaccionesList()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <Button onClick={() => setMode('edit')}>Editar</Button>
              <Button onClick={() => setMode('productos')}>Productos</Button>
              <Button onClick={() => setMode('ventas')}>Ventas</Button>
              <Button onClick={() => setMode('transacciones')}>Transacciones</Button>
            </div>
          )}
        </div>
        {mode !== 'view' && (
          <div className="flex justify-center p-4 border-t">
            <Button
              onClick={() => setMode('view')}
            >
              Volver
            </Button>
          </div>
        )}
      </DialogContent>

      <Dialog open={reduceDialogOpen} onOpenChange={setReduceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reducir cantidad de producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-medium">{productToReduce?.nombre}</p>

            {productToReduce?.parametros && productToReduce.parametros.length > 0 ? (
              // Vista para productos con parámetros
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Especifique la cantidad a reducir para cada parámetro:</p>
                <div className="space-y-2">
                  {productToReduce.parametros.map((parametro, index) => (
                    <div key={index} className="flex items-center justify-between space-x-4 p-2 border rounded-lg">
                      <div>
                        <p className="font-medium">{parametro.nombre}</p>
                        <p className="text-sm text-gray-500">Disponible: {parametro.cantidad}</p>
                      </div>
                      <Input
                        type="number"
                        className="w-24"
                        value={parameterQuantities[parametro.nombre] || 0}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(Number(e.target.value), parametro.cantidad))
                          setParameterQuantities(prev => ({
                            ...prev,
                            [parametro.nombre]: value
                          }))
                        }}
                        min={0}
                        max={parametro.cantidad}
                      />
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-500">
                  Total a reducir: {Object.values(parameterQuantities).reduce((a, b) => a + b, 0)}
                </div>
              </div>
            ) : (
              // Vista para productos sin parámetros
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Especifique la cantidad a reducir:</p>
                <div className="flex items-center space-x-4">
                  <Input
                    type="number"
                    value={quantityToReduce}
                    onChange={(e) => setQuantityToReduce(Math.max(0, Math.min(Number(e.target.value), productToReduce?.cantidad || 0)))}
                    max={productToReduce?.cantidad}
                    min={0}
                  />
                  <span className="text-sm text-gray-500">
                    Disponible: {productToReduce?.cantidad}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReduceDialogOpen(false)
                setParameterQuantities({})
                setQuantityToReduce(0)
              }}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (productToReduce?.parametros && productToReduce.parametros.length > 0) {
                  const totalQuantity = Object.values(parameterQuantities).reduce((a, b) => a + b, 0)
                  if (totalQuantity > 0) {
                    setQuantityToReduce(totalQuantity)
                    setShowDestinationDialog(true)
                    setReduceDialogOpen(false)
                  }
                } else if (quantityToReduce > 0) {
                  setShowDestinationDialog(true)
                  setReduceDialogOpen(false)
                }
              }}
              disabled={
                isLoading ||
                (productToReduce?.parametros
                  ? Object.values(parameterQuantities).reduce((a, b) => a + b, 0) <= 0
                  : quantityToReduce <= 0)
              }
            >
              Siguiente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDestinationDialog} onOpenChange={setShowDestinationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a:</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant={selectedDestination === 'almacen' ? 'default' : 'outline'}
              onClick={() => setSelectedDestination('almacen')}
            >
              Almacén
            </Button>
            <Button
              variant={selectedDestination === 'merma' ? 'default' : 'outline'}
              onClick={() => setSelectedDestination('merma')}
            >
              Merma
            </Button>
            <Button
              variant={selectedDestination === 'vendedor' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedDestination('vendedor')
                setShowVendorSelectDialog(true)
                setShowDestinationDialog(false)
              }}
            >
              Vendedor
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDestinationDialog(false)
              setSelectedDestination(null)
            }}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!productToReduce || !selectedDestination) return;

                setIsLoading(true);
                try {
                  // Preparar los parámetros
                  const parametrosReduccion = productToReduce.tiene_parametros && productToReduce.parametros
                    ? Object.entries(parameterQuantities)
                      .filter(([_, cantidad]) => cantidad > 0)
                      .map(([nombre, cantidad]) => ({
                        nombre,
                        cantidad
                      }))
                    : undefined;

                  if (selectedDestination === 'merma') {
                    // Solo llamar a onProductMerma, que manejará la reducción internamente
                    await onProductMerma(
                      productToReduce.id,
                      vendor.id,
                      productToReduce.tiene_parametros ? 0 : quantityToReduce,
                      parametrosReduccion
                    );
                  } else if (selectedDestination === 'almacen') {
                    await onProductReduce(
                      productToReduce.id,
                      vendor.id,
                      productToReduce.tiene_parametros ? 0 : quantityToReduce,
                      parametrosReduccion
                    );
                  }

                  setShowDestinationDialog(false);
                  setSelectedDestination(null);
                  setProductToReduce(null);
                  setQuantityToReduce(0);
                  setParameterQuantities({});

                  toast({
                    title: "Éxito",
                    description: `Producto ${selectedDestination === 'merma' ? 'enviado a merma' : 'reducido'} correctamente.`,
                  });
                } catch (error) {
                  console.error('Error al procesar la operación:', error);
                  toast({
                    title: "Error",
                    description: `No se pudo ${selectedDestination === 'merma' ? 'enviar a merma' : 'reducir'} el producto.`,
                    variant: "destructive",
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={
                isLoading ||
                !selectedDestination ||
                (productToReduce?.tiene_parametros
                  ? !Object.values(parameterQuantities).some(qty => qty > 0)
                  : quantityToReduce <= 0)
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>


          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nuevo diálogo para seleccionar vendedor */}
      <Dialog open={showVendorSelectDialog} onOpenChange={setShowVendorSelectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar Vendedor</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {vendedores
              .filter((v: Vendedor) => v.id !== vendor.id)
              .map((vendedor: Vendedor) => (
                <Button
                  key={vendedor.id}
                  variant={selectedVendorId === vendedor.id ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedVendorId(vendedor.id)}
                >
                  {vendedor.nombre}
                </Button>
              ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVendorSelectDialog(false)
                setSelectedVendorId(null)
                setSelectedDestination(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!productToReduce || !selectedVendorId) return

                setIsLoading(true)
                try {
                  const parametrosTransferencia = productToReduce.tiene_parametros && productToReduce.parametros
                    ? Object.entries(parameterQuantities)
                      .filter(([_, cantidad]) => cantidad > 0)
                      .map(([nombre, cantidad]) => ({
                        nombre,
                        cantidad
                      }))
                    : undefined;


                  console.log('Datos de transferencia:', {
                    productId: productToReduce.id.toString(),
                    fromVendorId: vendor.id,
                    toVendorId: selectedVendorId,
                    cantidad: productToReduce.tiene_parametros ? 0 : quantityToReduce,
                    parametros: parametrosTransferencia
                  });
                  await onProductTransfer(
                    productToReduce.id.toString(),
                    vendor.id.toString(), // Convertir a string
                    selectedVendorId.toString(), // Convertir a string
                    productToReduce.tiene_parametros ? 0 : quantityToReduce,
                    parametrosTransferencia
                  )

                  setShowVendorSelectDialog(false)
                  setSelectedVendorId(null)
                  setSelectedDestination(null)
                  setProductToReduce(null)
                  setQuantityToReduce(0)
                  setParameterQuantities({})

                  toast({
                    title: "Éxito",
                    description: "Producto transferido correctamente.",
                  })
                } catch (error) {
                  console.error('Error al transferir el producto:', error)
                  toast({
                    title: "Error",
                    description: "No se pudo transferir el producto. Por favor, inténtelo de nuevo.",
                    variant: "destructive",
                  })
                } finally {
                  setIsLoading(false)
                }
              }}
              disabled={isLoading || !selectedVendorId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Transferir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}