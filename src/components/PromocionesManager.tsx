import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getPromociones, 
  createPromocion, 
  updatePromocion, 
  deletePromocion, 
  togglePromocionStatus 
} from '@/app/services/api';
import { Promocion } from '@/types';
import PromocionCard from './PromocionCard';
import PromocionDialog from './PromocionDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Plus, Search, Tag, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PromocionesManager: React.FC = () => {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [filteredPromociones, setFilteredPromociones] = useState<Promocion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todas');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPromocion, setSelectedPromocion] = useState<Promocion | undefined>(undefined);
  const [promocionToDelete, setPromocionToDelete] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Cargar promociones
  const fetchPromociones = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPromociones();
      setPromociones(data);
      applyFilters(data, searchTerm, activeTab);
    } catch (err) {
      console.error('Error al cargar promociones:', err);
      setError('No se pudieron cargar las promociones');
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las promociones',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar promociones al montar el componente
  useEffect(() => {
    fetchPromociones();
  }, []);

  // Aplicar filtros cuando cambian los criterios
  useEffect(() => {
    applyFilters(promociones, searchTerm, activeTab);
  }, [searchTerm, activeTab]);

  // Función para aplicar filtros
  const applyFilters = (promos: Promocion[], search: string, tab: string) => {
    const now = new Date();
    
    let filtered = promos;
    
    // Filtrar por búsqueda
    if (search) {
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Filtrar por pestaña
    switch (tab) {
      case 'activas':
        filtered = filtered.filter(p => {
          const fechaInicio = new Date(p.fecha_inicio);
          const fechaFin = new Date(p.fecha_fin);
          return p.activa && now >= fechaInicio && now <= fechaFin;
        });
        break;
      case 'programadas':
        filtered = filtered.filter(p => {
          const fechaInicio = new Date(p.fecha_inicio);
          return p.activa && now < fechaInicio;
        });
        break;
      case 'expiradas':
        filtered = filtered.filter(p => {
          const fechaFin = new Date(p.fecha_fin);
          return now > fechaFin || !p.activa;
        });
        break;
      default:
        // No aplicar filtro adicional para 'todas'
        break;
    }
    
    setFilteredPromociones(filtered);
  };

  // Manejar creación de promoción
  const handleCreatePromocion = async (promocion: Omit<Promocion, 'id'>) => {
    try {
      const nuevaPromocion = await createPromocion(promocion);
      setPromociones([nuevaPromocion, ...promociones]);
      applyFilters([nuevaPromocion, ...promociones], searchTerm, activeTab);
      toast({
        title: 'Éxito',
        description: 'Promoción creada correctamente',
      });
    } catch (err) {
      console.error('Error al crear promoción:', err);
      toast({
        title: 'Error',
        description: 'No se pudo crear la promoción',
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Manejar actualización de promoción
  const handleUpdatePromocion = async (promocion: Promocion) => {
    try {
      const updatedPromocion = await updatePromocion(promocion.id, promocion);
      const updatedPromociones = promociones.map(p => 
        p.id === updatedPromocion.id ? updatedPromocion : p
      );
      setPromociones(updatedPromociones);
      applyFilters(updatedPromociones, searchTerm, activeTab);
      toast({
        title: 'Éxito',
        description: 'Promoción actualizada correctamente',
      });
    } catch (err) {
      console.error('Error al actualizar promoción:', err);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la promoción',
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Manejar eliminación de promoción
  const handleDeletePromocion = async () => {
    if (!promocionToDelete) return;
    
    try {
      await deletePromocion(promocionToDelete);
      const updatedPromociones = promociones.filter(p => p.id !== promocionToDelete);
      setPromociones(updatedPromociones);
      applyFilters(updatedPromociones, searchTerm, activeTab);
      toast({
        title: 'Éxito',
        description: 'Promoción eliminada correctamente',
      });
    } catch (err) {
      console.error('Error al eliminar promoción:', err);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la promoción',
        variant: 'destructive',
      });
    } finally {
      setPromocionToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Manejar cambio de estado de promoción
  const handleToggleStatus = async (id: string, activa: boolean) => {
    try {
      const updatedPromocion = await togglePromocionStatus(id, activa);
      const updatedPromociones = promociones.map(p => 
        p.id === id ? updatedPromocion : p
      );
      setPromociones(updatedPromociones);
      applyFilters(updatedPromociones, searchTerm, activeTab);
      toast({
        title: 'Éxito',
        description: `Promoción ${activa ? 'activada' : 'desactivada'} correctamente`,
      });
    } catch (err) {
      console.error('Error al cambiar estado de promoción:', err);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado de la promoción',
        variant: 'destructive',
      });
    }
  };

  // Abrir diálogo para crear/editar
  const openDialog = (promocion?: Promocion) => {
    setSelectedPromocion(promocion);
    setDialogOpen(true);
  };

  // Abrir diálogo de confirmación para eliminar
  const confirmDelete = (id: string) => {
    setPromocionToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Manejar guardado de promoción (crear o actualizar)
  const handleSavePromocion = async (promocion: Omit<Promocion, 'id'> | Promocion) => {
    if ('id' in promocion) {
      await handleUpdatePromocion(promocion);
    } else {
      await handleCreatePromocion(promocion);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera con búsqueda y botón de crear */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar promociones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={() => openDialog()}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Promoción
        </Button>
      </div>

      {/* Pestañas de filtrado */}
      <Tabs defaultValue="todas" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="todas" className="flex items-center">
            <Tag className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Todas</span>
          </TabsTrigger>
          <TabsTrigger value="activas" className="flex items-center">
            <CheckCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Activas</span>
          </TabsTrigger>
          <TabsTrigger value="programadas" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Programadas</span>
          </TabsTrigger>
          <TabsTrigger value="expiradas" className="flex items-center">
            <XCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Expiradas</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-500">Cargando promociones...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              <p>{error}</p>
              <Button 
                variant="outline" 
                onClick={fetchPromociones} 
                className="mt-2"
              >
                Reintentar
              </Button>
            </div>
          ) : filteredPromociones.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-md">
              <Tag className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No hay promociones</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm 
                  ? 'No se encontraron promociones con ese término de búsqueda' 
                  : 'Comienza creando una nueva promoción'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => openDialog()} 
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Promoción
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPromociones.map((promocion) => (
                <PromocionCard
                  key={promocion.id}
                  promocion={promocion}
                  onEdit={openDialog}
                  onDelete={confirmDelete}
                  onToggle={handleToggleStatus}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo para crear/editar promoción */}
      <PromocionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSavePromocion}
        promocion={selectedPromocion}
        title={selectedPromocion ? 'Editar Promoción' : 'Nueva Promoción'}
      />

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la promoción y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePromocion}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PromocionesManager;