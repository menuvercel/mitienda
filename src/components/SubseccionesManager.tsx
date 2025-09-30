'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Seccion, Subseccion, Producto } from '@/types'
import { PlusCircle, Trash2, Pencil, ChevronRight, ChevronDown, Loader2, Package } from 'lucide-react'
import SubseccionDialog from './SubseccionDialog'
import SubseccionCard from './SubseccionCard'
import ProductSelectionForSubseccionDialog from './ProductSelectionForSubseccionDialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import Image from 'next/image'

interface SubseccionesManagerProps {
  secciones: Seccion[]
  seccionSeleccionada: Seccion | null
  onRefresh: () => void
}

export default function SubseccionesManager({
  secciones,
  seccionSeleccionada,
  onRefresh
}: SubseccionesManagerProps) {
  const [subsecciones, setSubsecciones] = useState<Subseccion[]>([])
  const [subseccionSeleccionada, setSubseccionSeleccionada] = useState<Subseccion | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosEnSubseccion, setProductosEnSubseccion] = useState<Record<string, Producto[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProductos, setIsLoadingProductos] = useState<Record<string, boolean>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [expandedSubsecciones, setExpandedSubsecciones] = useState<Record<string, boolean>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const { toast } = useToast()

  // Cargar subsecciones cuando cambia la sección seleccionada
  useEffect(() => {
    if (seccionSeleccionada) {
      fetchSubsecciones(seccionSeleccionada.id)
    } else {
      setSubsecciones([])
    }
  }, [seccionSeleccionada])

  // Cargar todos los productos disponibles
  useEffect(() => {
    fetchProductos()
  }, [])

  const fetchSubsecciones = async (seccionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/subsecciones?seccion_id=${seccionId}`)
      if (response.ok) {
        const data = await response.json()
        setSubsecciones(data)
      } else {
        console.error('Error al cargar subsecciones')
        toast({
          title: "Error",
          description: "No se pudieron cargar las subsecciones",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar las subsecciones",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProductos = async () => {
    try {
      const response = await fetch('/api/productos')
      if (response.ok) {
        const data = await response.json()
        setProductos(data)
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
    }
  }

  const fetchProductosDeSubseccion = async (subseccionId: string) => {
    setIsLoadingProductos(prev => ({ ...prev, [subseccionId]: true }))
    try {
      const response = await fetch(`/api/subsecciones/${subseccionId}/productos`)
      if (response.ok) {
        const data = await response.json()
        setProductosEnSubseccion(prev => ({ ...prev, [subseccionId]: data }))
        return data
      }
      return []
    } catch (error) {
      console.error('Error al cargar productos de la subsección:', error)
      return []
    } finally {
      setIsLoadingProductos(prev => ({ ...prev, [subseccionId]: false }))
    }
  }

  const handleCreateSubseccion = () => {
    setSubseccionSeleccionada(null)
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  const handleEditSubseccion = (subseccion: Subseccion) => {
    setSubseccionSeleccionada(subseccion)
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDeleteSubseccion = (subseccion: Subseccion) => {
    setSubseccionSeleccionada(subseccion)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteSubseccion = async () => {
    if (!subseccionSeleccionada) return

    try {
      const response = await fetch(`/api/subsecciones/${subseccionSeleccionada.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Subsección eliminada",
          description: "La subsección se ha eliminado correctamente",
        })

        // Actualizar la lista de subsecciones
        if (seccionSeleccionada) {
          fetchSubsecciones(seccionSeleccionada.id)
        }

        onRefresh()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo eliminar la subsección",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar la subsección",
        variant: "destructive"
      })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  const handleSaveSubseccion = async (subseccionData: { nombre: string; foto: string; seccion_id: string }) => {
    try {
      let url = '/api/subsecciones'
      let method = 'POST'

      if (isEditing && subseccionSeleccionada) {
        url = `/api/subsecciones/${subseccionSeleccionada.id}`
        method = 'PUT'
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subseccionData)
      })

      if (response.ok) {
        const data = await response.json()

        toast({
          title: isEditing ? "Subsección actualizada" : "Subsección creada",
          description: isEditing
            ? "La subsección se ha actualizado correctamente"
            : "La subsección se ha creado correctamente",
        })

        // Actualizar la lista de subsecciones
        if (seccionSeleccionada) {
          fetchSubsecciones(seccionSeleccionada.id)
        }

        onRefresh()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error || "Error al guardar la subsección" }
      }
    } catch (error) {
      console.error('Error:', error)
      return { success: false, error: "Ocurrió un error al guardar la subsección" }
    }
  }

  const handleManageProducts = async (subseccion: Subseccion) => {
    setSubseccionSeleccionada(subseccion)
    const productos = await fetchProductosDeSubseccion(subseccion.id)
    setProductosEnSubseccion(prev => ({ ...prev, [subseccion.id]: productos }))
    setIsProductDialogOpen(true)
  }

  const handleSaveProductsToSubseccion = async (productosIds: string[], forzarCambioSeccion: boolean) => {
    if (!subseccionSeleccionada) {
      return { success: false, error: "No hay subsección seleccionada" }
    }

    try {
      const response = await fetch(`/api/subsecciones/${subseccionSeleccionada.id}/productos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productos: productosIds,
          forzarCambioSeccion
        })
      })

      if (response.ok) {
        toast({
          title: "Productos asignados",
          description: "Los productos se han asignado correctamente a la subsección",
        })

        // Actualizar la lista de productos en la subsección
        await fetchProductosDeSubseccion(subseccionSeleccionada.id)

        // Actualizar la lista de subsecciones para actualizar los contadores
        if (seccionSeleccionada) {
          fetchSubsecciones(seccionSeleccionada.id)
        }

        onRefresh()
        return { success: true }
      } else {
        const error = await response.json()

        // Si hay conflicto de secciones, devolver la información para mostrar el diálogo
        if (response.status === 409 && error.requiereForzado) {
          return {
            success: false,
            error: error.error,
            productosConflicto: error.productosConflicto
          }
        }

        return { success: false, error: error.error || "Error al asignar productos" }
      }
    } catch (error) {
      console.error('Error:', error)
      return { success: false, error: "Ocurrió un error al asignar productos" }
    }
  }

  const toggleSubseccionExpand = async (subseccionId: string) => {
    const isExpanded = expandedSubsecciones[subseccionId];

    // Si se está expandiendo y no tenemos los productos cargados, los cargamos
    if (!isExpanded && !productosEnSubseccion[subseccionId]) {
      await fetchProductosDeSubseccion(subseccionId);
    }

    setExpandedSubsecciones(prev => ({
      ...prev,
      [subseccionId]: !isExpanded
    }));
  }

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({
      ...prev,
      [id]: true
    }));
  }

  if (!seccionSeleccionada) {
    return (
      <div className="p-4 text-center text-gray-500">
        Selecciona una sección para gestionar sus subsecciones
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          Subsecciones de {seccionSeleccionada.nombre}
        </h2>
        <Button onClick={handleCreateSubseccion}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nueva Subsección
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : subsecciones.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No hay subsecciones en esta sección
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {subsecciones.map((subseccion) => (
            <div key={subseccion.id} className="border rounded-lg overflow-hidden">
              <div
                className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                onClick={() => toggleSubseccionExpand(subseccion.id)}
              >
                <div className="flex items-center">
                  {expandedSubsecciones[subseccion.id] ? (
                    <ChevronDown className="h-5 w-5 mr-2 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 mr-2 text-gray-500" />
                  )}
                  <h3 className="font-medium">{subseccion.nombre}</h3>
                  <span className="ml-2 text-sm text-gray-500">
                    ({subseccion.productos_count || 0} productos)
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManageProducts(subseccion);
                    }}
                  >
                    Gestionar Productos
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSubseccion(subseccion);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubseccion(subseccion);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {expandedSubsecciones[subseccion.id] && (
                <div className="p-4 bg-white">
                  <SubseccionCard
                    subseccion={subseccion}
                    onEdit={() => handleEditSubseccion(subseccion)}
                    onDelete={() => handleDeleteSubseccion(subseccion)}
                    onClick={() => toggleSubseccionExpand(subseccion.id)}
                  />
                  <div className="mt-4">
                    <h4 className="font-medium mb-3 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Productos en esta subsección
                    </h4>

                    {isLoadingProductos[subseccion.id] ? (
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      </div>
                    ) : !productosEnSubseccion[subseccion.id] || productosEnSubseccion[subseccion.id].length === 0 ? (
                      <div className="text-center py-4 text-gray-500 border rounded-lg">
                        No hay productos en esta subsección
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {productosEnSubseccion[subseccion.id].map((producto) => (
                          <div
                            key={producto.id}
                            className="border rounded-lg p-3 flex items-center"
                          >
                            <div className="w-12 h-12 relative flex-shrink-0 mr-3">
                              {producto.foto && !imageErrors[producto.id] ? (
                                <Image
                                  src={producto.foto}
                                  alt={producto.nombre}
                                  fill
                                  className="object-cover rounded-md"
                                  onError={() => handleImageError(producto.id)}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-md">
                                  <Package className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-sm truncate">{producto.nombre}</h5>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>${Number(producto.precio).toFixed(2)}</span>
                                <span>Stock: {producto.cantidad}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <SubseccionDialog
        subseccion={subseccionSeleccionada}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveSubseccion}
        isEditing={isEditing}
        secciones={secciones}
        seccionId={seccionSeleccionada?.id || ''} // Agregar esta línea
      />

      <ProductSelectionForSubseccionDialog
        isOpen={isProductDialogOpen}
        onClose={() => setIsProductDialogOpen(false)}
        productos={productos}
        productosEnSubseccion={productosEnSubseccion[subseccionSeleccionada?.id || ''] || []}
        subseccion={subseccionSeleccionada}
        onSave={handleSaveProductsToSubseccion}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la subsección "{subseccionSeleccionada?.nombre}".
              Los productos asociados se mantendrán en la base de datos pero ya no estarán asignados a esta subsección.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSubseccion} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}