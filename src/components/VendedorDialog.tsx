import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import Image from 'next/image'
import { Vendedor, Producto, Venta, Transaccion } from '@/types'
import { Minus, DollarSign, ArrowLeftRight, Search, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface VendorDialogProps {
  vendor: Vendedor
  onClose: () => void
  onEdit: (editedVendor: Vendedor) => Promise<void>
  productos: Producto[]
  transacciones: Transaccion[]
  ventas: Venta[]
  onProductReduce: (productId: string, vendorId: string, cantidad: number) => Promise<void>
}

export default function VendorDialog({ vendor, onClose, onEdit, productos, transacciones, ventas, onProductReduce }: VendorDialogProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'productos' | 'ventas' | 'transacciones'>('view')
  const [editedVendor, setEditedVendor] = useState(vendor)
  const [searchTerm, setSearchTerm] = useState('')
  const [reduceDialogOpen, setReduceDialogOpen] = useState(false)
  const [productToReduce, setProductToReduce] = useState<Producto | null>(null)
  const [quantityToReduce, setQuantityToReduce] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditedVendor(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleEdit = async () => {
    try {
      setIsLoading(true)
      await onEdit(editedVendor)
      setMode('view')
      toast({
        title: "Éxito",
        description: "Los datos del vendedor se han actualizado correctamente.",
      })
    } catch (error) {
      console.error('Error al editar el vendedor:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar los datos del vendedor. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReduceProduct = (product: Producto) => {
    setProductToReduce(product)
    setQuantityToReduce(0)
    setReduceDialogOpen(true)
  }

  const confirmReduce = async () => {
    if (productToReduce && quantityToReduce > 0) {
      setIsLoading(true)
      try {
        const productId = productToReduce.id.toString()
        await onProductReduce(productId, vendor.id, quantityToReduce)
        setReduceDialogOpen(false)
        setProductToReduce(null)
        setQuantityToReduce(0)
        toast({
          title: "Éxito",
          description: "La cantidad del producto se ha reducido correctamente.",
        })
      } catch (error) {
        console.error('Error al reducir la cantidad del producto:', error)
        toast({
          title: "Error",
          description: "No se pudo reducir la cantidad del producto. Por favor, inténtelo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
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
              variant="outline"
              size="sm"
              onClick={() => handleReduceProduct(producto)}
              disabled={isLoading}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    )
  }

  const VentaDesplegable = ({ venta }: { venta: Venta }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <TableRow className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <TableCell>{new Date(venta.fecha).toLocaleDateString()}</TableCell>
          <TableCell>${formatPrice(venta.total)}</TableCell>
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
                <span>Precio unitario: ${formatPrice(venta.precio_unitario)}</span>
              </div>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  };

  const renderVentasList = () => {
    const filteredVentas = filterItems(ventas, searchTerm)
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Total</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredVentas.length > 0 ? (
            filteredVentas.map(venta => (
              <VentaDesplegable key={venta._id} venta={venta} />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center">No hay ventas registradas</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    )
  }

  const renderTransaccionesList = () => {
    const filteredTransacciones = filterItems(transacciones, searchTerm)
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
                  <span>Cant: {transaccion.cantidad}</span>
                </div>
                <p className="text-xs font-semibold">{transactionType}</p>
                <p className="text-xs">De: {transaccion.desde} - A: {transaccion.hacia}</p>
              </div>
            </div>
          )
        })}
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
              <Button onClick={handleEdit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
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

      <Dialog open={reduceDialogOpen} onOpenChange={setReduceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reducir cantidad de producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Especifique la cantidad a reducir para {productToReduce?.nombre}</p>
            <Input
              type="number"
              value={quantityToReduce}
              onChange={(e) => setQuantityToReduce(Math.max(0, Math.min(Number(e.target.value), productToReduce?.cantidad || 0)))}
              max={productToReduce?.cantidad}
              min={0}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReduceDialogOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button onClick={confirmReduce} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}