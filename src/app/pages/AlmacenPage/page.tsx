'use client'

import { useState, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Menu, ArrowUpDown, Plus, Truck, UserPlus, FileSpreadsheet, Trash2, X } from "lucide-react"

import { ChevronDown } from "lucide-react"
import React from 'react'
import { Calendar, CalendarDays } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"


import {
  getVendedores,
  getCurrentUser,
  getInventario,
  registerUser,
  getProductosVendedor,
  getVentasVendedor,
  agregarProducto,
  editarProducto,
  entregarProducto,
  reducirProductoVendedor,
  getTransaccionesVendedor,
  editarVendedor,
  eliminarProducto,
  deleteSale,
  createMerma,
  getMermas,
  transferProduct,
  deleteMerma,
  verificarNombreProducto,
  deleteVendor
} from '../../services/api'
import ProductDialog from '@/components/ProductDialog'
import VendorDialog from '@/components/VendedorDialog'
import SalesSection from '@/components/SalesSection'
import { ImageUpload } from '@/components/ImageUpload'
import { Producto, Vendedor, Venta, Transaccion, Merma, Parametro } from '@/types'
import { toast } from "@/hooks/use-toast";
import { useVendorProducts } from '@/hooks/use-vendor-products';


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

interface NewUser {
  nombre: string;
  password: string;
  telefono: string;
  rol: string;
}

interface NewProduct {
  nombre: string;
  precio: number;
  precioCompra: number;
  cantidad: number;
  foto: string;
  tieneParametros: boolean;
  parametros: Array<{
    nombre: string;
    cantidad: number;
  }>;
}


const useAlmacenData = () => {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [inventario, setInventario] = useState<Producto[]>([])

  const fetchVendedores = useCallback(async () => {
    try {
      const data = await getVendedores()
      setVendedores(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los vendedores",
        variant: "destructive",
      })
    }
  }, [])

  const fetchInventario = useCallback(async () => {
    try {
      const data = await getInventario()
      setInventario(data as Producto[])
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al obtener el inventario",
        variant: "destructive",
      })
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        if (user?.rol === 'Almacen') {
          setIsAuthenticated(true)
          await Promise.all([fetchVendedores(), fetchInventario()])
        } else {
          router.push('/pages/LoginPage')
        }
      } catch (error) {
        router.push('/pages/LoginPage')
      }
    }

    checkAuth()
  }, [router, fetchVendedores, fetchInventario])

  return { isAuthenticated, vendedores, inventario, fetchVendedores, fetchInventario, setInventario }
}


