import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image'
import { Vendedor, Producto, Venta, Transaccion } from '@/types'
import { X, DollarSign, ArrowLeftRight } from 'lucide-react'

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

  const renderProductList = (products: Producto[]) => (
    <div className="overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="inline-flex space-x-4 px-4">
        {products.map(producto => (
          <div key={producto.id} className="flex flex-col items-center bg-white p-4 rounded-lg shadow min-w-[200px]">
            <Image
              src={producto.foto || '/placeholder.svg'}
              alt={producto.nombre}
              width={100}
              height={100}
              className="object-cover rounded mb-2"
            />
            <h3 className="font-bold text-sm">{producto.nombre}</h3>
            <p className="text-sm">${formatPrice(producto.precio)}</p>
            <p className="text-sm">Cantidad: {producto.cantidad}</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteProduct(producto.id, producto.cantidad)}
              className="mt-2"
            >
              Eliminar
            </Button>
          </div>
        ))}
      </div>
    </div>
  )

  const renderVentasList = () => (
    <div className="overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="inline-flex space-x-4 px-4">
        {ventas.map(venta => (
          <div key={venta._id} className="flex flex-col items-center bg-white p-4 rounded-lg shadow min-w-[200px]">
            <DollarSign className="w-10 h-10 text-green-500 mb-2" />
            <p className="text-sm font-bold">{venta.producto_nombre}</p>
            <p className="text-sm">{new Date(venta.fecha).toLocaleDateString()}</p>
            <p className="text-sm">Cantidad: {venta.cantidad}</p>
            <p className="text-sm font-bold mt-2">Total: ${formatPrice(venta.total)}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderTransaccionesList = () => (
    <div className="overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="inline-flex space-x-4 px-4">
        {transacciones.map(transaccion => (
          <div key={transaccion.id} className={`flex flex-col items-center bg-white p-4 rounded-lg shadow min-w-[200px] ${
            transaccion.tipo === 'Baja'
              ? 'bg-red-100'
              : transaccion.desde === 'Almacen' && transaccion.hacia === 'Vendedor'
              ? 'bg-green-100'
              : transaccion.desde === 'Vendedor' && transaccion.hacia === 'Almacen'
              ? 'bg-yellow-100'
              : ''
          }`}>
            <ArrowLeftRight className="w-10 h-10 text-blue-500 mb-2" />
            <p className="text-sm font-bold">{transaccion.producto}</p>
            <p className="text-sm">{new Date(transaccion.fecha).toLocaleDateString()}</p>
            <p className="text-sm">Cantidad: {transaccion.cantidad}</p>
            <p className="text-sm">De: {transaccion.desde}</p>
            <p className="text-sm">A: {transaccion.hacia}</p>
            <p className="text-sm font-bold mt-2">{transaccion.tipo || 'Normal'}</p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-full sm:max-w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4">
          <DialogTitle>{vendor.nombre}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
          {mode === 'edit' ? (
            <div className="p-4 space-y-4">
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="disponibles">Disponibles</TabsTrigger>
                <TabsTrigger value="agotados">Agotados</TabsTrigger>
              </TabsList>
              <TabsContent value="disponibles">
                {renderProductList(productos.filter(p => p.cantidad > 0))}
              </TabsContent>
              <TabsContent value="agotados">
                {renderProductList(productos.filter(p => p.cantidad === 0))}
              </TabsContent>
            </Tabs>
          ) : mode === 'ventas' ? (
            <div className="p-4">
              <h2 className="text-lg font-bold mb-4">Ventas</h2>
              {renderVentasList()}
            </div>
          ) : mode === 'transacciones' ? (
            <div className="p-4">
              <h2 className="text-lg font-bold mb-4">Transacciones</h2>
              {renderTransaccionesList()}
            </div>
          ) : (
            <div className="flex flex-col space-y-2 p-4">
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