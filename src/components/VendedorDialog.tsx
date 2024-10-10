import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Vendedor, Producto, Venta, Transaccion } from '@/types'

interface VendorDialogProps {
  vendor: Vendedor
  onClose: () => void
  onEdit: (editedVendor: Vendedor) => Promise<void>
  productos: Producto[]
  ventas: Venta[]
  transacciones: Transaccion[]
}

export default function VendorDialog({ vendor, onClose, onEdit, productos, ventas, transacciones }: VendorDialogProps) {
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

  const productosDisponibles = productos.filter(p => p.cantidad > 0)
  const productosAgotados = productos.filter(p => p.cantidad === 0)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] h-[90vh] flex flex-col">
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
                <div className="flex gap-2">
                  <Button onClick={handleEdit}>Guardar cambios</Button>
                  <Button variant="outline" onClick={() => setMode('view')}>Cancelar</Button>
                </div>
              </>
            ) : mode === 'productos' ? (
              <>
                <h3 className="text-lg font-semibold">Productos Disponibles</h3>
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
                <h3 className="text-lg font-semibold mt-4">Productos Agotados</h3>
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
              </>
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
                      <TableCell>${venta.total}</TableCell>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacciones.map(transaccion => (
                    <TableRow key={transaccion.id}>
                      <TableCell>{new Date(transaccion.fecha).toLocaleDateString()}</TableCell>
                      <TableCell>{transaccion.producto}</TableCell>
                      <TableCell>{transaccion.cantidad}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <>
                <p>Teléfono: {vendor.telefono}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => setMode('edit')}>Editar</Button>
                  <Button onClick={() => setMode('productos')}>Productos</Button>
                  <Button onClick={() => setMode('ventas')}>Ventas</Button>
                  <Button onClick={() => setMode('transacciones')}>Transacciones</Button>
                </div>
              </>
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