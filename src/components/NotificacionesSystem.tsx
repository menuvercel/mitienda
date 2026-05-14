import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  getAllNotificaciones, 
  getNotificacionesUsuario, 
  crearNotificacion, 
  marcarComoLeida, 
  eliminarNotificacionPorVendedores, 
  getInventario, 
  getAllVentas, 
  getProductosVendedor,
  getVendedores 
} from '@/app/services/api';
import { Vendedor, Notificacion, Producto, Venta } from '@/types';
import { Calendar as CalendarIcon, AlertTriangle, Search, Users, TrendingUp, BarChart3 } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

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

  const [productosVencimiento, setProductosVencimiento] = useState<Producto[]>([]);
  const [productosCantidades, setProductosCantidades] = useState<Producto[]>([]);
  const [isLoadingVencimiento, setIsLoadingVencimiento] = useState(false);
  const [activeTab, setActiveTab] = useState('mensajes');
  const [activeVendedoresTab, setActiveVendedoresTab] = useState('cantidades_v');
  const [filtroCantidad, setFiltroCantidad] = useState<'todos' | 'agotados' | 'bajo'>('todos');
  const [vendedorAlertas, setVendedorAlertas] = useState<{vendedor: Vendedor, productos: Producto[]}[]>([]);
  const [ventasStats, setVentasStats] = useState<{producto: string, nombre: string, totalVendidos: number, foto: string}[]>([]);
  const [topVendedores, setTopVendedores] = useState<{vendedor: string, nombre: string, totalVendido: number, totalMonto: number}[]>([]);
  const [allVentas, setAllVentas] = useState<Venta[]>([]);
  const [isLoadingVendedoresData, setIsLoadingVendedoresData] = useState(false);
  
  // Filtros de vendedor (inicialmente vacíos)
  const [vendedorIdFiltroAlertas, setVendedorIdFiltroAlertas] = useState<string>('');
  const [vendedorIdFiltroStats, setVendedorIdFiltroStats] = useState<string>('');
  
  // Estados para notificación rápida
  const [quickNotifyDialog, setQuickNotifyDialog] = useState(false);
  const [quickNotifyTarget, setQuickNotifyTarget] = useState<{id: string, nombre: string, mensaje: string} | null>(null);
  const { toast } = useToast();

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

  const fetchAlertas = async () => {
    try {
      setIsLoadingVencimiento(true);
      const data = await getInventario();
      
      // Filtrar vencimientos
      const conVencimiento = data
        .filter((p: Producto) => p.tiene_vencimiento && p.fecha_vencimiento)
        .sort((a: Producto, b: Producto) => {
          const dateA = new Date(a.fecha_vencimiento!).getTime();
          const dateB = new Date(b.fecha_vencimiento!).getTime();
          return dateA - dateB;
        });
      setProductosVencimiento(conVencimiento);

      // Filtrar alertas de cantidad
      const conAlertasCantidad = data.filter((p: Producto) => {
        // Calcular cantidad total
        const cantidadTotal = (p.tiene_parametros || p.tieneParametros) && p.parametros 
          ? p.parametros.reduce((sum: number, param: any) => sum + param.cantidad, 0)
          : p.cantidad;
        
        // Alerta si es 0 o si es menor/igual al stock mínimo definido
        return cantidadTotal === 0 || (p.stock_minimo !== undefined && p.stock_minimo !== null && cantidadTotal <= p.stock_minimo);
      }).sort((a, b) => {
        const getCant = (p: Producto) => (p.tiene_parametros || p.tieneParametros) && p.parametros 
          ? p.parametros.reduce((sum, param) => sum + param.cantidad, 0)
          : p.cantidad;
        return getCant(a) - getCant(b);
      });
      setProductosCantidades(conAlertasCantidad);
    } catch (error) {
      console.error('Error al cargar alertas de inventario:', error);
    } finally {
      setIsLoadingVencimiento(false);
    }
  };

  // ✅ NUEVA: Función para detectar y notificar productos estancados
  const verificarYNotificarEstancados = async (vendedor: Vendedor, inventario: Producto[], ventas: Venta[]) => {
    const hoy = new Date();
    const haceUnaSemana = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Filtrar ventas del vendedor en la última semana
    const ventasSemana = ventas.filter(v => 
      v.vendedor?.toString() === vendedor.id.toString() && 
      new Date(v.fecha) >= haceUnaSemana
    );
    
    // Identificar productos sin ventas en la última semana que tengan stock
    const estancados = inventario.filter(p => {
      const cant = (p.tiene_parametros || p.tieneParametros) && p.parametros 
        ? p.parametros.reduce((sum, param) => sum + param.cantidad, 0)
        : p.cantidad;
        
      if (cant <= 0) return false;
      return !ventasSemana.some(v => v.producto === p.id);
    });
    
    if (estancados.length > 0) {
      // Verificar si ya existe una notificación similar reciente (evitar spam)
      const yaNotificado = notificaciones.some(n => 
        n.texto.includes("estancados") && 
        (n.usuarios?.some(u => u.id.toString() === vendedor.id.toString()) || 
         n.texto.includes(vendedor.nombre)) &&
        differenceInDays(new Date(), new Date(n.fecha)) < 7
      );
      
      if (!yaNotificado) {
        const nombres = estancados.slice(0, 3).map(p => p.nombre).join(", ");
        const extra = estancados.length > 3 ? ` y ${estancados.length - 3} más` : "";
        await crearNotificacion(
          `Aviso de Rotación: No has vendido "${nombres}${extra}" en la última semana. Considera revisar su ubicación o promoción.`, 
          [vendedor.id]
        );
        console.log(`Notificación de estancamiento enviada a ${vendedor.nombre}`);
      }
    }
  };

  // ✅ NUEVA: Función para detectar y notificar bajo stock automáticamente
  const verificarYNotificarBajoStock = async (vendedor: Vendedor, productosBajoStock: Producto[]) => {
    if (productosBajoStock.length === 0) return;

    // Evitar spam: verificar si ya se notificó por stock bajo recientemente (cada 3 días)
    const yaNotificado = notificaciones.some(n => 
      n.texto.includes("Stock") && 
      (n.usuarios?.some(u => u.id.toString() === vendedor.id.toString()) || 
       n.texto.includes(vendedor.nombre)) &&
      differenceInDays(new Date(), new Date(n.fecha)) < 3
    );

    if (!yaNotificado) {
      const listado = productosBajoStock.slice(0, 3).map(p => p.nombre).join(", ");
      const extra = productosBajoStock.length > 3 ? ` y ${productosBajoStock.length - 3} más` : "";
      await crearNotificacion(
        `Alerta de Stock: Tienes ${productosBajoStock.length} productos con stock bajo o agotado (${listado}${extra}). Por favor, solicita reabastecimiento.`, 
        [vendedor.id]
      );
      console.log(`Notificación de bajo stock enviada a ${vendedor.nombre}`);
    }
  };

  const fetchVendedoresData = async () => {
    if (mode !== 'admin') return;
    
    try {
      setIsLoadingVendedoresData(true);
      const vendedoresList = await getVendedores();
      setVendedores(vendedoresList);

      // 1. Fetch alertas de stock
      if (!vendedorIdFiltroAlertas) {
        setVendedorAlertas([]);
      } else {
        let targetVendedores: Vendedor[] = [];
        if (vendedorIdFiltroAlertas === 'todos') {
          targetVendedores = vendedoresList;
        } else {
          const found = vendedoresList.find((v: Vendedor) => v.id.toString() === vendedorIdFiltroAlertas);
          if (found) targetVendedores = [found];
        }

        const alertasPromises = targetVendedores.map(async (v: Vendedor) => {
          try {
            const inventario = await getProductosVendedor(v.id);
            const lowStock = inventario.filter((p: Producto) => {
              const cant = (p.tiene_parametros || p.tieneParametros) && p.parametros 
                ? p.parametros.reduce((sum: number, param: any) => sum + param.cantidad, 0)
                : p.cantidad;
              return cant === 0 || (p.stock_minimo !== undefined && p.stock_minimo !== null && cant <= p.stock_minimo);
            });
            return { vendedor: v, productos: lowStock };
          } catch (err) {
            return { vendedor: v, productos: [] };
          }
        });
        
        const resAlertas = await Promise.all(alertasPromises);
        const filtradas = resAlertas.filter((a: {vendedor: Vendedor, productos: Producto[]}) => a.productos.length > 0);
        setVendedorAlertas(filtradas);

        // ✅ Automatización: Notificar bajo stock detectado a los vendedores afectados
        filtradas.forEach(item => {
          verificarYNotificarBajoStock(item.vendedor, item.productos);
        });
      }
      
      // 2. Fetch ventas y estadísticas
      if (!vendedorIdFiltroStats) {
        setVentasStats([]);
        setTopVendedores([]);
      } else {
        const todasLasVentas = await getAllVentas();
        setAllVentas(todasLasVentas);
        procesarEstadisticas(todasLasVentas, vendedoresList, vendedorIdFiltroStats);

        // ✅ Automatización: Verificar productos estancados tras cargar ventas e inventario
        if (vendedorIdFiltroStats !== 'todos') {
          const selectedV = vendedoresList.find(v => v.id.toString() === vendedorIdFiltroStats);
          if (selectedV) {
            const currentInv = await getProductosVendedor(selectedV.id);
            verificarYNotificarEstancados(selectedV, currentInv, todasLasVentas);
          }
        }
      }
      
    } catch (error) {
      console.error('Error al cargar datos de vendedores:', error);
    } finally {
      setIsLoadingVendedoresData(false);
    }
  };

  const procesarEstadisticas = (ventas: Venta[], vendedoresList: Vendedor[], filtroId: string) => {
    const statsMap = new Map<string, {nombre: string, total: number, foto: string}>();
    const vMap = new Map<string, {nombre: string, total: number, monto: number}>();
    
    // Filtrar ventas por vendedor si es necesario
    const ventasFiltradas = filtroId === 'todos' 
      ? ventas 
      : ventas.filter((v: Venta) => v.vendedor?.toString() === filtroId);

    ventasFiltradas.forEach((v: Venta) => {
      // Por producto
      const currentP = statsMap.get(v.producto) || { nombre: v.producto_nombre || 'Producto sin nombre', total: 0, foto: v.producto_foto || '' };
      currentP.total += Number(v.cantidad);
      statsMap.set(v.producto, currentP);
      
      // Por vendedor (siempre calculamos el top global o filtramos según el caso)
      const vendedorId = v.vendedor || 'desconocido';
      const currentV = vMap.get(vendedorId) || { nombre: 'Vendedor ' + vendedorId, total: 0, monto: 0 };
      if (currentV.nombre.startsWith('Vendedor')) {
        const vObj = vendedoresList.find(vend => vend.id.toString() === vendedorId.toString());
        if (vObj) currentV.nombre = vObj.nombre;
      }
      currentV.total += Number(v.cantidad);
      currentV.monto += Number(v.total || 0);
      vMap.set(vendedorId, currentV);
    });
    
    const statsArray = Array.from(statsMap.entries()).map(([id, data]: [string, {nombre: string, total: number, foto: string}]) => ({
      producto: id,
      nombre: data.nombre,
      totalVendidos: data.total,
      foto: data.foto
    })).sort((a: any, b: any) => b.totalVendidos - a.totalVendidos);
    
    setVentasStats(statsArray);
    
    const topVend = Array.from(vMap.entries()).map(([id, data]: [string, {nombre: string, total: number, monto: number}]) => ({
      vendedor: id,
      nombre: data.nombre,
      totalVendido: data.total,
      totalMonto: data.monto
    })).sort((a: any, b: any) => b.totalMonto - a.totalMonto);
    
    setTopVendedores(topVend);
  };

  useEffect(() => {
    fetchNotificaciones();
    fetchVendedores();
    fetchAlertas();
    fetchVendedoresData();

    if (mode === 'vendedor') {
      const intervalId = setInterval(fetchNotificaciones, 60000);
      return () => clearInterval(intervalId);
    }
  }, [mode]);

  // Recargar datos cuando cambien los filtros
  useEffect(() => {
    if (isLoadingVendedoresData) return;
    fetchVendedoresData();
  }, [vendedorIdFiltroAlertas, vendedorIdFiltroStats]);

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
  const handleQuickNotify = (vendedor: Vendedor, productos: Producto[]) => {
    const listado = productos.map(p => {
      const cant = (p.tiene_parametros || p.tieneParametros) && p.parametros 
        ? p.parametros.reduce((sum, param) => sum + param.cantidad, 0)
        : p.cantidad;
      return `- ${p.nombre}: ${cant === 0 ? 'AGOTADO' : `solo ${cant} unidades`}`;
    }).join('\n');

    setQuickNotifyTarget({
      id: vendedor.id,
      nombre: vendedor.nombre,
      mensaje: `Hola ${vendedor.nombre}, tienes los siguientes productos con stock crítico:\n\n${listado}\n\nPor favor, solicita reposición pronto.`
    });
    setQuickNotifyDialog(true);
  };

  const submitQuickNotify = async () => {
    if (!quickNotifyTarget) return;
    
    setIsSubmitting(true);
    try {
      await crearNotificacion(quickNotifyTarget.mensaje, [quickNotifyTarget.id]);
      toast({
        title: "Éxito",
        description: `Notificación enviada a ${quickNotifyTarget.nombre}`,
      });
      setQuickNotifyDialog(false);
      setQuickNotifyTarget(null);
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

  const debugNotificacion = (notificacion: Notificacion) => {
    console.log('Estructura de la notificación:', {
      id: notificacion.id,
      notificacion_grupo_id: notificacion.notificacion_grupo_id,
      texto: notificacion.texto,
      fecha: notificacion.fecha,
      usuarios: notificacion.usuarios?.map((u: {id: string, nombre: string, leida: boolean}) => ({
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
      setNotificaciones((prev: Notificacion[]) =>
        prev.map((notif: Notificacion) =>
          notif.id === id ? { ...notif, leida: true } : notif
        )
      );

      // ✅ Dispatch event to sync the badge in the header
      window.dispatchEvent(new CustomEvent('notificacionesUpdated'));

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
      setSelectedVendors(vendedores.map((v: Vendedor) => v.id));
    }
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendors((prev: string[]) => {
      if (prev.includes(vendorId)) {
        return prev.filter((id: string) => id !== vendorId);
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
    } catch (error) {
      return dateString;
    }
  };
  
  // ✅ Recargar notificaciones automáticamente para mantener el sistema actualizado
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotificaciones();
      if (mode === 'admin') fetchAlertas();
    }, 30000); // Refrescar cada 30 segundos
    
    return () => clearInterval(interval);
  }, [mode]);

  // ✅ Refrescar inmediatamente al cambiar a la pestaña de mensajes para ver novedades
  useEffect(() => {
    if (activeTab === 'mensajes') {
      fetchNotificaciones();
    }
  }, [activeTab]);

  // Componente para el panel de administrador
  if (mode === 'admin') {
    return (
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mensajes">Mensajes</TabsTrigger>
            <TabsTrigger value="vencimiento">Vencimientos</TabsTrigger>
            <TabsTrigger value="almacen">Almacén</TabsTrigger>
            <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          </TabsList>

          <TabsContent value="mensajes" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Notificaciones Enviadas</CardTitle>
                  <Button
                    onClick={() => setShowCrearDialog(true)}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Nueva Notificación
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Texto</TableHead>
                          <TableHead>Vendedor</TableHead>
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
                          notificaciones.map((notificacion: Notificacion) => (
                            <React.Fragment key={notificacion.id}>
                              {notificacion.usuarios && notificacion.usuarios.map((usuario: {id: string, nombre: string, leida: boolean}, index: number) => (
                                <TableRow
                                  key={`${notificacion.id}-${usuario.id}`}
                                  className={usuario.leida ? "bg-green-50" : "bg-red-50"}
                                >
                                  {index === 0 ? (
                                    <>
                                      <TableCell rowSpan={notificacion.usuarios!.length} className="align-top">
                                        <div>
                                          <p className="font-medium">{notificacion.texto}</p>
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
                                          onClick={() => handleAbrirEliminarDialog(notificacion)}
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
          </TabsContent>

          <TabsContent value="vencimiento" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Productos con Vencimiento</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingVencimiento ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Fecha de Vencimiento</TableHead>
                          <TableHead>Días Restantes</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productosVencimiento.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                              No hay productos con fecha de vencimiento
                            </TableCell>
                          </TableRow>
                        ) : (
                          productosVencimiento.map((producto) => {
                            const hoy = startOfDay(new Date());
                            const fechaVencimiento = startOfDay(new Date(producto.fecha_vencimiento!));
                            const diasRestantes = differenceInDays(fechaVencimiento, hoy);
                            const estaVencido = isBefore(fechaVencimiento, hoy);
                            const vencePronto = diasRestantes <= 7 && !estaVencido;

                            let bgColor = "";
                            let textColor = "";
                            let statusText = "";

                            if (estaVencido) {
                              bgColor = "bg-red-100";
                              textColor = "text-red-800";
                              statusText = "Vencido";
                            } else if (vencePronto) {
                              bgColor = "bg-yellow-100";
                              textColor = "text-yellow-800";
                              statusText = "Vence pronto";
                            } else {
                              bgColor = "bg-green-100";
                              textColor = "text-green-800";
                              statusText = "Vigente";
                            }

                            return (
                              <TableRow key={producto.id} className={estaVencido ? "bg-red-50" : vencePronto ? "bg-yellow-50" : ""}>
                                <TableCell className="font-medium">{producto.nombre}</TableCell>
                                <TableCell>{format(new Date(producto.fecha_vencimiento!), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>
                                  {estaVencido ? (
                                    <span className="text-red-600 font-bold">Hace {Math.abs(diasRestantes)} días</span>
                                  ) : (
                                    <span>{diasRestantes} días</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${bgColor} ${textColor}`}>
                                    {statusText}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="almacen" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Alertas de Stock Almacén</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingVencimiento ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Filtros de Cantidad */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant={filtroCantidad === 'todos' ? 'secondary' : 'outline'} 
                        size="sm"
                        onClick={() => setFiltroCantidad('todos')}
                        className="rounded-full px-4"
                      >
                        Todos ({productosCantidades.length})
                      </Button>
                      <Button 
                        variant={filtroCantidad === 'agotados' ? 'destructive' : 'outline'} 
                        size="sm"
                        onClick={() => setFiltroCantidad('agotados')}
                        className={`rounded-full px-4 ${filtroCantidad === 'agotados' ? '' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                      >
                        Agotados ({productosCantidades.filter(p => {
                          const cant = p.tiene_parametros && p.parametros 
                            ? p.parametros.reduce((sum, param) => sum + param.cantidad, 0)
                            : p.cantidad;
                          return cant === 0;
                        }).length})
                      </Button>
                      <Button 
                        variant={filtroCantidad === 'bajo' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setFiltroCantidad('bajo')}
                        className={`rounded-full px-4 ${filtroCantidad === 'bajo' ? 'bg-orange-500 hover:bg-orange-600' : 'text-orange-600 border-orange-200 hover:bg-orange-50'}`}
                      >
                        Bajo Stock ({productosCantidades.filter(p => {
                          const cant = p.tiene_parametros && p.parametros 
                            ? p.parametros.reduce((sum, param) => sum + param.cantidad, 0)
                            : p.cantidad;
                          return cant > 0;
                        }).length})
                      </Button>
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Stock Actual</TableHead>
                            <TableHead>Mínimo</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productosCantidades.filter(p => {
                            const cantidadTotal = p.tiene_parametros && p.parametros 
                              ? p.parametros.reduce((sum, param) => sum + param.cantidad, 0)
                              : p.cantidad;
                            
                            if (filtroCantidad === 'agotados') return cantidadTotal === 0;
                            if (filtroCantidad === 'bajo') return cantidadTotal > 0;
                            return true;
                          }).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                {filtroCantidad === 'todos' 
                                  ? "No hay alertas de stock en este momento" 
                                  : filtroCantidad === 'agotados' 
                                    ? "No hay productos agotados" 
                                    : "No hay productos con bajo stock"}
                              </TableCell>
                            </TableRow>
                          ) : (
                            productosCantidades.filter(p => {
                              const cantidadTotal = p.tiene_parametros && p.parametros 
                                ? p.parametros.reduce((sum, param) => sum + param.cantidad, 0)
                                : p.cantidad;
                              
                              if (filtroCantidad === 'agotados') return cantidadTotal === 0;
                              if (filtroCantidad === 'bajo') return cantidadTotal > 0;
                              return true;
                            }).map((producto) => {
                              const cantidadTotal = producto.tiene_parametros && producto.parametros 
                                ? producto.parametros.reduce((sum, param) => sum + param.cantidad, 0)
                                : producto.cantidad;
                              
                              return (
                                <TableRow key={producto.id}>
                                  <TableCell className="font-medium">{producto.nombre}</TableCell>
                                  <TableCell>
                                    <span className={cantidadTotal === 0 ? "text-red-600 font-bold" : "text-orange-600 font-medium"}>
                                      {cantidadTotal}
                                    </span>
                                  </TableCell>
                                  <TableCell>{producto.stock_minimo ?? 0}</TableCell>
                                  <TableCell>
                                    {cantidadTotal === 0 ? (
                                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 border border-red-200">
                                        Agotado
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 border border-orange-200">
                                        Stock Bajo
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendedores" className="space-y-4 pt-4">
            <Tabs value={activeVendedoresTab} onValueChange={setActiveVendedoresTab}>
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger value="cantidades_v">Cantidades (Vendedores)</TabsTrigger>
                <TabsTrigger value="ventas_v">Rendimiento Ventas</TabsTrigger>
              </TabsList>

              <TabsContent value="cantidades_v" className="pt-4">
                <Card className="border-none shadow-none bg-transparent">
                  <CardHeader className="px-0 pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-xl flex items-center text-orange-700">
                          <AlertTriangle className="mr-2 h-6 w-6" />
                          Stock Crítico
                        </CardTitle>
                        <p className="text-xs text-gray-500">Monitoreo de inventario bajo por vendedor</p>
                      </div>
                      
                      <div className="w-full sm:w-64">
                        <Select value={vendedorIdFiltroAlertas} onValueChange={setVendedorIdFiltroAlertas}>
                          <SelectTrigger className="bg-white border-orange-200">
                            <Users className="mr-2 h-4 w-4 text-orange-500" />
                            <SelectValue placeholder="Seleccionar Vendedor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos los Vendedores</SelectItem>
                            {vendedores.map((v: Vendedor) => (
                              <SelectItem key={v.id} value={v.id.toString()}>{v.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-0">
                    {!vendedorIdFiltroAlertas ? (
                      <Card className="bg-gray-50 border-gray-200 border-dashed">
                        <CardContent className="flex flex-col items-center py-20 text-center">
                          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <Users className="h-8 w-8 text-orange-400" />
                          </div>
                          <p className="text-gray-600 font-bold text-lg">Selecciona un vendedor</p>
                          <p className="text-gray-400 text-sm max-w-xs">Elige un vendedor o "Todos" del menú superior para ver sus alertas de stock.</p>
                        </CardContent>
                      </Card>
                    ) : isLoadingVendedoresData ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                        <p className="text-sm text-orange-600 font-medium animate-pulse">Cargando inventarios...</p>
                      </div>
                    ) : vendedorAlertas.length === 0 ? (
                      <Card className="bg-green-50 border-green-100 border-dashed">
                        <CardContent className="flex flex-col items-center py-16">
                          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <Check className="h-8 w-8 text-green-600" />
                          </div>
                          <p className="text-green-800 font-bold text-lg">Inventario Saludable</p>
                          <p className="text-green-600 text-sm text-center max-w-xs">No se encontraron productos con stock bajo para los filtros seleccionados.</p>
                          <Button variant="outline" className="mt-6 border-green-200 text-green-700 hover:bg-green-100" onClick={() => setVendedorIdFiltroAlertas('todos')}>
                            Ver todos los vendedores
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {vendedorAlertas.map((item) => (
                          <Card key={item.vendedor.id} className="overflow-hidden border-orange-100 shadow-sm flex flex-col">
                            <div className="bg-orange-50 px-4 py-3 flex justify-between items-center border-b border-orange-100">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs">
                                  {item.vendedor.nombre.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-gray-800">{item.vendedor.nombre}</h4>
                                  <Badge className="bg-orange-600 text-[9px] h-4 px-1.5">{item.productos.length} Alertas</Badge>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 rounded-full hover:bg-orange-200 text-orange-700"
                                onClick={() => handleQuickNotify(item.vendedor, item.productos)}
                              >
                                <Bell className="h-4 w-4" />
                              </Button>
                            </div>
                            <ScrollArea className="flex-grow max-h-[350px]">
                              <div className="divide-y divide-orange-50">
                                {item.productos.map(p => {
                                  const cant = (p.tiene_parametros || p.tieneParametros) && p.parametros 
                                    ? p.parametros.reduce((sum, param) => sum + param.cantidad, 0)
                                    : p.cantidad;
                                  return (
                                    <div key={p.id} className="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-lg bg-white border border-orange-50 overflow-hidden flex-shrink-0 shadow-sm">
                                          {p.foto ? (
                                            <img src={p.foto} alt={p.nombre} className="h-full w-full object-cover" />
                                          ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-300">
                                              <Search className="h-5 w-5 opacity-20" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="max-w-[120px] sm:max-w-none">
                                          <p className="font-bold text-xs text-gray-700 truncate">{p.nombre}</p>
                                          <p className="text-[10px] text-gray-400">Mín: {p.stock_minimo || 0}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className={`text-xs font-black px-2 py-0.5 rounded-full ${cant === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                          {cant} und
                                        </div>
                                        <p className={`text-[8px] uppercase font-black mt-1 ${cant === 0 ? 'text-red-500' : 'text-orange-500'}`}>
                                          {cant === 0 ? 'AGOTADO' : 'BAJO STOCK'}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ventas_v" className="pt-4 space-y-4">
                {/* Header con Filtro */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Rendimiento de Ventas</h3>
                      <p className="text-xs text-gray-500">
                        {vendedorIdFiltroStats === 'todos' 
                          ? 'Análisis global de la tienda' 
                          : `Análisis para ${vendedores.find(v => v.id.toString() === vendedorIdFiltroStats)?.nombre}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-64">
                    <Select value={vendedorIdFiltroStats} onValueChange={setVendedorIdFiltroStats}>
                      <SelectTrigger className="bg-white">
                        <Users className="mr-2 h-4 w-4 text-blue-500" />
                        <SelectValue placeholder="Seleccionar Vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Toda la Tienda</SelectItem>
                        {vendedores.map((v: Vendedor) => (
                          <SelectItem key={v.id} value={v.id.toString()}>{v.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!vendedorIdFiltroStats ? (
                  <Card className="bg-gray-50 border-gray-200 border-dashed">
                    <CardContent className="flex flex-col items-center py-20 text-center">
                      <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <BarChart3 className="h-8 w-8 text-blue-400" />
                      </div>
                      <p className="text-gray-600 font-bold text-lg">Analizar rendimiento</p>
                      <p className="text-gray-400 text-sm max-w-xs">Selecciona un vendedor o la tienda completa para generar las estadísticas de ventas.</p>
                    </CardContent>
                  </Card>
                ) : isLoadingVendedoresData ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    <p className="text-sm text-blue-600 font-medium animate-pulse">Analizando transacciones...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top Vendedores - Solo se muestra si el filtro es "todos" */}
                    {vendedorIdFiltroStats === 'todos' && (
                      <Card className="border-none shadow-lg bg-white overflow-hidden flex flex-col">
                        <CardHeader className="bg-blue-600 text-white pb-6 shrink-0">
                          <CardTitle className="text-lg flex items-center">
                            <BarChart3 className="mr-2 h-5 w-5" /> Mejores Vendedores
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 flex-grow p-0">
                          <ScrollArea className="h-[400px]">
                            {topVendedores.length === 0 ? (
                              <div className="flex flex-col items-center py-20 text-gray-400">
                                <Users className="h-12 w-12 opacity-20 mb-2" />
                                <p className="text-sm">Sin datos</p>
                              </div>
                            ) : (
                              <div className="space-y-6 p-6 pt-0">
                                {topVendedores.map((stat, idx) => (
                                  <div key={stat.vendedor} className="flex flex-col gap-1 group">
                                    <div className="flex justify-between items-center mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-700' : 'bg-blue-50 text-blue-700'}`}>
                                          {idx + 1}
                                        </span>
                                        <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{stat.nombre}</span>
                                      </div>
                                      <span className="text-xs font-black text-blue-600">${Number(stat.totalMonto).toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 w-full bg-blue-50 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                                        style={{ width: `${(stat.totalMonto / (topVendedores[0]?.totalMonto || 1)) * 100}%` }} 
                                      />
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Volumen</span>
                                      <span className="text-[10px] text-gray-500 font-medium">{stat.totalVendido} unid.</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {/* Top Productos */}
                    <Card className={`border-none shadow-lg bg-white overflow-hidden flex flex-col ${vendedorIdFiltroStats !== 'todos' ? 'lg:col-span-1.5' : ''}`}>
                      <CardHeader className="bg-green-600 text-white pb-6 shrink-0">
                        <CardTitle className="text-lg flex items-center">
                          <TrendingUp className="mr-2 h-5 w-5" /> Productos Estrella
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 flex-grow">
                        <ScrollArea className="h-[400px]">
                          {ventasStats.filter(s => s.totalVendidos > 0).length === 0 ? (
                            <p className="text-center text-gray-400 py-20 text-sm">Sin datos de ventas</p>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {ventasStats.filter(s => s.totalVendidos > 0).map((stat, idx) => (
                                <div key={stat.producto} className="flex items-center justify-between p-4 hover:bg-green-50 transition-colors">
                                  <div className="flex items-center gap-4 overflow-hidden">
                                    <span className={`text-sm font-black w-6 flex-shrink-0 ${idx < 3 ? 'text-green-600' : 'text-gray-300'}`}>
                                      {idx + 1}
                                    </span>
                                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-green-100 shadow-sm">
                                      {stat.foto ? (
                                        <img src={stat.foto} alt={stat.nombre} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-300 text-[10px]">IMG</div>
                                      )}
                                    </div>
                                    <div className="truncate">
                                      <p className="text-sm font-bold text-gray-700 truncate">{stat.nombre}</p>
                                      <p className="text-[10px] text-green-600 font-black uppercase tracking-tight">{stat.totalVendidos} vendidos</p>
                                    </div>
                                  </div>
                                  {idx === 0 && <Badge className="bg-yellow-400 text-yellow-900 text-[8px] h-4">TOP #1</Badge>}
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Estancados */}
                    <Card className="border-none shadow-lg bg-white overflow-hidden flex flex-col">
                      <CardHeader className="bg-red-600 text-white pb-6 shrink-0">
                        <CardTitle className="text-lg flex items-center">
                          <AlertTriangle className="mr-2 h-5 w-5" /> Poca Rotación
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 flex-grow">
                        <ScrollArea className="h-[400px]">
                          {ventasStats.filter(s => s.totalVendidos < 5).length === 0 ? (
                            <div className="flex flex-col items-center py-20 text-gray-400">
                              <Check className="h-12 w-12 opacity-20 mb-2" />
                              <p className="text-sm">Todo rota bien</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {[...ventasStats].filter(s => s.totalVendidos < 5).reverse().map((stat) => (
                                <div key={stat.producto} className="flex items-center justify-between p-4 hover:bg-red-50 transition-colors">
                                  <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-red-100 shadow-sm">
                                      {stat.foto ? (
                                        <img src={stat.foto} alt={stat.nombre} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-300 text-[10px]">IMG</div>
                                      )}
                                    </div>
                                    <div className="truncate">
                                      <p className="text-sm font-bold text-gray-700 truncate">{stat.nombre}</p>
                                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{stat.totalVendidos} ventas</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[8px] font-black">ESTANCADO</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

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
                  {notificacionParaEliminar?.usuarios?.map((usuario: {id: string, nombre: string, leida: boolean}) => (
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

        {/* ✅ NUEVO: Diálogo de notificación rápida */}
        <Dialog open={quickNotifyDialog} onOpenChange={setQuickNotifyDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Notificación rápida a {quickNotifyTarget?.nombre}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={quickNotifyTarget?.mensaje || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuickNotifyTarget((prev: {id: string, nombre: string, mensaje: string} | null) => prev ? { ...prev, mensaje: e.target.value } : null)}
                className="min-h-[150px] text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setQuickNotifyDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={submitQuickNotify} disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white">
                  {isSubmitting ? "Enviando..." : "Enviar Notificación"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Botón flotante para agregar notificación se movió a la pestaña de mensajes */}
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
            {notificaciones.map((notif: Notificacion) => (
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
        const cantidadNoLeidas = notificaciones.filter((n: Notificacion) => !n.leida).length;
        setNoLeidas(cantidadNoLeidas);
      } catch (error) {
        console.error('Error al cargar notificaciones:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotificaciones();
    
    // ✅ Listen for synchronization events
    const handleSync = () => {
      fetchNotificaciones();
    };

    window.addEventListener('notificacionesUpdated', handleSync);
    const intervalId = setInterval(fetchNotificaciones, 60000);
    
    return () => {
      window.removeEventListener('notificacionesUpdated', handleSync);
      clearInterval(intervalId);
    };
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
