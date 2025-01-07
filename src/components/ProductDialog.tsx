import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Image from 'next/image'
import { Producto, Vendedor, Parametro } from '@/types'
import { Plus, Minus } from 'lucide-react'

interface ProductDialogProps {
  product: Producto
  onClose: () => void
  vendedores: Vendedor[]
  onEdit: (editedProduct: Producto, foto: File | null) => Promise<void>
  onDelete: (productId: string, vendedorId: string, cantidad: number) => Promise<void>
  onDeliver: (
    productId: string,
    vendedorId: string,
    cantidadTotal: number,
    parametros: { nombre: string; cantidad: number }[]
  ) => Promise<void>
}


export default function ProductDialog({
  product,
  onClose,
  vendedores,
  onEdit,
  onDelete,
  onDeliver
}: ProductDialogProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'deliver'>('view')
  const [editedProduct, setEditedProduct] = useState<Producto>({
    ...product,
    tieneParametros: product.tiene_parametros,
    tiene_parametros: product.tiene_parametros,
    parametros: product.parametros || []
  })

  useEffect(() => {
    console.log('Product recibido:', product)
    console.log('Estado editedProduct:', editedProduct)
  }, [product, editedProduct])

  const [newImage, setNewImage] = useState<File | null>(null)
  const [selectedVendedor, setSelectedVendedor] = useState<string | null>(null)
  const [deliveryQuantity, setDeliveryQuantity] = useState<number>(0)
  const [deliveryStep, setDeliveryStep] = useState<1 | 2>(1)
  const [parameterQuantities, setParameterQuantities] = useState<{ [key: string]: number }>({})
  const [totalDeliveryQuantity, setTotalDeliveryQuantity] = useState(0)
  const [simpleDeliveryQuantity, setSimpleDeliveryQuantity] = useState<number>(0)



  useEffect(() => {
    setEditedProduct({
      ...product,
      tieneParametros: product.tiene_parametros,
      tiene_parametros: product.tiene_parametros,
      parametros: product.parametros || []
    })
  }, [product])


  const handleParameterQuantityChange = (paramName: string, value: number) => {
    const newQuantities = {
      ...parameterQuantities,
      [paramName]: value
    }
    setParameterQuantities(newQuantities)

    // Actualizar el total
    const newTotal = Object.values(newQuantities).reduce((sum, qty) => sum + qty, 0)
    setTotalDeliveryQuantity(newTotal)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditedProduct(prev => ({
      ...prev,
      [name]: name === 'precio' || name === 'cantidad' ? Number(value) : value,
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewImage(e.target.files[0])
    }
  }

  const handleParametroChange = (index: number, field: 'nombre' | 'cantidad', value: string) => {
    setEditedProduct(prev => {
      const newParametros = [...(prev.parametros || [])]
      newParametros[index] = {
        ...newParametros[index],
        [field]: field === 'cantidad' ? Number(value) : value
      }
      return {
        ...prev,
        parametros: newParametros
      }
    })
  }

  const addParametro = () => {
    setEditedProduct(prev => ({
      ...prev,
      parametros: [...(prev.parametros || []), { nombre: '', cantidad: 0 }]
    }))
  }

  const removeParametro = (index: number) => {
    setEditedProduct(prev => ({
      ...prev,
      parametros: prev.parametros?.filter((_, i) => i !== index)
    }))
  }

  const handleTieneParametrosChange = (checked: boolean) => {
    setEditedProduct(prev => ({
      ...prev,
      tieneParametros: checked,
      tiene_parametros: checked, // Importante mantener ambas propiedades
      parametros: checked ? (prev.parametros?.length ? prev.parametros : [{ nombre: '', cantidad: 0 }]) : []
    }))
  }


  const handleEdit = async () => {
    const updatedProduct: Producto = {
      ...editedProduct,
      // Aseguramos que tiene_parametros se mantenga sincronizado con tieneParametros
      tiene_parametros: editedProduct.tieneParametros || false,
      tieneParametros: editedProduct.tieneParametros || false,
      // Si tiene parámetros, aseguramos que se incluyan
      parametros: editedProduct.tieneParametros ? editedProduct.parametros : []
    }

    // Actualizar la cantidad total si tiene parámetros
    if (updatedProduct.tiene_parametros && updatedProduct.parametros) {
      updatedProduct.cantidad = updatedProduct.parametros.reduce((sum, param) => sum + param.cantidad, 0)
    }

    // Verificación antes de enviar
    console.log('Producto a actualizar:', updatedProduct)

    await onEdit(updatedProduct, newImage)
    setMode('view')
    setNewImage(null)
  }


  const handleDeliver = async () => {
    if (!selectedVendedor) {
      alert('Por favor seleccione un vendedor')
      return
    }

    const cantidadAEntregar = product.tiene_parametros ? totalDeliveryQuantity : simpleDeliveryQuantity

    if (cantidadAEntregar === 0) {
      alert('Por favor ingrese las cantidades a entregar')
      return
    }

    if (cantidadAEntregar > getTotalCantidad()) {
      alert('La cantidad total excede el stock disponible')
      return
    }

    try {
      const parametrosEntrega = product.tiene_parametros && product.parametros ?
        product.parametros.map(param => ({
          nombre: param.nombre,
          cantidad: parameterQuantities[param.nombre] || 0
        })) :
        []

      await onDeliver(
        product.id,
        selectedVendedor,
        cantidadAEntregar,
        parametrosEntrega
      )

      setDeliveryStep(1)
      setSelectedVendedor(null)
      setParameterQuantities({})
      setTotalDeliveryQuantity(0)
      setSimpleDeliveryQuantity(0)
      setMode('view')
    } catch (error) {
      console.error('Error al entregar producto:', error)
      alert(error instanceof Error ? error.message : 'Error desconocido al entregar producto')
    }
  }



  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      await onDelete(product.id, '', getTotalCantidad())
      onClose()
    }
  }

  const handleVendedorSelect = (vendedorId: string) => {
    setSelectedVendedor(vendedorId)
  }

  const getTotalCantidad = () => {
    if ((product.tiene_parametros || product.tieneParametros) && product.parametros) {
      return product.parametros.reduce((sum, param) => sum + param.cantidad, 0)
    }
    return product.cantidad
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.nombre}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center">
            <Image
              src={newImage ? URL.createObjectURL(newImage) : (product.foto || '/placeholder.svg')}
              alt={product.nombre}
              width={200}
              height={200}
              className="object-cover rounded"
            />
          </div>

          {mode === 'edit' ? (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    name="nombre"
                    value={editedProduct.nombre}
                    onChange={handleInputChange}
                    placeholder="Nombre del producto"
                  />
                </div>

                <div>
                  <Label>Precio</Label>
                  <Input
                    name="precio"
                    type="number"
                    value={editedProduct.precio}
                    onChange={handleInputChange}
                    placeholder="Precio"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tieneParametros"
                    checked={editedProduct.tieneParametros}
                    onCheckedChange={handleTieneParametrosChange}
                  />
                  <Label htmlFor="tieneParametros">Tiene parámetros</Label>
                </div>

                {editedProduct.tieneParametros ? (
                  <div className="space-y-4">
                    <Label>Parámetros</Label>
                    {(editedProduct.parametros || []).map((param, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={param.nombre}
                          onChange={(e) => handleParametroChange(index, 'nombre', e.target.value)}
                          placeholder="Nombre del parámetro"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={param.cantidad}
                          onChange={(e) => handleParametroChange(index, 'cantidad', e.target.value)}
                          placeholder="Cantidad"
                          className="w-24"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeParametro(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={addParametro}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar parámetro
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Label>Cantidad</Label>
                    <Input
                      name="cantidad"
                      type="number"
                      value={editedProduct.cantidad}
                      onChange={handleInputChange}
                      placeholder="Cantidad"
                    />
                  </div>
                )}

                <Input
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                />

                <div className="flex justify-between gap-2">
                  <Button onClick={handleEdit} className="flex-1">Guardar cambios</Button>
                  <Button variant="outline" onClick={() => setMode('view')} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            </>
          ) : mode === 'deliver' ? (
            <>
              {deliveryStep === 1 ? (
                <div className="space-y-4">
                  <Label>Seleccionar vendedor:</Label>
                  <div className="grid gap-2">
                    {vendedores.map(vendedor => (
                      <Button
                        key={vendedor.id}
                        onClick={() => {
                          handleVendedorSelect(vendedor.id)
                          setDeliveryStep(2)
                        }}
                        variant={selectedVendedor === vendedor.id ? 'default' : 'outline'}
                        className="w-full"
                      >
                        {vendedor.nombre}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setMode('view')}
                    className="w-full mt-4"
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Cantidades a entregar</h3>
                    <div className="text-sm">
                      <span className="font-medium">Total: </span>
                      <span className={`${(product.tiene_parametros ? totalDeliveryQuantity : simpleDeliveryQuantity) > getTotalCantidad()
                          ? 'text-red-500'
                          : 'text-green-600'
                        }`}>
                        {product.tiene_parametros ? totalDeliveryQuantity : simpleDeliveryQuantity}
                      </span>
                    </div>
                  </div>

                  {product.tiene_parametros && product.parametros ? (
                    // Renderizado para productos con parámetros
                    product.parametros.map((param, index) => (
                      <div key={index} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-medium">{param.nombre}</Label>
                          <span className="text-xs text-gray-500">
                            Disponible: {param.cantidad}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            value={parameterQuantities[param.nombre] || 0}
                            onChange={(e) => handleParameterQuantityChange(
                              param.nombre,
                              Math.min(Number(e.target.value), param.cantidad)
                            )}
                            min={0}
                            max={param.cantidad}
                            className="w-full"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    // Renderizado para productos sin parámetros
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">Cantidad</Label>
                        <span className="text-xs text-gray-500">
                          Disponible: {product.cantidad}
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={simpleDeliveryQuantity}
                          onChange={(e) => setSimpleDeliveryQuantity(
                            Math.min(Number(e.target.value), product.cantidad)
                          )}
                          min={0}
                          max={product.cantidad}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-2 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDeliveryStep(1)
                        setParameterQuantities({})
                        setTotalDeliveryQuantity(0)
                        setSimpleDeliveryQuantity(0)
                      }}
                      className="flex-1"
                    >
                      Atrás
                    </Button>
                    <Button
                      onClick={handleDeliver}
                      disabled={product.tiene_parametros ?
                        (totalDeliveryQuantity === 0 || totalDeliveryQuantity > getTotalCantidad()) :
                        (simpleDeliveryQuantity === 0 || simpleDeliveryQuantity > getTotalCantidad())
                      }
                      className="flex-1"
                    >
                      Confirmar entrega
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-lg font-medium">Precio: ${product.precio}</p>

                  {(product.tiene_parametros || product.tieneParametros) && product.parametros && product.parametros.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">Parámetros:</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {product.parametros.map((param, index) => (
                          <div
                            key={index}
                            className="p-2 bg-gray-50 rounded-md flex justify-between items-center"
                          >
                            <span className="font-medium">{param.nombre}:</span>
                            <span className="text-gray-600">{param.cantidad}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500">
                        Cantidad total: {getTotalCantidad()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-700">Cantidad disponible: {product.cantidad}</p>
                  )}
                </div>

                <div className="flex justify-between gap-2">
                  <Button onClick={() => setMode('edit')} className="w-full">Editar</Button>
                  <Button onClick={() => setMode('deliver')} className="w-full">Entregar</Button>
                  <Button onClick={handleDelete} variant="destructive" className="w-full">
                    Eliminar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );


}