'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MenuIcon, Search, X, ChevronDown, ChevronUp, ArrowLeftRight } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  getTransaccionesVendedor,
  getProductosVendedor, 
  realizarVenta, 
  getVentasDia, 
  getVentasMes,
  getCurrentUser,
  getTransaccionesProducto,
  getVentasProducto
} from '../../../services/api'

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  foto: string;
}

interface ProductoVenta extends Producto {
  cantidadVendida: number;
}

interface Transaccion {
  id: string;
  producto: string;
  cantidad: number;
  desde: string;
  hacia: string;
  fecha: string;
  tipo: string;
}

interface Venta {
  _id: string;
  producto: string;
  producto_nombre: string;
  producto_foto: string;
  cantidad: number;
  precio_unitario: number;
  total: number | string;
  vendedor: string;
  fecha: string;
}

interface VentaAgrupada {
  fecha: string;
  ventas: Venta[];
  total: number | string;
}

interface VentaSemana {
  fechaInicio: string;
  fechaFin: string;
  ventas: Venta[];
  total: number;
  ganancia: number;
}

interface VentaDia {
  fecha: string;
  ventas: Venta[];
  total: number;
}

const useVendedorData = (vendedorId: string) => {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([])
  const [productosAgotados, setProductosAgotados] = useState<Producto[]>([])
  const [ventasRegistro, setVentasRegistro] = useState<Venta[]>([])
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [ventasDia, setVentasDia] = useState<Venta[]>([])
  const [ventasAgrupadas, setVentasAgrupadas] = useState<VentaAgrupada[]>([])
  const [ventasSemanales, setVentasSemanales] = useState<VentaSemana[]>([])
  const [ventasDiarias, setVentasDiarias] = useState<VentaDia[]>([]);

  const agruparVentasPorDia = useCallback((ventas: Venta[]) => {
    const ventasDiarias: VentaDia[] = [];
    ventas.forEach((venta) => {
      const fecha = new Date(venta.fecha).toLocaleDateString();
      const diaExistente = ventasDiarias.find(d => d.fecha === fecha);
      if (diaExistente) {
        diaExistente.ventas.push(venta);
        diaExistente.total += typeof venta.total === 'number' ? venta.total : parseFloat(venta.total) || 0;
      } else {
        ventasDiarias.push({
          fecha,
          ventas: [venta],
          total: typeof venta.total === 'number' ? venta.total : parseFloat(venta.total) || 0
        });
      }
    });
    return ventasDiarias.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, []);

  const agruparVentas = useCallback((ventas: Venta[]) => {
    const ventasAgrupadas = ventas.reduce((acc: VentaAgrupada[], venta) => {
      const fecha = new Date(venta.fecha).toLocaleDateString()
      const ventaExistente = acc.find(v => v.fecha === fecha)
      if (ventaExistente) {
        ventaExistente.ventas.push(venta)
        ventaExistente.total = (parseFloat(ventaExistente.total as string) || 0) + (parseFloat(venta.total as string) || 0)
      } else {
        acc.push({ fecha, ventas: [venta], total: venta.total })
      }
      return acc
    }, [])
    return ventasAgrupadas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [])

  const agruparVentasPorSemana = useCallback((ventas: Venta[]) => {
    const ventasSemanales: VentaSemana[] = []
    ventas.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    let currentWeek: VentaSemana | null = null

    ventas.forEach((venta) => {
      const ventaDate = new Date(venta.fecha)
      const dayOfWeek = ventaDate.getDay()
      const weekStart = new Date(ventaDate.getFullYear(), ventaDate.getMonth(), ventaDate.getDate() - dayOfWeek)
      const weekEnd = new Date(weekStart.getFullYear(), ventaDate.getMonth(), weekStart.getDate() + 6)

      if (!currentWeek || ventaDate > weekEnd) {
        if (currentWeek) {
          ventasSemanales.push(currentWeek)
        }
        currentWeek = {
          fechaInicio: weekStart.toISOString().split('T')[0],
          fechaFin: weekEnd.toISOString().split('T')[0],
          ventas: [],
          total: 0,
          ganancia: 0
        }
      }

      currentWeek.ventas.push(venta)
      currentWeek.total += typeof venta.total === 'number' ? venta.total : parseFloat(venta.total) || 0
      currentWeek.ganancia = parseFloat((currentWeek.total * 0.08).toFixed(2))
    })

    if (currentWeek) {
      ventasSemanales.push(currentWeek)
    }

    return ventasSemanales.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())
  }, [])

  const fetchProductos = useCallback(async () => {
    try {
      const data = await getProductosVendedor(vendedorId)
      console.log('Raw data from getProductosVendedor:', data);
      setProductosDisponibles(data.filter((up: Producto) => up.cantidad > 0))
      setProductosAgotados(data.filter((up: Producto) => up.cantidad === 0))
      console.log('Productos disponibles:', productosDisponibles);
      console.log('Productos agotados:', productosAgotados);
    } catch (error) {
      console.error('Error al obtener productos:', error)
      setError('No se pudieron cargar los productos. Por favor, intenta de nuevo.')
    }
  }, [vendedorId])

  const fetchVentasRegistro = useCallback(async () => {
    try {
      const ventasDiaData: Venta[] = await getVentasDia(vendedorId);
      const ventasMesData: Venta[] = await getVentasMes(vendedorId);
      const todasLasVentas = [...ventasDiaData, ...ventasMesData];
      setVentasDia(ventasDiaData);
      setVentasRegistro(todasLasVentas);
      setVentasAgrupadas(agruparVentas(todasLasVentas));
      setVentasSemanales(agruparVentasPorSemana(todasLasVentas));
      setVentasDiarias(agruparVentasPorDia(todasLasVentas));
    } catch (error) {
      console.error('Error al obtener registro de ventas:', error);
      if (error instanceof Error) {
        setError(`No se pudo cargar el registro de ventas: ${error.message}`);
      } else {
        setError('No se pudo cargar el registro de ventas. Por favor, intenta de nuevo.');
      }
    }
  }, [vendedorId, agruparVentas, agruparVentasPorSemana, agruparVentasPorDia]);

  const fetchTransacciones = useCallback(async () => {
    try {
      const data = await getTransaccionesVendedor(vendedorId);
      setTransacciones(data);
    } catch (error) {
      console.error('Error al obtener transacciones:', error);
      setError('No se pudieron cargar las transacciones. Por favor, intenta de nuevo.');
    }
  }, [vendedorId]);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await getCurrentUser();
        console.log('Usuario actual:', user.id);
        if (user && user.rol === 'Vendedor') {
          if (user.id.toString() === vendedorId.toString()) {
            setIsAuthenticated(true);
            await Promise.all([fetchProductos(), fetchVentasRegistro(), fetchTransacciones()]);
          } else {
            throw new Error('ID de vendedor no coincide');
          }
        } else {
          throw new Error('Rol de usuario no autorizado');
        }
      } catch (error) {
        console.error('Error de autenticación:', error);
        setError(error instanceof Error ? error.message : 'Error de autenticación desconocido');
        router.push('/pages/LoginPage');
      } finally {
        setIsLoading(false);
      }
    };
  
    checkAuth();
  }, [vendedorId, fetchProductos, fetchVentasRegistro, fetchTransacciones, router]);

  return { 
    isAuthenticated, 
    isLoading, 
    error, 
    productosDisponibles, 
    productosAgotados, 
    ventasRegistro, 
    transacciones,
    ventasDia,
    ventasAgrupadas,
    ventasSemanales,
    ventasDiarias,
    fetchProductos, 
    fetchVentasRegistro,
    fetchTransacciones
  }
}

