'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Producto } from '@/types'

interface ProductoDestacadoCardProps {
    producto: Producto
    onClick?: (producto: Producto) => void
}

export default function ProductoDestacadoCard({ producto, onClick }: ProductoDestacadoCardProps) {
    const [imageError, setImageError] = useState(false)

    const calcularCantidadTotal = (producto: Producto) => {
        if (producto.tiene_parametros && producto.parametros) {
            return producto.parametros.reduce((sum, param) => sum + param.cantidad, 0);
        }
        return producto.cantidad;
    };

    return (
        <Card
            className={`cursor-pointer hover:shadow-lg transition-all duration-200 relative ${onClick ? 'hover:scale-105' : ''}`}
            onClick={() => onClick?.(producto)}
        >
            <CardContent className="p-4">
                <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                        src={imageError ? '/placeholder.svg' : (producto.foto || '/placeholder.svg')}
                        alt={producto.nombre}
                        fill
                        className="object-cover"
                        onError={() => setImageError(true)}
                    />
                    <div className="absolute top-2 right-2">
                        <Badge className="bg-yellow-500 text-white">
                            <Star className="w-3 h-3 mr-1" />
                            Destacado
                        </Badge>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="font-semibold text-lg truncate">{producto.nombre}</h3>
                    <div className="flex justify-between items-center">
                        <p className="text-lg font-bold text-green-600">${producto.precio}</p>
                        <p className={`text-sm ${calcularCantidadTotal(producto) === 0 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                            Stock: {calcularCantidadTotal(producto)}
                        </p>
                    </div>

                    {producto.tiene_parametros && producto.parametros && producto.parametros.length > 0 && (
                        <div className="text-xs text-blue-600">
                            Con variantes disponibles
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
