import React, { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import Image from 'next/image'
import { Vendedor, Producto, Venta, Transaccion, TransaccionParametro } from '@/types'
import { Minus, DollarSign, ArrowLeftRight, Search, ChevronDown, ChevronUp, Loader2, ArrowUpDown, FileDown, X, Edit2 } from 'lucide-react'
import { format, parseISO, startOfWeek, endOfWeek, isValid, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'

interface VendorDialogProps {
  almacen: Producto[]// Añadir esta prop
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
  onDeleteVendorData: (vendorId: string) => Promise<void>;
  onUpdateProductQuantity?: (
    vendorId: string,
    productId: string,
    newQuantity: number,
    parametros?: Array<{ nombre: string; cantidad: number }>
  ) => Promise<void>;
}

interface ComparativeData {
  id: string;
  nombre: string;
  cantidadVendedor: number;
  cantidadAlmacen: number;
  precio: number;
  parametrosVendedor?: Array<{ nombre: string; cantidad: number }>;
  parametrosAlmacen?: Array<{ nombre: string; cantidad: number }>;
  tieneParametros: boolean;
}

interface InconsistenciaData {
  id: string;
  nombre: string;
  cantidadActual: number;
  cantidadCalculada: number;
  diferencia: number;
  entregas: number;
  bajas: number;
  ventas: number;
  parametros?: Array<{
    nombre: string;
    cantidadActual: number;
    cantidadCalculada: number;
    diferencia: number;
    entregas: number;
    bajas: number;
    ventas: number;
  }>;
  tieneParametros: boolean;
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


export default function VendorDialog({ 
  vendor, 
  almacen, 
  onClose, 
  onEdit, 
  productos, 
  transacciones, 
  ventas, 
  ventasSemanales, 
  ventasDiarias, 
  onProductReduce, 
  onDeleteSale, 
  onProductMerma, 
  vendedores, 
  onProductTransfer, 
  onDeleteVendorData,
  onUpdateProductQuantity 
}: VendorDialogProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'productos' | 'ventas' | 'transacciones' | 'inconsistencias'>('view')
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
  const [expandedTransactions, setExpandedTransactions] = useState<Record<string, boolean>>({});
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showComparativeTable, setShowComparativeTable] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'lessThan5' | 'outOfStock' | 'notInVendor'>('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [sortField, setSortField] = useState<keyof Pick<ComparativeData, 'cantidadVendedor' | 'cantidadAlmacen' | 'precio'> | null>(null);
  const [expandedComparativeProducts, setExpandedComparativeProducts] = useState<Record<string, boolean>>({});
  const [showInconsistenciasTable, setShowInconsistenciasTable] = useState(false);
  const [expandedInconsistencias, setExpandedInconsistencias] = useState<Record<string, boolean>>({});
  const [showEditQuantityDialog, setShowEditQuantityDialog] = useState(false);
  const [productToEdit, setProductToEdit] = useState<InconsistenciaData | null>(null);
  const [newQuantities, setNewQuantities] = useState<Record<string, number>>({});
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);



  const getComparativeData = useCallback((): ComparativeData[] => {
    // Función de utilidad para validar parámetros
    const validarParametro = (parametro: any) => {
      // Verificar que el parámetro sea un objeto válido
      if (!parametro || typeof parametro !== 'object') return false;

      // Verificar que tenga un nombre válido (no solo números)
      if (!parametro.nombre || typeof parametro.nombre !== 'string') return false;
      if (/^\d+$/.test(parametro.nombre)) return false;

      // Verificar que la cantidad sea un número
      if (isNaN(parametro.cantidad)) return false;

      return true;
    };

    // Crear un array con todos los IDs únicos (con validación)
    const uniqueIds = Array.from(
      new Set([
        ...productos.filter(p => p && p.id).map(p => p.id),
        ...almacen.filter(p => p && p.id).map(p => p.id)
      ])
    );

    // Mapear los IDs únicos a los datos de productos
    const allProducts = uniqueIds.map(productId => {
      const productoVendedor = productos.find(p => p.id === productId);
      const productoAlmacen = almacen.find(p => p.id === productId);

      // Filtrar y validar parámetros del vendedor
      const parametrosVendedor = productoVendedor?.parametros
        ? productoVendedor.parametros
          .filter(validarParametro)
          .map(param => ({ ...param }))
        : [];

      // Filtrar y validar parámetros del almacén
      const parametrosAlmacen = productoAlmacen?.parametros
        ? productoAlmacen.parametros
          .filter(validarParametro)
          .map(param => ({ ...param }))
        : [];

      const getCantidadTotal = (producto: Producto | undefined, parametros: Array<{ nombre: string; cantidad: number }>) => {
        if (!producto) return 0;
        if (parametros && parametros.length > 0) {
          return parametros
            .filter(param => param.cantidad > 0)
            .reduce((total, param) => total + (param.cantidad || 0), 0);
        }
        return producto.cantidad;
      };

      const cantidadVendedor = getCantidadTotal(productoVendedor, parametrosVendedor);
      const cantidadAlmacen = getCantidadTotal(productoAlmacen, parametrosAlmacen);

      // Verificar si tiene parámetros válidos
      const tieneParametros = parametrosVendedor.length > 0 || parametrosAlmacen.length > 0;

      return {
        id: productId,
        nombre: productoAlmacen?.nombre || productoVendedor?.nombre || '',
        cantidadVendedor,
        cantidadAlmacen,
        precio: productoAlmacen?.precio || productoVendedor?.precio || 0,
        parametrosVendedor,
        parametrosAlmacen,
        tieneParametros
      };
    });

    // Aplicar filtros
    const filteredData = allProducts
      .filter(item =>
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(item => {
        switch (filterType) {
          case 'lessThan5':
            return item.cantidadVendedor < 5 && item.cantidadVendedor > 0;
          case 'outOfStock':
            return item.cantidadVendedor === 0;
          case 'notInVendor':
            return item.cantidadVendedor === 0 && item.cantidadAlmacen > 0;
          default:
            return true;
        }
      });

    // Ordenamiento
    if (sortField && sortDirection) {
      filteredData.sort((a, b) => {
        const compareValue = a[sortField] - b[sortField];
        return sortDirection === 'asc' ? compareValue : -compareValue;
      });
    }

    return filteredData;
  }, [productos, almacen, searchTerm, filterType, sortField, sortDirection]);




  const handleComparativeSort = (field: 'cantidadVendedor' | 'cantidadAlmacen' | 'precio') => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };




  const handleDeleteVendorData = async () => {
    try {
      setIsDeleting(true);
      await onDeleteVendorData(vendor.id);
      toast({
        title: "Éxito",
        description: "Los datos del vendedor han sido eliminados correctamente.",
      });
      setDeleteConfirmDialogOpen(false);
      onClose(); // Cerrar el diálogo principal
    } catch (error) {
      console.error('Error al eliminar los datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar los datos del vendedor. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpand = (transactionId: string) => {
    setExpandedTransactions(prev => ({
      ...prev,
      [transactionId]: !prev[transactionId]
    }));
  };


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
        console.log('Parámetros del producto:', producto.nombre, producto.parametros); // Log temporal
        return producto.parametros
          .filter(param => param.cantidad > 0) // Solo contar parámetros con cantidad > 0
          .reduce((total, param) => total + (param.cantidad || 0), 0)
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
      if (!venta.parametros || venta.parametros.length === 0) return null;

      // Filtrar los parámetros con cantidad mayor a 0
      const parametrosFiltrados = venta.parametros.filter(param => param.cantidad > 0);

      if (parametrosFiltrados.length === 0) return null; // Si no hay parámetros válidos, no renderizar nada

      return (
        <div className="mt-1 text-sm text-gray-600">
          {parametrosFiltrados.map((param, index) => (
            <div key={index} className="flex space-x-2">
              <span>{param.nombre}:</span>
              <span>{param.cantidad}</span>
            </div>
          ))}
        </div>
      );
    };


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

  const toggleExpandProd = useCallback((productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }, [])

  const renderProductList = useCallback((products: Producto[]) => {
    const filteredAndSortedProducts = sortAndFilterProducts(products)

    const calcularCantidadTotal = (producto: Producto) => {
      if (producto.parametros && producto.parametros.length > 0) {
        // Filtrar parámetros válidos (no numéricos y cantidad > 0)
        const parametrosValidos = producto.parametros.filter(param => 
          param.cantidad > 0 && 
          isNaN(Number(param.nombre)) && // Excluir nombres que son solo números
          param.nombre.trim() !== '' // Excluir nombres vacíos
        );
        
        return parametrosValidos.reduce((total, param) => total + param.cantidad, 0);
      }
      return producto.cantidad;
    }

    return (
      <div className="space-y-2">
        {filteredAndSortedProducts.map(producto => {
          // Filtrar parámetros válidos
          const parametrosValidos = producto.parametros?.filter(param => 
            param.cantidad > 0 && 
            isNaN(Number(param.nombre)) && // Excluir nombres que son solo números
            param.nombre.trim() !== '' // Excluir nombres vacíos
          ) || [];

          const hasParameters = parametrosValidos.length > 0;
          const isExpanded = expandedProducts[producto.id] || false;
          const cantidadTotal = calcularCantidadTotal(producto);

          // Si el producto tiene parámetros pero ninguno es válido, lo mostramos como agotado
          if (producto.parametros && producto.parametros.length > 0 && !hasParameters) {
            return (
              <div
                key={producto.id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="flex items-center p-4">
                  <div className="w-[50px] h-[50px] relative mr-4">
                    <Image
                      src={producto.foto || '/placeholder.svg'}
                      alt={producto.nombre}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <h3 className="font-bold">{producto.nombre}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      ${formatPrice(producto.precio)} - Agotado
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={producto.id}
              className={`bg-white rounded-lg shadow overflow-hidden ${hasParameters ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => hasParameters && toggleExpandProd(producto.id)}
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
                    setProductToReduce(producto)
                    setReduceDialogOpen(true)
                  }}
                  disabled={isLoading || cantidadTotal === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
              {isExpanded && hasParameters && (
                <div className="px-4 pb-4 bg-gray-50 border-t">
                  <div className="space-y-2 mt-2">
                    {parametrosValidos.map((parametro, index) => (
                      <div key={index} className="flex justify-between items-center space-x-4 p-2 border rounded-lg">
                        <p className="font-medium">{parametro.nombre}</p>
                        <p className="text-sm text-gray-500">Disponible: {parametro.cantidad}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [expandedProducts, isLoading, toggleExpandProd, setProductToReduce, setReduceDialogOpen, formatPrice])

  const renderVentasList = () => {
    const filtrarVentas = (ventas: VentaDia[]) => {
      if (!searchTerm) return ventas;
      
      return ventas.map(ventaDia => ({
        ...ventaDia,
        ventas: ventaDia.ventas.filter(venta =>
          venta.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        total: ventaDia.ventas
          .filter(venta => venta.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
          .reduce((sum, venta) => sum + parseFloat(venta.total.toString()), 0)
      })).filter(ventaDia => ventaDia.ventas.length > 0);
    };

    const filtrarVentasSemanales = (ventas: VentaSemana[]) => {
      if (!searchTerm) return ventas;

      return ventas.map(ventaSemana => ({
        ...ventaSemana,
        ventas: ventaSemana.ventas.filter(venta =>
          venta.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        total: ventaSemana.ventas
          .filter(venta => venta.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
          .reduce((sum, venta) => sum + parseFloat(venta.total.toString()), 0),
        ganancia: ventaSemana.ventas
          .filter(venta => venta.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
          .reduce((sum, venta) => sum + parseFloat(venta.total.toString()), 0) * 0.08
      })).filter(ventaSemana => ventaSemana.ventas.length > 0);
    };

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
              filtrarVentas(ventasDiariasLocales).map((venta) => (
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
              filtrarVentasSemanales(ventasSemanalesState).map((venta) => (
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
    const vendorId = vendor.id.toString();

    const filteredTransacciones = filterItems(transacciones, searchTerm).filter(transaccion => {
      const transaccionDesde = transaccion.desde?.toString();
      const transaccionHacia = transaccion.hacia?.toString();

      if (transaccionDesde === vendorId && transaccion.tipo === 'Baja') {
        return true;
      }
      if (transaccionHacia === vendorId && transaccion.tipo === 'Entrega') {
        return true;
      }
      return false;
    });

    const calcularCantidadTotal = (transaccion: Transaccion): number => {
      if (transaccion.parametros && Array.isArray(transaccion.parametros) && transaccion.parametros.length > 0) {
        return transaccion.parametros.reduce((total, param) => total + (param.cantidad || 0), 0);
      }
      return transaccion.cantidad || 0;
    };

    return (
      <div className="space-y-2">
        {filteredTransacciones.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No hay transacciones para mostrar
          </div>
        ) : (
          filteredTransacciones.map((transaccion: Transaccion) => {
            const transactionType = transaccion.tipo || 'Normal';
            const borderColor =
              transactionType === 'Baja' ? 'border-red-500' :
                transactionType === 'Entrega' ? 'border-green-500' :
                  'border-blue-500';

            const precioFormateado = parseFloat(transaccion.precio?.toString() || '0').toFixed(2);
            const cantidadTotal = calcularCantidadTotal(transaccion);
            const hasParameters = Boolean(
              transaccion.parametros &&
              Array.isArray(transaccion.parametros) &&
              transaccion.parametros.length > 0
            );
            const isExpanded = expandedTransactions[transaccion.id];

            return (
              <div
                key={transaccion.id}
                className={`bg-white rounded-lg shadow border-l-4 ${borderColor} overflow-hidden`}
              >
                <div
                  className={`p-4 ${hasParameters ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={() => hasParameters && toggleExpand(transaccion.id)}
                >
                  <div className="flex items-center">
                    <ArrowLeftRight className="w-6 h-6 text-blue-500 mr-2 flex-shrink-0" />
                    <div className="flex-grow overflow-hidden">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-sm truncate">{transaccion.producto}</p>
                          {hasParameters && (
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          )}
                        </div>
                        <p className="text-sm font-semibold text-green-600">
                          ${precioFormateado}
                        </p>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-600">
                        <span>{format(parseISO(transaccion.fecha), 'dd/MM/yyyy')}</span>
                        <span>Cantidad: {cantidadTotal}</span>
                      </div>
                      <p className="text-xs font-semibold">{transactionType}</p>
                    </div>
                  </div>
                </div>

                {/* Panel expandible para parámetros */}
                {hasParameters && isExpanded && transaccion.parametros && (
                  <div className="bg-gray-50 px-4 py-2 border-t">
                    <div className="space-y-2">
                      {transaccion.parametros
                        .filter((param: TransaccionParametro) => param.cantidad > 0) // Añadimos este filtro
                        .map((param: TransaccionParametro, index: number) => (
                          <div
                            key={`${transaccion.id}-param-${index}`}
                            className="flex justify-between items-center p-2 bg-white rounded-md"
                          >
                            <span className="text-sm font-medium">{param.nombre}</span>
                            <span className="text-sm">{param.cantidad}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>
    );
  };






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

  const calcularInconsistencias = useCallback((): InconsistenciaData[] => {
    const calcularCantidadPorTransacciones = (productoId: string, parametroNombre?: string) => {
      let entregas = 0;
      let bajas = 0;
      let ventasTotal = 0;
      const vendorId = vendor.id.toString();
      
      // Obtener el producto
      const producto = productos.find(p => p.id === productoId);
      if (!producto) return { entregas: 0, bajas: 0, ventasTotal: 0, cantidad: 0 };
      
      // Filtrar transacciones
      const transaccionesVendedor = transacciones.filter(transaccion => {
        const transaccionDesde = transaccion.desde?.toString();
        const transaccionHacia = transaccion.hacia?.toString();
        const productoTransaccion = productos.find(p => p.nombre === transaccion.producto);

        if (!productoTransaccion) return false;

        if (transaccionDesde === vendorId && transaccion.tipo === 'Baja' && productoTransaccion.id === productoId) {
          return true;
        }
        if (transaccionHacia === vendorId && transaccion.tipo === 'Entrega' && productoTransaccion.id === productoId) {
          return true;
        }
        return false;
      });

      // Procesar las transacciones filtradas
      transaccionesVendedor.forEach(transaccion => {
        const productoTransaccion = productos.find(p => p.nombre === transaccion.producto);
        if (productoTransaccion && productoTransaccion.id === productoId) {
          if (parametroNombre && transaccion.parametros) {
            const parametro = transaccion.parametros.find(p => p.nombre === parametroNombre);
            if (parametro) {
              if (transaccion.tipo === 'Entrega') {
                entregas += parametro.cantidad;
              } else if (transaccion.tipo === 'Baja') {
                bajas += parametro.cantidad;
              }
            }
          } else if (!parametroNombre) {
            if (transaccion.tipo === 'Entrega') {
              entregas += transaccion.cantidad;
            } else if (transaccion.tipo === 'Baja') {
              bajas += transaccion.cantidad;
            }
          }
        }
      });

      // Calcular ventas
      ventas.forEach(venta => {
        const productoVenta = productos.find(p => p.nombre === venta.producto_nombre);
        if (productoVenta && productoVenta.id === productoId) {
          if (parametroNombre && venta.parametros) {
            const parametro = venta.parametros.find(p => p.nombre === parametroNombre);
            if (parametro) {
              ventasTotal += parametro.cantidad;
            }
          } else if (!parametroNombre) {
            ventasTotal += venta.cantidad;
          }
        }
      });

      return { entregas, bajas, ventasTotal, cantidad: entregas - bajas - ventasTotal };
    };

    return productos
      .map(producto => {
        let inconsistenciaData: InconsistenciaData; 

        if (producto.parametros && producto.parametros.length > 0) {
          // Calcular inconsistencias para productos con parámetros
          const parametrosInconsistentes = producto.parametros
            .filter(parametro => parametro.cantidad > 0 || parametro.nombre.trim() !== '')
            .map(parametro => {
              const resultado = calcularCantidadPorTransacciones(producto.id, parametro.nombre);
              return {
                nombre: parametro.nombre,
                cantidadActual: parametro.cantidad,
                cantidadCalculada: resultado.cantidad,
                diferencia: parametro.cantidad - resultado.cantidad,
                entregas: resultado.entregas,
                bajas: resultado.bajas,
                ventas: resultado.ventasTotal
              };
            });

          const totales = parametrosInconsistentes.reduce((acc, param) => ({
            entregas: acc.entregas + param.entregas,
            bajas: acc.bajas + param.bajas,
            ventas: acc.ventas + param.ventas,
            cantidadActual: acc.cantidadActual + param.cantidadActual,
            cantidadCalculada: acc.cantidadCalculada + param.cantidadCalculada
          }), { entregas: 0, bajas: 0, ventas: 0, cantidadActual: 0, cantidadCalculada: 0 });

          inconsistenciaData = {
            id: producto.id,
            nombre: producto.nombre,
            cantidadActual: totales.cantidadActual,
            cantidadCalculada: totales.cantidadCalculada,
            diferencia: totales.cantidadActual - totales.cantidadCalculada,
            entregas: totales.entregas,
            bajas: totales.bajas,
            ventas: totales.ventas,
            parametros: parametrosInconsistentes,
            tieneParametros: true
          };
        } else {
          // Calcular inconsistencias para productos sin parámetros
          const resultado = calcularCantidadPorTransacciones(producto.id);
          inconsistenciaData = {
            id: producto.id,
            nombre: producto.nombre,
            cantidadActual: producto.cantidad,
            cantidadCalculada: resultado.cantidad,
            diferencia: producto.cantidad - resultado.cantidad,
            entregas: resultado.entregas,
            bajas: resultado.bajas,
            ventas: resultado.ventasTotal,
            tieneParametros: false
          };
        }

        return inconsistenciaData;
      })
      .filter(item => 
        item.diferencia !== 0 || 
        (item.parametros && item.parametros.some(p => p.diferencia !== 0))
      );
  }, [productos, transacciones, ventas, vendor.id]);

  const renderInconsistenciasTable = () => {
    const inconsistencias = calcularInconsistencias();
    const inconsistenciasFiltradas = inconsistencias.filter(item =>
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="w-full">
        <div className="relative mb-4">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="inline-block min-w-full border rounded-md">
            <div className="max-h-[350px] overflow-y-auto">
              <table className="min-w-full border-collapse table-fixed">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className="text-left p-2 border-b w-[120px] min-w-[120px] text-sm">Producto</th>
                    <th className="text-right p-2 border-b w-[60px] min-w-[60px] text-sm">Actual</th>
                    <th className="text-right p-2 border-b w-[70px] min-w-[70px] text-sm">Calculada</th>
                    <th className="text-right p-2 border-b w-[70px] min-w-[70px] text-sm">Diferencia</th>
                    <th className="text-right p-2 border-b w-[60px] min-w-[60px] text-sm">Entregas</th>
                    <th className="text-right p-2 border-b w-[60px] min-w-[60px] text-sm">Bajas</th>
                    <th className="text-right p-2 border-b w-[60px] min-w-[60px] text-sm">Ventas</th>
                    <th className="text-center p-2 border-b w-[50px] min-w-[50px] text-sm">Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {inconsistenciasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-gray-500 text-sm">
                        {searchTerm 
                          ? 'No se encontraron productos que coincidan con la búsqueda.'
                          : 'No se encontraron inconsistencias en el inventario.'}
                      </td>
                    </tr>
                  ) : (
                    inconsistenciasFiltradas.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`border-b hover:bg-gray-50 ${item.tieneParametros ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (item.tieneParametros) {
                              setExpandedInconsistencias(prev => ({
                                ...prev,
                                [item.id]: !prev[item.id]
                              }));
                            }
                          }}
                        >
                          <td className="p-2 text-sm break-words">
                            <div className="flex items-center">
                              {item.nombre}
                              {item.tieneParametros && (
                                <ChevronDown
                                  className={`ml-2 h-4 w-4 transition-transform ${
                                    expandedInconsistencias[item.id] ? 'rotate-180' : ''
                                  }`}
                                />
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-right text-sm whitespace-nowrap">{item.cantidadActual}</td>
                          <td className="p-2 text-right text-sm whitespace-nowrap">{item.cantidadCalculada}</td>
                          <td className={`p-2 text-right text-sm whitespace-nowrap ${
                            item.diferencia > 0 ? 'text-green-600' : 
                            item.diferencia < 0 ? 'text-red-600' : ''
                          }`}>
                            {item.diferencia}
                          </td>
                          <td className="p-2 text-right text-sm whitespace-nowrap text-green-600">{item.entregas}</td>
                          <td className="p-2 text-right text-sm whitespace-nowrap text-red-600">{item.bajas}</td>
                          <td className="p-2 text-right text-sm whitespace-nowrap text-blue-600">{item.ventas}</td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductToEdit(item);
                                setShowEditQuantityDialog(true);
                                if (item.tieneParametros && item.parametros) {
                                  const initialQuantities: Record<string, number> = {};
                                  item.parametros.forEach(param => {
                                    initialQuantities[param.nombre] = param.cantidadActual;
                                  });
                                  setNewQuantities(initialQuantities);
                                } else {
                                  setNewQuantities({ total: item.cantidadActual });
                                }
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>

                        {item.tieneParametros && expandedInconsistencias[item.id] && item.parametros && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="p-0">
                              <div className="p-2 pl-6">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-separate border-spacing-0">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="p-1 text-left min-w-[100px]">Parámetro</th>
                                        <th className="p-1 text-right min-w-[50px]">Actual</th>
                                        <th className="p-1 text-right min-w-[60px]">Calculada</th>
                                        <th className="p-1 text-right min-w-[60px]">Diferencia</th>
                                        <th className="p-1 text-right min-w-[50px]">Entregas</th>
                                        <th className="p-1 text-right min-w-[50px]">Bajas</th>
                                        <th className="p-1 text-right min-w-[50px]">Ventas</th>
                                        <th className="p-1 text-right min-w-[50px]"></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.parametros.map((param, idx) => (
                                        <tr key={idx} className="hover:bg-gray-100">
                                          <td className="p-1">{param.nombre}</td>
                                          <td className="p-1 text-right whitespace-nowrap">{param.cantidadActual}</td>
                                          <td className="p-1 text-right whitespace-nowrap">{param.cantidadCalculada}</td>
                                          <td className={`p-1 text-right whitespace-nowrap ${
                                            param.diferencia > 0 ? 'text-green-600' : 
                                            param.diferencia < 0 ? 'text-red-600' : ''
                                          }`}>
                                            {param.diferencia}
                                          </td>
                                          <td className="p-1 text-right whitespace-nowrap text-green-600">{param.entregas}</td>
                                          <td className="p-1 text-right whitespace-nowrap text-red-600">{param.bajas}</td>
                                          <td className="p-1 text-right whitespace-nowrap text-blue-600">{param.ventas}</td>
                                          <td className="p-1"></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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

              {/* Nuevo botón para eliminar datos */}
              <div className="pt-4 border-t mt-4">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteConfirmDialogOpen(true)}
                >
                  Eliminar datos del vendedor
                </Button>
              </div>
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
          ) : mode === 'inconsistencias' ? (
            <div className="max-h-[600px] overflow-y-auto">
              <div>
                <h2 className="text-lg font-bold mb-4">Inconsistencias en Inventario</h2>
                {renderInconsistenciasTable()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <Button onClick={() => setMode('edit')}>Editar</Button>
              <Button onClick={() => setMode('productos')}>Productos</Button>
              <Button onClick={() => setMode('ventas')}>Ventas</Button>
              <Button onClick={() => setMode('transacciones')}>Transacciones</Button>
              <Button onClick={() => setMode('inconsistencias')}>Inconsistencias</Button>
              <Button
                onClick={() => setShowComparativeTable(true)}
                className="w-full md:w-auto"
              >
                Comparativa
              </Button>
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
        <DialogContent className="max-h-[90vh] flex flex-col"> {/* Añadido max-h y flex */}
          <DialogHeader>
            <DialogTitle>Reducir cantidad de producto</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0"> {/* Contenedor flexible */}
            <div className="space-y-4">
              <p className="font-medium">{productToReduce?.nombre}</p>

              {productToReduce?.parametros && productToReduce.parametros.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Especifique la cantidad a reducir para cada parámetro:</p>

                  {/* Contenedor scrolleable para los parámetros */}
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                    {productToReduce.parametros
                      .filter(parametro => parametro.cantidad > 0) // Filtrar parámetros con cantidad > 0
                      .map((parametro, index) => (
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
          </div>

          <DialogFooter className="mt-4"> {/* Añadido margen superior */}
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
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación de datos</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-red-500 font-medium mb-2">¡Advertencia!</p>
            <p className="text-gray-600">
              Esta acción eliminará todas las ventas y transacciones asociadas a {vendor.nombre}.
              Los productos asignados no serán eliminados.
            </p>
            <p className="text-gray-600 mt-2">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVendorData}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar datos'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showComparativeTable} onOpenChange={setShowComparativeTable}>
        <DialogContent className="w-[95vw] max-w-3xl mx-auto p-2 sm:p-4 overflow-hidden">
          <DialogHeader className="w-full mb-2">
            <DialogTitle className="text-center text-lg sm:text-xl">Comparativa con Almacén</DialogTitle>
            <DialogDescription className="sr-only">
              Tabla comparativa de productos entre vendedor y almacén
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center w-full gap-2">
            {/* Controles de búsqueda y filtro */}
            <div className="flex flex-col sm:flex-row justify-between gap-2 w-full">
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:max-w-[250px]"
              />
              <select
                className="border rounded-md px-2 py-1 w-full sm:w-auto text-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'lessThan5' | 'outOfStock' | 'notInVendor')}
              >
                <option value="all">Todos los productos</option>
                <option value="lessThan5">Menos de 5 unidades</option>
                <option value="outOfStock">Sin existencias</option>
                <option value="notInVendor">No disponible en vendedor</option>
              </select>
            </div>

            {/* Contenedor de tabla con restricción estricta */}
            <div className="w-full overflow-x-hidden">
              <div className="w-full overflow-x-auto">
                <div className="border rounded-md overflow-hidden max-h-[350px] overflow-y-auto">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th className="text-left p-2 border-b w-[40%] text-sm">Producto</th>
                        <th
                          className="text-right p-2 border-b text-sm cursor-pointer hover:bg-gray-50"
                          onClick={() => handleComparativeSort('precio')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Precio
                            {sortField === 'precio' && (
                              <span className="text-xs">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="text-right p-2 border-b text-sm cursor-pointer hover:bg-gray-50"
                          onClick={() => handleComparativeSort('cantidadVendedor')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span className="hidden xs:inline">Cant.</span> Vend.
                            {sortField === 'cantidadVendedor' && (
                              <span className="text-xs">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="text-right p-2 border-b text-sm cursor-pointer hover:bg-gray-50"
                          onClick={() => handleComparativeSort('cantidadAlmacen')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span className="hidden xs:inline">Cant.</span> Alm.
                            {sortField === 'cantidadAlmacen' && (
                              <span className="text-xs">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getComparativeData().length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-gray-500 text-sm">
                            {filterType === 'all' && searchTerm
                              ? 'No se encontraron productos que coincidan con la búsqueda.'
                              : filterType === 'lessThan5'
                                ? 'No hay productos con menos de 5 unidades.'
                                : filterType === 'outOfStock'
                                  ? 'No hay productos sin existencias.'
                                  : filterType === 'notInVendor'
                                    ? 'No hay productos que no estén disponibles en el vendedor.'
                                    : 'No hay productos disponibles.'}
                          </td>
                        </tr>
                      ) : (
                        getComparativeData().map((item) => (
                          <React.Fragment key={item.id}>
                            <tr
                              className={`border-b hover:bg-gray-50 ${item.tieneParametros ? 'cursor-pointer' : ''}`}
                              onClick={() => {
                                if (item.tieneParametros) {
                                  setExpandedComparativeProducts(prev => ({
                                    ...prev,
                                    [item.id]: !prev[item.id]
                                  }));
                                }
                              }}
                            >
                              <td className="p-2 text-sm break-words">
                                <div className="flex items-center">
                                  {item.nombre}
                                  {item.tieneParametros && (
                                    <ChevronDown
                                      className={`ml-2 h-4 w-4 transition-transform ${expandedComparativeProducts[item.id] ? 'rotate-180' : ''
                                        }`}
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-right text-sm whitespace-nowrap">${formatPrice(item.precio)}</td>
                              <td
                                className={`p-2 text-right text-sm ${item.cantidadVendedor === 0
                                  ? 'text-red-500'
                                  : item.cantidadVendedor < 5
                                    ? 'text-yellow-600'
                                    : ''
                                  }`}
                              >
                                {item.cantidadVendedor}
                              </td>
                              <td className="p-2 text-right text-sm">{item.cantidadAlmacen}</td>
                            </tr>

                            {/* Fila expandible para parámetros */}
                            {item.tieneParametros && expandedComparativeProducts[item.id] && (
                              <tr className="bg-gray-50">
                                <td colSpan={4} className="p-0">
                                  <div className="p-2 pl-6 border-b">
                                    <div className="grid grid-cols-1 gap-2">
                                      <div className="text-xs font-semibold mb-1">Parámetros:</div>

                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs border-separate border-spacing-0">
                                          <thead className="bg-gray-100">
                                            <tr>
                                              <th className="p-1 text-left">Parámetro</th>
                                              <th className="p-1 text-right">Vendedor</th>
                                              <th className="p-1 text-right">Almacén</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {/* Unir todos los parámetros de vendedor y almacén */}
                                            {Array.from(new Set([
                                              ...(item.parametrosVendedor || []).map(p => p.nombre),
                                              ...(item.parametrosAlmacen || []).map(p => p.nombre)
                                            ])).map((nombreParametro, idx) => {
                                              const paramVendedor = (item.parametrosVendedor || []).find(p => p.nombre === nombreParametro);
                                              const paramAlmacen = (item.parametrosAlmacen || []).find(p => p.nombre === nombreParametro);

                                              return (
                                                <tr key={idx} className="hover:bg-gray-100">
                                                  <td className="p-1">{nombreParametro}</td>
                                                  <td className={`p-1 text-right ${(paramVendedor?.cantidad || 0) === 0
                                                    ? 'text-red-500'
                                                    : (paramVendedor?.cantidad || 0) < 5
                                                      ? 'text-yellow-600'
                                                      : ''
                                                    }`}>
                                                    {paramVendedor?.cantidad || 0}
                                                  </td>
                                                  <td className="p-1 text-right">{paramAlmacen?.cantidad || 0}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>

                </div>
              </div>
            </div>

            {/* Botón de cerrar */}
            <div className="flex justify-center w-full mt-2">
              <Button
                variant="outline"
                onClick={() => setShowComparativeTable(false)}
                className="w-full sm:w-auto"
              >
                Cerrar
              </Button>
            </div>
          </div>

          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditQuantityDialog} onOpenChange={setShowEditQuantityDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar cantidad de {productToEdit?.nombre}</DialogTitle>
            <DialogDescription>
              Ajusta las cantidades del producto
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 px-2">
            <div className="space-y-4">
              {productToEdit?.tieneParametros && productToEdit.parametros ? (
                // Formulario para productos con parámetros
                productToEdit.parametros.map((param, index) => (
                  <div key={index} className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">
                      {param.nombre}
                      <span className="text-gray-500 text-xs ml-2">
                        (Actual: {param.cantidadActual})
                      </span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={newQuantities[param.nombre] || 0}
                      onChange={(e) => {
                        const value = Math.max(0, parseInt(e.target.value) || 0);
                        setNewQuantities(prev => ({
                          ...prev,
                          [param.nombre]: value
                        }));
                      }}
                    />
                  </div>
                ))
              ) : (
                // Formulario para productos sin parámetros
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">
                    Cantidad
                    <span className="text-gray-500 text-xs ml-2">
                      (Actual: {productToEdit?.cantidadActual})
                    </span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={newQuantities.total || 0}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setNewQuantities({ total: value });
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditQuantityDialog(false);
                setProductToEdit(null);
                setNewQuantities({});
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!productToEdit || !onUpdateProductQuantity) return;

                setIsUpdatingQuantity(true);
                try {
                  if (productToEdit.tieneParametros) {
                    const parametros = Object.entries(newQuantities).map(([nombre, cantidad]) => ({
                      nombre,
                      cantidad
                    }));
                    await onUpdateProductQuantity(
                      vendor.id,
                      productToEdit.id,
                      0, // La cantidad total se calcula a partir de los parámetros
                      parametros
                    );
                  } else {
                    await onUpdateProductQuantity(
                      vendor.id,
                      productToEdit.id,
                      newQuantities.total || 0
                    );
                  }

                  toast({
                    title: "Éxito",
                    description: "Cantidad actualizada correctamente",
                  });

                  setShowEditQuantityDialog(false);
                  setProductToEdit(null);
                  setNewQuantities({});
                } catch (error) {
                  console.error('Error al actualizar la cantidad:', error);
                  toast({
                    title: "Error",
                    description: "No se pudo actualizar la cantidad",
                    variant: "destructive",
                  });
                } finally {
                  setIsUpdatingQuantity(false);
                }
              }}
              disabled={isUpdatingQuantity}
            >
              {isUpdatingQuantity ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar cantidad'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}