const VentaDiaDesplegable = ({ venta }: { venta: VentaDia }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <TableCell>{venta.fecha}</TableCell>
        <TableCell>${venta.total.toFixed(2)}</TableCell>
        <TableCell>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow>
          <TableCell colSpan={3}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venta.ventas.map((v) => (
                  <TableRow key={v._id}>
                    <TableCell className="flex items-center space-x-2">
                      <Image
                        src={v.producto_foto || '/placeholder.svg'}
                        alt={v.producto_nombre}
                        width={40}
                        height={40}
                        className="rounded-md"
                      />
                      <span>{v.producto_nombre}</span>
                    </TableCell>
                    <TableCell>{v.cantidad}</TableCell>
                    <TableCell>${typeof v.total === 'number' ? v.total.toFixed(2) : parseFloat(v.total).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const VentaSemanaDesplegable = ({ venta }: { venta: VentaSemana }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() =>setIsOpen(!isOpen)}>
        <TableCell>{`${venta.fechaInicio} - ${venta.fechaFin}`}</TableCell>
        <TableCell>${venta.total.toFixed(2)}</TableCell>
        <TableCell className="text-green-600">${venta.ganancia.toFixed(2)}</TableCell>
        <TableCell>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow>
          <TableCell colSpan={4}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venta.ventas.map((v) => (
                  <TableRow key={v._id}>
                    <TableCell>{new Date(v.fecha).toLocaleDateString()}</TableCell>
                    <TableCell className="flex items-center space-x-2">
                      <Image
                        src={v.producto_foto || '/placeholder.svg'}
                        alt={v.producto_nombre}
                        width={40}
                        height={40}
                        className="rounded-md"
                      />
                      <span>{v.producto_nombre}</span>
                    </TableCell>
                    <TableCell>{v.cantidad}</TableCell>
                    <TableCell>${typeof v.total === 'number' ? v.total.toFixed(2) : parseFloat(v.total).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const ProductoCard = ({ producto }: { producto: Producto }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProductData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];

      const [transaccionesData, ventasData] = await Promise.all([
        getTransaccionesProducto(producto.id),
        getVentasProducto(producto.id, startDate, endDate)
      ]);
      setTransacciones(transaccionesData.map(t => ({
        id: t.id,
        producto: t.producto,
        cantidad: t.cantidad,
        desde: t.desde,
        hacia: t.hacia,
        fecha: t.fecha,
        tipo: t.tipo
      })))
      setVentas(ventasData)
    } catch (error) {
      console.error('Error al obtener datos del producto:', error)
      setError('No se pudieron cargar los datos del producto. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [producto.id])

  const handleCardClick = () => {
    setIsDialogOpen(true)
    fetchProductData()
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className="w-full h-auto p-2 flex items-center justify-between text-left bg-white hover:bg-gray-100 border border-gray-200 rounded-lg shadow-sm transition-colors cursor-pointer"
      >
        <div className="flex items-center">
          {producto.foto ? (
            <Image
              src={producto.foto}
              alt={producto.nombre}
              width={50}
              height={50}
              className="object-cover rounded mr-4"
              onError={(e) => {
                console.error(`Error loading image for ${producto.nombre}:`, e);
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center mr-4">
              <span className="text-gray-500 text-xs">Sin imagen</span>
            </div>
          )}
          <div>
            <span className="font-semibold text-gray-800">{producto.nombre}</span>
            <div className="text-sm text-gray-600">
              <span className="mr-4">Precio: ${producto.precio}</span>
              <span>{producto.cantidad > 0 ? `Cantidad: ${producto.cantidad}` : 'Agotado'}</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{producto.nombre}</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">Cargando...</div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="transacciones">
              <TabsList>
                <TabsTrigger value="transacciones">Registro</TabsTrigger>
                <TabsTrigger value="ventas">Ventas</TabsTrigger>
              </TabsList>
              <TabsContent value="transacciones">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacciones.map((transaccion) => (
                      <TableRow key={transaccion.id}>
                        <TableCell>{new Date(transaccion.fecha).toLocaleString()}</TableCell>
                        <TableCell>{transaccion.cantidad}</TableCell>
                        <TableCell>{transaccion.tipo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="ventas">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unitario</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventas.map((venta) => (
                      <TableRow key={venta._id}>
                        <TableCell>{new Date(venta.fecha).toLocaleString()}</TableCell>
                        <TableCell>{venta.cantidad}</TableCell>
                        <TableCell>${(typeof venta.precio_unitario === 'number' ? venta.precio_unitario : parseFloat(venta.precio_unitario) || 0).toFixed(2)}</TableCell>
                        <TableCell>${typeof venta.total === 'number' ? venta.total.toFixed(2) : parseFloat(venta.total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function VendedorPage() {
  const params = useParams()
  const vendedorId = params.id as string
  const { 
    isAuthenticated, 
    isLoading, 
    error, 
    productosDisponibles, 
    productosAgotados, 
    transacciones,
    ventasAgrupadas,
    ventasSemanales,
    ventasDiarias,
    fetchProductos, 
    fetchVentasRegistro,
  } = useVendedorData(vendedorId)

  const [busqueda, setBusqueda] = useState('')
  const [fecha, setFecha] = useState('')
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoVenta[]>([])
  const [seccionActual, setSeccionActual] = useState<'productos' | 'ventas' | 'registro'>('productos')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState<number>(1)
  const [productoActual, setProductoActual] = useState<Producto | null>(null)

  const renderTransaccionesList = () => {
    const filteredTransacciones = transacciones.filter(t =>
      t.producto.toLowerCase().includes(busqueda.toLowerCase())
    )
    return (
      <div className="space-y-2">
        {filteredTransacciones.map(transaccion => {
          const transactionType = transaccion.tipo || 'Normal'
          const borderColor = 
            transactionType === 'Baja' ? 'border-red-500' :
            transactionType === 'Entrega' ? 'border-green-500' :
            'border-blue-500'
  
          return (
            <div key={transaccion.id} className={`flex items-center bg-white p-2 rounded-lg shadow border-l-4 ${borderColor}`}>
              <ArrowLeftRight className="w-6 h-6 text-blue-500 mr-2 flex-shrink-0" />
              <div className="flex-grow overflow-hidden">
                <p className="font-bold text-sm truncate">{transaccion.producto}</p>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>{new Date(transaccion.fecha).toLocaleDateString()}</span>
                  <span>Cantidad: {transaccion.cantidad}</span>
                </div>
                <p className="text-xs font-semibold">{transactionType}</p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const VentaDesplegable = ({ venta }: { venta: Venta }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <TableRow className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <TableCell>{new Date(venta.fecha).toLocaleDateString()}</TableCell>
          <TableCell>${typeof venta.total === 'number' ? venta.total.toFixed(2) : parseFloat(venta.total).toFixed(2)}</TableCell>
          <TableCell>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </TableCell>
        </TableRow>
        {isOpen && (
          <TableRow>
            <TableCell colSpan={3}>
              <div className="flex items-center space-x-2 p-2">
                <Image
                  src={venta.producto_foto || '/placeholder.svg'}
                  alt={venta.producto_nombre}
                  width={40}
                  height={40}
                  className="rounded-md"
                />
                <span>{venta.producto_nombre}</span>
                <span>Cantidad: {venta.cantidad}</span>
                <span>Precio unitario: ${typeof venta.precio_unitario === 'number' ? venta.precio_unitario.toFixed(2) : parseFloat(venta.precio_unitario).toFixed(2)}</span>
              </div>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  };


  const productosFiltrados = productosDisponibles.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleSeleccionarProducto = (producto: Producto) => {
    setProductoActual(producto)
    setCantidadSeleccionada(1)
  }

  const handleConfirmarSeleccion = () => {
    if (productoActual && cantidadSeleccionada > 0 && cantidadSeleccionada <= productoActual.cantidad) {
      setProductosSeleccionados(prev => [
        ...prev,
        {
          ...productoActual,
          cantidadVendida: cantidadSeleccionada
        }
      ])
      setProductoActual(null)
      setCantidadSeleccionada(1)
    } else {
      alert('La cantidad seleccionada no es válida o excede el stock disponible.')
    }
  }

  const handleRemoverProducto = (id: string) => {
    setProductosSeleccionados(prev => prev.filter(p => p.id !== id))
  }

  const handleEnviarVenta = async () => {
    if (productosSeleccionados.length === 0) {
      alert('Por favor, seleccione al menos un producto.')
      return
    }
    if (!fecha) {
      alert('Por favor, seleccione una fecha.')
      return
    }
  
    try {
      await Promise.all(productosSeleccionados.map(producto => {
        return realizarVenta(producto.id, producto.cantidadVendida, fecha);
      }));
  
      setProductosSeleccionados([])
      setFecha('')
      await fetchProductos()
      await fetchVentasRegistro()
      alert('Venta realizada con éxito')
    } catch (error) {
      console.error('Error al realizar la venta:', error)
      alert(`Error al realizar la venta: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const productosAgotadosFiltrados = productosAgotados.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const cambiarSeccion = (seccion: 'productos' | 'ventas' | 'registro') => {
    setSeccionActual(seccion)
    setMenuAbierto(false)
  }

  const handleCancelarSeleccion = () => {
    setProductoActual(null)
    setCantidadSeleccionada(1)
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error de autenticación</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!isAuthenticated) {
    return (
      <Alert>
        <AlertTitle>No autenticado</AlertTitle>
        <AlertDescription>Por favor, inicia sesión para acceder a esta página.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex h-screen">
      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed top-4 right-4 z-50">
            <MenuIcon  className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[200px]">
          <nav className="flex flex-col space-y-4">
            <Button variant="ghost" onClick={() => cambiarSeccion('productos')}>Productos</Button>
            <Button variant="ghost" onClick={() => cambiarSeccion('ventas')}>Ventas</Button>
            <Button variant="ghost" onClick={() => cambiarSeccion('registro')}>Registro</Button>
          </nav>
        </SheetContent>
      </Sheet>

      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Panel de Vendedor</h1>

          {seccionActual === 'productos' && (
          <Tabs defaultValue="disponibles">
            <TabsList>
              <TabsTrigger value="disponibles">Disponibles</TabsTrigger>
              <TabsTrigger value="agotados">Agotados</TabsTrigger>
            </TabsList>
            <TabsContent value="disponibles">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar productos..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10 max-w-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {productosFiltrados.map((producto) => (
                  <ProductoCard key={producto.id} producto={producto} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="agotados">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar productos agotados..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10 max-w-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {productosAgotadosFiltrados.map((producto) => (
                  <ProductoCard key={producto.id} producto={producto} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}


        {seccionActual === 'ventas' && (
          <Tabs defaultValue="vender">
            <TabsList>
              <TabsTrigger value="vender">Vender</TabsTrigger>
              <TabsTrigger value="registro">Registro de Ventas</TabsTrigger>
            </TabsList>
            <TabsContent value="vender">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">1. Selecciona la fecha</h2>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
                <h2 className="text-xl font-semibold">2. Selecciona los productos</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Seleccionar Productos</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Seleccionar Productos</DialogTitle>
                    </DialogHeader>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Buscar productos..."
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <ScrollArea className="h-[300px] pr-4">
                      {productoActual ? (
                        <Card className="mb-4">
                          <CardContent className="p-4">
                            <div className="flex items-center mb-2">
                              <Image
                                src={productoActual.foto || '/placeholder.svg'}
                                alt={productoActual.nombre}
                                width={50}
                                height={50}
                                className="rounded-md mr-4"
                              />
                              <div>
                                <h3 className="font-bold">{productoActual.nombre}</h3>
                                <p className="text-sm text-gray-500">Stock: {productoActual.cantidad}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <Input
                                type="number"
                                min="1"
                                max={productoActual.cantidad}
                                value={cantidadSeleccionada}
                                onChange={(e) => setCantidadSeleccionada(Math.min(parseInt(e.target.value), productoActual.cantidad))}
                                className="w-20"
                              />
                              <div>
                                <Button onClick={handleConfirmarSeleccion} className="mr-2">Seleccionar</Button>
                                <Button onClick={handleCancelarSeleccion} variant="outline">Cancelar</Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        productosFiltrados.map((producto) => (
                          <Button
                            key={producto.id}
                            onClick={() => handleSeleccionarProducto(producto)}
                            className="w-full justify-start mb-2 p-2"
                            variant="outline"
                          >
                            <Image
                              src={producto.foto || '/placeholder.svg'}
                              alt={producto.nombre}
                              width={40}
                              height={40}
                              className="rounded-md mr-4"
                            />
                            <span>{producto.nombre}</span>
                          </Button>
                        ))
                      )}
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                <div>
                  <h3 className="font-bold mb-2">Productos Seleccionados:</h3>
                  {productosSeleccionados.map((producto) => (
                    <div key={producto.id} className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded">
                      <span>{producto.nombre} x{producto.cantidadVendida}</span>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoverProducto(producto.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <h2 className="text-xl font-semibold">3. Enviar el formulario de ventas</h2>
                <Button onClick={handleEnviarVenta}>Enviar</Button>
              </div>
              </TabsContent>
            <TabsContent value="registro">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Registro de Ventas</h2>
                <div className="relative mb-4">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar ventas..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventasAgrupadas.length > 0 ? (
                      ventasAgrupadas.map((venta) => (
                        <VentaDesplegable key={venta.fecha} venta={venta.ventas[0]} />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">No hay ventas registradas</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {seccionActual === 'registro' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Registro de Actividades</h2>
            <div className="relative mb-4">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar transacciones..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            {renderTransaccionesList()}
          </div>
        )}
      </main>
    </div>
  )
}