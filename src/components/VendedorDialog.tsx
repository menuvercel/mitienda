import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image'
import { Vendedor, Producto, Venta, Transaccion } from '@/types'
import { getVentasDia } from '@/app/services/api'
import { X } from 'lucide-react'

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

  const renderProductTable = (products: Producto[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Foto</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Cantidad</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map(producto => (
          <TableRow key={producto.id}>
            <TableCell>
              <Image
                src={producto.foto || '/placeholder.svg'}
                alt={producto.nombre}
                width={50}
                height={50}
                className="object-cover rounded"
              />
            </TableCell>
            <TableCell>{producto.nombre}</TableCell>
            <TableCell>${producto.precio}</TableCell>
            <TableCell>{producto.cantidad}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteProduct(producto.id, producto.cantidad)}
                aria-label={`Eliminar ${producto.nombre}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{vendor.nombre}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-grow">
          <div className="grid gap-4 py-4">
            {mode === 'edit' ? (
              <>
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
              </>
            ) : mode === 'productos' ? (
              <Tabs defaultValue="disponibles" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="disponibles">Disponibles</TabsTrigger>
                  <TabsTrigger value="agotados">Agotados</TabsTrigger>
                </TabsList>
                <TabsContent value="disponibles">
                  {renderProductTable(productos.filter(p => p.cantidad > 0))}
                </TabsContent>
                <TabsContent value="agotados">
                  {renderProductTable(productos.filter(p => p.cantidad === 0))}
                </TabsContent>
              </Tabs>
            ) : mode === 'ventas' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map(venta => (
                    <TableRow key={venta._id}>
                      <TableCell>{new Date(venta.fecha).toLocaleDateString()}</TableCell>
                      <TableCell>{venta.producto_nombre}</TableCell>
                      <TableCell>{venta.cantidad}</TableCell>
                      <TableCell>${venta.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : mode === 'transacciones' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hacia</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacciones.map(transaccion => (
                    <TableRow 
                      key={transaccion.id}
                      className={
                          transaccion.tipo === 'Baja'
                          ? 'bg-red-100'
                          : transaccion.desde === 'Almacen' && transaccion.hacia === 'Vendedor'
                          ? 'bg-green-100'
                          : transaccion.desde === 'Vendedor' && transaccion.hacia === 'Almacen'
                          ? 'bg-yellow-100'
                          : ''
                      }
                    >
                      <TableCell>{new Date(transaccion.fecha).toLocaleDateString()}</TableCell>
                      <TableCell>{transaccion.producto}</TableCell>
                      <TableCell>{transaccion.cantidad}</TableCell>
                      <TableCell>{transaccion.desde}</TableCell>
                      <TableCell>{transaccion.hacia}</TableCell>
                      <TableCell>{transaccion.tipo || 'Normal'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col space-y-2">
                <Button onClick={() => setMode('edit')}>Editar</Button>
                <Button onClick={() => setMode('productos')}>Productos</Button>
                <Button onClick={() => setMode('ventas')}>Ventas</Button>
                <Button onClick={() => setMode('transacciones')}>Transacciones</Button>
              </div>
            )}
          </div>
        </ScrollArea>
        {mode !== 'view' && (
          <div className="mt-4">
            <Button onClick={() => setMode('view')}>Volver</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}