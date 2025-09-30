'use client'

import React from 'react'
import Image from 'next/image'
import { Subseccion } from '@/types'
import { Card, CardContent } from "@/components/ui/card"
import { CalendarIcon, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SubseccionCardProps {
  subseccion: Subseccion;
  onEdit: (subseccion: Subseccion) => void;
  onDelete: (subseccionId: string) => void;
  onClick: (subseccion: Subseccion) => void;
}

export default function SubseccionCard({ subseccion, onEdit, onDelete, onClick }: SubseccionCardProps) {
  const [imageError, setImageError] = React.useState(false)

  // Formatear fecha si está disponible
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'

    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    } catch (error) {
      return 'Fecha inválida'
    }
  }

  // Prevenir propagación de eventos
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(subseccion);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(subseccion.id);
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(subseccion)}
    >
      <CardContent className="p-0">
        <div className="flex flex-col">
          <div className="w-full h-32 relative">
            {subseccion.foto && !imageError ? (
              <Image
                src={subseccion.foto}
                alt={subseccion.nombre}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                Sin imagen
              </div>
            )}
          </div>

          <div className="p-4 flex-1">
            <h3 className="font-medium text-lg mb-2">{subseccion.nombre}</h3>

            <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 mb-3">
              <div className="flex items-center">
                <span className="font-medium mr-2">Productos:</span>
                <span>{subseccion.productos_count || 0}</span>
              </div>

              {subseccion.created_at && (
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span className="font-medium mr-2">Creado:</span>
                  <span>{formatDate(subseccion.created_at)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="h-8 px-2"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="h-8 px-2 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}