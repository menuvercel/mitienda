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
  agregarProducto,
  editarProducto,
  entregarProducto,
  eliminarProducto
} from '../../services/api'
import ProductDialog from '@/components/ProductDialog'
import { Producto, Vendedor } from '@/types';
import { uploadImage } from '../../services/api';


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
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [inventario, setInventario] = useState<Producto[]>([]);

  const fetchVendedores = useCallback(async () => {
    try {
      const data = await getVendedores();
      setVendedores(data);
      console.log('Lista de vendedores cargada:', data);
    } catch (error) {
      console.error('Error al obtener vendedores:', error);
      alert('No se pudieron cargar los vendedores. Por favor, inténtalo de nuevo.');
    }
  }, []);

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
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<string | null>(null)
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

  const handleVerProductos = async (vendedorId: string) => {
    if (!vendedorId) {
      console.error('ID del vendedor es undefined');
      return;
    }
    try {
      const productos = await getProductosVendedor(vendedorId);
      setProductosVendedor(productos);
      setVendedorSeleccionado(vendedorId);
    } catch (error) {
      console.error('Error al obtener productos del vendedor:', error);
      alert('No se pudieron cargar los productos del vendedor. Por favor, inténtalo de nuevo.');
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
      const formData = new FormData();
      formData.append('nombre', newProduct.nombre);
      formData.append('precio', newProduct.precio.toString());
      formData.append('cantidad', newProduct.cantidad.toString());
      
      if (newProduct.foto) {
        formData.append('foto', newProduct.foto);
      }
  
      await agregarProducto(formData);
      setShowAddProductModal(false);
      setNewProduct({
        nombre: '',
        precio: 0,
        cantidad: 0,
        foto: null
      });
      await fetchInventario();
    } catch (error) {
      console.error('Error al agregar producto:', error);
    }
  };

  const handleProductDelivery = async (productId: string, vendedorId: string, cantidad: number) => {
    try {
      console.log(`Entregando producto: ID=${productId}, VendedorID=${vendedorId}, Cantidad=${cantidad}`);
      await entregarProducto(productId, vendedorId, cantidad);
      
      setInventario(prevInventario => 
        prevInventario.map(producto => 
          producto.id === productId 
            ? { ...producto, cantidad: producto.cantidad - cantidad }
            : producto
        )
      );
  
      if (vendedorSeleccionado === vendedorId) {
        const updatedProductos = await getProductosVendedor(vendedorId);
        setProductosVendedor(updatedProductos);
      }
  
      setSelectedProduct(null);
  
      alert('Producto entregado exitosamente');
    } catch (error) {
      console.error('Error entregando producto:', error);
      alert(`Error al entregar producto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

// src/app/pages/AlmacenPage/page.tsx

const handleEditProduct = async (editedProduct: Producto, foto: File | null) => {
  try {
    await editarProducto(editedProduct.id, editedProduct, foto || undefined);
    await fetchInventario();
    setSelectedProduct(null);
  } catch (error) {
    console.error('Error editing product:', error);
    alert('Error al editar el producto. Por favor, inténtelo de nuevo.');
  }
};

  const handleDeleteProduct = async (productId: string) => {
    try {
      await eliminarProducto(productId);
      await fetchInventario();
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar el producto. Por favor, inténtelo de nuevo.');
    }
  }

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedores.map((vendedor) => (
                    <TableRow key={vendedor.id}>
                      <TableCell>{vendedor.nombre}</TableCell>
                      <TableCell>
                        <Button onClick={() => handleVerProductos(vendedor.id)}>Ver Productos</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                          console.error(`Error loading image for ${producto.nombre}:`, e);
                          e.currentTarget.src = '/placeholder.svg';
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

      <Dialog open={!!vendedorSeleccionado} onOpenChange={() => setVendedorSeleccionado(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Productos del Vendedor</DialogTitle>
          </DialogHeader>
          <Table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foto</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosVendedor.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell>
                      {producto.foto ? (
                        <Image
                          src={producto.foto}
                          alt={producto.nombre}
                          width={50}
                          height={50}
                          className="object-cover rounded"
                          onError={(e) => {
                            console.error(`Error loading image for ${producto.nombre}`);
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-500 text-xs">Sin imagen</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{producto.nombre}</TableCell>
                    <TableCell>${producto.precio}</TableCell>
                    <TableCell>{producto.cantidad}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Table>
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
    </div>
  )
}