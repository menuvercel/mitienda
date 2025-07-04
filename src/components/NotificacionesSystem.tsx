import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from "@/hooks/use-toast";
import { getAllNotificaciones, getNotificacionesUsuario, crearNotificacion, marcarComoLeida, eliminarNotificacionPorVendedores } from '@/app/services/api';
import { getVendedores } from '@/app/services/api';
import { Vendedor, Notificacion } from '@/types';

interface NotificacionesSystemProps {
  mode: 'admin' | 'vendedor';
}

const NotificacionesSystem: React.FC<NotificacionesSystemProps> = ({ mode }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCrearDialog, setShowCrearDialog] = useState(false);

  // ✅ NUEVO: Estados para el diálogo de eliminación selectiva
  const [showEliminarDialog, setShowEliminarDialog] = useState(false);
  const [notificacionParaEliminar, setNotificacionParaEliminar] = useState<Notificacion | null>(null);
  const [vendedoresSeleccionadosEliminar, setVendedoresSeleccionadosEliminar] = useState<string[]>([]);

  const [step, setStep] = useState(1);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [texto, setTexto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotificaciones = async () => {
    try {
      setIsLoading(true);
      const data = mode === 'admin'
        ? await getAllNotificaciones()
        : await getNotificacionesUsuario();
      setNotificaciones(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las notificaciones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendedores = async () => {
    if (mode === 'admin') {
      try {
        const data = await getVendedores();
        setVendedores(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los vendedores",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    fetchNotificaciones();
    fetchVendedores();

    if (mode === 'vendedor') {
      const intervalId = setInterval(fetchNotificaciones, 60000);
      return () => clearInterval(intervalId);
    }
  }, [mode]);

  // ✅ NUEVO: Función para abrir el diálogo de eliminación selectiva
  const handleAbrirEliminarDialog = (notificacion: Notificacion) => {
    setNotificacionParaEliminar(notificacion);
    setVendedoresSeleccionadosEliminar([]);
    setShowEliminarDialog(true);
  };

  // ✅ NUEVO: Función para manejar la selección de vendedores a eliminar
  const handleVendedorEliminarChange = (vendedorId: string) => {
    setVendedoresSeleccionadosEliminar(prev => {
      if (prev.includes(vendedorId)) {
        return prev.filter(id => id !== vendedorId);
      } else {
        return [...prev, vendedorId];
      }
    });
  };

  // ✅ FUNCIÓN CORREGIDA en NotificacionesSystem
  const handleEliminarPorVendedores = async () => {
    if (!notificacionParaEliminar || vendedoresSeleccionadosEliminar.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un vendedor",
        variant: "destructive",
      });
      return;
    }

    try {
      // ✅ Usar notificacion_grupo_id si está disponible, sino usar id
      const notificacionId = notificacionParaEliminar.notificacion_grupo_id
        ? notificacionParaEliminar.notificacion_grupo_id.toString()
        : notificacionParaEliminar.id;

      const vendedorIdsAsNumbers = vendedoresSeleccionadosEliminar
        .map(id => parseInt(id.toString()))
        .filter(id => !isNaN(id));

      console.log('Eliminando notificación:', {
        notificacionId,
        grupoId: notificacionParaEliminar.notificacion_grupo_id,
        vendedorIds: vendedorIdsAsNumbers
      });

      // ✅ Usar la nueva función de API
      await eliminarNotificacionPorVendedores(notificacionId, vendedorIdsAsNumbers);

      toast({
        title: "Éxito",
        description: "Notificación eliminada correctamente",
      });

      await fetchNotificaciones();
      setShowEliminarDialog(false);
      setNotificacionParaEliminar(null);
      setVendedoresSeleccionadosEliminar([]);

    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la notificación",
        variant: "destructive",
      });
    }
  };

  // ✅ FUNCIÓN CORREGIDA para seleccionar todos los vendedores
  const handleSelectAllEliminar = () => {
    if (!notificacionParaEliminar?.usuarios) return;

    // ✅ Asegurar que los IDs sean números
    const todosLosIds = notificacionParaEliminar.usuarios
      .map(u => parseInt(u.id.toString()))
      .filter(id => !isNaN(id));

    console.log('Todos los IDs disponibles (como números):', todosLosIds);
    console.log('IDs actualmente seleccionados:', vendedoresSeleccionadosEliminar);

    if (vendedoresSeleccionadosEliminar.length === todosLosIds.length) {
      setVendedoresSeleccionadosEliminar([]);
    } else {
      setVendedoresSeleccionadosEliminar(todosLosIds.map(id => id.toString())); // Mantener como string para el estado del frontend
    }
  };

  // ✅ FUNCIÓN CORREGIDA para manejar selección individual
  const handleVendedorToggleEliminar = (vendedorId: string | number) => {
    const idAsString = vendedorId.toString();

    setVendedoresSeleccionadosEliminar(prev =>
      prev.includes(idAsString)
        ? prev.filter(id => id !== idAsString)
        : [...prev, idAsString]
    );
  };

  // ✅ FUNCIÓN DE DEBUG mejorada
  const debugNotificacion = (notificacion: Notificacion) => {
    console.log('Estructura de la notificación:', {
      id: notificacion.id,
      notificacion_grupo_id: notificacion.notificacion_grupo_id,
      texto: notificacion.texto,
      fecha: notificacion.fecha,
      usuarios: notificacion.usuarios?.map(u => ({
        id: u.id,
        nombre: u.nombre,
        leida: u.leida
      }))
    });
  };


  const handleMarcarLeida = async (id: string) => {
    try {
      await marcarComoLeida(id);

      // ✅ Actualizar el estado local correctamente
      setNotificaciones(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, leida: true } : notif
        )
      );

      toast({
        title: "Éxito",
        description: "Notificación marcada como leída",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la notificación",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedVendors.length === vendedores.length) {
      setSelectedVendors([]);
    } else {
      setSelectedVendors(vendedores.map(v => v.id));
    }
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendors(prev => {
      if (prev.includes(vendorId)) {
        return prev.filter(id => id !== vendorId);
      } else {
        return [...prev, vendorId];
      }
    });
  };

  const handleNext = () => {
    if (selectedVendors.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un vendedor",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (texto.trim() === '') {
      toast({
        title: "Error",
        description: "El texto de la notificación no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ CAMBIO: Pasar usuarioIds en lugar de usuarios
      await crearNotificacion(texto, selectedVendors);
      toast({
        title: "Éxito",
        description: "Notificación enviada correctamente",
      });
      setStep(1);
      setSelectedVendors([]);
      setTexto('');
      fetchNotificaciones();
      setShowCrearDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la notificación",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setStep(1);
      setSelectedVendors([]);
      setTexto('');
    }
    setShowCrearDialog(open);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  // Componente para el panel de administrador
  if (mode === 'admin') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Notificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Texto</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificaciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                          No hay notificaciones disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      notificaciones.map((notificacion) => (
                        <React.Fragment key={notificacion.id}>
                          {notificacion.usuarios && notificacion.usuarios.map((usuario, index) => (
                            <TableRow
                              key={`${notificacion.id}-${usuario.id}`}
                              className={usuario.leida ? "bg-green-50" : "bg-red-50"}
                            >
                              {index === 0 ? (
                                <>
                                  <TableCell rowSpan={notificacion.usuarios!.length} className="align-top">
                                    <div>
                                      <p>{notificacion.texto}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {formatDate(notificacion.fecha)}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell>{usuario.nombre}</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${usuario.leida ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {usuario.leida ? 'Leído' : 'No leído'}
                                    </span>
                                  </TableCell>
                                  <TableCell rowSpan={notificacion.usuarios!.length} className="text-right align-top">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        // ✅ Debug antes de abrir el diálogo
                                        console.log('Notificación seleccionada para eliminar:', {
                                          id: notificacion.id,
                                          notificacion_grupo_id: notificacion.notificacion_grupo_id,
                                          texto: notificacion.texto,
                                          usuarios: notificacion.usuarios
                                        });

                                        handleAbrirEliminarDialog(notificacion);
                                      }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell>{usuario.nombre}</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${usuario.leida ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {usuario.leida ? 'Leído' : 'No leído'}
                                    </span>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diálogo para crear notificación */}
        <Dialog open={showCrearDialog} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {step === 1 ? "Seleccionar vendedores" : "Escribir notificación"}
              </DialogTitle>
            </DialogHeader>

            {step === 1 ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={selectedVendors.length === vendedores.length && vendedores.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Seleccionar todos
                  </label>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {vendedores.map((vendedor) => (
                    <div key={vendedor.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={`vendor-${vendedor.id}`}
                        checked={selectedVendors.includes(vendedor.id)}
                        onCheckedChange={() => handleVendorChange(vendedor.id)}
                      />
                      <label htmlFor={`vendor-${vendedor.id}`} className="flex-grow cursor-pointer">
                        {vendedor.nombre}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleNext} disabled={selectedVendors.length === 0}>
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="texto" className="block text-sm font-medium text-gray-700 mb-1">
                    Texto de la notificación
                  </label>
                  <Textarea
                    id="texto"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escribe el mensaje para los vendedores seleccionados..."
                    className="min-h-[120px]"
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack}>
                    Atrás
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting || texto.trim() === ''}>
                    {isSubmitting ? "Enviando..." : "Enviar notificación"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ✅ NUEVO: Diálogo para eliminar notificación por vendedores específicos */}
        <Dialog open={showEliminarDialog} onOpenChange={setShowEliminarDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Eliminar notificación</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Notificación:</p>
                <p className="text-sm text-gray-600 mt-1">{notificacionParaEliminar?.texto}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Selecciona de qué vendedores eliminar esta notificación:
                </p>

                <div className="flex items-center space-x-2 p-2 border-b mb-2">
                  <Checkbox
                    id="select-all-eliminar"
                    checked={
                      notificacionParaEliminar?.usuarios &&
                      vendedoresSeleccionadosEliminar.length === notificacionParaEliminar.usuarios.length &&
                      notificacionParaEliminar.usuarios.length > 0
                    }
                    onCheckedChange={handleSelectAllEliminar}
                  />
                  <label htmlFor="select-all-eliminar" className="text-sm font-medium">
                    Seleccionar todos
                  </label>
                </div>

                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {notificacionParaEliminar?.usuarios?.map((usuario) => (
                    <div key={usuario.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={`eliminar-${usuario.id}`}
                        checked={vendedoresSeleccionadosEliminar.includes(usuario.id)}
                        onCheckedChange={() => handleVendedorEliminarChange(usuario.id)}
                      />
                      <label htmlFor={`eliminar-${usuario.id}`} className="flex-grow cursor-pointer text-sm">
                        {usuario.nombre}
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${usuario.leida ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {usuario.leida ? 'Leído' : 'No leído'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEliminarDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleEliminarPorVendedores}
                  disabled={vendedoresSeleccionadosEliminar.length === 0}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Eliminar ({vendedoresSeleccionadosEliminar.length})
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Botón flotante para agregar notificación */}
        <Button
          className="fixed bottom-6 right-6 rounded-full h-12 w-12 shadow-lg bg-green-500 hover:bg-green-600 text-white"
          onClick={() => setShowCrearDialog(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  // Componente para el panel de vendedor (sin cambios)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Notificaciones</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tienes notificaciones
          </div>
        ) : (
          <div className="space-y-4">
            {notificaciones.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border ${notif.leida ? 'bg-green-50' : 'bg-red-50'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="font-medium">{notif.texto}</p>
                    <p className="text-xs text-gray-500">{formatDate(notif.fecha)}</p>
                  </div>
                  {!notif.leida && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => handleMarcarLeida(notif.id)}
                    >
                      <Check className="mr-1 h-4 w-4" /> Marcar como leída
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


// Componente para mostrar el indicador de notificaciones no leídas (sin cambios)
export const NotificacionesBadge: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => {
  const [noLeidas, setNoLeidas] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotificaciones = async () => {
      try {
        setIsLoading(true);
        const notificaciones = await getNotificacionesUsuario();
        const cantidadNoLeidas = notificaciones.filter(n => !n.leida).length;
        setNoLeidas(cantidadNoLeidas);
      } catch (error) {
        console.error('Error al cargar notificaciones:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotificaciones();
    const intervalId = setInterval(fetchNotificaciones, 60000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`relative ${className}`}
      disabled={isLoading}
    >
      <Bell className="h-5 w-5" />
      {noLeidas > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
          {noLeidas > 9 ? '9+' : noLeidas}
        </span>
      )}
      <span className="sr-only">Notificaciones</span>
    </Button>
  );
};

export default NotificacionesSystem;