export default function AlmacenPage() {
  const { isAuthenticated, vendedores, inventario, fetchVendedores, fetchInventario, setInventario } = useAlmacenData()
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [newUser, setNewUser] = useState<NewUser>({
    nombre: '',
    password: '',
    telefono: '',
    rol: ''
  })
  const [productosVendedor, setProductosVendedor] = useState<Producto[]>([])
  const [ventasVendedor, setVentasVendedor] = useState<Venta[]>([])
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<Vendedor | null>(null)
  const [ventasSemanales, setVentasSemanales] = useState<VentaSemana[]>([])
  const [ventasDiarias, setVentasDiarias] = useState<VentaDia[]>([])
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [newProduct, setNewProduct] = useState<NewProduct>({
    nombre: '',
    precio: 0,
    precioCompra: 0,
    cantidad: 0,
    foto: '',
    tieneParametros: false,
    parametros: []
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('productos')
  const [showMassDeliveryDialog, setShowMassDeliveryDialog] = useState(false)
  const [massDeliveryStep, setMassDeliveryStep] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<{
    [productId: string]: {
      cantidad: number;
      parametros?: {
        [parametroId: string]: number;
      };
    };
  }>({});

  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [sortBy, setSortBy] = useState<'nombre' | 'cantidad'>('nombre')
  const [activeProductTab, setActiveProductTab] = useState<'inventario' | 'merma' | 'agotados'>('inventario');
  const [mermas, setMermas] = useState<Merma[]>([]);
  const [mermaToDelete, setMermaToDelete] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [expandedMermas, setExpandedMermas] = useState<Set<string>>(new Set());
  const [mermaSearchTerm, setMermaSearchTerm] = useState("")
  const [mermaSortOrder, setMermaSortOrder] = useState<'asc' | 'desc'>('asc')
  const [mermaSortBy, setMermaSortBy] = useState<'nombre' | 'cantidad'>('nombre')
  const [nombreExiste, setNombreExiste] = useState(false);
  const [verificandoNombre, setVerificandoNombre] = useState(false);
  const { updateProductQuantity } = useVendorProducts();
  // Agregar estos estados al inicio del componente
  const [ventasGlobales, setVentasGlobales] = useState<Venta[]>([])
  const [isLoadingContabilidad, setIsLoadingContabilidad] = useState(false)
  const [searchTermContabilidad, setSearchTermContabilidad] = useState("")
  const [sortOrderContabilidad, setSortOrderContabilidad] = useState<'asc' | 'desc'>('desc')
  const [expandedContabilidadProducts, setExpandedContabilidadProducts] = useState<Record<string, boolean>>({})
  // Agregar estos estados cerca de los otros estados de contabilidad
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null)
  const [fechaFin, setFechaFin] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)



  const toggleExpandContabilidad = useCallback((productName: string) => {
    setExpandedContabilidadProducts(prev => ({
      ...prev,
      [productName]: !prev[productName]
    }))
  }, [])

  // Función para obtener productos de un vendedor específico con manejo de errores mejorado
  const getVendorProducts = useCallback(async (vendorId: string): Promise<Producto[]> => {
    try {
      // Verificar que el vendedor existe
      const vendedor = vendedores.find(v => v.id === vendorId);
      if (!vendedor) {
        throw new Error(`Vendedor con ID ${vendorId} no encontrado`);
      }

      const productos = await getProductosVendedor(vendorId);

      // Asegurar que siempre retornamos un array
      return Array.isArray(productos) ? productos : [];
    } catch (error) {
      console.error(`Error al obtener productos del vendedor ${vendorId}:`, error);

      // En caso de error, retornar array vacío en lugar de lanzar error
      // para que la UI no se rompa
      return [];
    }
  }, [vendedores]);




  const fetchAllSales = useCallback(async () => {
    setIsLoadingContabilidad(true)
    try {
      // Obtener todas las ventas de todos los vendedores
      const allSales: Venta[] = []

      for (const vendedor of vendedores) {
        try {
          const ventasVendedor = await getVentasVendedor(vendedor.id)
          // Agregar información del vendedor a cada venta
          const ventasConVendedor = ventasVendedor.map(venta => ({
            ...venta,
            vendedor_nombre: vendedor.nombre,
            vendedor_id: vendedor.id
          }))
          allSales.push(...ventasConVendedor)
        } catch (error) {
          console.error(`Error al obtener ventas del vendedor ${vendedor.nombre}:`, error)
        }
      }

      // Ordenar por fecha (más recientes primero)
      allSales.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

      setVentasGlobales(allSales)
    } catch (error) {
      console.error('Error al obtener todas las ventas:', error)
      toast({
        title: "Error",
        description: "Error al cargar la contabilidad global",
        variant: "destructive",
      })
    } finally {
      setIsLoadingContabilidad(false)
    }
  }, [vendedores])

  // Llamar a la función cuando se selecciona la sección de contabilidad
  useEffect(() => {
    if (activeSection === 'contabilidad' && vendedores.length > 0) {
      fetchAllSales()
    }
  }, [activeSection, vendedores, fetchAllSales])

  const getContabilidadData = useCallback(() => {
    // Filtrar ventas por rango de fechas si hay fechas seleccionadas
    const ventasFiltradas = (fechaInicio || fechaFin)
      ? ventasGlobales.filter(venta => {
        const fechaVenta = new Date(venta.fecha);
        const cumpleFechaInicio = !fechaInicio || fechaVenta >= fechaInicio;
        const cumpleFechaFin = !fechaFin || fechaVenta <= fechaFin;
        return cumpleFechaInicio && cumpleFechaFin;
      })
      : ventasGlobales;
    // Resto de la lógica permanece igual...
    const ventasPorProducto = ventasFiltradas.reduce((acc, venta) => {
      const key = venta.producto_nombre

      if (!acc[key]) {
        acc[key] = {
          producto: venta.producto_nombre,
          cantidadTotal: 0,
          montoTotal: 0,
          ventas: [],
          parametros: new Map<string, { cantidad: number; monto: number }>(),
          tieneParametros: false
        }
      }

      // Verificar si tiene parámetros
      if (venta.parametros && venta.parametros.length > 0) {
        acc[key].tieneParametros = true

        // Procesar cada parámetro
        venta.parametros.forEach(param => {
          if (param.cantidad > 0) {
            const parametroKey = param.nombre
            const montoParametro = (parseFloat(venta.total.toString()) / venta.parametros!.reduce((sum, p) => sum + p.cantidad, 0)) * param.cantidad

            if (!acc[key].parametros.has(parametroKey)) {
              acc[key].parametros.set(parametroKey, { cantidad: 0, monto: 0 })
            }

            const parametroData = acc[key].parametros.get(parametroKey)!
            parametroData.cantidad += param.cantidad
            parametroData.monto += montoParametro
          }
        })

        // Calcular cantidad total de parámetros
        const cantidadVenta = venta.parametros.reduce((sum, param) => sum + param.cantidad, 0)
        acc[key].cantidadTotal += cantidadVenta
      } else {
        // Producto sin parámetros
        acc[key].cantidadTotal += venta.cantidad
      }

      acc[key].montoTotal += parseFloat(venta.total.toString())
      acc[key].ventas.push(venta)

      return acc
    }, {} as Record<string, {
      producto: string
      cantidadTotal: number
      montoTotal: number
      ventas: Venta[]
      parametros: Map<string, { cantidad: number; monto: number }>
      tieneParametros: boolean
    }>)

    // Convertir a array y filtrar por búsqueda
    const resultados = Object.values(ventasPorProducto)
      .filter(item =>
        item.producto.toLowerCase().includes(searchTermContabilidad.toLowerCase())
      )
      .sort((a, b) => {
        if (sortOrderContabilidad === 'asc') {
          return a.montoTotal - b.montoTotal
        } else {
          return b.montoTotal - a.montoTotal
        }
      })

    return resultados
  }, [ventasGlobales, searchTermContabilidad, sortOrderContabilidad, fechaInicio, fechaFin])



  const exportContabilidadToExcel = useCallback(() => {
    const data = getContabilidadData()
    const dataToExport: any[] = []

    // Agregar información del filtro de fecha al inicio
    if (fechaInicio || fechaFin) {
      let filtroTexto = 'FILTRO APLICADO - ';
      if (fechaInicio && fechaFin) {
        filtroTexto += `Desde: ${format(fechaInicio, 'dd/MM/yyyy')} hasta: ${format(fechaFin, 'dd/MM/yyyy')}`;
      } else if (fechaInicio) {
        filtroTexto += `Desde: ${format(fechaInicio, 'dd/MM/yyyy')}`;
      } else if (fechaFin) {
        filtroTexto += `Hasta: ${format(fechaFin, 'dd/MM/yyyy')}`;
      }

      dataToExport.push({
        Producto: filtroTexto,
        Parametro: '-',
        'Cantidad Total Vendida': '-',
        'Monto Total': '-',
        'Número de Ventas': '-'
      })
      dataToExport.push({}) // Fila vacía para separar
    }

    data.forEach(item => {
      if (item.tieneParametros && item.parametros.size > 0) {
        // Agregar fila principal del producto
        dataToExport.push({
          Producto: item.producto,
          Parametro: 'TOTAL',
          'Cantidad Total Vendida': item.cantidadTotal,
          'Monto Total': item.montoTotal.toFixed(2),
          'Número de Ventas': item.ventas.length
        })

        // Agregar filas de parámetros
        Array.from(item.parametros.entries()).forEach(([parametroNombre, parametroData]) => {
          dataToExport.push({
            Producto: `  └─ ${item.producto}`,
            Parametro: parametroNombre,
            'Cantidad Total Vendida': parametroData.cantidad,
            'Monto Total': parametroData.monto.toFixed(2),
            'Número de Ventas': '-'
          })
        })
      } else {
        // Producto sin parámetros
        dataToExport.push({
          Producto: item.producto,
          Parametro: '-',
          'Cantidad Total Vendida': item.cantidadTotal,
          'Monto Total': item.montoTotal.toFixed(2),
          'Número de Ventas': item.ventas.length
        })
      }
    })

    // Agregar fila de totales
    const totalCantidad = data.reduce((sum, item) => sum + item.cantidadTotal, 0)
    const totalMonto = data.reduce((sum, item) => sum + item.montoTotal, 0)

    dataToExport.push({
      Producto: 'TOTAL GENERAL',
      Parametro: '-',
      'Cantidad Total Vendida': totalCantidad,
      'Monto Total': totalMonto.toFixed(2),
      'Número de Ventas': data.reduce((sum, item) => sum + item.ventas.length, 0)
    })

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Contabilidad Global")

    let fileName = 'contabilidad_global_';
    if (fechaInicio && fechaFin) {
      fileName += `${format(fechaInicio, 'yyyy-MM-dd')}_a_${format(fechaFin, 'yyyy-MM-dd')}_`;
    } else if (fechaInicio) {
      fileName += `desde_${format(fechaInicio, 'yyyy-MM-dd')}_`;
    } else if (fechaFin) {
      fileName += `hasta_${format(fechaFin, 'yyyy-MM-dd')}_`;
    }
    fileName += `${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    XLSX.writeFile(wb, fileName)
  }, [getContabilidadData, fechaInicio, fechaFin])

  // Función para limpiar las fechas
  const limpiarFiltroFechas = () => {
    setFechaInicio(null);
    setFechaFin(null);
    setShowDatePicker(false);
  };

  // Función para validar el rango de fechas
  const validarRangoFechas = (inicio: Date | null, fin: Date | null): string | null => {
    if (inicio && fin && inicio > fin) {
      return "La fecha de inicio no puede ser posterior a la fecha de fin";
    }
    return null;
  };

  // Función helper para crear el matcher de fechas deshabilitadas
  const createDisabledMatcher = (fechaComparacion: Date | null, tipo: 'before' | 'after') => {
    return (date: Date): boolean => {
      const today = new Date();
      const minDate = new Date("1900-01-01");

      // Siempre deshabilitar fechas futuras y muy antiguas
      if (date > today || date < minDate) {
        return true;
      }

      // Deshabilitar según el tipo y la fecha de comparación
      if (fechaComparacion) {
        if (tipo === 'before') {
          return date > fechaComparacion;
        } else {
          return date < fechaComparacion;
        }
      }

      return false;
    };
  };

  const isProductoAgotado = (producto: Producto): boolean => {
    if (producto.tiene_parametros && producto.parametros) {
      // Si tiene parámetros, está agotado si todos los parámetros están en 0
      return producto.parametros.every(param => param.cantidad === 0);
    }
    // Si no tiene parámetros, está agotado si la cantidad es 0
    return producto.cantidad === 0;
  };

  const getFilteredProducts = (productos: Producto[]): Producto[] => {
    const filteredBySearch = productos.filter((producto) =>
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (activeProductTab) {
      case 'agotados':
        return filteredBySearch.filter(isProductoAgotado);
      case 'inventario':
        return filteredBySearch.filter(producto => !isProductoAgotado(producto));
      default:
        return filteredBySearch;
    }
  };

  const handleDeleteVendorData = async (vendorId: string) => {
    try {
      const response = await fetch(`/api/users/vendedores?id=${vendorId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar datos');
      }

      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      await deleteVendor(vendorId);
      await fetchVendedores();
      toast({
        title: "Éxito",
        description: "Vendedor eliminado correctamente"
      });
    } catch (error) {
      console.error('Error al eliminar el vendedor:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el vendedor. Por favor, inténtelo de nuevo.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const toggleMermaExpansion = (mermaId: string) => {
    setExpandedMermas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mermaId)) {
        newSet.delete(mermaId);
      } else {
        newSet.add(mermaId);
      }
      return newSet;
    });
  };

  const handleMermaSort = (key: 'nombre' | 'cantidad') => {
    if (mermaSortBy === key) {
      setMermaSortOrder(mermaSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setMermaSortBy(key)
      setMermaSortOrder('asc')
    }
  }

  const fetchMermas = useCallback(async () => {
    try {
      console.log('Fetching mermas...');
      const data = await getMermas();
      console.log('Mermas received:', data);
      setMermas(data);
    } catch (error) {
      console.error('Error al obtener las mermas:', error);
      toast({
        title: "Error",
        description: "Error al obtener las mermas",
        variant: "destructive",
      });
    }
  }, []);


  useEffect(() => {
    if (activeProductTab === 'merma') {
      console.log('Fetching mermas...');
      fetchMermas().then(() => {
        console.log('Mermas actualizadas:', mermas);
      });
    }
  }, [activeProductTab, fetchMermas]);

  const handleExportToExcel = () => {
    const header = ["Nombre", "Precio", "Cantidad"];
    const data = inventario.map(producto => [producto.nombre, producto.precio, producto.cantidad]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");

    XLSX.writeFile(wb, "lista_productos.xlsx");
  };

  const handleProductMerma = async (
    productId: string,
    vendorId: string,
    cantidad: number,
    parametros?: Parametro[]
  ) => {
    try {
      // Solo llamar a createMerma, que manejará internamente la reducción
      await createMerma(productId, vendorId, cantidad, parametros);

      // Actualizar los estados después de la operación
      if (vendedorSeleccionado) {
        const updatedProducts = await getProductosVendedor(vendedorSeleccionado.id);
        setProductosVendedor(updatedProducts);
      }

      await fetchInventario();
      await fetchMermas();

      toast({
        title: "Éxito",
        description: "Merma registrada correctamente",
      });
    } catch (error) {
      console.error('Error al registrar merma:', error);
      toast({
        title: "Error",
        description: "Error al registrar la merma",
        variant: "destructive",
      });
    }
  };




  const handleDeleteProduct = async (productId: string) => {
    try {
      await eliminarProducto(productId);
      await fetchInventario();
      setSelectedProduct(null);
      alert('Producto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar el producto. Por favor, inténtelo de nuevo.');
    }
  };


  const handleDeleteMerma = (productoId: string) => {
    setMermaToDelete(productoId);
  };


  const confirmDeleteMerma = async () => {
    if (!mermaToDelete) return;

    try {
      await deleteMerma(mermaToDelete);
      // En lugar de filtrar manualmente, volvemos a cargar todas las mermas
      await fetchMermas();

      toast({
        title: "Éxito",
        description: "Merma eliminada correctamente",
      });
    } catch (error) {
      console.error('Error al eliminar la merma:', error);
      toast({
        title: "Error",
        description: "Error al eliminar la merma",
        variant: "destructive",
      });
    } finally {
      setMermaToDelete(null);
    }
  };


  const agruparMermas = (mermas: Merma[]) => {
    return mermas.reduce((acc, merma) => {
      const key = merma.producto.id;

      // Calcular la cantidad total basada en los parámetros si existen
      const cantidadTotal = merma.producto.tiene_parametros && merma.producto.parametros
        ? merma.producto.parametros.reduce((sum, param) => sum + param.cantidad, 0)
        : merma.cantidad;

      if (!acc[key]) {
        // Primera vez que encontramos este producto
        acc[key] = {
          ...merma,
          cantidad: cantidadTotal,
          producto: {
            ...merma.producto,
            parametros: merma.producto.tiene_parametros ? (merma.producto.parametros || []) : []
          }
        };
      } else {
        // Ya existe este producto, actualizamos la cantidad
        acc[key] = {
          ...acc[key],
          cantidad: acc[key].cantidad + cantidadTotal,
          producto: {
            ...acc[key].producto,
            parametros: merma.producto.parametros || []
          }
        };
      }
      return acc;
    }, {} as { [key: string]: Merma });
  };






  const calcularCantidadTotal = (producto: Producto) => {
    if (producto.tiene_parametros && producto.parametros) {
      return producto.parametros.reduce((sum, param) => sum + param.cantidad, 0);
    }
    return producto.cantidad; // Si no tiene parámetros, usar la cantidad directa
  };

  const handleMassDelivery = async () => {
    try {
      if (Object.keys(selectedProducts).length === 0 || selectedVendors.length === 0) {
        alert('Por favor, selecciona al menos un producto y un vendedor.');
        return;
      }

      await fetchInventario();

      for (const [productId, productData] of Object.entries(selectedProducts)) {
        const { cantidad, parametros } = productData;

        const producto = inventario.find((p) => p.id.toString() === productId.toString());
        if (!producto) continue;

        // Calcular la cantidad total correctamente
        const cantidadTotal = parametros
          ? Object.values(parametros).reduce((sum, val) => sum + (Number(val) || 0), 0)
          : Number(cantidad) || 0;

        // Validar que la cantidad sea un número válido
        if (isNaN(cantidadTotal) || cantidadTotal <= 0) {
          alert(`Cantidad inválida para el producto ${producto.nombre}`);
          continue;
        }

        if (producto.cantidad < cantidadTotal) {
          alert(`Stock insuficiente para ${producto.nombre}`);
          continue;
        }

        // Transformar parámetros
        const parametrosArray = parametros
          ? Object.entries(parametros)
            .filter(([nombre]) => nombre && nombre !== '0' && nombre !== '1')
            .map(([nombre, cantidadParam]) => ({
              nombre,
              cantidad: Number(cantidadParam) || 0
            }))
          : undefined;

        for (const vendorId of selectedVendors) {
          try {
            await entregarProducto(
              productId,
              vendorId,
              cantidadTotal,
              parametrosArray
            );
          } catch (error) {
            console.error(`Error en entrega: ${error}`);
            alert(`Error al entregar ${producto.nombre} al vendedor ${vendorId}`);
          }
        }
      }

      await fetchInventario();
      setShowMassDeliveryDialog(false);
      setMassDeliveryStep(1);
      setSelectedProducts({});
      setSelectedVendors([]);
      alert('Entrega masiva realizada con éxito');

    } catch (error) {
      console.error('Error en entrega masiva:', error);
      alert('Error en la entrega masiva');
    }
  };




  const handleSort = (key: 'nombre' | 'cantidad') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  const sortedInventario = [...inventario].sort((a, b) => {
    if (sortBy === 'nombre') {
      return sortOrder === 'asc'
        ? a.nombre.localeCompare(b.nombre)
        : b.nombre.localeCompare(a.nombre)
    } else {
      return sortOrder === 'asc'
        ? a.cantidad - b.cantidad
        : b.cantidad - a.cantidad
    }
  })

  const filteredInventarioForMassDelivery = inventario
    .filter((producto) => {
      // Primero verifica si el producto tiene cantidad mayor a 0
      if (producto.tiene_parametros && producto.parametros) {
        // Para productos con parámetros, verifica si al menos un parámetro tiene cantidad > 0
        return producto.parametros.some(param => param.cantidad > 0);
      }
      // Para productos sin parámetros, verifica si la cantidad es mayor a 0
      return producto.cantidad > 0;
    })
    .filter((producto) =>
      producto.nombre.toLowerCase().includes(productSearchTerm.toLowerCase())
    );



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value })
  }

  const handleRoleChange = (value: string) => {
    setNewUser({ ...newUser, rol: value })
  }

  const handleRegisterUser = async () => {
    try {
      await registerUser(newUser)
      setShowRegisterModal(false)
      setNewUser({
        nombre: '',
        password: '',
        telefono: '',
        rol: ''
      })
      await fetchVendedores()
    } catch (error) {
      console.error('Error al registrar usuario:', error)
    }
  }

  const calcularVentasDiarias = (ventas: Venta[]): VentaDia[] => {
    const ventasPorDia: { [key: string]: Venta[] } = {};
    ventas.forEach(venta => {
      const fecha = venta.fecha.split('T')[0];
      if (!ventasPorDia[fecha]) ventasPorDia[fecha] = [];
      ventasPorDia[fecha].push(venta);
    });

    return Object.entries(ventasPorDia).map(([fecha, ventasDelDia]) => ({
      fecha,
      ventas: ventasDelDia,
      total: ventasDelDia.reduce((sum, venta) => sum + parseFloat(venta.total.toString()), 0)
    }));
  };

  const calcularVentasSemanales = (ventas: Venta[]): VentaSemana[] => {
    const weekMap = new Map();

    const getWeekKey = (date: Date) => {
      // Asegúrate de que la semana empiece en lunes
      const mondayOfWeek = startOfWeek(date, { weekStartsOn: 1 });
      // Asegura que la semana empieza el lunes
      const sundayOfWeek = endOfWeek(date, { weekStartsOn: 1 });
      // Y termina el domingo
      return `${format(mondayOfWeek, 'yyyy-MM-dd')}_${format(sundayOfWeek, 'yyyy-MM-dd')}`;
    };

    ventas.forEach((venta) => {
      const ventaDate = new Date(venta.fecha);

      // Validar que la fecha sea válida
      if (isNaN(ventaDate.getTime())) {
        console.error(`Fecha inválida en la venta: ${venta.fecha}`);
        return;
      }

      const weekKey = getWeekKey(ventaDate);

      // Si la semana no existe en el Map, se agrega
      if (!weekMap.has(weekKey)) {
        const mondayOfWeek = startOfWeek(ventaDate, { weekStartsOn: 1 });
        const sundayOfWeek = endOfWeek(ventaDate, { weekStartsOn: 1 });
        weekMap.set(weekKey, {
          fechaInicio: format(mondayOfWeek, 'yyyy-MM-dd'),
          fechaFin: format(sundayOfWeek, 'yyyy-MM-dd'),
          ventas: [],
          total: 0,
          ganancia: 0,
        });
      }

      // Obtener la semana y agregar una copia de la venta
      const currentWeek = weekMap.get(weekKey)!;
      currentWeek.ventas.push({ ...venta });

      // Acumulación del total
      currentWeek.total += typeof venta.total === 'number' ? venta.total : parseFloat(venta.total) || 0;

      // Calcular la ganancia
      currentWeek.ganancia = parseFloat((currentWeek.total * 0.08).toFixed(2));
    });

    return Array.from(weekMap.values());
  };


  const handleVerVendedor = async (vendedor: Vendedor) => {
    try {
      const productos = await getProductosVendedor(vendedor.id);
      const ventasData = await getVentasVendedor(vendedor.id);
      const transData = await getTransaccionesVendedor(vendedor.id);
      const calcularSemanas = calcularVentasSemanales(ventasData);
      const calcularDias = calcularVentasDiarias(ventasData);

      setProductosVendedor(productos);
      setVentasVendedor(ventasData);
      setVentasSemanales(calcularSemanas);
      setVentasDiarias(calcularDias);
      setTransacciones(transData);
      setVendedorSeleccionado(vendedor);
    } catch (error) {
      console.error('Error al obtener datos del vendedor:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del vendedor",
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
    const verificarNombre = async () => {
      if (!newProduct.nombre.trim()) {
        setNombreExiste(false);
        return;
      }

      setVerificandoNombre(true);
      try {
        const existe = await verificarNombreProducto(newProduct.nombre);
        setNombreExiste(existe);
      } catch (error) {
        console.error('Error al verificar nombre:', error);
      } finally {
        setVerificandoNombre(false);
      }
    };

    const timeoutId = setTimeout(verificarNombre, 500);
    return () => clearTimeout(timeoutId);
  }, [newProduct.nombre]);

  const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target

    if (type === 'file') {
      const fileList = e.target.files
      if (fileList && fileList.length > 0) {
        setNewProduct({ ...newProduct, [name]: fileList[0] })
      }
    } else if (type === 'checkbox' && name === 'tieneParametros') {
      setNewProduct({
        ...newProduct,
        tieneParametros: e.target.checked,
        parametros: e.target.checked ? [{ nombre: '', cantidad: 0 }] : []
      })
    } else {
      setNewProduct({
        ...newProduct,
        [name]: type === 'number' ? parseFloat(value) : value
      })
    }
  }


  const handleAddProduct = async () => {
    try {
      if (nombreExiste) {
        toast({
          title: "Error",
          description: "El nombre del producto ya existe",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append('nombre', newProduct.nombre);
      formData.append('precio', newProduct.precio.toString());
      formData.append('precioCompra', newProduct.precioCompra.toString());

      if (newProduct.tieneParametros) {
        formData.append('tieneParametros', 'true');
        formData.append('parametros', JSON.stringify(newProduct.parametros));
        const cantidadTotal = newProduct.parametros.reduce((sum, param) => sum + param.cantidad, 0);
        formData.append('cantidad', cantidadTotal.toString());
      } else {
        formData.append('tieneParametros', 'false');
        formData.append('cantidad', newProduct.cantidad.toString());
      }

      if (newProduct.foto && typeof newProduct.foto === 'string' && newProduct.foto.trim() !== '') {
        formData.append('foto', newProduct.foto);
      }

      await agregarProducto(formData);
      await fetchInventario();
      setShowAddProductModal(false);
      setNewProduct({
        nombre: '',
        precio: 0,
        precioCompra: 0,
        cantidad: 0,
        foto: '',
        tieneParametros: false,
        parametros: []
      });

      toast({
        title: "Éxito",
        description: "Producto agregado correctamente",
      });
    } catch (error) {
      console.error('Error al agregar producto:', error);
      toast({
        title: "Error",
        description: "Error al agregar el producto",
        variant: "destructive",
      });
    }
  };




  const handleProductDelivery = async (
    productId: string,
    vendedorId: string,
    cantidad: number,
    parametros?: Array<{ nombre: string; cantidad: number }>
  ) => {
    try {
      await entregarProducto(productId, vendedorId, cantidad, parametros)
      await fetchInventario()
      setSelectedProduct(null)
      alert('Producto entregado exitosamente')
    } catch (error) {
      console.error('Error entregando producto:', error)
      if (error instanceof Error) {
        alert(`Error al entregar producto: ${error.message}`)
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as any
        alert(`Error al entregar producto: ${axiosError.response?.data?.error || 'Error desconocido'}`)
      } else {
        alert('Error desconocido al entregar producto')
      }
    }
  }

  // En AlmacenPage.tsx
  const handleEditProduct = async (editedProduct: Producto, imageUrl: string | undefined) => {
    try {
      const formData = new FormData();
      formData.append('nombre', editedProduct.nombre);
      formData.append('precio', editedProduct.precio.toString());
      formData.append('cantidad', editedProduct.cantidad.toString());
      formData.append('tiene_parametros', editedProduct.tiene_parametros.toString());

      // Añadir explícitamente el precio_compra
      formData.append('precio_compra', (editedProduct.precio_compra || 0).toString());

      // Log para depuración
      console.log('Precio de compra a enviar:', editedProduct.precio_compra);

      if (editedProduct.parametros) {
        formData.append('parametros', JSON.stringify(editedProduct.parametros));
      }

      if (imageUrl) {
        formData.append('fotoUrl', imageUrl);
        console.log('FormData imagen:', imageUrl);
      }

      await editarProducto(editedProduct.id, formData);
      await fetchInventario();
      setSelectedProduct(null);

      toast({
        title: "Éxito",
        description: "Producto actualizado correctamente",
      });
    } catch (error) {
      console.error('Error al editar producto:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el producto",
        variant: "destructive",
      });
    }
  };




  const handleReduceVendorProduct = async (
    productId: string,
    vendorId: string,
    cantidad: number,
    parametros?: Array<{ nombre: string; cantidad: number }>
  ) => {
    try {
      // Si hay parámetros, enviarlos en la reducción
      await reducirProductoVendedor(productId, vendorId, cantidad, parametros);

      if (vendedorSeleccionado) {
        const updatedProducts = await getProductosVendedor(vendedorSeleccionado.id);
        setProductosVendedor(updatedProducts);
        const updatedTransactions = await getTransaccionesVendedor(vendedorSeleccionado.id);
        setTransacciones(updatedTransactions);
      }

      await fetchInventario();

      toast({
        title: "Éxito",
        description: "Cantidad de producto reducida exitosamente",
      });
    } catch (error) {
      console.error('Error reducing vendor product quantity:', error);
      toast({
        title: "Error",
        description: "Error al reducir la cantidad del producto",
        variant: "destructive",
      });
    }
  };


  const handleProductTransfer = async (
    productId: string,
    fromVendorId: string,
    toVendorId: string,
    cantidad: number,
    parametros?: Array<{ nombre: string; cantidad: number }>

  ) => {
    console.log('handleProductTransfer recibió:', {
      productId,
      fromVendorId,
      toVendorId,
      cantidad,
      parametros
    });
    try {
      await transferProduct({
        productId,
        fromVendorId,
        toVendorId,
        cantidad,
        parametros
      });

      if (vendedorSeleccionado) {
        const updatedProducts = await getProductosVendedor(vendedorSeleccionado.id);
        setProductosVendedor(updatedProducts);

        const updatedTransactions = await getTransaccionesVendedor(vendedorSeleccionado.id);
        setTransacciones(updatedTransactions);
      }

      await fetchInventario();

      toast({
        title: "Transferencia exitosa",
        description: "El producto ha sido transferido correctamente.",
      });
    } catch (error) {
      console.error('Error en la transferencia:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al transferir el producto",
        variant: "destructive",
      });
    }
  };




  const handleEditVendedor = async (editedVendor: Vendedor & { newPassword?: string }) => {
    try {
      await editarVendedor(editedVendor.id, editedVendor);
      await fetchVendedores();
      setVendedorSeleccionado(null);
      toast({
        title: "Éxito",
        description: "Vendedor actualizado exitosamente",
      });
    } catch (error) {
      console.error('Error editing vendor:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Error desconocido al editar el vendedor',
        variant: "destructive",
      });
    }
  };

  const filteredInventario = sortedInventario.filter((producto) =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUpdateProductQuantity = async (
    vendorId: string,
    productId: string,
    newQuantity: number,
    parametros?: Array<{ nombre: string; cantidad: number }>
  ) => {
    try {
      await updateProductQuantity(vendorId, productId, newQuantity, parametros);
      // Actualizar los productos del vendedor después de la actualización
      if (vendedorSeleccionado) {
        const updatedProducts = await getProductosVendedor(vendedorSeleccionado.id);
        setProductosVendedor(updatedProducts);
      }
    } catch (error) {
      console.error('Error al actualizar la cantidad:', error);
    }
  };

  if (!isAuthenticated) {
    return <div>Cargando...</div>
  }

  return (
    <div className="container mx-auto p-4 relative">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Panel de Almacén</h1>
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed top-4 right-4 z-50">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col space-y-4">
              <Button
                variant="ghost"
                className={activeSection === 'productos' ? 'bg-accent' : ''}
                onClick={() => {
                  setActiveSection('productos')
                  setIsMenuOpen(false)
                }}
              >
                Productos
              </Button>
              <Button
                variant="ghost"
                className={activeSection === 'vendedores' ? 'bg-accent' : ''}
                onClick={() => {
                  setActiveSection('vendedores')
                  setIsMenuOpen(false)
                }}
              >
                Vendedores
              </Button>
              <Button
                variant="ghost"
                className={activeSection === 'ventas' ? 'bg-accent' : ''}
                onClick={() => {
                  setActiveSection('ventas')
                  setIsMenuOpen(false)
                }}
              >
                Ventas
              </Button>
              <Button
                variant="ghost"
                className={activeSection === 'contabilidad' ? 'bg-accent' : ''}
                onClick={() => {
                  setActiveSection('contabilidad')
                  setIsMenuOpen(false)
                }}
              >
                Contabilidad Global
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>



      {activeSection === 'productos' && (
        <div>
          <div className="flex flex-wrap justify-end gap-2 mb-4">
            <Button
              onClick={() => setShowAddProductModal(true)}
              className="flex-grow sm:flex-grow-0 bg-green-500 hover:bg-green-600 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Agregar Producto</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
            <Button
              onClick={() => setShowMassDeliveryDialog(true)}
              className="flex-grow sm:flex-grow-0 bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Truck className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Entrega Masiva</span>
              <span className="sm:hidden">Entregar</span>
            </Button>
            <Button
              onClick={handleExportToExcel}
              className="flex-grow sm:flex-grow-0 bg-purple-500 hover:bg-purple-600 text-white"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Exportar a Excel</span>
              <span className="sm:hidden">Exportar</span>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center mb-4">Lista de productos</CardTitle>
              <div className="flex justify-center space-x-2 mb-4">
                <Button
                  variant={activeProductTab === 'inventario' ? "default" : "outline"}
                  onClick={() => setActiveProductTab('inventario')}
                  size="sm"
                  className="flex-1 max-w-xs"
                >
                  Inventario
                </Button>
                <Button
                  variant={activeProductTab === 'agotados' ? "default" : "outline"}
                  onClick={() => setActiveProductTab('agotados')}
                  size="sm"
                  className="flex-1 max-w-xs relative"
                >
                  Agotados
                </Button>
                <Button
                  variant={activeProductTab === 'merma' ? "default" : "outline"}
                  onClick={() => setActiveProductTab('merma')}
                  size="sm"
                  className="flex-1 max-w-xs"
                >
                  Merma
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeProductTab === 'merma' ? (
                <div className="space-y-4">
                  {/* Barra de búsqueda */}
                  <div className="mb-4">
                    <Input
                      placeholder="Buscar en mermas..."
                      value={mermaSearchTerm}
                      onChange={(e) => setMermaSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>

                  {/* Botones de ordenamiento */}
                  <div className="flex justify-start space-x-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMermaSort('nombre')}
                      className="flex items-center text-xs px-2 py-1"
                    >
                      Nombre
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMermaSort('cantidad')}
                      className="flex items-center text-xs px-2 py-1"
                    >
                      Cantidad
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </div>

                  {/* Lista de mermas con filtrado y ordenamiento */}
                  <div className="space-y-4">
                    {mermas.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No hay productos en merma registrados
                      </div>
                    ) : (
                      Object.values(agruparMermas(mermas))
                        .filter((merma) =>
                          merma.producto.nombre.toLowerCase().includes(mermaSearchTerm.toLowerCase())
                        )
                        .sort((a, b) => {
                          if (mermaSortBy === 'nombre') {
                            return mermaSortOrder === 'asc'
                              ? a.producto.nombre.localeCompare(b.producto.nombre)
                              : b.producto.nombre.localeCompare(a.producto.nombre);
                          } else {
                            return mermaSortOrder === 'asc'
                              ? a.cantidad - b.cantidad
                              : b.cantidad - a.cantidad;
                          }
                        })
                        .map((merma) => {
                          const tieneParametros = merma.producto.tiene_parametros;
                          const isExpanded = expandedMermas.has(merma.producto.id);

                          return (
                            <div
                              key={merma.producto.id}
                              className="p-3 rounded-lg border bg-white hover:bg-gray-50 transition-all duration-200"
                            >
                              <div
                                className={`flex items-center ${tieneParametros ? 'cursor-pointer' : ''}`}
                                onClick={(e) => {
                                  if (tieneParametros) {
                                    e.preventDefault();
                                    toggleMermaExpansion(merma.producto.id);
                                  }
                                }}
                              >
                                {/* Contenedor de la imagen */}
                                <div className="w-12 h-12 flex-shrink-0 relative mr-4">
                                  <Image
                                    src={imageErrors[merma.producto.id] ? '/placeholder.svg' : (merma.producto.foto || '/placeholder.svg')}
                                    alt={merma.producto.nombre}
                                    fill
                                    className="rounded-md object-cover"
                                    onError={() => {
                                      setImageErrors(prev => ({
                                        ...prev,
                                        [merma.producto.id]: true
                                      }));
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-base">{merma.producto.nombre}</h3>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                    <div>
                                      <p>${Number(merma.producto.precio).toFixed(2)}</p>
                                      <p>{new Date(merma.fecha).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                      <p>Cantidad: {merma.producto.tiene_parametros
                                        ? merma.producto.parametros?.reduce((sum, param) => sum + param.cantidad, 0)
                                        : merma.cantidad}</p>
                                      {tieneParametros && !isExpanded && (
                                        <p className="text-blue-500 text-xs">
                                          Parámetros
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMerma(merma.producto.id);
                                  }}
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>

                              {tieneParametros && isExpanded && (
                                <div className="mt-3 pl-16 border-t pt-2">
                                  <div className="space-y-1">
                                    {merma.producto.parametros?.map((parametro, index) => (
                                      <div key={`${parametro.nombre}-${index}`} className="flex justify-between text-sm">
                                        <span className="text-gray-600">{parametro.nombre}:</span>
                                        <span className="font-medium">{parametro.cantidad}</span>
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
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <Input
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="flex justify-start space-x-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSort('nombre')}
                      className="flex items-center text-xs px-2 py-1"
                    >
                      Nombre
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSort('cantidad')}
                      className="flex items-center text-xs px-2 py-1"
                    >
                      Cantidad
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {getFilteredProducts(filteredInventario).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        {activeProductTab === 'agotados'
                          ? 'No hay productos agotados'
                          : 'No se encontraron productos'}
                      </div>
                    ) : (
                      getFilteredProducts(filteredInventario).map((producto) => (
                        <div
                          key={producto.id}
                          onClick={() => setSelectedProduct(producto)}
                          className={`flex items-center p-3 rounded-lg border mb-2 bg-white hover:bg-gray-50 cursor-pointer ${activeProductTab === 'agotados' ? 'border-red-200 bg-red-50' : ''
                            }`}
                        >
                          {/* Contenedor de la imagen */}
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

                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {producto.nombre}
                            </h3>
                            <div className="flex flex-wrap gap-x-4 text-sm text-gray-500">
                              <p>Precio: ${Number(producto.precio).toFixed(2)}</p>
                              <p className={`${calcularCantidadTotal(producto) === 0 ? 'text-red-500 font-semibold' : ''}`}>
                                Cantidad: {calcularCantidadTotal(producto)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>


          </Card>
        </div>
      )}


      {activeSection === 'vendedores' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setShowRegisterModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Agregar Usuario
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {vendedores.map((vendedor) => (
                  <Button
                    key={vendedor.id}
                    onClick={() => handleVerVendedor(vendedor)}
                    className="w-full h-auto p-4 flex items-center text-left bg-white hover:bg-gray-100 border border-gray-200 rounded-lg shadow-sm transition-colors"
                    variant="ghost"
                  >
                    <div className="flex-grow">
                      <span className="font-semibold text-gray-800">{vendedor.nombre}</span>
                      <div className="text-sm text-gray-600">
                        <span>Teléfono: {vendedor.telefono}</span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}




      {activeSection === 'ventas' && (
        <SalesSection userRole="Almacen" />
      )}

      {activeSection === 'contabilidad' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-xl font-bold">Contabilidad Global</h2>
            <Button
              onClick={exportContabilidadToExcel}
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={isLoadingContabilidad}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumen de Ventas por Producto</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Buscar producto..."
                  value={searchTermContabilidad}
                  onChange={(e) => setSearchTermContabilidad(e.target.value)}
                  className="max-w-sm"
                />

                {/* Selector de rango de fechas CORREGIDO */}
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        (!fechaInicio && !fechaFin) && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {fechaInicio || fechaFin ? (
                        <span className="truncate">
                          {fechaInicio && fechaFin
                            ? `${format(fechaInicio, 'dd/MM/yyyy')} - ${format(fechaFin, 'dd/MM/yyyy')}`
                            : fechaInicio
                              ? `Desde: ${format(fechaInicio, 'dd/MM/yyyy')}`
                              : fechaFin
                                ? `Hasta: ${format(fechaFin, 'dd/MM/yyyy')}`
                                : ""
                          }
                        </span>
                      ) : (
                        "Seleccionar rango de fechas"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-4 space-y-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Seleccionar rango de fechas
                      </div>

                      {/* Fecha de inicio */}
                      <div className="space-y-2">
                        <label className="text-xs text-gray-600">Fecha de inicio:</label>
                        <CalendarComponent
                          mode="single"
                          selected={fechaInicio || undefined}
                          onSelect={(date) => {
                            setFechaInicio(date || null);
                            // Validar que la fecha de inicio no sea posterior a la de fin
                            if (date && fechaFin && date > fechaFin) {
                              setFechaFin(null);
                            }
                          }}
                          disabled={createDisabledMatcher(fechaFin, 'before')}
                          initialFocus
                        />
                      </div>

                      {/* Fecha de fin */}
                      <div className="space-y-2">
                        <label className="text-xs text-gray-600">Fecha de fin:</label>
                        <CalendarComponent
                          mode="single"
                          selected={fechaFin || undefined}
                          onSelect={(date) => {
                            setFechaFin(date || null);
                            // Validar que la fecha de fin no sea anterior a la de inicio
                            if (date && fechaInicio && date < fechaInicio) {
                              setFechaInicio(null);
                            }
                          }}
                          disabled={createDisabledMatcher(fechaInicio, 'after')}
                        />
                      </div>

                      {/* Validación de rango */}
                      {validarRangoFechas(fechaInicio, fechaFin) && (
                        <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                          {validarRangoFechas(fechaInicio, fechaFin)}
                        </div>
                      )}

                      {/* Botones de acción */}
                      <div className="flex space-x-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={limpiarFiltroFechas}
                        >
                          Limpiar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => setShowDatePicker(false)}
                          disabled={!!validarRangoFechas(fechaInicio, fechaFin)}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  onClick={() => setSortOrderContabilidad(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center"
                >
                  Ordenar por monto
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Mostrar información del filtro aplicado */}
              {(fechaInicio || fechaFin) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-blue-700">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span className="text-sm font-medium">
                        {fechaInicio && fechaFin
                          ? `Período: ${format(fechaInicio, 'dd/MM/yyyy')} - ${format(fechaFin, 'dd/MM/yyyy')}`
                          : fechaInicio
                            ? `Desde: ${format(fechaInicio, 'dd/MM/yyyy')}`
                            : fechaFin
                              ? `Hasta: ${format(fechaFin, 'dd/MM/yyyy')}`
                              : ""
                        }
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={limpiarFiltroFechas}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {isLoadingContabilidad ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    <p>Cargando datos de contabilidad...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tabla de resumen expandible */}
                  <div className="overflow-x-auto">
                    <div className="border rounded-lg">
                      <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-white border-b">
                            <tr>
                              <th className="text-left p-3 font-medium">Producto</th>
                              <th className="text-right p-3 font-medium">Cantidad Total</th>
                              <th className="text-right p-3 font-medium">Monto Total</th>
                              <th className="text-right p-3 font-medium">N° Ventas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getContabilidadData().length === 0 ? (
                              <tr>
                                <td colSpan={4} className="text-center py-8 text-gray-500">
                                  {searchTermContabilidad
                                    ? 'No se encontraron productos que coincidan con la búsqueda.'
                                    : (fechaInicio || fechaFin)
                                      ? `No hay datos de ventas en el período seleccionado.`
                                      : 'No hay datos de ventas disponibles.'}
                                </td>
                              </tr>
                            ) : (
                              getContabilidadData().map((item, index) => (
                                <React.Fragment key={index}>
                                  {/* Fila principal del producto */}
                                  <tr
                                    className={`border-b hover:bg-gray-50 ${item.tieneParametros ? 'cursor-pointer' : ''
                                      }`}
                                    onClick={() => {
                                      if (item.tieneParametros) {
                                        toggleExpandContabilidad(item.producto)
                                      }
                                    }}
                                  >
                                    <td className="p-3">
                                      <div className="flex items-center">
                                        <span className="font-medium">{item.producto}</span>
                                        {item.tieneParametros && (
                                          <ChevronDown
                                            className={`ml-2 h-4 w-4 transition-transform ${expandedContabilidadProducts[item.producto] ? 'rotate-180' : ''
                                              }`}
                                          />
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3 text-right font-semibold">{item.cantidadTotal}</td>
                                    <td className="p-3 text-right font-semibold text-green-600">
                                      ${item.montoTotal.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-right">{item.ventas.length}</td>
                                  </tr>

                                  {/* Filas expandibles para parámetros */}
                                  {item.tieneParametros &&
                                    expandedContabilidadProducts[item.producto] &&
                                    item.parametros.size > 0 && (
                                      <tr>
                                        <td colSpan={4} className="p-0">
                                          <div className="bg-gray-50 border-t">
                                            <div className="px-6 py-3">
                                              <div className="text-sm font-medium text-gray-700 mb-2">
                                                Desglose por parámetros:
                                              </div>
                                              <div className="space-y-1">
                                                {Array.from(item.parametros.entries())
                                                  .sort(([, a], [, b]) => b.monto - a.monto)
                                                  .map(([parametroNombre, parametroData], paramIndex) => (
                                                    <div
                                                      key={paramIndex}
                                                      className="flex justify-between items-center py-2 px-3 bg-white rounded border"
                                                    >
                                                      <div className="flex items-center">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                                        <span className="text-sm font-medium">
                                                          {parametroNombre}
                                                        </span>
                                                      </div>
                                                      <div className="flex space-x-6 text-sm">
                                                        <span className="text-gray-600">
                                                          Cantidad: <span className="font-semibold">{parametroData.cantidad}</span>
                                                        </span>
                                                        <span className="text-green-600">
                                                          Monto: <span className="font-semibold">${parametroData.monto.toFixed(2)}</span>
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))}
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

                  {/* Totales */}
                  <div className="border-t pt-4 mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-bold text-lg mb-2">
                        Totales Generales
                        {(fechaInicio || fechaFin) && (
                          <span className="text-sm font-normal text-gray-600 ml-2">
                            {fechaInicio && fechaFin
                              ? `(${format(fechaInicio, 'dd/MM/yyyy')} - ${format(fechaFin, 'dd/MM/yyyy')})`
                              : fechaInicio
                                ? `(desde ${format(fechaInicio, 'dd/MM/yyyy')})`
                                : fechaFin
                                  ? `(hasta ${format(fechaFin, 'dd/MM/yyyy')})`
                                  : ""
                            }
                          </span>
                        )}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Total Productos Vendidos</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {getContabilidadData().reduce((sum, item) => sum + item.cantidadTotal, 0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Total en Ventas</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${getContabilidadData().reduce((sum, item) => sum + item.montoTotal, 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Total de Transacciones</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {getContabilidadData().reduce((sum, item) => sum + item.ventas.length, 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}


      <Dialog open={showMassDeliveryDialog} onOpenChange={setShowMassDeliveryDialog}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Entrega Masiva</DialogTitle>
          </DialogHeader>
          {massDeliveryStep === 1 ? (
            <div className="space-y-4">
              <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                {vendedores.map((vendedor) => (
                  <div key={vendedor.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      id={`vendor-${vendedor.id}`}
                      checked={selectedVendors.includes(vendedor.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedVendors([...selectedVendors, vendedor.id])
                        } else {
                          setSelectedVendors(selectedVendors.filter(id => id !== vendedor.id))
                        }
                      }}
                    />
                    <label htmlFor={`vendor-${vendedor.id}`} className="flex-grow cursor-pointer">
                      {vendedor.nombre}
                    </label>
                  </div>
                ))}
              </div>
              <div className="sticky bottom-0 pt-2 bg-white">
                <Button
                  onClick={() => setMassDeliveryStep(2)}
                  disabled={selectedVendors.length === 0}
                  className="w-full"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Buscar productos..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
              />
              <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-2">
                {filteredInventarioForMassDelivery.map((producto) => (
                  <div key={producto.id} className="flex flex-col p-3 border rounded-lg bg-white">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center h-5">
                        <Checkbox
                          id={`product-${producto.id}`}
                          checked={!!selectedProducts[producto.id]}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProducts((prev) => ({
                                ...prev,
                                [producto.id]: {
                                  cantidad: 0,
                                  parametros: producto.tiene_parametros ? {} : undefined,
                                },
                              }));
                            } else {
                              setSelectedProducts((prev) => {
                                const { [producto.id]: _, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                        />
                      </div>

                      <div className="w-16 h-16 relative rounded-md overflow-hidden flex-shrink-0">
                        <Image
                          src={producto.foto || '/placeholder.svg'}
                          alt={producto.nombre}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <label htmlFor={`product-${producto.id}`} className="font-medium text-sm block">
                          {producto.nombre}
                        </label>
                        <div className="text-xs text-gray-600 mt-1 space-y-1">
                          <p>Precio: ${producto.precio}</p>
                          <p>Disponible: {producto.cantidad}</p>
                        </div>
                      </div>
                    </div>

                    {selectedProducts[producto.id] && (
                      <div className="mt-3 pl-8 space-y-3">
                        {!producto.tiene_parametros ? (
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 flex-shrink-0">Cantidad:</label>
                            <Input
                              type="number"
                              value={selectedProducts[producto.id]?.cantidad || ''}
                              onChange={(e) =>
                                setSelectedProducts((prev) => ({
                                  ...prev,
                                  [producto.id]: {
                                    ...prev[producto.id],
                                    cantidad: parseInt(e.target.value, 10) || 0,
                                  },
                                }))
                              }
                              className="w-24 h-8"
                              min={1}
                              max={producto.cantidad}
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {producto.parametros?.map((parametro) => (
                              <div key={parametro.nombre} className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 flex-1">
                                  {parametro.nombre}:
                                  <span className="text-xs text-gray-500 ml-1">
                                    (Máx: {parametro.cantidad})
                                  </span>
                                </label>
                                <Input
                                  type="number"
                                  value={selectedProducts[producto.id]?.parametros?.[parametro.nombre] || ''}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value, 10) || 0;
                                    setSelectedProducts((prev) => ({
                                      ...prev,
                                      [producto.id]: {
                                        ...prev[producto.id],
                                        parametros: {
                                          ...prev[producto.id]?.parametros,
                                          [parametro.nombre]: value,
                                        },
                                      },
                                    }));
                                  }}
                                  className="w-24 h-8"
                                  min={0}
                                  max={parametro.cantidad}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="sticky bottom-0 pt-2 bg-white flex justify-between space-x-2">
                <Button variant="outline" onClick={() => setMassDeliveryStep(1)}>
                  Atrás
                </Button>
                <Button
                  onClick={handleMassDelivery}
                  disabled={Object.keys(selectedProducts).length === 0}
                >
                  Entregar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
              <Input
                id="nombre"
                name="nombre"
                value={newUser.nombre}
                onChange={handleInputChange}
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
              <Input
                id="password"
                name="password"
                type="password"
                value={newUser.password}
                onChange={handleInputChange}
                placeholder="Contraseña"
              />
            </div>
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
              <Input
                id="telefono"
                name="telefono"
                value={newUser.telefono}
                onChange={handleInputChange}
                placeholder="Número de teléfono"
              />
            </div>
            <div>
              <label htmlFor="rol" className="block text-sm font-medium text-gray-700">Rol</label>
              <Select onValueChange={handleRoleChange} value={newUser.rol}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Almacen">Almacén</SelectItem>
                  <SelectItem value="Vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleRegisterUser}>Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddProductModal} onOpenChange={setShowAddProductModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Producto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mb-16">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
              <Input
                id="nombre"
                name="nombre"
                value={newProduct.nombre}
                onChange={handleProductInputChange}
                placeholder="Nombre del producto"
              />
              {verificandoNombre && (
                <p className="text-sm text-gray-500 mt-1">Verificando nombre...</p>
              )}
              {!verificandoNombre && nombreExiste && (
                <p className="text-sm text-red-500 mt-1">Este nombre de producto ya existe</p>
              )}
            </div>

            <div>
              <label htmlFor="precio" className="block text-sm font-medium text-gray-700">Precio</label>
              <Input
                id="precio"
                name="precio"
                type="number"
                value={newProduct.precio}
                onChange={handleProductInputChange}
                placeholder="Precio del producto"
              />
            </div>

            <div>
              <label htmlFor="precioCompra" className="block text-sm font-medium text-gray-700">Precio de Compra</label>
              <Input
                id="precioCompra"
                name="precioCompra"
                type="number"
                value={newProduct.precioCompra}
                onChange={handleProductInputChange}
                placeholder="Precio de compra del producto"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tieneParametros"
                checked={newProduct.tieneParametros}
                onCheckedChange={(checked) => {
                  setNewProduct(prev => ({
                    ...prev,
                    tieneParametros: checked as boolean,
                    parametros: checked ? [{ nombre: '', cantidad: 0 }] : []
                  }));
                }}
              />
              <label htmlFor="tieneParametros">Tiene parámetros</label>
            </div>

            {newProduct.tieneParametros ? (
              <div className="space-y-4">
                {/* Contenedor scrolleable para los parámetros */}
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 border rounded-lg p-4">
                  {newProduct.parametros.map((param, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        placeholder="Nombre del parámetro"
                        value={param.nombre}
                        onChange={(e) => {
                          const newParametros = [...newProduct.parametros];
                          newParametros[index].nombre = e.target.value;
                          setNewProduct(prev => ({ ...prev, parametros: newParametros }));
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Cantidad"
                        value={param.cantidad}
                        onChange={(e) => {
                          const newParametros = [...newProduct.parametros];
                          newParametros[index].cantidad = parseInt(e.target.value);
                          setNewProduct(prev => ({ ...prev, parametros: newParametros }));
                        }}
                      />
                      {/* Botón para eliminar parámetro */}
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          const newParametros = newProduct.parametros.filter((_, i) => i !== index);
                          setNewProduct(prev => ({ ...prev, parametros: newParametros }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {/* Botón para agregar parámetro fuera del área scrolleable */}
                <Button
                  type="button"
                  onClick={() => {
                    setNewProduct(prev => ({
                      ...prev,
                      parametros: [...prev.parametros, { nombre: '', cantidad: 0 }]
                    }));
                  }}
                  className="w-full"
                >
                  + Agregar parámetro
                </Button>
              </div>
            ) : (
              <div>
                <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700">Cantidad</label>
                <Input
                  id="cantidad"
                  name="cantidad"
                  type="number"
                  value={newProduct.cantidad}
                  onChange={handleProductInputChange}
                  placeholder="Cantidad del producto"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto del producto
              </label>
              <ImageUpload
                value={newProduct.foto}
                onChange={(url) => setNewProduct(prev => ({ ...prev, foto: url }))}
                disabled={false}
              />
            </div>
          </div>

          {/* Botones fijos en la parte inferior */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
            <div className="max-w-[calc(100%-2rem)] mx-auto">
              <Button onClick={handleAddProduct} className="w-full" disabled={nombreExiste || verificandoNombre}>
                {verificandoNombre ? 'Verificando...' : 'Agregar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      <AlertDialog open={mermaToDelete !== null} onOpenChange={(open) => !open && setMermaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMermaToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMerma}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      {selectedProduct && (
        <ProductDialog
          product={{ ...selectedProduct, foto: selectedProduct.foto || '' }}
          onClose={() => setSelectedProduct(null)}
          vendedores={vendedores}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onDeliver={handleProductDelivery}
          getVendorProducts={getVendorProducts} // NUEVA PROP AGREGADA
        />
      )}


      {vendedorSeleccionado && (
        <VendorDialog
          vendor={vendedorSeleccionado}
          almacen={inventario}
          onClose={() => setVendedorSeleccionado(null)}
          onEdit={handleEditVendedor}
          productos={productosVendedor}
          ventas={ventasVendedor}
          ventasSemanales={ventasSemanales}
          ventasDiarias={ventasDiarias}
          transacciones={transacciones}
          onProductReduce={handleReduceVendorProduct}
          onDeleteSale={deleteSale}
          onProductMerma={handleProductMerma}
          vendedores={vendedores}
          onProductTransfer={handleProductTransfer}
          onDeleteVendorData={handleDeleteVendorData}
          onDeleteVendor={handleDeleteVendor}
          onUpdateProductQuantity={handleUpdateProductQuantity}
        />
      )}
    </div>
  )
} 