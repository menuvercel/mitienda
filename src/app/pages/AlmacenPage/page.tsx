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
import { Menu, ArrowUpDown, Plus, Truck, UserPlus, FileSpreadsheet, Trash2 } from "lucide-react"
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
  deleteMerma
} from '../../services/api'
import ProductDialog from '@/components/ProductDialog'
import VendorDialog from '@/components/VendedorDialog'
import SalesSection from '@/components/SalesSection'
import { Producto, Vendedor, Venta, Transaccion, Merma, Parametro } from '@/types'
import { toast } from "@/hooks/use-toast";


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
  cantidad: number;
  foto: File | null;
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
  const [ventas, setVentas] = useState<Venta[]>([])
  const [transaccionesVendedor, setTransaccionesVendedor] = useState<Transaccion[]>([])
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<Vendedor | null>(null)
  const [ventasSemanales, setVentasSemanales] = useState<VentaSemana[]>([])
  const [ventasDiarias, setVentasDiarias] = useState<VentaDia[]>([])
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [newProduct, setNewProduct] = useState<NewProduct>({
    nombre: '',
    precio: 0,
    cantidad: 0,
    foto: null,
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
  const [activeProductTab, setActiveProductTab] = useState<'inventario' | 'merma'>('inventario');
  const [mermas, setMermas] = useState<Merma[]>([]);
  const [mermaToDelete, setMermaToDelete] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});



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
      fetchMermas();
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

  const handleProductMerma = async (productId: string, vendorId: string, cantidad: number) => {
    try {
      await createMerma(productId, vendorId, cantidad);

      // Actualizar los productos del vendedor si hay uno seleccionado
      if (vendedorSeleccionado) {
        const updatedProducts = await getProductosVendedor(vendedorSeleccionado.id);
        setProductosVendedor(updatedProducts);
      }

      // Actualizar el inventario general
      await fetchInventario();
      // Actualizar la lista de mermas
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
      if (!acc[key]) {
        acc[key] = {
          ...merma,
          cantidad: 0
        };
      }
      acc[key].cantidad += merma.cantidad;
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
      // Verificar si hay productos y vendedores seleccionados
      if (Object.keys(selectedProducts).length === 0 || selectedVendors.length === 0) {
        alert('Por favor, selecciona al menos un producto y un vendedor.');
        return;
      }
  
      // Actualizar el inventario antes de la entrega
      await fetchInventario();
      console.log('Inventario después de fetch:', inventario);
  
      // Validar que todos los productos seleccionados existan en el inventario
      const filteredProducts = Object.entries(selectedProducts).filter(([productId]) => {
        const exists = inventario.some((p) => p.id.toString() === productId.toString());
        if (!exists) {
          console.error(`Producto con ID ${productId} no encontrado en el inventario.`);
        }
        return exists;
      });
  
      if (filteredProducts.length !== Object.keys(selectedProducts).length) {
        console.error('Algunos productos seleccionados no existen en el inventario.');
        alert('Algunos productos seleccionados no existen en el inventario. Por favor, verifica la selección.');
        return;
      }
  
      // Iterar sobre los productos seleccionados
      for (const [productId, productData] of filteredProducts) {
        const { cantidad, parametros } = productData;
  
        // Obtener el producto del inventario
        const producto = inventario.find((p) => p.id.toString() === productId.toString());
        if (!producto) {
          console.error(`Producto con ID ${productId} no encontrado en el inventario.`);
          continue; // Saltar este producto y continuar con el siguiente
        }
  
        // Calcular la cantidad total a descontar
        const cantidadTotal = parametros
          ? Object.values(parametros).reduce((sum, val) => sum + val, 0)
          : cantidad;
  
        // Validar que haya suficiente stock
        if (producto.cantidad < cantidadTotal) {
          alert(`Stock insuficiente para el producto ${producto.nombre}. Disponible: ${producto.cantidad}, Requerido: ${cantidadTotal}`);
          continue; // Saltar este producto y continuar con el siguiente
        }
  
        // Transformar y filtrar los parámetros al formato correcto
        const parametrosArray = parametros
          ? Object.entries(parametros)
            .filter(([nombre]) => nombre !== '0' && nombre !== '1') // Filtrar nombres inválidos
            .map(([nombre, cantidadParam]) => {
              // Asegurarse de que `cantidadParam` sea un número
              const cantidadNumerica = typeof cantidadParam === 'number' ? cantidadParam : 0;
              return { nombre, cantidad: cantidadNumerica };
            })
          : undefined;
  
        // Iterar sobre los vendedores seleccionados
        for (const vendorId of selectedVendors) {
          try {
            // Depurar la solicitud
            console.log('Datos de entrega:', {
              productId,
              vendorId,
              cantidadTotal,
              parametrosArray,
            });
  
            // Realizar la entrega del producto al vendedor
            await entregarProducto(productId, vendorId, cantidadTotal, parametrosArray);
          } catch (error) {
            console.error(`Error al entregar el producto ${productId} al vendedor ${vendorId}:`, error);
            alert(`Error al entregar el producto ${productId} al vendedor ${vendorId}. Por favor, inténtelo de nuevo.`);
            continue; // Continuar con el siguiente producto/vendedor en caso de error
          }
        }
      }
  
      // Actualizar el inventario después de todas las entregas
      await fetchInventario();
  
      // Limpiar el estado y cerrar el diálogo de entrega masiva
      setShowMassDeliveryDialog(false);
      setMassDeliveryStep(1);
      setSelectedProducts({});
      setSelectedVendors([]);
  
      alert('Entrega masiva realizada con éxito');
    } catch (error) {
      console.error('Error en la entrega masiva:', error);
      alert('Hubo un error al realizar la entrega masiva. Por favor, inténtelo de nuevo.');
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

  const filteredInventarioForMassDelivery = inventario.filter((producto) =>
    producto.nombre.toLowerCase().includes(productSearchTerm.toLowerCase())
  )



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
      const [productos, ventas, transacciones] = await Promise.all([
        getProductosVendedor(vendedor.id),
        getVentasVendedor(vendedor.id), // Ahora no es necesario pasar las fechas
        getTransaccionesVendedor(vendedor.id)
      ]);

      // Calcular ventas diarias
      const ventasDiarias = calcularVentasDiarias(ventas);

      // Calcular ventas semanales
      const ventasSemanales = calcularVentasSemanales(ventas);

      setProductosVendedor(productos);
      setVentasVendedor(ventas);
      setVentasDiarias(ventasDiarias);
      setVentasSemanales(ventasSemanales);
      setTransaccionesVendedor(transacciones);
      setVendedorSeleccionado(vendedor);
    } catch (error) {
      console.error('Error al obtener datos del vendedor:', error);
      alert('No se pudieron cargar todos los datos del vendedor. Algunos datos pueden estar incompletos.');
      setVendedorSeleccionado(vendedor);
    }
  };


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
      const formData = new FormData()
      formData.append('nombre', newProduct.nombre)
      formData.append('precio', newProduct.precio.toString())

      // Si tiene parámetros, enviamos los parámetros y su cantidad total
      if (newProduct.tieneParametros) {
        formData.append('tieneParametros', 'true')
        formData.append('parametros', JSON.stringify(newProduct.parametros))
        // Calculamos la cantidad total sumando las cantidades de todos los parámetros
        const cantidadTotal = newProduct.parametros.reduce((sum, param) => sum + param.cantidad, 0)
        formData.append('cantidad', cantidadTotal.toString())
      } else {
        formData.append('tieneParametros', 'false')
        formData.append('cantidad', newProduct.cantidad.toString())
      }

      if (newProduct.foto) {
        formData.append('foto', newProduct.foto)
      }

      await agregarProducto(formData)
      setShowAddProductModal(false)
      setNewProduct({
        nombre: '',
        precio: 0,
        cantidad: 0,
        foto: null,
        tieneParametros: false,
        parametros: []
      })
      await fetchInventario()

      toast({
        title: "Éxito",
        description: "Producto agregado correctamente",
      })
    } catch (error) {
      console.error('Error al agregar producto:', error)
      toast({
        title: "Error",
        description: "Error al agregar el producto",
        variant: "destructive",
      })
    }
  }


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


  const handleEditProduct = async (editedProduct: Producto, foto: File | null) => {
    try {
      const formData = new FormData()
      formData.append('nombre', editedProduct.nombre)
      formData.append('precio', editedProduct.precio.toString())
      formData.append('cantidad', editedProduct.cantidad.toString())
      formData.append('tiene_parametros', editedProduct.tiene_parametros.toString())

      // Agregar los parámetros si existen
      if (editedProduct.parametros) {
        formData.append('parametros', JSON.stringify(editedProduct.parametros))
      }

      if (foto) {
        formData.append('foto', foto)
      } else if (editedProduct.foto) {
        formData.append('fotoUrl', editedProduct.foto)
      }

      await editarProducto(editedProduct.id, formData)
      await fetchInventario()
      setSelectedProduct(null)
    } catch (error) {
      console.error('Error editing product:', error)
      alert('Error al editar el producto. Por favor, inténtelo de nuevo.')
    }
  }


  const handleReduceVendorProduct = async (productId: string, vendorId: string, cantidad: number) => {
    try {
      await reducirProductoVendedor(productId, vendorId, cantidad);

      if (vendedorSeleccionado) {
        const updatedProducts = await getProductosVendedor(vendedorSeleccionado.id);
        setProductosVendedor(updatedProducts);
        const updatedTransactions = await getTransaccionesVendedor(vendedorSeleccionado.id);
        setTransaccionesVendedor(updatedTransactions);
      }

      await fetchInventario();

      alert('Cantidad de producto reducida exitosamente');
    } catch (error) {
      console.error('Error reducing vendor product quantity:', error);
      alert('Error al reducir la cantidad del producto. Por favor, inténtelo de nuevo.');
    }
  };

  const handleProductTransfer = async (
    productId: string,
    fromVendorId: string,
    toVendorId: string,
    cantidad: number
  ) => {
    try {
      await transferProduct({
        productId,
        fromVendorId,
        toVendorId,
        cantidad
      });

      if (vendedorSeleccionado) {
        const updatedProducts = await getProductosVendedor(vendedorSeleccionado.id);
        setProductosVendedor(updatedProducts);

        const updatedTransactions = await getTransaccionesVendedor(vendedorSeleccionado.id);
        setTransaccionesVendedor(updatedTransactions);
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
              <div className="flex justify-between items-center">
                <CardTitle>Lista de productos</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant={activeProductTab === 'inventario' ? "default" : "outline"}
                    onClick={() => setActiveProductTab('inventario')}
                    size="sm"
                  >
                    Inventario
                  </Button>
                  <Button
                    variant={activeProductTab === 'merma' ? "default" : "outline"}
                    onClick={() => setActiveProductTab('merma')}
                    size="sm"
                  >
                    Merma
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeProductTab === 'inventario' ? (
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
                    {filteredInventario.map((producto) => (
                      <div
                        key={producto.id}
                        onClick={() => setSelectedProduct(producto)}
                        className="flex items-center p-3 rounded-lg border mb-2 bg-white hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="w-12 h-12 mr-3">
                          <Image
                            src={imageErrors[producto.id] ? '/placeholder.svg' : (producto.foto || '/placeholder.svg')}
                            alt={producto.nombre}
                            width={48}
                            height={48}
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
                            <p className={`${calcularCantidadTotal(producto) === 0 ? 'text-red-500' : ''}`}>
                              Cantidad: {calcularCantidadTotal(producto)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {mermas.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No hay productos en merma registrados
                    </div>
                  ) : (
                    Object.values(agruparMermas(mermas)).map((merma) => (
                      <div
                        key={merma.producto.id}
                        className="p-3 rounded-lg border bg-white hover:bg-gray-50 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 relative">
                            {merma.producto.foto ? (
                              <Image
                                src={merma.producto.foto || '/placeholder.svg'}
                                alt={merma.producto.nombre}
                                width={48}
                                height={48}
                                className="rounded-md object-cover"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  img.src = '/placeholder.svg';
                                }}
                              />

                            ) : (
                              <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                                <span className="text-gray-400 text-xs">Sin imagen</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-base">{merma.producto.nombre}</h3>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div>
                                <p>${Number(merma.producto.precio).toFixed(2)}</p>
                                <p>{new Date(merma.fecha).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p>Cantidad: {merma.cantidad}</p>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMerma(merma.producto.id); // Ahora usamos el ID del producto
                            }}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>

                        </div>
                      </div>
                    ))
                  )}
                </div>
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

      <Dialog open={showMassDeliveryDialog} onOpenChange={setShowMassDeliveryDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Entrega Masiva</DialogTitle>
          </DialogHeader>
          {massDeliveryStep === 1 ? (
            <div className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {vendedores.map((vendedor) => (
                  <div key={vendedor.id} className="flex items-center space-x-2">
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
                    <label htmlFor={`vendor-${vendedor.id}`}>{vendedor.nombre}</label>
                  </div>
                ))}
              </div>
              <Button onClick={() => setMassDeliveryStep(2)}
                disabled={selectedVendors.length === 0}>
                Siguiente
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Buscar productos..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
              />
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {filteredInventarioForMassDelivery.map((producto) => {
                  console.log('Producto:', producto); // Log 1: Verificar los datos del producto
                  console.log('Selected Products:', selectedProducts); // Log 2: Verificar el estado actual de selectedProducts

                  return (
                    <div key={producto.id} className="flex flex-col space-y-2 p-2 border rounded">
                      <div className="flex items-center space-x-4">
                        {/* Checkbox a la izquierda */}
                        <Checkbox
                          id={`product-${producto.id}`}
                          checked={!!selectedProducts[producto.id]}
                          onCheckedChange={(checked) => {
                            console.log('Checkbox changed:', checked); // Log 3: Verificar si el checkbox cambia
                            if (checked) {
                              setSelectedProducts((prev) => {
                                const newState = {
                                  ...prev,
                                  [producto.id]: {
                                    cantidad: 0,
                                    parametros: producto.tiene_parametros ? (producto.parametros || {}) : undefined,
                                  },
                                };
                                console.log('New Selected Products (after adding):', newState); // Log 4: Verificar el nuevo estado después de seleccionar
                                return newState;
                              });
                            } else {
                              setSelectedProducts((prev) => {
                                const { [producto.id]: _, ...rest } = prev;
                                console.log('New Selected Products (after removing):', rest); // Log 5: Verificar el nuevo estado después de deseleccionar
                                return rest;
                              });
                            }
                          }}
                        />

                        {/* Foto del producto */}
                        <img
                          src={producto.foto || '/placeholder.svg'}
                          alt={producto.nombre}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.src = '/placeholder.svg';
                          }}
                        />


                        <div className="flex-grow">
                          {/* Nombre y detalles del producto */}
                          <label htmlFor={`product-${producto.id}`} className="font-medium">{producto.nombre}</label>
                          <div className="text-sm text-gray-600">
                            <span className="mr-2">Precio: ${producto.precio}</span>
                            <span>Disponible: {producto.cantidad}</span>
                          </div>
                        </div>

                        {/* Input para cantidad si no tiene parámetros */}
                        {!producto.tiene_parametros && (
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
                            className="w-20"
                            min={1}
                            max={producto.cantidad}
                          />
                        )}
                      </div>

                      {/* Mostrar parámetros si el producto los tiene */}
                      {producto.tiene_parametros && selectedProducts[producto.id] && (
                        <div className="ml-6 mt-2 space-y-2">
                          <p className="text-sm font-medium text-gray-700"></p>
                          {producto.parametros?.map((parametro) => {
                            console.log('Rendering parameter:', parametro); // Log 6: Verificar los datos del parámetro

                            return (
                              <div key={parametro.nombre} className="flex items-center space-x-2">
                                <label className="flex-grow text-sm">
                                  {parametro.nombre} (Max: {parametro.cantidad})
                                </label>
                                <Input
                                  type="number"
                                  value={selectedProducts[producto.id]?.parametros?.[parametro.nombre] || ''}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value, 10) || 0;
                                    console.log('Parameter value changed:', { parametro: parametro.nombre, value }); // Log 7: Verificar el valor del parámetro
                                    setSelectedProducts((prev) => {
                                      const newState = {
                                        ...prev,
                                        [producto.id]: {
                                          ...prev[producto.id],
                                          parametros: {
                                            ...prev[producto.id]?.parametros,
                                            [parametro.nombre]: value,
                                          },
                                        },
                                      };
                                      console.log('New Selected Products (after parameter change):', newState); // Log 8: Verificar el nuevo estado después de cambiar un parámetro
                                      return newState;
                                    });
                                  }}
                                  className="w-20"
                                  min={0}
                                  max={parametro.cantidad}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}





              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setMassDeliveryStep(1)}>
                  Atrás
                </Button>
                <Button onClick={handleMassDelivery} disabled={Object.keys(selectedProducts).length === 0}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
              <Input
                id="nombre"
                name="nombre"
                value={newProduct.nombre}
                onChange={handleProductInputChange}
                placeholder="Nombre del producto"
              />
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
                  </div>
                ))}
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
              <label htmlFor="foto" className="block text-sm font-medium text-gray-700">Foto del producto</label>
              <Input
                id="foto"
                name="foto"
                type="file"
                onChange={handleProductInputChange}
                accept="image/*"
              />
            </div>
            <Button onClick={handleAddProduct}>Agregar</Button>
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
        />
      )}

      {vendedorSeleccionado && (
        <VendorDialog
          vendor={vendedorSeleccionado}
          onClose={() => setVendedorSeleccionado(null)}
          onEdit={handleEditVendedor}
          productos={productosVendedor}
          ventas={ventasVendedor}
          ventasSemanales={ventasSemanales}
          ventasDiarias={ventasDiarias}
          transacciones={transaccionesVendedor}
          onProductReduce={handleReduceVendorProduct}
          onDeleteSale={deleteSale}
          onProductMerma={handleProductMerma}
          onProductTransfer={handleProductTransfer}
          vendedores={vendedores}
        />
      )}
    </div>
  )
} 