'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Seccion } from '@/types'

interface SeccionCardProps {
    seccion: Seccion & {
        productos_count?: number;
        subsecciones_count?: number;
    }
    onEdit: (seccion: Seccion) => void
    onDelete: (seccionId: string) => void
    onClick: (seccion: Seccion) => void
}

export default function SeccionCard({ seccion, onEdit, onDelete, onClick }: SeccionCardProps) {
    const [imageError, setImageError] = useState(false)

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation()
    }

    // Determinar qué texto mostrar según si tiene subsecciones o productos
    const getInfoText = () => {
        if (seccion.subsecciones_count && seccion.subsecciones_count > 0) {
            return `${seccion.subsecciones_count} subsecciones`;
        } else {
            return `${seccion.productos_count || 0} productos`;
        }
    }

    return (
        <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200 relative group"
            onClick={() => onClick(seccion)}
        >
            <CardContent className="p-4">
                <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                        src={imageError ? '/placeholder.svg' : (seccion.foto || '/placeholder.svg')}
                        alt={seccion.nombre}
                        fill
                        className="object-cover"
                        onError={() => setImageError(true)}
                    />
                </div>

                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{seccion.nombre}</h3>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={handleMenuClick}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                onEdit(seccion)
                            }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDelete(seccion.id)
                                }}
                                className="text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    )
}