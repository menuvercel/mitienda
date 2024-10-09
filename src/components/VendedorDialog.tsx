import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Vendedor, Producto, Venta, Transaccion } from '@/types'

interface VendorDialogProps {
  vendor: Vendedor
  onClose: () => void
  onEdit: (editedVendor: Vendedor) => Promise<void>
  productos: Producto[]
  ventas: Venta[]
  transaccion: Transaccion[]
}

export default function VendorDialog({ vendor, onClose, onEdit, productos, ventas, transaccion }: VendorDialogProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
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

  const productosDisponibles = productos.filter(p => p.cantidad > 0)
  const productosAgotados = productos.filter(p => p.cantidad === 0)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{vendor.nombre}</DialogTitle>
        </DialogHeader>
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
              <Button variant="outline" onClick={() => setMode('view')}>Cancelar</Button>
            </>
          ) : (
            <>
              <p>Teléfono: {vendor.telefono}</p>
              <Button onClick={() => setMode('edit')}>Editar</Button>
            </>
          )}

          <Tabs defaultValue="disponibles" className="w-full">
            <TabsList>
              <TabsTrigger value="disponibles">Productos Disponibles</TabsTrigger>
              <TabsTrigger value="agotados">Productos Agotados</TabsTrigger>
              <TabsTrigger value="ventas">Ventas</TabsTrigger>
              <TabsTrigger value="transaccion">Transacciones</TabsTrigger>
            </TabsList>
            <TabsContent value="disponibles">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosDisponibles.map(producto => (
                    <TableRow key={producto.id}>
                      <TableCell>{producto.nombre}</TableCell>
                      <TableCell>${producto.precio}</TableCell>
                      <TableCell>{producto.cantidad}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="agotados">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosAgotados.map(producto => (
                    <TableRow key={producto.id}>
                      <TableCell>{producto.nombre}</TableCell>
                      <TableCell>${producto.precio}</TableCell>
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
                      <TableCell>${venta.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="entregas">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaccion.map(transaccion => (
                    <TableRow key={transaccion.id}>
                      <TableCell>{new Date(transaccion.fecha).toLocaleDateString()}</TableCell>
                      <TableCell>{transaccion.producto}</TableCell>
                      <TableCell>{transaccion.cantidad}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}