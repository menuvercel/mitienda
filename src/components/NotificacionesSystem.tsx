'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { 
  Bell, 
  AlertTriangle, 
  Calendar, 
  Package, 
  Users, 
  TrendingUp, 
  Send, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Flame, 
  AlertOctagon, 
  RefreshCw,
  Search,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal
} from 'lucide-react';
import { Producto, Vendedor, AlertaVendedorStock } from '@/types';
import { getNotificationKey } from './VencimientoBell';

interface NotificacionesSystemProps {
  isOpen?: boolean;
  onClose?: () => void;
  vendedores?: Vendedor[];
  isFullPage?: boolean;
  initialTab?: 'vencimientos' | 'almacen' | 'vendedores';
}

export const NotificacionesSystem: React.FC<NotificacionesSystemProps> = ({
  isOpen = true,
  onClose,
  vendedores = [],
  isFullPage = false,
  initialTab = 'vencimientos'
}) => {
  const [activeTab, setActiveTab] = useState<'vencimientos' | 'almacen' | 'vendedores'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [subTabVendedores, setSubTabVendedores] = useState<'cantidades' | 'rendimiento'>('cantidades');
  
  // Data states
  const [vencimientos, setVencimientos] = useState<any[]>([]);
  const [alertasAlmacen, setAlertasAlmacen] = useState<any[]>([]);
  const [filtroAlmacen, setFiltroAlmacen] = useState<'todos' | 'agotados' | 'bajo_stock'>('todos');
  
  const [vendedoresAlertas, setVendedoresAlertas] = useState<AlertaVendedorStock[]>([]);
  const [listaVendedoresApi, setListaVendedoresApi] = useState<{ id: string; nombre: string }[]>([]);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<string>('todos');
  const [rotacionProductos, setRotacionProductos] = useState<any[]>([]);
  const [productosEstrella, setProductosEstrella] = useState<any[]>([]);
  const [productosEstancados, setProductosEstancados] = useState<any[]>([]);
  const [rankingVendedores, setRankingVendedores] = useState<any[]>([]);
  
  // Filtros para la tabla de rotación
  const [rotacionVendedorFiltro, setRotacionVendedorFiltro] = useState<string>('todos');
  const [rotacionEstadoFiltro, setRotacionEstadoFiltro] = useState<string>('todos');
  const [rotacionSearchTerm, setRotacionSearchTerm] = useState<string>('');

  // Ordenamiento para rotación (Tocar para organizar de menor a mayor / mayor a menor)
  type SortField = 'indice_rotacion_diaria' | 'unidades_vendidas' | 'stock_actual' | 'dias_vigencia' | 'producto_nombre' | 'vendedor_nombre';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('indice_rotacion_diaria');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchNotificaciones = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notificaciones');
      if (res.ok) {
        const data = await res.json();
        setVencimientos(data.vencimientos || []);
        setAlertasAlmacen(data.almacen || []);
        if (data.vendedores) {
          if (data.vendedores.lista) {
            setListaVendedoresApi(data.vendedores.lista);
          }
          setVendedoresAlertas(data.vendedores.alertas || []);
          setRotacionProductos(data.vendedores.rotacionProductos || []);
          setProductosEstrella(data.vendedores.productosEstrella || []);
          setProductosEstancados(data.vendedores.productosEstancados || []);
          setRankingVendedores(data.vendedores.rankingVendedores || []);
        }
      }
    } catch (err) {
      console.error('Error al cargar panel de notificaciones:', err);
      toast({
        title: "Error de carga",
        description: "No se pudieron obtener las notificaciones actualizadas.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markTabAsRead = useCallback((tab: 'vencimientos' | 'almacen' | 'vendedores' | 'all') => {
    try {
      let readKeysSet = new Set<string>();
      const stored = localStorage.getItem('read_notif_keys');
      if (stored) {
        readKeysSet = new Set(JSON.parse(stored));
      }

      if (tab === 'vencimientos' || tab === 'all') {
        vencimientos.filter(v => v.estado !== 'vigente').forEach(v => {
          readKeysSet.add(getNotificationKey('vencimiento', v));
        });
      }

      if (tab === 'almacen' || tab === 'all') {
        alertasAlmacen.filter(a => a.estado !== 'normal').forEach(a => {
          readKeysSet.add(getNotificationKey('almacen', a));
        });
      }

      if (tab === 'vendedores' || tab === 'all') {
        vendedoresAlertas.forEach(vend => {
          (vend.productos_criticos || []).forEach(prod => {
            readKeysSet.add(`vend_${vend.vendedor_id}_${prod.id}_${prod.estado}`);
          });
        });
      }

      localStorage.setItem('read_notif_keys', JSON.stringify(Array.from(readKeysSet)));
      window.dispatchEvent(new Event('notificaciones_updated'));
    } catch (e) {
      console.error('Error marking notifications as read:', e);
    }
  }, [vencimientos, alertasAlmacen, vendedoresAlertas]);

  useEffect(() => {
    if (isOpen) {
      fetchNotificaciones();
    }
  }, [isOpen, fetchNotificaciones]);

  useEffect(() => {
    if (isOpen) {
      markTabAsRead(activeTab);
    }
  }, [isOpen, activeTab, markTabAsRead]);

  // QuickNotify Handler
  const handleQuickNotify = (vendedor: AlertaVendedorStock) => {
    const listaCriticos = vendedor.productos_criticos
      .map(p => `- ${p.nombre} (${p.estado === 'agotado' ? 'AGOTADO' : `Stock: ${p.cantidad} / Mín: ${p.stock_minimo}`})`)
      .join('\n');

    const mensaje = `Hola ${vendedor.vendedor_nombre}, este es un aviso sobre tu inventario crítico en punto de venta:\n\n${listaCriticos}\n\nPor favor gestiona la reposición o actualización.`;

    if (vendedor.vendedor_telefono) {
      const cleanPhone = vendedor.vendedor_telefono.replace(/\D/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');
    } else {
      navigator.clipboard.writeText(mensaje);
      toast({
        title: "Mensaje copiado al portapapeles 📋",
        description: `Se copió la alerta de stock para ${vendedor.vendedor_nombre}. Puedes enviársela directamente.`,
      });
    }
  };

  // Filtered Vencimientos
  const vencimientosFiltrados = vencimientos.filter(p => 
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered Almacen Alertas
  const almacenFiltrado = alertasAlmacen.filter(item => {
    const matchSearch = item.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (filtroAlmacen === 'agotados') return item.estado === 'agotado';
    if (filtroAlmacen === 'bajo_stock') return item.estado === 'bajo_stock';
    return true;
  });

  // Filtered Vendedores Alertas
  const vendedoresAlertasFiltradas = vendedoresAlertas.filter(v => {
    if (vendedorSeleccionado !== 'todos' && String(v.vendedor_id) !== String(vendedorSeleccionado)) {
      return false;
    }
    return v.vendedor_nombre.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Todos los vendedores consolidados (prop vendedores, API lista, rotacion y alertas)
  const todosLosVendedores = React.useMemo(() => {
    const map = new Map<string, string>();
    // 1. De prop vendedores
    (vendedores || []).forEach(v => {
      if (v && v.id) map.set(String(v.id), v.nombre || `Vendedor #${v.id}`);
    });
    // 2. De lista de la API
    (listaVendedoresApi || []).forEach(v => {
      if (v && v.id) map.set(String(v.id), v.nombre || `Vendedor #${v.id}`);
    });
    // 3. De productos en rotación
    (rotacionProductos || []).forEach(r => {
      if (r && r.vendedor_id) map.set(String(r.vendedor_id), r.vendedor_nombre || `Vendedor #${r.vendedor_id}`);
    });
    // 4. De alertas de vendedores
    (vendedoresAlertas || []).forEach(va => {
      if (va && va.vendedor_id) map.set(String(va.vendedor_id), va.vendedor_nombre || `Vendedor #${va.vendedor_id}`);
    });

    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [vendedores, listaVendedoresApi, rotacionProductos, vendedoresAlertas]);

  // Productos de rotación filtrados para la tabla
  const filteredRotacionProductos = rotacionProductos.filter(item => {
    if (rotacionVendedorFiltro !== 'todos' && String(item.vendedor_id) !== String(rotacionVendedorFiltro)) {
      return false;
    }
    if (rotacionEstadoFiltro !== 'todos' && item.estado_vigencia !== rotacionEstadoFiltro) {
      return false;
    }
    if (rotacionSearchTerm.trim() !== '') {
      const matchProd = item.producto_nombre.toLowerCase().includes(rotacionSearchTerm.toLowerCase());
      const matchVend = item.vendedor_nombre.toLowerCase().includes(rotacionSearchTerm.toLowerCase());
      if (!matchProd && !matchVend) return false;
    }
    return true;
  });

  // Productos de rotación ordenados dinámicamente según campo y dirección (menor a mayor / mayor a menor)
  const sortedRotacionProductos = React.useMemo(() => {
    const list = [...filteredRotacionProductos];
    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (sortField === 'producto_nombre' || sortField === 'vendedor_nombre') {
        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortDirection === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      }

      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
    return list;
  }, [filteredRotacionProductos, sortField, sortDirection]);

  const mainContent = (
    <div className="w-full space-y-4">
      {/* CABECERA RESPONSIVE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 shrink-0" />
            Panel de Notificaciones y Alertas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitoreo en tiempo real de caducidades, existencias críticas e índice de rotación.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchNotificaciones} 
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 text-slate-600 border-orange-200 hover:bg-orange-50 w-full sm:w-auto h-9 text-xs sm:text-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* BUSCADOR RÁPIDO RESPONSIVE */}
      <div className="relative my-2 sm:my-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por producto o vendedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9 sm:h-10 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 rounded-lg"
        />
      </div>

      {/* PESTAÑAS PRINCIPALES RESPONSIVE */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-auto">
          <TabsTrigger value="vencimientos" className="flex items-center justify-center gap-1 sm:gap-2 py-2 text-[11px] sm:text-sm font-medium">
            <Calendar className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span className="truncate">Vencidos</span>
            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
              {vencimientos.filter(v => v.estado !== 'vigente').length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="almacen" className="flex items-center justify-center gap-1 sm:gap-2 py-2 text-[11px] sm:text-sm font-medium">
            <Package className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <span className="truncate">Almacén</span>
            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">
              {alertasAlmacen.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="vendedores" className="flex items-center justify-center gap-1 sm:gap-2 py-2 text-[11px] sm:text-sm font-medium">
            <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="truncate">Vendedores</span>
            {vendedoresAlertas.length > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                {vendedoresAlertas.reduce((acc, v) => acc + (v.productos_criticos?.length || 0), 0)}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 1. PESTAÑA VENCIMIENTOS */}
        <TabsContent value="vencimientos" className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-orange-50 dark:bg-orange-950/40 p-3 rounded-xl border border-orange-200 dark:border-orange-800">
            <span className="text-xs sm:text-sm font-medium text-orange-800 dark:text-orange-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600" />
              Seguimiento global de fechas de expiración en inventario.
            </span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
              <Badge variant="destructive" className="bg-red-600 text-[10px] sm:text-xs">🔴 Vencido</Badge>
              <Badge className="bg-amber-500 text-white text-[10px] sm:text-xs">🟡 Vence pronto (≤ 7 días)</Badge>
              <Badge className="bg-emerald-600 text-white text-[10px] sm:text-xs">🟢 Vigente</Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 sm:py-16 border rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-orange-500 mx-auto" />
              <p className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300">Cargando notificaciones y vencimientos...</p>
            </div>
          ) : vencimientosFiltrados.length === 0 ? (
            <div className="text-center py-8 sm:py-10 border rounded-xl bg-slate-50 dark:bg-slate-900">
              <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300">No hay productos con alertas de vencimiento</p>
              <p className="text-xs text-slate-500">Todos los artículos marcados están al día.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vencimientosFiltrados.map((item) => (
                <Card 
                  key={item.id} 
                  className={`border-l-4 ${
                    item.estado === 'vencido' 
                      ? 'border-l-red-600 bg-red-50/30 dark:bg-red-950/20' 
                      : item.estado === 'vence_pronto' 
                        ? 'border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20' 
                        : 'border-l-emerald-500'
                  }`}
                >
                  <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">{item.nombre}</h4>
                      <p className="text-xs text-slate-500">Sección: {item.seccion || 'General'} | Stock: {item.cantidad}</p>
                      <p className="text-xs sm:text-sm font-medium mt-1">
                        Vencimiento: <span className="underline">{item.fecha_vencimiento}</span>
                      </p>
                    </div>
                    <div className="self-start sm:self-auto sm:text-right">
                      {item.estado === 'vencido' && (
                        <Badge variant="destructive" className="bg-red-600 text-[10px] sm:text-xs">
                          Hace {item.dias_diferencia} día(s)
                        </Badge>
                      )}
                      {item.estado === 'vence_pronto' && (
                        <Badge className="bg-amber-500 text-white text-[10px] sm:text-xs">
                          Faltan {item.dias_diferencia} día(s)
                        </Badge>
                      )}
                      {item.estado === 'vigente' && (
                        <Badge className="bg-emerald-600 text-white text-[10px] sm:text-xs">
                          Vigente ({item.dias_diferencia} días)
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 2. PESTAÑA ALMACÉN */}
        <TabsContent value="almacen" className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
            <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
              Filtros de Stock en Almacén:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant={filtroAlmacen === 'todos' ? 'default' : 'outline'}
                onClick={() => setFiltroAlmacen('todos')}
                className="h-8 text-xs flex-1 sm:flex-none"
              >
                Todos ({alertasAlmacen.length})
              </Button>
              <Button
                size="sm"
                variant={filtroAlmacen === 'agotados' ? 'destructive' : 'outline'}
                onClick={() => setFiltroAlmacen('agotados')}
                className={`h-8 text-xs flex-1 sm:flex-none ${filtroAlmacen === 'agotados' ? 'bg-red-600' : ''}`}
              >
                🔴 Agotados ({alertasAlmacen.filter(a => a.estado === 'agotado').length})
              </Button>
              <Button
                size="sm"
                variant={filtroAlmacen === 'bajo_stock' ? 'default' : 'outline'}
                onClick={() => setFiltroAlmacen('bajo_stock')}
                className={`h-8 text-xs flex-1 sm:flex-none ${filtroAlmacen === 'bajo_stock' ? 'bg-orange-600 text-white' : ''}`}
              >
                🟠 Bajo Stock ({alertasAlmacen.filter(a => a.estado === 'bajo_stock').length})
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 sm:py-16 border rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-orange-500 mx-auto" />
              <p className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300">Cargando alertas de inventario...</p>
            </div>
          ) : almacenFiltrado.length === 0 ? (
            <div className="text-center py-8 sm:py-10 border rounded-xl bg-slate-50 dark:bg-slate-900">
              <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300">Sin alertas de stock en Almacén</p>
              <p className="text-xs text-slate-500">Todos los productos en almacén cuentan con existencias adecuadas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {almacenFiltrado.map((item, idx) => (
                <Card key={idx} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">{item.nombre}</h4>
                      <p className="text-xs text-slate-500">Ubicación: {item.ubicacion || 'Almacén General'}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Cantidad Actual: <span className="font-bold text-slate-900 dark:text-slate-100">{item.cantidad}</span> | Stock Mínimo: {item.stock_minimo}
                      </p>
                    </div>
                    <div className="self-start sm:self-auto">
                      {item.estado === 'agotado' ? (
                        <Badge variant="destructive" className="bg-red-600 text-[10px] sm:text-xs">🔴 Agotado</Badge>
                      ) : (
                        <Badge className="bg-orange-500 text-white text-[10px] sm:text-xs">🟠 Bajo Stock</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. PESTAÑA VENDEDORES */}
        <TabsContent value="vendedores" className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b pb-3 gap-3">
            <div className="grid grid-cols-2 sm:flex gap-1.5 sm:gap-2">
              <Button
                size="sm"
                variant={subTabVendedores === 'cantidades' ? 'default' : 'outline'}
                onClick={() => setSubTabVendedores('cantidades')}
                className="h-8 text-xs justify-center"
              >
                <AlertOctagon className="h-3.5 w-3.5 mr-1 text-red-500 shrink-0" />
                Stock Crítico
              </Button>
              <Button
                size="sm"
                variant={subTabVendedores === 'rendimiento' ? 'default' : 'outline'}
                onClick={() => setSubTabVendedores('rendimiento')}
                className="h-8 text-xs justify-center"
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1 text-emerald-500 shrink-0" />
                Rotación
              </Button>
            </div>

            {subTabVendedores === 'cantidades' && (
              <Select value={vendedorSeleccionado} onValueChange={setVendedorSeleccionado}>
                <SelectTrigger className="w-full sm:w-[220px] h-10 sm:h-9 text-xs sm:text-sm bg-white">
                  <SelectValue placeholder="Filtrar por Vendedor" />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-xl max-h-72">
                  <SelectItem value="todos">Todos los Vendedores ({todosLosVendedores.length})</SelectItem>
                  {todosLosVendedores.map(v => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* SUB-TAB A: CANTIDADES / STOCK CRÍTICO */}
          {subTabVendedores === 'cantidades' && (
            <div className="space-y-3 sm:space-y-4">
              {isLoading ? (
                <div className="text-center py-12 sm:py-16 border rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-blue-500 mx-auto" />
                  <p className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300">Cargando datos de vendedores...</p>
                </div>
              ) : vendedoresAlertasFiltradas.length === 0 ? (
                <div className="text-center py-8 sm:py-10 border rounded-xl bg-slate-50 dark:bg-slate-900">
                  <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300">No hay vendedores con productos en nivel crítico</p>
                </div>
              ) : (
                vendedoresAlertasFiltradas.map((vend) => (
                  <Card key={vend.vendedor_id} className="border-l-4 border-l-blue-600 shadow-sm">
                    <CardHeader className="p-3 sm:p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                          {vend.vendedor_nombre}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-0.5">
                          Agotados: <span className="font-semibold text-red-600">{vend.total_agotados}</span> | Bajo Stock: <span className="font-semibold text-orange-600">{vend.total_bajo_stock}</span>
                        </CardDescription>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleQuickNotify(vend)}
                        className="bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 shadow h-8 text-xs w-full sm:w-auto"
                        title="Enviar aviso preconfigurado por WhatsApp / Notificación rápida"
                      >
                        <Bell className="h-3.5 w-3.5" />
                        QuickNotify 🔔
                      </Button>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className="mt-2 space-y-2">
                        {vend.productos_criticos.map((prod) => (
                          <div key={prod.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs sm:text-sm gap-2">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{prod.nombre}</span>
                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                              <span className="text-xs text-slate-500">Stock: <strong className="text-slate-900 dark:text-slate-100">{prod.cantidad}</strong> / Mín: {prod.stock_minimo}</span>
                              {prod.estado === 'agotado' ? (
                                <Badge variant="destructive" className="bg-red-600 text-[10px]">🔴 AGOTADO</Badge>
                              ) : (
                                <Badge className="bg-orange-500 text-white text-[10px]">🟠 BAJO STOCK</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* SUB-TAB B: RENDIMIENTO VENTAS Y ROTACIÓN */}
          {subTabVendedores === 'rendimiento' && (
            <div className="space-y-4 sm:space-y-6">
              {/* ÍNDICE DE ROTACIÓN DE PRODUCTOS - TABLA CALIFICADORA */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600 shrink-0" />
                      Tabla de Calificación por Índice de Rotación
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Calificación por vendedor: Ventas acumuladas ÷ Días de vigencia en existencia. A mayor ventas en menor vigencia, mejor índice.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs self-start sm:self-auto border-blue-200 text-blue-700 bg-blue-50/50">
                    {filteredRotacionProductos.length} productos calificados
                  </Badge>
                </div>

                {/* FILTROS DE LA TABLA DE ROTACIÓN - RESPONSIVE MOBILE FIRST */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Punto de Venta / Vendedor
                      </label>
                      <Select value={rotacionVendedorFiltro} onValueChange={setRotacionVendedorFiltro}>
                        <SelectTrigger className="h-10 sm:h-9 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200">
                          <SelectValue placeholder="Todos los vendedores" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-white dark:bg-slate-900 border border-slate-200 shadow-xl max-h-72">
                          <SelectItem value="todos">Todos los vendedores ({todosLosVendedores.length})</SelectItem>
                          {todosLosVendedores.map(v => (
                            <SelectItem key={v.id} value={String(v.id)}>{v.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Estado de Vigencia
                      </label>
                      <Select value={rotacionEstadoFiltro} onValueChange={setRotacionEstadoFiltro}>
                        <SelectTrigger className="h-10 sm:h-9 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200">
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-white dark:bg-slate-900 border border-slate-200 shadow-xl max-h-72">
                          <SelectItem value="todos">Todos los estados</SelectItem>
                          <SelectItem value="activa">En Existencia (Vigencia activa)</SelectItem>
                          <SelectItem value="agotada">Agotados (Vigencia finalizada)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Buscar Producto o Vendedor
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 sm:top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Nombre de producto o vendedor..."
                          value={rotacionSearchTerm}
                          onChange={(e) => setRotacionSearchTerm(e.target.value)}
                          className="pl-9 pr-7 h-10 sm:h-9 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200"
                        />
                        {rotacionSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setRotacionSearchTerm('')}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs p-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CHIPS DE FILTROS ACTIVOS (Ideal para Mobile) */}
                  {(rotacionVendedorFiltro !== 'todos' || rotacionEstadoFiltro !== 'todos' || rotacionSearchTerm.trim() !== '') && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-500">Filtros activos:</span>
                      {rotacionVendedorFiltro !== 'todos' && (
                        <Badge variant="secondary" className="text-[11px] py-1 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5 rounded-lg">
                          <span>Vendedor: {todosLosVendedores.find(v => String(v.id) === String(rotacionVendedorFiltro))?.nombre || rotacionVendedorFiltro}</span>
                          <button type="button" onClick={() => setRotacionVendedorFiltro('todos')} className="hover:text-blue-900 text-xs font-bold">✕</button>
                        </Badge>
                      )}
                      {rotacionEstadoFiltro !== 'todos' && (
                        <Badge variant="secondary" className="text-[11px] py-1 px-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 rounded-lg">
                          <span>Estado: {rotacionEstadoFiltro === 'activa' ? 'En existencia' : 'Agotados'}</span>
                          <button type="button" onClick={() => setRotacionEstadoFiltro('todos')} className="hover:text-emerald-900 text-xs font-bold">✕</button>
                        </Badge>
                      )}
                      {rotacionSearchTerm.trim() !== '' && (
                        <Badge variant="secondary" className="text-[11px] py-1 px-2.5 bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 rounded-lg">
                          <span>&quot;{rotacionSearchTerm}&quot;</span>
                          <button type="button" onClick={() => setRotacionSearchTerm('')} className="hover:text-amber-900 text-xs font-bold">✕</button>
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setRotacionVendedorFiltro('todos');
                          setRotacionEstadoFiltro('todos');
                          setRotacionSearchTerm('');
                        }}
                        className="text-[11px] text-rose-600 hover:underline font-semibold ml-1 py-1"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                  {/* BARRA TÁCTIL DE ORDENAMIENTO (Menor a Mayor / Mayor a Menor) */}
                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 mr-1">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        Ordenar por:
                      </span>
                      {[
                        { field: 'indice_rotacion_diaria', label: 'Índice Rotación' },
                        { field: 'unidades_vendidas', label: 'Ventas' },
                        { field: 'stock_actual', label: 'Stock' },
                        { field: 'dias_vigencia', label: 'Vigencia' },
                        { field: 'producto_nombre', label: 'Producto' },
                      ].map((f) => {
                        const isActive = sortField === f.field;
                        return (
                          <button
                            key={f.field}
                            type="button"
                            onClick={() => handleSortToggle(f.field as SortField)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 active:scale-95 ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-xs font-bold'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{f.label}</span>
                            {isActive && (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3 stroke-[2.5]" />
                              ) : (
                                <ArrowDown className="h-3 w-3 stroke-[2.5]" />
                              )
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* BOTÓN RÁPIDO PARA ALTERNAR DIRECCIÓN (MENOR A MAYOR / MAYOR A MENOR) */}
                    <button
                      type="button"
                      onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className={`h-9 px-3 text-xs font-bold rounded-lg border transition-all active:scale-95 flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-xs ${
                        sortDirection === 'asc'
                          ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                      title="Toca para alternar entre Menor a Mayor y Mayor a Menor"
                    >
                      {sortDirection === 'asc' ? (
                        <>
                          <ArrowUp className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Menor a Mayor ⬆️</span>
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Mayor a Menor ⬇️</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {sortedRotacionProductos.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                      No hay productos registrados con datos de vigencia y ventas para los filtros seleccionados.
                    </p>
                    {(rotacionVendedorFiltro !== 'todos' || rotacionEstadoFiltro !== 'todos' || rotacionSearchTerm !== '') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRotacionVendedorFiltro('todos');
                          setRotacionEstadoFiltro('todos');
                          setRotacionSearchTerm('');
                        }}
                        className="mt-3 text-xs"
                      >
                        Restablecer todos los filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* VISTA MOBILE FIRST (< md): Tarjetas interactivas y compactas */}
                    <div className="block md:hidden space-y-3">
                      {sortedRotacionProductos.map((item, idx) => {
                        const rank = idx + 1;
                        return (
                          <div
                            key={`${item.vendedor_id}-${item.producto_id}-${idx}`}
                            className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
                          >
                            {/* Cabecera: Rank, Foto, Nombre, Vendedor y Calificación */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-xs">
                                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                                </span>
                                {item.producto_foto ? (
                                  <img
                                    src={item.producto_foto}
                                    alt={item.producto_nombre}
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-100 dark:border-slate-800 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                    <Package className="h-5 w-5" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate" title={item.producto_nombre}>
                                    {item.producto_nombre}
                                  </h5>
                                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium truncate max-w-full">
                                    📍 {item.vendedor_nombre}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {item.evaluacion === 'Alta Rotación' ? (
                                  <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 whitespace-nowrap">
                                    🚀 Alta
                                  </Badge>
                                ) : item.evaluacion === 'Rotación Media' ? (
                                  <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0.5 whitespace-nowrap">
                                    ⚡ Media
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="bg-rose-500 text-[10px] px-2 py-0.5 whitespace-nowrap">
                                    🐢 Baja
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Métricas en cuadrícula 2x2 optimizada para teléfonos móviles */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Existencias</span>
                                <span className={`font-bold text-xs ${item.stock_actual > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                                  {item.stock_actual > 0 ? `${item.stock_actual} u` : '0 (Agotado)'}
                                </span>
                              </div>

                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Ventas</span>
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                  {item.unidades_vendidas} unidades
                                </span>
                              </div>

                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Vigencia</span>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
                                  <span>{item.dias_vigencia} días</span>
                                  {item.estado_vigencia === 'activa' ? (
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="En existencia" />
                                  ) : (
                                    <span className="inline-block w-2 h-2 rounded-full bg-rose-400" title="Agotado" />
                                  )}
                                </div>
                              </div>

                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Índice Rotación</span>
                                <span className={`font-black text-xs ${
                                  item.evaluacion === 'Alta Rotación' ? 'text-emerald-600' : item.evaluacion === 'Rotación Media' ? 'text-blue-600' : 'text-rose-600'
                                }`}>
                                  {Number(item.indice_rotacion_diaria).toFixed(2)} u/día
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* VISTA DESKTOP / TABLET (>= md): Tabla completa con scroll */}
                    <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
                      <Table>
                        <TableHeader className="bg-slate-50/80 dark:bg-slate-800/60">
                          <TableRow>
                            <TableHead className="w-12 text-center text-xs font-bold text-slate-700 dark:text-slate-300">Rank</TableHead>
                            <TableHead 
                              className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 select-none transition-colors"
                              onClick={() => handleSortToggle('producto_nombre')}
                              title="Toca para ordenar por producto"
                            >
                              <div className="flex items-center gap-1">
                                <span>Producto</span>
                                {sortField === 'producto_nombre' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600 stroke-[2.5]" /> : <ArrowDown className="h-3 w-3 text-blue-600 stroke-[2.5]" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 select-none transition-colors"
                              onClick={() => handleSortToggle('vendedor_nombre')}
                              title="Toca para ordenar por punto de venta"
                            >
                              <div className="flex items-center gap-1">
                                <span>Punto de Venta</span>
                                {sortField === 'vendedor_nombre' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600 stroke-[2.5]" /> : <ArrowDown className="h-3 w-3 text-blue-600 stroke-[2.5]" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-center text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 select-none transition-colors"
                              onClick={() => handleSortToggle('stock_actual')}
                              title="Toca para ordenar por existencias de menor a mayor o viceversa"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Stock</span>
                                {sortField === 'stock_actual' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600 stroke-[2.5]" /> : <ArrowDown className="h-3 w-3 text-blue-600 stroke-[2.5]" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-center text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 select-none transition-colors"
                              onClick={() => handleSortToggle('unidades_vendidas')}
                              title="Toca para ordenar por ventas de menor a mayor o viceversa"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Ventas</span>
                                {sortField === 'unidades_vendidas' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600 stroke-[2.5]" /> : <ArrowDown className="h-3 w-3 text-blue-600 stroke-[2.5]" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-center text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 select-none transition-colors"
                              onClick={() => handleSortToggle('dias_vigencia')}
                              title="Toca para ordenar por vigencia de menor a mayor o viceversa"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Vigencia</span>
                                {sortField === 'dias_vigencia' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600 stroke-[2.5]" /> : <ArrowDown className="h-3 w-3 text-blue-600 stroke-[2.5]" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-center text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 select-none transition-colors"
                              onClick={() => handleSortToggle('indice_rotacion_diaria')}
                              title="Toca para ordenar por índice de rotación de menor a mayor o viceversa"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Índice Rotación</span>
                                {sortField === 'indice_rotacion_diaria' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600 stroke-[2.5]" /> : <ArrowDown className="h-3 w-3 text-blue-600 stroke-[2.5]" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="text-center text-xs font-bold text-slate-700 dark:text-slate-300">Calificación</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedRotacionProductos.map((item, idx) => {
                            const rank = idx + 1;
                            return (
                              <TableRow key={`${item.vendedor_id}-${item.producto_id}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 text-xs">
                                <TableCell className="text-center font-bold">
                                  {rank === 1 ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-black text-xs">
                                      🥇
                                    </span>
                                  ) : rank === 2 ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-black text-xs">
                                      🥈
                                    </span>
                                  ) : rank === 3 ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-black text-xs">
                                      🥉
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-semibold">#{rank}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 min-w-[140px]">
                                    {item.producto_foto ? (
                                      <img
                                        src={item.producto_foto}
                                        alt={item.producto_nombre}
                                        className="w-8 h-8 rounded-lg object-cover border border-slate-100 dark:border-slate-800 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                        <Package className="h-4 w-4" />
                                      </div>
                                    )}
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.producto_nombre}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                    {item.vendedor_nombre}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center font-bold">
                                  {item.stock_actual > 0 ? (
                                    <span className="text-emerald-700 dark:text-emerald-400">{item.stock_actual} u</span>
                                  ) : (
                                    <span className="text-slate-400 italic">0 (Agotado)</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center font-bold text-slate-800 dark:text-slate-200">
                                  {item.unidades_vendidas} u
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                    <span>{item.dias_vigencia} d</span>
                                    {item.estado_vigencia === 'activa' ? (
                                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Vigencia activa en existencia" />
                                    ) : (
                                      <span className="inline-block w-2 h-2 rounded-full bg-red-400" title="Vigencia cerrada (agotado)" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center font-black">
                                  <span className={`text-xs ${
                                    item.evaluacion === 'Alta Rotación' ? 'text-emerald-600' : item.evaluacion === 'Rotación Media' ? 'text-blue-600' : 'text-rose-600'
                                  }`}>
                                    {Number(item.indice_rotacion_diaria).toFixed(2)} u/d
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.evaluacion === 'Alta Rotación' ? (
                                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5">
                                      🚀 Alta Rotación
                                    </Badge>
                                  ) : item.evaluacion === 'Rotación Media' ? (
                                    <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] px-2 py-0.5">
                                      ⚡ Rotación Media
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-500 text-[10px] px-2 py-0.5">
                                      🐢 Baja Rotación
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>

              {/* MEJORES VENDEDORES */}
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                  Ranking de Vendedores por Volumen y Ventas
                </h4>
                <div className="space-y-2">
                  {rankingVendedores.map((v) => (
                    <div key={v.vendedor_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border gap-2">
                      <div className="flex items-center gap-2.5">
                        <Badge className="bg-blue-600 text-white font-bold text-xs">Rank #{v.rank}</Badge>
                        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">{v.vendedor_nombre}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 text-xs sm:text-sm">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Unidades: {v.unidades_vendidas}</span>
                        <span className="font-bold text-emerald-600">${Number(v.monto_total).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isFullPage) {
    return (
      <Card className="border-orange-200 shadow-md p-3 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
        {mainContent}
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
      <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto p-3 sm:p-6 rounded-2xl">
        {mainContent}
      </DialogContent>
    </Dialog>
  );
};

export default NotificacionesSystem;
