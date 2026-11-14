import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Calendar,
  ClipboardList,
  Loader2,
  UserCheck,
  UserX,
  Phone,
  ClipboardCheck,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Eye,
  CheckCircle2,
  ListFilter,
  FileEdit,
  Truck,
  ArrowRightLeft,
  Search,
  X,
  Layers
} from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import {
  getModeradores,
  crearModerador,
  editarModerador,
  eliminarModerador,
  getBitacoraModerador,
  getInventariosModerador,
  getInventarioDetalle,
  getInventario
} from '@/app/services/api';
import { Producto } from '@/types';

interface Moderador {
  id: string;
  nombre: string;
  telefono: string;
  rol: string;
  activo: boolean;
}

interface LogEntry {
  id: string;
  moderador_id: number;
  accion: string;
  detalles: string;
  fecha: string;
}

export type BitacoraFilter = 'todos' | 'inventarios' | 'creacion_edicion' | 'entregas' | 'bajas' | 'traslados';

interface ParsedDelivery {
  header: string;
  items: Array<{ nombre: string; cantidad: number; detalleExtra?: string }>;
  totalUnidades: number;
  totalMonto: number;
}

const parseDeliveryLog = (detalles: string, inventarioList: Producto[]): ParsedDelivery | null => {
  if (!detalles || (!detalles.toLowerCase().includes('entregó') && !detalles.toLowerCase().includes('entreg'))) {
    return null;
  }

  // Extraer resumen explícito si ya viene en el texto
  let explicitUnidades: number | null = null;
  let explicitMonto: number | null = null;
  const resumenMatch = detalles.match(/Resumen:\s*([\d,.]+)\s*unidades\s*entregadas\s*por\s*un\s*monto\s*de\s*([\d,.]+)\s*CUP/i);
  if (resumenMatch) {
    explicitUnidades = parseFloat(resumenMatch[1].replace(/,/g, ''));
    explicitMonto = parseFloat(resumenMatch[2].replace(/,/g, ''));
  }

  // Limpiar parte de resumen del texto para procesar los productos
  const cleanDetalles = detalles.split(/\s*\|\s*Resumen:/i)[0].trim();
  const items: Array<{ nombre: string; cantidad: number; detalleExtra?: string }> = [];

  // Formato multi: Entregó 408 unidades totales ("Coca Cola": 200, "Galletas": 208) al punto de venta "ML Santa Elena"
  const multiRegex = /^Entregó\s+(\d+)\s+unidades\s+totales\s*\((.+?)\)\s*(al punto de venta\s*".+?")?$/i;
  const multiMatch = cleanDetalles.match(multiRegex);

  if (multiMatch) {
    const totalHeader = parseInt(multiMatch[1], 10) || 0;
    const productsRaw = multiMatch[2];
    const destination = multiMatch[3] ? multiMatch[3].trim() : '';

    const productTokens: string[] = [];
    let currentToken = '';
    let parenDepth = 0;
    for (let i = 0; i < productsRaw.length; i++) {
      const char = productsRaw[i];
      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

      if (char === ',' && parenDepth === 0) {
        if (currentToken.trim()) productTokens.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    if (currentToken.trim()) productTokens.push(currentToken.trim());

    for (const token of productTokens) {
      const tokenMatch = token.match(/^"?([^":]+)"?\s*:\s*(\d+)(?:\s*\((.+?)\))?/);
      if (tokenMatch) {
        items.push({
          nombre: tokenMatch[1].trim(),
          cantidad: parseInt(tokenMatch[2], 10) || 0,
          detalleExtra: tokenMatch[3]?.trim()
        });
      } else {
        items.push({
          nombre: token.replace(/^["']|["']$/g, '').trim(),
          cantidad: 1
        });
      }
    }

    const totalUnidades = explicitUnidades !== null ? explicitUnidades : (items.reduce((s, it) => s + it.cantidad, 0) || totalHeader);

    let totalMonto = explicitMonto !== null ? explicitMonto : 0;
    if (explicitMonto === null) {
      for (const item of items) {
        const prod = inventarioList.find(p => p.nombre.trim().toLowerCase() === item.nombre.trim().toLowerCase());
        const precioCompra = parseFloat(prod?.precio_compra?.toString() || '0') || 0;
        totalMonto += item.cantidad * precioCompra;
      }
    }

    return {
      header: `Entregó ${totalUnidades} unidades totales ${destination}:`,
      items,
      totalUnidades,
      totalMonto
    };
  }

  // Formato individual: Entregó 10 unidades de "Coca Cola" al punto de venta "ML Santa Elena"
  // o: Entregó 10 unidades totales (5x Roja, 5x Azul) de 'Camisa' al punto de venta "Juan"
  const singleRegex = /^Entregó\s+(\d+)\s+unidades(?:\s+totales)?(?:\s*\((.+?)\))?\s+de\s+["'](.+?)["']\s*(al punto de venta\s*".+?")?$/i;
  const singleMatch = cleanDetalles.match(singleRegex);

  if (singleMatch) {
    const qty = parseInt(singleMatch[1], 10) || 0;
    const extra = singleMatch[2]?.trim();
    const prodName = singleMatch[3].trim();
    const destination = singleMatch[4] ? singleMatch[4].trim() : '';

    items.push({
      nombre: prodName,
      cantidad: qty,
      detalleExtra: extra
    });

    const totalUnidades = explicitUnidades !== null ? explicitUnidades : qty;
    let totalMonto = explicitMonto !== null ? explicitMonto : 0;
    if (explicitMonto === null) {
      const prod = inventarioList.find(p => p.nombre.trim().toLowerCase() === prodName.toLowerCase());
      const precioCompra = parseFloat(prod?.precio_compra?.toString() || '0') || 0;
      totalMonto = qty * precioCompra;
    }

    return {
      header: `Entregó ${qty} unidades ${destination}:`,
      items,
      totalUnidades,
      totalMonto
    };
  }

  return null;
};

const matchFilter = (log: LogEntry, filter: BitacoraFilter): boolean => {
  if (filter === 'todos') return true;
  const accion = (log.accion || '').toLowerCase();
  const detalles = (log.detalles || '').toLowerCase();

  switch (filter) {
    case 'inventarios':
      return accion.includes('inventario') || detalles.includes('auditoría de inventario') || detalles.includes('inventario físico') || detalles.includes('inventarios');
    case 'creacion_edicion':
      return accion.includes('crear') || accion.includes('editar') || accion.includes('eliminar') ||
             detalles.includes('creó un nuevo') || detalles.includes('editó el producto') || detalles.includes('eliminó el producto');
    case 'entregas':
      return accion.includes('entrega') || detalles.startsWith('entregó') || detalles.includes('entregó') || detalles.includes('despachó');
    case 'bajas':
      return accion.includes('baja') || accion.includes('merma') || detalles.includes('baja') || detalles.includes('merma');
    case 'traslados':
      return accion.includes('mover') || accion.includes('traslado') || detalles.includes('transfirió') || detalles.includes('trasladó');
    default:
      return true;
  }
};

export default function ModeradoresSection() {
  const [moderadores, setModeradores] = useState<Moderador[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Dialogs
  const [showAddEditDialog, setShowAddEditDialog] = useState(false);
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [showBitacoraDialog, setShowBitacoraDialog] = useState(false);
  const [showInventariosDialog, setShowInventariosDialog] = useState(false);
  const [showInventarioDetalleDialog, setShowInventarioDetalleDialog] = useState(false);
  
  // Selected state
  const [selectedModerador, setSelectedModerador] = useState<Moderador | null>(null);
  
  // Form fields
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    password: '',
    activo: true
  });

  // Bitacora logs y filtros
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeFilter, setActiveFilter] = useState<BitacoraFilter>('todos');
  const [searchTermBitacora, setSearchTermBitacora] = useState('');
  const [inventario, setInventario] = useState<Producto[]>([]);

  // Inventarios
  const [inventariosList, setInventariosList] = useState<any[]>([]);
  const [loadingInventarios, setLoadingInventarios] = useState(false);
  const [selectedInventarioDetalle, setSelectedInventarioDetalle] = useState<any | null>(null);
  const [loadingInventarioDetalle, setLoadingInventarioDetalle] = useState(false);

  const fetchModeradores = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getModeradores();
      setModeradores(data);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los moderadores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModeradores();
  }, [fetchModeradores]);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({
      nombre: '',
      telefono: '',
      password: '',
      activo: true
    });
    setShowAddEditDialog(true);
  };

  const handleOpenEdit = (mod: Moderador) => {
    setIsEditMode(true);
    setSelectedModerador(mod);
    setFormData({
      nombre: mod.nombre,
      telefono: mod.telefono || '',
      password: '', // Dejar en blanco a menos que se desee cambiar
      activo: mod.activo
    });
    setShowOptionsDialog(false);
    setShowAddEditDialog(true);
  };

  const handleOpenInventarios = async (mod: Moderador) => {
    setSelectedModerador(mod);
    setShowOptionsDialog(false);
    setShowInventariosDialog(true);
    try {
      setLoadingInventarios(true);
      const data = await getInventariosModerador(mod.id);
      setInventariosList(data);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los inventarios", variant: "destructive" });
    } finally {
      setLoadingInventarios(false);
    }
  };

  const handleVerDetalleInventario = async (invId: number) => {
    try {
      setLoadingInventarioDetalle(true);
      setShowInventarioDetalleDialog(true);
      const data = await getInventarioDetalle(invId);
      setSelectedInventarioDetalle(data);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el detalle del inventario", variant: "destructive" });
    } finally {
      setLoadingInventarioDetalle(false);
    }
  };

  const handleExportarExcel = (inv: any) => {
    if (!inv || !inv.detalles || inv.detalles.length === 0) {
      toast({ title: "Atención", description: "No hay detalles para exportar", variant: "default" });
      return;
    }

    try {
      const dataExport = inv.detalles.map((d: any, index: number) => ({
        'N°': index + 1,
        'Código de Barras': d.codigo_barras || 'N/A',
        'Producto': d.nombre_producto,
        'Variante / Parámetro': d.parametro_nombre || '-',
        'Cantidad en Sistema': Number(d.cantidad_sistema),
        'Cantidad Física Real': Number(d.cantidad_fisica),
        'Diferencia': Number(d.diferencia),
        'Estado': Number(d.diferencia) === 0 ? 'Exacto' : (Number(d.diferencia) > 0 ? 'Sobrante (+)' : 'Faltante (-)'),
        'Precio Compra': Number(d.precio_compra || 0),
        'Precio Venta': Number(d.precio_venta || 0),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataExport);

      ws['!cols'] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 35 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Auditoria");

      const fechaStr = new Date(inv.fecha).toISOString().split('T')[0];
      const safePunto = (inv.punto_venta_nombre || 'Punto').replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.writeFile(wb, `Inventario_${safePunto}_${fechaStr}.xlsx`);

      toast({ title: "Éxito", description: "Informe exportado a Excel correctamente" });
    } catch (error) {
      console.error("Error al exportar inventario a Excel:", error);
      toast({ title: "Error", description: "No se pudo generar el archivo Excel", variant: "destructive" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast({ title: "Advertencia", description: "El nombre es obligatorio", variant: "default" });
      return;
    }
    if (!isEditMode && !formData.password) {
      toast({ title: "Advertencia", description: "La contraseña es obligatoria para cuentas nuevas", variant: "default" });
      return;
    }

    try {
      if (isEditMode && selectedModerador) {
        const payload: any = {
          nombre: formData.nombre,
          telefono: formData.telefono,
          activo: formData.activo
        };
        if (formData.password.trim()) {
          payload.password = formData.password;
        }
        await editarModerador(selectedModerador.id, payload);
        toast({ title: "Éxito", description: "Moderador actualizado correctamente" });
      } else {
        await crearModerador({
          nombre: formData.nombre,
          telefono: formData.telefono,
          password: formData.password,
          activo: formData.activo
        });
        toast({ title: "Éxito", description: "Moderador creado con éxito" });
      }
      setShowAddEditDialog(false);
      fetchModeradores();
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (mod: Moderador) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al moderador "${mod.nombre}"? Se borrará todo su historial de bitácora.`)) {
      return;
    }

    try {
      await eliminarModerador(mod.id);
      toast({ title: "Éxito", description: "Moderador eliminado" });
      setShowOptionsDialog(false);
      fetchModeradores();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el moderador", variant: "destructive" });
    }
  };

  const handleOpenBitacora = async (mod: Moderador) => {
    setSelectedModerador(mod);
    setShowOptionsDialog(false);
    setShowBitacoraDialog(true);
    setActiveFilter('todos');
    setSearchTermBitacora('');
    try {
      setLoadingLogs(true);
      const [logsData, invData] = await Promise.all([
        getBitacoraModerador(mod.id),
        inventario.length === 0 ? getInventario().catch(() => []) : Promise.resolve(inventario)
      ]);
      setLogs(logsData);
      if (invData && invData.length > 0) {
        setInventario(invData);
      }
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la bitácora", variant: "destructive" });
    } finally {
      setLoadingLogs(false);
    }
  };

  // Agrupar logs por fecha local
  const groupLogsByDate = (logsList: LogEntry[]) => {
    const groups: { [key: string]: LogEntry[] } = {};
    logsList.forEach(log => {
      const dateStr = new Date(log.fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(log);
    });
    return groups;
  };

  // Opciones de filtros solicitadas
  const filterOptions: Array<{ id: BitacoraFilter; label: string; icon: React.ReactNode; activeClass: string }> = [
    { id: 'todos', label: 'Todos', icon: <ListFilter className="w-3.5 h-3.5" />, activeClass: 'bg-gray-900 text-white' },
    { id: 'inventarios', label: 'Inventarios Realizados', icon: <ClipboardCheck className="w-3.5 h-3.5" />, activeClass: 'bg-teal-600 text-white' },
    { id: 'creacion_edicion', label: 'Creación/Edición', icon: <FileEdit className="w-3.5 h-3.5" />, activeClass: 'bg-emerald-600 text-white' },
    { id: 'entregas', label: 'Entregas', icon: <Truck className="w-3.5 h-3.5" />, activeClass: 'bg-blue-600 text-white' },
    { id: 'bajas', label: 'Bajas', icon: <AlertTriangle className="w-3.5 h-3.5" />, activeClass: 'bg-red-600 text-white' },
    { id: 'traslados', label: 'Traslados', icon: <ArrowRightLeft className="w-3.5 h-3.5" />, activeClass: 'bg-amber-600 text-white' },
  ];

  const filterCounts = useMemo(() => {
    return {
      todos: logs.length,
      inventarios: logs.filter(l => matchFilter(l, 'inventarios')).length,
      creacion_edicion: logs.filter(l => matchFilter(l, 'creacion_edicion')).length,
      entregas: logs.filter(l => matchFilter(l, 'entregas')).length,
      bajas: logs.filter(l => matchFilter(l, 'bajas')).length,
      traslados: logs.filter(l => matchFilter(l, 'traslados')).length,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesCategory = matchFilter(log, activeFilter);
      if (!matchesCategory) return false;
      if (!searchTermBitacora.trim()) return true;
      const term = searchTermBitacora.toLowerCase();
      return (log.accion || '').toLowerCase().includes(term) || (log.detalles || '').toLowerCase().includes(term);
    });
  }, [logs, activeFilter, searchTermBitacora]);

  const groupedLogs = useMemo(() => {
    return groupLogsByDate(filteredLogs);
  }, [filteredLogs]);

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'crear_producto': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'editar_producto': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'eliminar_producto': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'entregar_producto': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'mover_vendedores': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ver_transacciones': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'inventario_fisico': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'baja':
      case 'baja_producto':
      case 'merma': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            Moderadores de Almacén
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los accesos y audita la bitácora diaria de acciones e inventarios de tus moderadores
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo Moderador
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moderadores.map(mod => (
            <Card
              key={mod.id}
              onClick={() => {
                setSelectedModerador(mod);
                setShowOptionsDialog(true);
              }}
              className="hover:shadow-md cursor-pointer transition-all duration-200 border-gray-200 hover:border-blue-400 relative overflow-hidden group bg-white"
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${mod.activo ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-100 rounded-full text-gray-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">{mod.nombre}</CardTitle>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 border ${
                        mod.activo 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {mod.activo ? (
                          <>
                            <UserCheck className="w-3 h-3" /> Activo
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" /> Inactivo
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2 text-sm text-gray-600">
                {mod.telefono && (
                  <div className="flex items-center gap-2 mt-2 text-gray-500">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{mod.telefono}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-4 text-blue-600 font-medium group-hover:translate-x-1 transition-transform">
                  <span>Tocar para gestionar</span>
                  <span>→</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {moderadores.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No hay cuentas de moderadores registradas</p>
              <p className="text-xs text-gray-400 mt-1">Crea una cuenta para delegar la gestión y auditoría del stock</p>
              <Button onClick={handleOpenAdd} variant="outline" className="mt-4 border-gray-300 text-gray-700 hover:bg-gray-50">
                Añadir Primero
              </Button>
            </div>
          )}
        </div>
      )}

      {/* OPTIONS DIALOG */}
      <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Gestionar: {selectedModerador?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            <Button
              onClick={() => selectedModerador && handleOpenBitacora(selectedModerador)}
              className="bg-blue-50 border border-blue-200 text-blue-950 hover:bg-blue-100 flex items-center justify-start gap-3 h-12 text-left"
            >
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-bold text-sm">Ver Bitácora</div>
                <div className="text-xs text-blue-600 font-normal">Acciones registradas por día</div>
              </div>
            </Button>

            <Button
              onClick={() => selectedModerador && handleOpenInventarios(selectedModerador)}
              className="bg-emerald-50 border border-emerald-200 text-emerald-950 hover:bg-emerald-100 flex items-center justify-start gap-3 h-12 text-left"
            >
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="font-bold text-sm">Inventarios Realizados</div>
                <div className="text-xs text-emerald-600 font-normal">Auditorías físicas vs virtual</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => selectedModerador && handleOpenEdit(selectedModerador)}
              className="flex items-center justify-start gap-3 h-12 text-left hover:bg-gray-50 border-gray-200"
            >
              <Edit className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-bold text-sm">Editar Cuenta</div>
                <div className="text-xs text-gray-500 font-normal">Cambiar nombre, teléfono o clave</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => selectedModerador && handleDelete(selectedModerador)}
              className="flex items-center justify-start gap-3 h-12 text-left hover:bg-red-50 hover:text-red-900 border-red-200"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
              <div>
                <div className="font-bold text-sm text-red-700">Eliminar Cuenta</div>
                <div className="text-xs text-red-500 font-normal">Borrar moderador permanentemente</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD / EDIT DIALOG */}
      <Dialog open={showAddEditDialog} onOpenChange={setShowAddEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {isEditMode ? 'Editar Cuenta de Moderador' : 'Registrar Nuevo Moderador'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre de Usuario</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej. Gilberto Moderador"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono (Opcional)</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej. +1 809-555-0199"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                {isEditMode ? 'Nueva Contraseña (Dejar en blanco para conservar)' : 'Contraseña de Acceso'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder={isEditMode ? '••••••••' : 'Ingresa la clave de inicio'}
                required={!isEditMode}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="activo"
                checked={formData.activo}
                onCheckedChange={checked => setFormData({ ...formData, activo: checked as boolean })}
              />
              <Label htmlFor="activo" className="font-semibold text-gray-700 cursor-pointer">
                Cuenta Activa (Habilita el inicio de sesión)
              </Label>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddEditDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {isEditMode ? 'Guardar Cambios' : 'Crear Moderador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BITACORA DIALOG */}
      <Dialog open={showBitacoraDialog} onOpenChange={setShowBitacoraDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader className="space-y-3 pb-3 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <DialogTitle className="text-xl font-bold text-gray-950 flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-blue-600" />
                Bitácora de Actividad: {selectedModerador?.nombre}
              </DialogTitle>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar en la bitácora..."
                  value={searchTermBitacora}
                  onChange={(e) => setSearchTermBitacora(e.target.value)}
                  className="pl-8 h-8 text-xs bg-gray-50 border-gray-200"
                />
                {searchTermBitacora && (
                  <button
                    onClick={() => setSearchTermBitacora('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
              {filterOptions.map(f => {
                const count = filterCounts[f.id];
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                      isActive
                        ? f.activeClass + ' shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {f.icon}
                    <span>{f.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
            {loadingLogs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : Object.keys(groupedLogs).length > 0 ? (
              Object.keys(groupedLogs).map(dateStr => (
                <div key={dateStr} className="space-y-3">
                  <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5 bg-gray-100 p-2 rounded-lg border border-gray-200">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    {dateStr}
                  </h4>
                  <div className="relative pl-6 ml-3 border-l-2 border-blue-200 space-y-4">
                    {groupedLogs[dateStr].map(log => {
                      const logTime = new Date(log.fecha).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <div key={log.id} className="relative">
                          {/* Punto indicador */}
                          <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white"></div>
                          
                          <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={`inline-block border text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${getActionBadgeColor(log.accion)}`}>
                                {log.accion.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-400 font-medium">{logTime}</span>
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed font-normal">
                              {(() => {
                                const detalles = log.detalles;

                                // Caso especial: Entrega de productos (con resumen en negrita calculado)
                                const delivery = parseDeliveryLog(detalles, inventario);
                                if (delivery) {
                                  return (
                                    <div className="space-y-1.5">
                                      <span className="font-medium text-gray-800">{delivery.header}</span>
                                      <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
                                        {delivery.items.map((p, idx) => (
                                          <li key={idx} className="text-sm font-normal text-gray-700">
                                            <span className="font-medium text-gray-900">{p.nombre}:</span>{' '}
                                            <span className="font-semibold text-blue-700">{p.cantidad} {p.cantidad === 1 ? 'unidad' : 'unidades'}</span>
                                            {p.detalleExtra && (
                                              <span className="text-xs text-gray-500 ml-1.5 font-normal">({p.detalleExtra})</span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>

                                      {/* Resumen en negritas al final de la lista de Entrega */}
                                      <div className="mt-2.5 pt-2 border-t border-gray-100">
                                        <p className="text-sm font-bold text-gray-950">
                                          {delivery.totalUnidades.toLocaleString('en-US')} unidades entregadas por un monto de {delivery.totalMonto.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} CUP
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }

                                if (detalles.includes(' | ')) {
                                  const parts = detalles.split(' | ');
                                  return (
                                    <div className="space-y-1 text-gray-700">
                                      {parts.map((part, idx) => {
                                        if (part.includes('Parámetros: ')) {
                                          const paramMatch = part.match(/^(Parámetros:\s*)(.+)$/);
                                          if (paramMatch) {
                                            const [_, paramPrefix, paramsList] = paramMatch;
                                            const params = paramsList.split(/,\s*/);
                                            return (
                                              <div key={idx} className="mt-1">
                                                <span className="font-semibold text-gray-800">{paramPrefix}</span>
                                                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                                                  {params.map((p, pIdx) => (
                                                    <li key={pIdx} className="text-sm font-normal text-gray-600">{p}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            );
                                          }
                                        }
                                        return (
                                          <div key={idx} className="text-sm text-gray-600">
                                            • {part}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                }

                                if (detalles.includes('Parámetros: ')) {
                                  const paramMatch = detalles.match(/^(.*Parámetros:\s*)(.+)$/);
                                  if (paramMatch) {
                                    const [_, prefix, paramsList] = paramMatch;
                                    const params = paramsList.split(/,\s*/);
                                    return (
                                      <div className="space-y-1 text-gray-700">
                                        <span className="font-medium">{prefix}</span>
                                        <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-600">
                                          {params.map((p, idx) => (
                                            <li key={idx} className="text-sm font-normal">{p}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  }
                                }

                                return <p className="text-sm text-gray-700 leading-relaxed font-normal">{detalles}</p>;
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-sm">
                  {activeFilter === 'todos' && !searchTermBitacora
                    ? 'No hay acciones registradas en la bitácora'
                    : `No hay registros para el filtro seleccionado (${filterOptions.find(f => f.id === activeFilter)?.label || activeFilter})`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {activeFilter !== 'todos' || searchTermBitacora
                    ? 'Prueba seleccionando "Todos" o limpiando el buscador.'
                    : 'Las operaciones que realice el moderador se verán reflejadas aquí por día'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setShowBitacoraDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INVENTARIOS LIST DIALOG */}
      <Dialog open={showInventariosDialog} onOpenChange={setShowInventariosDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-emerald-600" />
              Inventarios Físicos: {selectedModerador?.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-4">
            {loadingInventarios ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : inventariosList.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {inventariosList.map(inv => {
                  const fecha = new Date(inv.fecha).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const hasDiscrepancies = Number(inv.total_discrepancias) > 0;

                  return (
                    <div
                      key={inv.id}
                      className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-emerald-400 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 text-base">
                            📍 {inv.punto_venta_nombre}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                            {fecha}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                          <span>📦 Total auditados: <strong className="text-gray-800">{inv.total_items_auditados}</strong></span>
                          <span className="text-gray-300">|</span>
                          <span className={`inline-flex items-center gap-1 font-semibold ${hasDiscrepancies ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {hasDiscrepancies ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {inv.total_discrepancias} {inv.total_discrepancias === 1 ? 'diferencia' : 'diferencias'}
                          </span>
                        </div>
                        {inv.observaciones ? (
                          <p className="text-xs text-gray-500 italic mt-1 bg-gray-50 p-1.5 rounded">
                            &quot;{inv.observaciones}&quot;
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerDetalleInventario(inv.id)}
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5"
                        >
                          <Eye className="w-4 h-4" /> Ver Detalle
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-sm">No hay inventarios registrados por este moderador</p>
                <p className="text-xs text-gray-400 mt-1">Las auditorías de inventario físico vs virtual se listarán aquí</p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setShowInventariosDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INVENTARIO DETALLE DIALOG */}
      <Dialog open={showInventarioDetalleDialog} onOpenChange={setShowInventarioDetalleDialog}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="space-y-2 pb-2 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pr-6 sm:pr-0">
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
                  <span>Auditoría: {selectedInventarioDetalle?.punto_venta_nombre}</span>
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-1">
                  📅 {selectedInventarioDetalle && new Date(selectedInventarioDetalle.fecha).toLocaleString('es-ES')} 
                  <span className="hidden sm:inline"> | 👤 Moderador: {selectedInventarioDetalle?.moderador_nombre || selectedModerador?.nombre}</span>
                </p>
              </div>
              {selectedInventarioDetalle && (
                <Button
                  onClick={() => handleExportarExcel(selectedInventarioDetalle)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 w-full sm:w-auto justify-center text-xs sm:text-sm py-2 h-auto"
                  size="sm"
                >
                  <Download className="w-4 h-4" /> Descargar Excel
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 py-3 space-y-4">
            {loadingInventarioDetalle ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : selectedInventarioDetalle ? (
              <div className="space-y-4">
                {/* Resumen Cards */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg border border-gray-200 text-center">
                    <span className="text-[10px] sm:text-xs text-gray-500 block font-medium">Auditados</span>
                    <span className="text-base sm:text-xl font-extrabold text-gray-800">{selectedInventarioDetalle.total_items_auditados}</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 sm:p-3 rounded-lg border border-emerald-200 text-center">
                    <span className="text-[10px] sm:text-xs text-emerald-700 block font-medium">Exactos</span>
                    <span className="text-base sm:text-xl font-extrabold text-emerald-800">
                      {selectedInventarioDetalle.detalles?.filter((d: any) => Number(d.diferencia) === 0).length || 0}
                    </span>
                  </div>
                  <div className="bg-amber-50 p-2.5 sm:p-3 rounded-lg border border-amber-200 text-center">
                    <span className="text-[10px] sm:text-xs text-amber-700 block font-medium">Discrepancias</span>
                    <span className="text-base sm:text-xl font-extrabold text-amber-800">{selectedInventarioDetalle.total_discrepancias}</span>
                  </div>
                </div>

                {selectedInventarioDetalle.observaciones ? (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 sm:p-3 text-xs text-amber-900">
                    <strong className="block mb-0.5 text-amber-950 font-semibold">Notas / Observaciones:</strong>
                    &quot;{selectedInventarioDetalle.observaciones}&quot;
                  </div>
                ) : null}

                {/* Vista Móvil */}
                <div className="space-y-2.5 md:hidden">
                  {selectedInventarioDetalle.detalles?.map((d: any) => {
                    const diff = Number(d.diferencia);
                    const isExact = diff === 0;
                    const isSurplus = diff > 0;

                    return (
                      <div 
                        key={d.id} 
                        className={`p-3 rounded-lg border ${
                          !isExact 
                            ? 'bg-amber-50/30 border-amber-300' 
                            : 'bg-white border-gray-200'
                        } space-y-2`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-bold text-gray-900 text-sm block">
                              {d.nombre_producto}
                            </span>
                            {d.parametro_nombre ? (
                              <span className="text-xs text-blue-600 font-medium">
                                Variante: {d.parametro_nombre}
                              </span>
                            ) : null}
                            <span className="text-[11px] text-gray-400 font-mono block">
                              Cód: {d.codigo_barras || 'N/A'}
                            </span>
                          </div>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            isExact 
                              ? 'bg-gray-50 text-gray-600 border-gray-200' 
                              : (isSurplus ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200')
                          }`}>
                            {isExact ? 'Exacto' : (isSurplus ? `Sobrante (+${diff})` : `Faltante (${diff})`)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-2 rounded border border-gray-150 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 block">Sistema</span>
                            <span className="font-semibold text-gray-700">{d.cantidad_sistema}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block">Físico</span>
                            <span className="font-bold text-gray-900">{d.cantidad_fisica}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block">Diferencia</span>
                            <span className={`font-extrabold ${isExact ? 'text-gray-400' : isSurplus ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isSurplus ? `+${diff}` : diff}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vista Escritorio / Tablet */}
                <div className="hidden md:block border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-100 text-gray-700 font-semibold border-b text-xs uppercase">
                        <tr>
                          <th className="p-3">Producto / Variante</th>
                          <th className="p-3">Código</th>
                          <th className="p-3 text-center">Sistema</th>
                          <th className="p-3 text-center">Físico</th>
                          <th className="p-3 text-center">Diferencia</th>
                          <th className="p-3 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedInventarioDetalle.detalles?.map((d: any) => {
                          const diff = Number(d.diferencia);
                          const isExact = diff === 0;
                          const isSurplus = diff > 0;

                          return (
                            <tr key={d.id} className={!isExact ? 'bg-amber-50/40' : 'hover:bg-gray-50'}>
                              <td className="p-3 font-medium text-gray-800">
                                <div>{d.nombre_producto}</div>
                                {d.parametro_nombre ? (
                                  <div className="text-xs text-blue-600 font-normal">Variante: {d.parametro_nombre}</div>
                                ) : null}
                              </td>
                              <td className="p-3 text-xs text-gray-500 font-mono">
                                {d.codigo_barras || 'N/A'}
                              </td>
                              <td className="p-3 text-center text-gray-600 font-semibold">
                                {d.cantidad_sistema}
                              </td>
                              <td className="p-3 text-center text-gray-900 font-bold">
                                {d.cantidad_fisica}
                              </td>
                              <td className="p-3 text-center font-extrabold">
                                <span className={isExact ? 'text-gray-400' : (isSurplus ? 'text-emerald-600' : 'text-red-600')}>
                                  {isSurplus ? `+${diff}` : diff}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                  isExact 
                                    ? 'bg-gray-50 text-gray-600 border-gray-200' 
                                    : (isSurplus ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200')
                                }`}>
                                  {isExact ? 'Exacto' : (isSurplus ? 'Sobrante (+)' : 'Faltante (-)')}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t pt-3 sm:pt-4">
            <Button className="w-full sm:w-auto" onClick={() => setShowInventarioDetalleDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
