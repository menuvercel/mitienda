import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image'
import { Vendedor, Producto, Venta, Transaccion } from '@/types'
import { X, DollarSign, ArrowLeftRight, Search } from 'lucide-react'

interface VendorDialogProps {
  vendor: Vendedor
  onClose: () => void
  onEdit: (editedVendor: Vendedor) => Promise<void>
  productos: Producto[]
  transacciones: Transaccion[]
  ventas: Venta[]
  onProductDelete: (productId: string, vendorId: string, cantidad: number) => Promise<void>
}

export default function VendorDialog({ vendor, onClose, onEdit, productos, transacciones, ventas, onProductDelete }: VendorDialogProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'productos' | 'ventas' | 'transacciones'>('view')
  const [editedVendor, setEditedVendor] = useState(vendor)
  const [searchTerm, setSearchTerm] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditedVendor(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleEdit = async () => {
    await onEdit(editedVendor)
    setMode('view')
  }

  const handleDeleteProduct = async (productId: string, cantidad: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      await onProductDelete(productId, vendor.id, cantidad)
    }
  }

  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)
  }

  const filterItems = useCallback((items: any[], term: string) => {
    return items.filter(item => 
      Object.values(item).some(value => 
        value && value.toString().toLowerCase().includes(term.toLowerCase())
      )
    )
  }, [])

  const renderProductList = (products: Producto[]) => {
    const filteredProducts = filterItems(products, searchTerm)
    return (
      <div className="space-y-2">
        {filteredProducts.map(producto => (
          <div key={producto.id} className="flex items-center bg-white p-4 rounded-lg shadow">
            <Image
              src={producto.foto || '/placeholder.svg'}
              alt={producto.nombre}
              width={50}
              height={50}
              className="object-cover rounded mr-4"
            />
            <div className="flex-grow">
              <h3 className="font-bold">{producto.nombre}</h3>
              <p className="text-sm">${formatPrice(producto.precio)} - Cantidad: {producto.cantidad}</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteProduct(producto.id, producto.cantidad)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    )
  }

  const renderVentasList = () => {
    const filteredVentas = filterItems(ventas, searchTerm)
    return (
      <div className="space-y-2">
        {filteredVentas.map(venta => (
          <div key={venta._id} className="flex items-center bg-white p-4 rounded-lg shadow">
            <DollarSign className="w-10 h-10 text-green-500 mr-4" />
            <div className="flex-grow">
              <p className="font-bold">{venta.producto_nombre}</p>
              <p className="text-sm">{new Date(venta.fecha).toLocaleDateString()}</p>
              <p className="text-sm">Cantidad: {venta.cantidad} - Total: ${formatPrice(venta.total)}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderTransaccionesList = () => {
    const filteredTransacciones = filterItems(transacciones, searchTerm)
    return (
      <div className="space-y-2">
        {filteredTransacciones.map(transaccion => (
          <div key={transaccion.id} className={`flex items-center bg-white p-2 rounded-lg shadow ${
            transaccion.tipo === 'Baja'
              ? 'border-l-4 border-red-500'
              : transaccion.desde === 'Almacen' && transaccion.hacia === 'Vendedor'
              ? 'border-l-4 border-green-500'
              : transaccion.desde === 'Vendedor' && transaccion.hacia === 'Almacen'
              ? 'border-l-4 border-yellow-500'
              : 'border-l-4 border-blue-500'
          }`}>
            <ArrowLeftRight className="w-6 h-6 text-blue-500 mr-2 flex-shrink-0" />
            <div className="flex-grow overflow-hidden">
              <p className="font-bold text-sm truncate">{transaccion.producto}</p>
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>{new Date(transaccion.fecha).toLocaleDateString()}</span>
                <span>Cant: {transaccion.cantidad}</span>
              </div>
              <p className="text-xs font-semibold">{transaccion.tipo || 'Normal'}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-full sm:max-w-[90vw] h-[90vh] flex flex-col p-0">
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
              <Button onClick={handleEdit}>Guardar cambios</Button>
            </div>
          ) : mode === 'productos' ? (
            <Tabs defaultValue="disponibles" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="disponibles">Disponibles</TabsTrigger>
                <TabsTrigger value="agotados">Agotados</TabsTrigger>
              </TabsList>
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
              <TabsContent value="disponibles">
                {renderProductList(productos.filter(p => p.cantidad > 0))}
              </TabsContent>
              <TabsContent value="agotados">
                {renderProductList(productos.filter(p => p.cantidad === 0))}
              </TabsContent>
            </Tabs>
          ) : mode === 'ventas' ? (
            <div>
              <h2 className="text-lg font-bold mb-4">Ventas</h2>
              <div className="relative mb-4">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar ventas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {renderVentasList()}
            </div>
          ) : mode === 'transacciones' ? (
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
          <div className="p-4">
            <Button onClick={() => setMode('view')}>Volver</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}