'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, X } from 'lucide-react'
import { getNotificacionesVendedor, marcarComoLeidaVendedor } from '@/app/services/api'
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

interface Notificacion {
    id: string;
    texto: string;
    fecha: string;
    leida: boolean;
    fecha_lectura?: string;
}

interface NotificacionesBellProps {
    vendedorId: string;
}

export const NotificacionesBell = ({ vendedorId }: NotificacionesBellProps) => {
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const notificacionesNoLeidas = notificaciones.filter(n => !n.leida);
    const cantidadNoLeidas = notificacionesNoLeidas.length;

    const fetchNotificaciones = async () => {
        try {
            setIsLoading(true);
            const data = await getNotificacionesVendedor(vendedorId);

            // ✅ Procesar los datos para asegurar que leida sea siempre boolean
            const notificacionesProcesadas = data.map(notif => ({
                ...notif,
                leida: Boolean(notif.leida) // Convierte undefined a false
            }));

            setNotificaciones(notificacionesProcesadas);
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
        } finally {
            setIsLoading(false);
        }
    };


    const handleMarcarComoLeida = async (notificacionId: string) => {
        try {
            await marcarComoLeidaVendedor(notificacionId, vendedorId);

            // Actualizar el estado local
            setNotificaciones(prev =>
                prev.map(notif =>
                    notif.id === notificacionId
                        ? { ...notif, leida: true, fecha_lectura: new Date().toISOString() }
                        : notif
                )
            );
        } catch (error) {
            console.error('Error al marcar como leída:', error);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);

        // Cuando se abre el popover, marcar todas las no leídas como leídas
        if (open && cantidadNoLeidas > 0) {
            notificacionesNoLeidas.forEach(notif => {
                handleMarcarComoLeida(notif.id);
            });
        }
    };

    const formatDate = (dateString: string): string => {
        try {
            const date = parseISO(dateString);
            if (!isValid(date)) {
                return 'Fecha inválida';
            }
            return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
        } catch (error) {
            return 'Error en fecha';
        }
    };

    useEffect(() => {
        fetchNotificaciones();

        // Actualizar cada 30 segundos
        const interval = setInterval(fetchNotificaciones, 30000);

        return () => clearInterval(interval);
    }, [vendedorId]);

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="relative"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Bell className="h-4 w-4" />
                    {cantidadNoLeidas > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-5"
                        >
                            {cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Notificaciones</h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    {cantidadNoLeidas > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                            {cantidadNoLeidas} sin leer
                        </p>
                    )}
                </div>

                <ScrollArea className="h-96">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">
                            Cargando notificaciones...
                        </div>
                    ) : notificaciones.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            No tienes notificaciones
                        </div>
                    ) : (
                        <div className="p-2">
                            {notificaciones.map((notificacion) => (
                                <div
                                    key={notificacion.id}
                                    className={`p-3 mb-2 rounded-lg border transition-colors ${!notificacion.leida
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className={`text-sm ${!notificacion.leida ? 'font-medium' : ''}`}>
                                                {notificacion.texto}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatDate(notificacion.fecha)}
                                            </p>
                                            {notificacion.leida && notificacion.fecha_lectura && (
                                                <p className="text-xs text-green-600 mt-1">
                                                    Leída: {formatDate(notificacion.fecha_lectura)}
                                                </p>
                                            )}
                                        </div>
                                        {!notificacion.leida && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {notificaciones.length > 0 && (
                    <div className="p-3 border-t bg-gray-50">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchNotificaciones}
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? 'Actualizando...' : 'Actualizar'}
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
};
