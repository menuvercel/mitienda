'use client'

import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { differenceInDays, isBefore, startOfDay, format } from 'date-fns';
import { Producto } from '@/types';

interface VencimientoBellProps {
    inventario: Producto[];
}

export const VencimientoBell = ({ inventario }: VencimientoBellProps) => {
    const [alertasVencimiento, setAlertasVencimiento] = useState<{ producto: Producto; diasRestantes: number; estado: 'vencido' | 'pronto' }[]>([]);
    const [alertasCantidad, setAlertasCantidad] = useState<{ producto: Producto; cantidad: number; estado: 'agotado' | 'bajo' }[]>([]);

    const [vistas, setVistas] = useState<Set<string>>(new Set());
    const [popoverOpen, setPopoverOpen] = useState(false);

    useEffect(() => {
        const hoy = startOfDay(new Date());
        
        // Alertas de Vencimiento
        const nuevasVencimiento = inventario
            .filter(p => p.tiene_vencimiento && p.fecha_vencimiento)
            .map(p => {
                const fechaVencimiento = startOfDay(new Date(p.fecha_vencimiento!));
                const diasRestantes = differenceInDays(fechaVencimiento, hoy);
                const estaVencido = isBefore(fechaVencimiento, hoy);
                const vencePronto = diasRestantes <= 7 && !estaVencido;

                if (estaVencido) {
                    return { producto: p, diasRestantes, estado: 'vencido' as const };
                } else if (vencePronto) {
                    return { producto: p, diasRestantes, estado: 'pronto' as const };
                }
                return null;
            })
            .filter((a): a is { producto: Producto; diasRestantes: number; estado: 'vencido' | 'pronto' } => a !== null)
            .sort((a, b) => a.diasRestantes - b.diasRestantes);

        setAlertasVencimiento(nuevasVencimiento);

        // Alertas de Cantidad
        const nuevasCantidad = inventario
            .map(p => {
                const cantidadTotal = p.tiene_parametros && p.parametros 
                    ? p.parametros.reduce((sum, param) => sum + param.cantidad, 0)
                    : p.cantidad;
                
                if (cantidadTotal === 0) {
                    return { producto: p, cantidad: cantidadTotal, estado: 'agotado' as const };
                } else if (p.stock_minimo !== undefined && p.stock_minimo !== null && cantidadTotal <= p.stock_minimo) {
                    return { producto: p, cantidad: cantidadTotal, estado: 'bajo' as const };
                }
                return null;
            })
            .filter((a): a is { producto: Producto; cantidad: number; estado: 'agotado' | 'bajo' } => a !== null)
            .sort((a, b) => a.cantidad - b.cantidad);

        setAlertasCantidad(nuevasCantidad);
    }, [inventario]);

    const totalAlertas = alertasVencimiento.length + alertasCantidad.length;
    
    // Identificadores únicos de las alertas actuales
    const currentAlertIds = [
        ...alertasVencimiento.map(a => `venc-${a.producto.id}`),
        ...alertasCantidad.map(a => `cant-${a.producto.id}`)
    ];

    // Alertas que no han sido "vistas"
    const alertasNoVistas = currentAlertIds.filter(id => !vistas.has(id)).length;

    const tieneVencidos = alertasVencimiento.some(a => a.estado === 'vencido');
    const tieneAgotados = alertasCantidad.some(a => a.estado === 'agotado');

    const handleOpenChange = (open: boolean) => {
        setPopoverOpen(open);
        if (open) {
            // Marcar todas las alertas actuales como vistas
            setVistas(new Set(currentAlertIds));
        }
    };

    return (
        <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative border-yellow-400 bg-yellow-50 hover:bg-yellow-100">
                    <Bell className={`h-4 w-4 ${(tieneVencidos || tieneAgotados) ? 'text-red-500 animate-bounce' : 'text-yellow-600'}`} />
                    {alertasNoVistas > 0 && (
                        <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white">
                            {alertasNoVistas}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b bg-yellow-50">
                    <h3 className="font-semibold text-sm flex items-center">
                        <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                        Alertas del Sistema
                    </h3>
                </div>
                <ScrollArea className="h-72">
                    <div className="p-2 space-y-2">
                        {totalAlertas === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                                No hay alertas activas
                            </div>
                        ) : (
                            <>
                                {alertasVencimiento.map((alerta) => (
                                    <div 
                                        key={`venc-${alerta.producto.id}`} 
                                        className={`p-3 rounded-md border text-sm ${alerta.estado === 'vencido' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}
                                    >
                                        <div className="font-medium flex justify-between">
                                            <span>{alerta.producto.nombre}</span>
                                            {alerta.estado === 'vencido' ? (
                                                <Badge variant="destructive" className="text-[10px] h-4">Vencido</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] h-4 border-yellow-400 text-yellow-700">Vence Pronto</Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1 flex items-center">
                                            <Calendar className="mr-1 h-3 w-3" />
                                            Vence: {format(new Date(alerta.producto.fecha_vencimiento!), 'dd/MM/yyyy')}
                                        </div>
                                        <div className={`text-xs mt-1 font-semibold ${alerta.estado === 'vencido' ? 'text-red-600' : 'text-yellow-700'}`}>
                                            {alerta.estado === 'vencido' 
                                                ? `Venció hace ${Math.abs(alerta.diasRestantes)} días` 
                                                : `Vence en ${alerta.diasRestantes} días`
                                            }
                                        </div>
                                    </div>
                                ))}

                                {alertasCantidad.map((alerta) => (
                                    <div 
                                        key={`cant-${alerta.producto.id}`} 
                                        className={`p-3 rounded-md border text-sm ${alerta.estado === 'agotado' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}
                                    >
                                        <div className="font-medium flex justify-between">
                                            <span>{alerta.producto.nombre}</span>
                                            {alerta.estado === 'agotado' ? (
                                                <Badge variant="destructive" className="text-[10px] h-4">Agotado</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] h-4 border-orange-400 text-orange-700">Stock Bajo</Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1 flex items-center">
                                            Stock actual: {alerta.cantidad}
                                        </div>
                                        <div className={`text-xs mt-1 font-semibold ${alerta.estado === 'agotado' ? 'text-red-600' : 'text-orange-700'}`}>
                                            {alerta.estado === 'agotado' 
                                                ? `¡Producto agotado!` 
                                                : `Stock mínimo: ${alerta.producto.stock_minimo}`
                                            }
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};
