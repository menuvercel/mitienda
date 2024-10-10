'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  eliminarProducto,
  getTransaccionesVendedor,
  editarVendedor
} from '../../services/api'
import ProductDialog from '@/components/ProductDialog'
import VendorDialog from '@/components/VendedorDialog'
import { Producto, Vendedor, Venta, Transaccion } from '@/types'

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
      console.log('Lista de vendedores cargada:', data)
    } catch (error) {
      console.error('Error al obtener vendedores:', error)
      alert('No se pudieron cargar los vendedores. Por favor, inténtalo de nuevo.')
    }
  }, [])

  const fetchInventario = useCallback(async () => {
    try {
      const data = await getInventario()
      setInventario(data as Producto[])
    } catch (error) {
      console.error('Error al obtener inventario:', error)
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        if (user.rol === 'Almacen') {
          setIsAuthenticated(true)
          await Promise.all([fetchVendedores(), fetchInventario()])
        } else {
          router.push('/pages/LoginPage')
        }
      } catch (error) {
        console.error('Error de autenticación:', error)
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
  const [transaccionesVendedor, setTransaccionesVendedor] = useState<Transaccion[]>([])
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<Vendedor | null>(null)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [newProduct, setNewProduct] = useState<NewProduct>({
    nombre: '',
    precio: 0,
    cantidad: 0,
    foto: null
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)

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

  const handleVerVendedor = async (vendedor: Vendedor) => {
    try {
      const [productos, ventas, transacciones] = await Promise.all([
        getProductosVendedor(vendedor.id),
        getVentasVendedor(vendedor.id),
        getTransaccionesVendedor(vendedor.id)
      ]);
      setProductosVendedor(productos);
      setVentasVendedor(ventas);
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
    } else {
      setNewProduct({ ...newProduct, [name]: type === 'number' ? parseFloat(value) : value })
    }
  }

  const handleAddProduct = async () => {
    try {
      const formData = new FormData()
      formData.append('nombre', newProduct.nombre)
      formData.append('precio', newProduct.precio.toString())
      formData.append('cantidad', newProduct.cantidad.toString())
      
      if (newProduct.foto) {
        formData.append('foto', newProduct.foto)
      }
  
      await agregarProducto(formData)
      setShowAddProductModal(false)
      setNewProduct({
        nombre: '',
        precio: 0,
        cantidad: 0,
        foto: null
      })
      await fetchInventario()
    } catch (error) {
      console.error('Error al agregar producto:', error)
    }
  }

  const handleProductDelivery = async (productId: string, vendedorId: string, cantidad: number) => {
    try {
      console.log(`Entregando producto: ID=${productId}, VendedorID=${vendedorId}, Cantidad=${cantidad}`)
      await entregarProducto(productId, vendedorId, cantidad)
      
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

  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await eliminarProducto(productId)
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Server error details:', errorData)
        throw new Error(errorData.error || 'Error desconocido al eliminar el producto')
      }
      await fetchInventario()
      setSelectedProduct(null)
      alert('Producto eliminado exitosamente')
    } catch (error) {
      console.error('Error deleting product:', error)
      if (error instanceof Error) {
        alert(`Error al eliminar el producto: ${error.message}`)
      } else {
        alert('Error desconocido al eliminar el producto')
      }
    }
  }

  const handleEditVendedor = async (editedVendor: Vendedor) => {
    try {
      await editarVendedor(editedVendor.id, editedVendor);
      await fetchVendedores();
      setVendedorSeleccionado(null);
      alert('Vendedor actualizado exitosamente');
    } catch (error) {
      console.error('Error editing vendor:', error);
      if (error instanceof Error) {
        alert(`Error al editar el vendedor: ${error.message}`);
      } else {
        alert('Error desconocido al editar el vendedor');
      }
    }
  };

  const filteredInventario = inventario.filter((producto) =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAuthenticated) {
    return <div>Cargando...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Panel de Almacén</h1>
      <Button onClick={() => setShowRegisterModal(true)} className="mb-4 mr-2">
        Agregar Usuario
      </Button>
      <Button onClick={() => setShowAddProductModal(true)} className="mb-4">
        Agregar Producto
      </Button>
      <Tabs defaultValue="vendedores">
        <TabsList>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="inventario">Productos en Almacen</TabsTrigger>
        </TabsList>
        <TabsContent value="vendedores">
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
        </TabsContent>
        <TabsContent value="inventario">
          <Card>
            <CardHeader>
              <CardTitle>Lista de productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="space-y-2">
                {filteredInventario.map((producto) => (
                  <Button
                    key={producto.id}
                    onClick={() => setSelectedProduct(producto)}
                    className="w-full h-auto p-2 flex items-center text-left bg-white hover:bg-gray-100 border border-gray-200 rounded-lg shadow-sm transition-colors"
                    variant="ghost"
                  >
                    {producto.foto ? (
                      <Image
                        src={producto.foto}
                        alt={producto.nombre}
                        width={50}
                        height={50}
                        className="object-cover rounded mr-4"
                        onError={(e) => {
                          console.error(`Error loading image for ${producto.nombre}:`, e)
                          e.currentTarget.src = '/placeholder.svg'
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center mr-4">
                        <span className="text-gray-500 text-xs">Sin imagen</span>
                      </div>
                    )}
                    <div className="flex-grow">
                      <span className="font-semibold text-gray-800">{producto.nombre}</span>
                      <div className="text-sm text-gray-600">
                        <span className="mr-4">Precio: ${producto.precio}</span>
                        <span>Cantidad: {producto.cantidad}</span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {selectedProduct && (
        <ProductDialog
          product={{...selectedProduct, foto: selectedProduct.foto || ''}}
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
          transacciones={transaccionesVendedor}
        />
      )}
    </div>
  )
}