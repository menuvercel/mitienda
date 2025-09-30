'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Seccion, Subseccion, Producto } from '@/types'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface ProductosPorSubseccionProps {
  seccion?: Seccion | null
}

export default function ProductosPorSubseccion({ seccion }: ProductosPorSubseccionProps) {
  const [subsecciones, setSubsecciones] = useState<Subseccion[]>([])
  const [productosPorSubseccion, setProductosPorSubseccion] = useState<Record<string, Producto[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('todas')
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  
  const { toast } = useToast()

  useEffect(() => {
    if (seccion) {
      fetchSubsecciones(seccion.id)
    } else {
      fetchTodasSubsecciones()
    }
  }, [seccion])

  const fetchSubsecciones = async (seccionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/subsecciones?seccion_id=${seccionId}`)
      if (response.ok) {
        const data = await response.json()
        setSubsecciones(data)
        
        // Cargar productos para cada subsección
        const productosMap: Record<string, Producto[]> = {}
        for (const subseccion of data) {
          const productos = await fetchProductosDeSubseccion(subseccion.id)
          productosMap[subseccion.id] = productos
        }
        setProductosPorSubseccion(productosMap)
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

  const fetchTodasSubsecciones = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/subsecciones')
      if (response.ok) {
        const data = await response.json()
        setSubsecciones(data)
        
        // Cargar productos para cada subsección
        const productosMap: Record<string, Producto[]> = {}
        for (const subseccion of data) {
          const productos = await fetchProductosDeSubseccion(subseccion.id)
          productosMap[subseccion.id] = productos
        }
        setProductosPorSubseccion(productosMap)
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

  const fetchProductosDeSubseccion = async (subseccionId: string): Promise<Producto[]> => {
    try {
      const response = await fetch(`/api/subsecciones/${subseccionId}/productos`)
      if (response.ok) {
        return await response.json()
      }
      return []
    } catch (error) {
      console.error('Error al cargar productos de la subsección:', error)
      return []
    }
  }

  const handleImageError = (productoId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [productoId]: true
    }))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (subsecciones.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {seccion 
          ? `No hay subsecciones en ${seccion.nombre}`
          : "No hay subsecciones disponibles"
        }
      </div>
    )
  }

  // Todos los productos de todas las subsecciones
  const todosLosProductos = Object.values(productosPorSubseccion).flat()

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full overflow-x-auto flex-wrap">
          <TabsTrigger value="todas" className="flex-shrink-0">
            Todas ({todosLosProductos.length})
          </TabsTrigger>
          
          {subsecciones.map(subseccion => (
            <TabsTrigger 
              key={subseccion.id} 
              value={subseccion.id}
              className="flex-shrink-0"
            >
              {subseccion.nombre} ({productosPorSubseccion[subseccion.id]?.length || 0})
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="todas" className="mt-6">
          {todosLosProductos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay productos en ninguna subsección
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {todosLosProductos.map(producto => (
                <ProductoCard 
                  key={producto.id} 
                  producto={producto} 
                  hasError={!!imageErrors[producto.id]}
                  onImageError={() => handleImageError(producto.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        {subsecciones.map(subseccion => (
          <TabsContent key={subseccion.id} value={subseccion.id} className="mt-6">
            {!productosPorSubseccion[subseccion.id] || productosPorSubseccion[subseccion.id].length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay productos en esta subsección
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {productosPorSubseccion[subseccion.id].map(producto => (
                  <ProductoCard 
                    key={producto.id} 
                    producto={producto} 
                    hasError={!!imageErrors[producto.id]}
                    onImageError={() => handleImageError(producto.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

interface ProductoCardProps {
  producto: Producto
  hasError: boolean
  onImageError: () => void
}

function ProductoCard({ producto, hasError, onImageError }: ProductoCardProps) {
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="w-full h-40 relative">
        {producto.foto && !hasError ? (
          <Image
            src={producto.foto}
            alt={producto.nombre}
            fill
            className="object-cover"
            onError={onImageError}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
            Sin imagen
          </div>
        )}
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="font-medium text-lg mb-1 line-clamp-2">{producto.nombre}</h3>
        
        <div className="mt-auto">
          <div className="flex justify-between items-center mt-2">
            <span className="font-bold text-lg">${Number(producto.precio).toFixed(2)}</span>
            <span className="text-sm text-gray-500">Stock: {producto.cantidad}</span>
          </div>
          
          {producto.tiene_parametros && (
            <div className="mt-2 text-xs text-blue-600">
              Producto con parámetros
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}