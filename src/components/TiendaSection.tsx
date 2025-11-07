'use client';

import { useEffect, useState } from 'react';
import { ImageIcon, LayoutGrid, Percent, Star, Store, Plus, ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CarruselManager } from '@/components/CarruselManager';
import PromocionesManager from '@/components/PromocionesManager';
import { Seccion, Subseccion, Producto } from '@/types';
import SubseccionCard from './SubseccionCard';
import SubseccionDialog from './SubseccionDialog';
import ProductSelectionDialog from './ProductSelectionDialog';
import Image from 'next/image';
// Define el tipo para las pestañas de tienda
type TiendaTabType = 'secciones' | 'destacados' | 'promociones' | 'carrusel';

interface TiendaSectionProps {
  activeTiendaTab: TiendaTabType; // Cambiar de string a TiendaTabType
  setActiveTiendaTab: React.Dispatch<React.SetStateAction<TiendaTabType>>; // Usar el tipo correcto
  // El resto de props se mantienen igual
  secciones: Seccion[];
  handleCreateSeccion: () => void;
  handleEditSeccion: (seccion: Seccion) => void;
  handleDeleteSeccion: (seccionId: string) => void;
  handleSeccionClick: (seccion: Seccion) => void;
  productosDestacados: Producto[];
  handleManageProductosDestacados: () => void;
  setSelectedProduct: (producto: Producto) => void;
  SeccionCard: React.ComponentType<{
    seccion: Seccion;
    onEdit: (seccion: Seccion) => void;
    onDelete: (seccionId: string) => void;
    onClick: (seccion: Seccion) => void;
  }>;
  ProductoDestacadoCard: React.ComponentType<{
    producto: Producto;
    onClick: (producto: Producto) => void;
  }>;
}

export default function TiendaSection({
  activeTiendaTab,
  setActiveTiendaTab,
  secciones,
  handleCreateSeccion,
  handleEditSeccion,
  handleDeleteSeccion,
  handleSeccionClick,
  productosDestacados,
  handleManageProductosDestacados,
  setSelectedProduct,
  SeccionCard,
  ProductoDestacadoCard
}: TiendaSectionProps) {
  // Estado para manejar subsecciones
  const [subsecciones, setSubsecciones] = useState<Subseccion[]>([]);
  const [selectedSeccion, setSelectedSeccion] = useState<Seccion | null>(null);
  const [showSubsecciones, setShowSubsecciones] = useState(false);
  const [showSubseccionDialog, setShowSubseccionDialog] = useState(false);
  const [selectedSubseccion, setSelectedSubseccion] = useState<Subseccion | null>(null);
  const [isEditingSubseccion, setIsEditingSubseccion] = useState(false);
  const [productosEnSubseccion, setProductosEnSubseccion] = useState<Producto[]>([]);
  const [showProductSelectionDialog, setShowProductSelectionDialog] = useState(false);
  const [showProductosSubseccion, setShowProductosSubseccion] = useState(false);
  // Nuevo estado para manejar productos directamente en la sección
  const [productosEnSeccion, setProductosEnSeccion] = useState<Producto[]>([]);
  const [showProductosSeccion, setShowProductosSeccion] = useState(false);
  // Estado para controlar si estamos añadiendo productos a la sección o a una subsección
  const [isAddingToSeccion, setIsAddingToSeccion] = useState(false);
  // Estado para manejar todos los productos disponibles
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([]);
  const [isLoadingSeccionData, setIsLoadingSeccionData] = useState(false);

  // Agrega un useEffect para monitorear cambios
  useEffect(() => {
    console.log('📊 productosEnSeccion changed:', productosEnSeccion);
  }, [productosEnSeccion]);

  useEffect(() => {
    console.log('🎛️ showProductosSeccion changed:', showProductosSeccion);
  }, [showProductosSeccion]);


  // Cargar todos los productos disponibles
  useEffect(() => {
    const fetchTodosLosProductos = async () => {
      try {
        const response = await fetch('/api/productos');
        if (response.ok) {
          const data = await response.json();
          setTodosLosProductos(data);
        } else {
          console.error('Error al cargar todos los productos');
        }
      } catch (error) {
        console.error('Error al cargar todos los productos:', error);
      }
    };

    fetchTodosLosProductos();
  }, []);

  // Función para cargar subsecciones de una sección
  const fetchSubsecciones = async (seccionId: string) => {
    try {
      const response = await fetch(`/api/subsecciones?seccion_id=${seccionId}`);
      if (response.ok) {
        const data = await response.json();
        setSubsecciones(data);
      } else {
        console.error('Error al cargar subsecciones');
      }
    } catch (error) {
      console.error('Error al cargar subsecciones:', error);
    }
  };

  const fetchProductosSeccion = async (seccionId: string) => {
    try {
      console.log('🔍 Fetching productos for seccion:', seccionId);
      const response = await fetch(`/api/secciones/${seccionId}/productos`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Productos fetched successfully:', data);
        console.log('📊 Number of productos:', data.length);

        setProductosEnSeccion(data);
        console.log('💾 State updated with productos');
        return data;
      }
    } catch (error) {
      console.error('💥 Error al cargar productos de la sección:', error);
    }
  };



  // Función para cargar productos de una subsección
  const fetchProductosSubseccion = async (subseccionId: string) => {
    try {
      const response = await fetch(`/api/subsecciones/${subseccionId}/productos`);
      if (response.ok) {
        const data = await response.json();
        setProductosEnSubseccion(data);
        return data;
      } else {
        console.error('Error al cargar productos de la subsección');
        return [];
      }
    } catch (error) {
      console.error('Error al cargar productos de la subsección:', error);
      return [];
    }
  };

  // Función para manejar la creación de una subsección
  const handleCreateSubseccion = () => {
    setSelectedSubseccion(null);
    setIsEditingSubseccion(false);
    setShowSubseccionDialog(true);
  };

  // Función para manejar la edición de una subsección
  const handleEditSubseccion = (subseccion: Subseccion) => {
    setSelectedSubseccion(subseccion);
    setIsEditingSubseccion(true);
    setShowSubseccionDialog(true);
  };

  // Función para manejar la eliminación de una subsección
  const handleDeleteSubseccion = async (subseccionId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta subsección? Los productos asociados se desasociarán de la subsección.')) {
      try {
        const response = await fetch(`/api/subsecciones/${subseccionId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setSubsecciones(subsecciones.filter(s => s.id !== subseccionId));
        } else {
          console.error('Error al eliminar la subsección');
        }
      } catch (error) {
        console.error('Error al eliminar la subsección:', error);
      }
    }
  };

  // Función para guardar una subsección (crear o editar)
  const handleSaveSubseccion = async (subseccionData: { nombre: string; foto: string; seccion_id: string }) => {
    try {
      if (isEditingSubseccion && selectedSubseccion) {
        // Editar subsección existente
        const response = await fetch(`/api/subsecciones/${selectedSubseccion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subseccionData),
        });

        if (response.ok) {
          const updatedSubseccion = await response.json();
          setSubsecciones(subsecciones.map(s =>
            s.id === selectedSubseccion.id ? updatedSubseccion : s
          ));
          setShowSubseccionDialog(false);
        } else {
          console.error('Error al actualizar la subsección');
        }
      } else {
        // Crear nueva subsección
        const response = await fetch('/api/subsecciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subseccionData),
        });

        if (response.ok) {
          const newSubseccion = await response.json();
          setSubsecciones([...subsecciones, newSubseccion]);
          setShowSubseccionDialog(false);
        } else {
          console.error('Error al crear la subsección');
        }
      }
    } catch (error) {
      console.error('Error al guardar la subsección:', error);
    }
  };

  // Función para manejar el clic en una subsección
  const handleSubseccionClick = async (subseccion: Subseccion) => {
    setSelectedSubseccion(subseccion);
    const productos = await fetchProductosSubseccion(subseccion.id);
    if (productos.length > 0) {
      setProductosEnSubseccion(productos);
    }
    setShowProductosSubseccion(true);
  };

  // Función para volver a la vista de secciones
  const handleBackToSecciones = () => {
    setShowSubsecciones(false);
    setShowProductosSeccion(false);
    setSelectedSeccion(null);
  };

  // Función para volver a la vista de subsecciones desde productos
  const handleBackToSubsecciones = () => {
    setShowProductosSubseccion(false);
    setSelectedSubseccion(null);
  };


  // Nueva función helper para determinar qué mostrar
  const determineSeccionView = async (seccion: Seccion) => {
    try {
      // Verificar subsecciones primero
      const subseccionesResponse = await fetch(`/api/subsecciones?seccion_id=${seccion.id}`);
      const subseccionesData = subseccionesResponse.ok ? await subseccionesResponse.json() : [];

      // Verificar productos directos
      const productosResponse = await fetch(`/api/secciones/${seccion.id}/productos`);
      const productosData = productosResponse.ok ? await productosResponse.json() : [];

      return {
        hasSubsecciones: subseccionesData.length > 0,
        hasProductos: productosData.length > 0,
        subsecciones: subseccionesData,
        productos: productosData
      };
    } catch (error) {
      console.error('Error determining section view:', error);
      return {
        hasSubsecciones: false,
        hasProductos: false,
        subsecciones: [],
        productos: []
      };
    }
  };

  const handleSeccionClickInternal = async (seccion: Seccion) => {
    console.log('🎯 Sección clicked:', seccion.nombre);
    setSelectedSeccion(seccion);
    setIsLoadingSeccionData(true);

    try {
      // Cargar ambos datos en paralelo para mejor performance
      const [subseccionesResponse, productosResponse] = await Promise.all([
        fetch(`/api/subsecciones?seccion_id=${seccion.id}`),
        fetch(`/api/secciones/${seccion.id}/productos`)
      ]);

      const subseccionesData = subseccionesResponse.ok ? await subseccionesResponse.json() : [];
      const productosData = productosResponse.ok ? await productosResponse.json() : [];

      // Lógica de decisión
      if (subseccionesData.length > 0) {
        // ✅ HAY SUBSECCIONES: Mostrar subsecciones (prioridad alta)
        console.log('📁 Found subsecciones, showing subsecciones view');
        setSubsecciones(subseccionesData);
        setShowSubsecciones(true);
        setShowProductosSeccion(false);
      } else if (productosData.length > 0) {
        // ✅ NO HAY SUBSECCIONES PERO SÍ PRODUCTOS: Mostrar productos directos
        console.log('📦 No subsecciones, but found direct productos');
        setProductosEnSeccion(productosData);
        setShowProductosSeccion(true);
        setShowSubsecciones(false);
      } else {
        // ❌ SECCIÓN VACÍA: Mostrar vista para crear contenido
        console.log('🈳 Empty section, showing creation options');
        setSubsecciones([]);
        setShowSubsecciones(true);
        setShowProductosSeccion(false);
      }
    } catch (error) {
      console.error('Error loading section data:', error);
      // En caso de error, mostrar vista de subsecciones por defecto
      setShowSubsecciones(true);
      setShowProductosSeccion(false);
    } finally {
      setIsLoadingSeccionData(false);
    }
  };


  const handleShowProductosSeccion = async () => {
    console.log('🎯 handleShowProductosSeccion called');
    console.log('🎯 selectedSeccion:', selectedSeccion);

    if (selectedSeccion) {
      console.log('🚀 Calling fetchProductosSeccion...');
      const productos = await fetchProductosSeccion(selectedSeccion.id);
      console.log('📦 Productos returned:', productos);

      setProductosEnSeccion(productos || []);
      setShowProductosSeccion(true);
      setShowSubsecciones(false);

      console.log('🎛️ States updated:', {
        showProductosSeccion: true,
        showSubsecciones: false,
        productosCount: productos?.length || 0
      });
    }
  };


  // Función para añadir productos a una sección
  const handleAddProductosToSeccion = () => {
    setIsAddingToSeccion(true);
    setShowProductSelectionDialog(true);
  };

  // Función para añadir productos directamente a una sección vacía
  const handleAddProductosToEmptySeccion = () => {
    setIsAddingToSeccion(true);
    setShowProductSelectionDialog(true);
  };

  // Función para añadir productos a una subsección
  const handleAddProductosToSubseccion = () => {
    setIsAddingToSeccion(false);
    setShowProductSelectionDialog(true);
  };

  // Función para guardar los productos seleccionados
  const handleProductosSelected = async (productosIds: string[]) => {
    try {
      if (isAddingToSeccion && selectedSeccion) {
        // Guardar productos en la sección
        const response = await fetch(`/api/secciones/${selectedSeccion.id}/productos`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: productosIds }),
        });
        // ... resto del código
      } else if (!isAddingToSeccion && selectedSubseccion) {
        // Guardar productos en la subsección - AQUÍ ESTÁ EL CAMBIO
        const response = await fetch(`/api/subsecciones/${selectedSubseccion.id}/productos`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productos: productosIds }), // ✅ Cambiar de productIds a productos
        });
        // ... resto del código
      }
    } catch (error) {
      console.error('Error al guardar productos:', error);
    }

    setShowProductSelectionDialog(false);
  };

  // Justo antes del return del componente
  console.log('🎨 Render conditions:', {
    activeTiendaTab,
    showProductosSeccion,
    selectedSeccion: selectedSeccion?.id,
    showProductosSubseccion,
    productosEnSeccionLength: productosEnSeccion.length,
    shouldShowProductos: activeTiendaTab === 'secciones' && showProductosSeccion && selectedSeccion && !showProductosSubseccion
  });


  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center">
          <Store className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
          Gestión de Tienda
        </h2>
      </div>

      {/* Pestañas - Responsivas con mejor diseño móvil */}
      <div className="w-full overflow-x-auto">
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg min-w-max">
          <Button
            variant={activeTiendaTab === 'secciones' ? "default" : "ghost"}
            onClick={() => setActiveTiendaTab('secciones')}
            className="flex items-center whitespace-nowrap text-xs sm:text-sm md:text-base"
            size="sm"
          >
            <LayoutGrid className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Secciones</span>
            <span className="sm:hidden">Sec</span>
          </Button>
          <Button
            variant={activeTiendaTab === 'destacados' ? "default" : "ghost"}
            onClick={() => setActiveTiendaTab('destacados')}
            className="flex items-center whitespace-nowrap text-xs sm:text-sm md:text-base"
            size="sm"
          >
            <Star className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Destacados</span>
            <span className="sm:hidden">Dest</span>
          </Button>
          <Button
            variant={activeTiendaTab === 'promociones' ? "default" : "ghost"}
            onClick={() => setActiveTiendaTab('promociones')}
            className="flex items-center whitespace-nowrap text-xs sm:text-sm md:text-base"
            size="sm"
          >
            <Percent className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Promociones</span>
            <span className="sm:hidden">Promo</span>
          </Button>
          <Button
            variant={activeTiendaTab === 'carrusel' ? "default" : "ghost"}
            onClick={() => setActiveTiendaTab('carrusel')}
            className="flex items-center whitespace-nowrap text-xs sm:text-sm md:text-base"
            size="sm"
          >
            <ImageIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Carrusel</span>
            <span className="sm:hidden">Carr</span>
          </Button>
        </div>
      </div>

      {/* Contenido de Secciones */}
      {activeTiendaTab === 'secciones' && !showSubsecciones && !showProductosSubseccion && !showProductosSeccion && (
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mb-4 w-full">
            <Button
              onClick={handleCreateSeccion}
              className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
              size="sm"
            >
              <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-sm sm:text-base">Nueva Sección</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 w-full">
            {secciones.map((seccion) => (
              <div key={seccion.id} className="w-full">
                <SeccionCard
                  seccion={seccion}
                  onEdit={handleEditSeccion}
                  onDelete={handleDeleteSeccion}
                  onClick={handleSeccionClickInternal}
                />
              </div>
            ))}
          </div>

          {secciones.length === 0 && (
            <div className="text-center py-8 sm:py-12 px-4">
              <Store className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                No hay secciones creadas
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4 max-w-md mx-auto">
                Comienza creando tu primera sección para organizar tus productos
              </p>
              <Button onClick={handleCreateSeccion} size="sm" className="text-sm sm:text-base">
                <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Crear Primera Sección
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Vista de subsecciones de una sección */}
      {activeTiendaTab === 'secciones' && showSubsecciones && selectedSeccion && !showProductosSubseccion && !showProductosSeccion && (
        <div className="w-full">
          {/* Header responsivo con título de sección que se adapta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 w-full">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button
                variant="outline"
                onClick={handleBackToSecciones}
                size="sm"
                className="flex-shrink-0"
              >
                <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Volver a Secciones</span>
                <span className="sm:hidden">Volver</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-2xl font-bold truncate" title={selectedSeccion.nombre}>
                  {selectedSeccion.nombre}
                </h2>
                <p className="text-sm sm:text-base text-gray-600">{subsecciones.length} subsecciones</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
              <Button
                onClick={subsecciones.length > 0 ? handleShowProductosSeccion : handleAddProductosToEmptySeccion}
                className="bg-purple-500 hover:bg-purple-600 text-white w-full sm:w-auto"
                size="sm"
              >
                <Package className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-sm sm:text-base">
                  {subsecciones.length > 0 ? "Ver/Añadir" : "Añadir Productos"}
                </span>
              </Button>
              <Button
                onClick={handleCreateSubseccion}
                className="bg-green-500 hover:bg-green-600 text-white w-full sm:w-auto"
                size="sm"
              >
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-sm sm:text-base">Nueva Subsección</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 w-full">
            {subsecciones.map((subseccion) => (
              <div key={subseccion.id} className="w-full">
                <SubseccionCard
                  subseccion={subseccion}
                  onEdit={handleEditSubseccion}
                  onDelete={handleDeleteSubseccion}
                  onClick={handleSubseccionClick}
                />
              </div>
            ))}
          </div>

          {subsecciones.length === 0 && (
            <div className="text-center py-8 sm:py-12 px-4">
              <div className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4 text-2xl sm:text-3xl">📁</div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                No hay productos o subsecciones en esta sección
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4 max-w-md mx-auto">
                Puedes crear subsecciones para organizar mejor tus productos o añadir productos directamente a esta sección
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto sm:max-w-none">
                <Button
                  onClick={handleAddProductosToEmptySeccion}
                  className="bg-purple-500 hover:bg-purple-600 w-full sm:w-auto"
                  size="sm"
                >
                  <Package className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-sm sm:text-base">Añadir Productos</span>
                </Button>
                <Button
                  onClick={handleCreateSubseccion}
                  className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
                  size="sm"
                >
                  <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-sm sm:text-base">Crear Subsección</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista de productos en una sección */}
      {activeTiendaTab === 'secciones' && showProductosSeccion && selectedSeccion && !showProductosSubseccion && (
        <div className="w-full">
          {/* Header responsivo con título de sección que se adapta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 w-full">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button
                variant="outline"
                onClick={handleBackToSecciones}
                size="sm"
                className="flex-shrink-0"
              >
                <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Volver a Secciones</span>
                <span className="sm:hidden">Volver</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-2xl font-bold truncate" title={`Productos en ${selectedSeccion.nombre}`}>
                  Productos en {selectedSeccion.nombre}
                </h2>
                <p className="text-sm sm:text-base text-gray-600">{productosEnSeccion.length} productos</p>
              </div>
            </div>

            <Button
              onClick={handleAddProductosToSeccion}
              className="bg-purple-500 hover:bg-purple-600 text-white w-full sm:w-auto flex-shrink-0"
              size="sm"
            >
              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-sm sm:text-base">Añadir Productos</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 w-full">
            {productosEnSeccion.map((producto) => (
              <Card key={producto.id} className="overflow-hidden w-full">
                <CardContent className="p-0">
                  <div className="flex flex-col">
                    <div className="w-full h-40 sm:h-48 relative">
                      {producto.foto ? (
                        <Image
                          src={producto.foto}
                          alt={producto.nombre}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    <div className="p-3 sm:p-4">
                      <h3 className="font-medium text-sm sm:text-lg mb-1 line-clamp-2" title={producto.nombre}>
                        {producto.nombre}
                      </h3>
                      <p className="text-green-600 font-bold text-sm sm:text-base">
                        ${Number(producto.precio || 0).toFixed(2)}
                      </p>

                      <div className="flex justify-end mt-2 sm:mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProduct(producto)}
                          className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm"
                        >
                          Ver detalles
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {productosEnSeccion.length === 0 && (
            <div className="text-center py-8 sm:py-12 px-4">
              <div className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4 text-2xl sm:text-3xl">📦</div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                No hay productos en esta sección
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4 max-w-md mx-auto">
                Añade productos directamente a esta sección
              </p>
              <Button
                onClick={handleAddProductosToSeccion}
                className="bg-purple-500 hover:bg-purple-600"
                size="sm"
              >
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-sm sm:text-base">Añadir Productos</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Vista de productos en una subsección */}
      {activeTiendaTab === 'secciones' && showProductosSubseccion && selectedSubseccion && (
        <div className="w-full">
          {/* Header responsivo con título de subsección que se adapta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 w-full">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button
                variant="outline"
                onClick={handleBackToSubsecciones}
                size="sm"
                className="flex-shrink-0"
              >
                <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Volver a Subsecciones</span>
                <span className="sm:hidden">Volver</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-2xl font-bold truncate" title={selectedSubseccion.nombre}>
                  {selectedSubseccion.nombre}
                </h2>
                <p className="text-sm sm:text-base text-gray-600">{productosEnSubseccion.length} productos</p>
              </div>
            </div>

            <Button
              onClick={handleAddProductosToSubseccion}
              className="bg-purple-500 hover:bg-purple-600 text-white w-full sm:w-auto flex-shrink-0"
              size="sm"
            >
              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-sm sm:text-base">Añadir Productos</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 w-full">
            {productosEnSubseccion.map((producto) => (
              <Card key={producto.id} className="overflow-hidden w-full">
                <CardContent className="p-0">
                  <div className="flex flex-col">
                    <div className="w-full h-40 sm:h-48 relative">
                      {producto.foto ? (
                        <Image
                          src={producto.foto}
                          alt={producto.nombre}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    <div className="p-3 sm:p-4">
                      <h3 className="font-medium text-sm sm:text-lg mb-1 line-clamp-2" title={producto.nombre}>
                        {producto.nombre}
                      </h3>
                      <p className="text-green-600 font-bold text-sm sm:text-base">
                        ${Number(producto.precio || 0).toFixed(2)}
                      </p>

                      <div className="flex justify-end mt-2 sm:mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProduct(producto)}
                          className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm"
                        >
                          Ver detalles
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {productosEnSubseccion.length === 0 && (
            <div className="text-center py-8 sm:py-12 px-4">
              <div className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4 text-2xl sm:text-3xl">📦</div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                No hay productos en esta subsección
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4 max-w-md mx-auto">
                Añade productos a esta subsección para organizarlos mejor
              </p>
              <Button
                onClick={handleAddProductosToSubseccion}
                className="bg-purple-500 hover:bg-purple-600"
                size="sm"
              >
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-sm sm:text-base">Añadir Productos</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Contenido de Productos Destacados */}
      {activeTiendaTab === 'destacados' && (
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mb-4 w-full">
            <Button
              onClick={handleManageProductosDestacados}
              className="bg-yellow-500 hover:bg-yellow-600 text-white w-full sm:w-auto"
              size="sm"
            >
              <span className="mr-1 sm:mr-2 text-sm sm:text-base">⚙️</span>
              <span className="text-sm sm:text-base">Gestionar Destacados</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 w-full">
            {productosDestacados.map((producto) => (
              <div key={producto.id} className="w-full">
                <ProductoDestacadoCard
                  producto={producto}
                  onClick={(producto) => setSelectedProduct(producto)}
                />
              </div>
            ))}
          </div>
          {productosDestacados.length === 0 && (
            <div className="text-center py-8 sm:py-12 px-4">
              <Star className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                No hay productos destacados
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4 max-w-md mx-auto">
                Selecciona productos para destacar en tu tienda y aumentar las ventas
              </p>
              <Button
                onClick={handleManageProductosDestacados}
                className="bg-yellow-500 hover:bg-yellow-600"
                size="sm"
              >
                <Star className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-sm sm:text-base">Seleccionar Productos Destacados</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Contenido de Promociones */}
      {activeTiendaTab === 'promociones' && (
        <PromocionesManager />
      )}

      {/* Contenido de Carrusel - NUEVA SECCIÓN */}
      {activeTiendaTab === 'carrusel' && (
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Imágenes del Carrusel</CardTitle>
          </CardHeader>
          <CardContent>
            <CarruselManager />
          </CardContent>
        </Card>
      )}

      {/* Diálogo para gestionar subsecciones */}
      {showSubseccionDialog && (
        <SubseccionDialog
          isOpen={showSubseccionDialog}
          onClose={() => setShowSubseccionDialog(false)}
          onSave={handleSaveSubseccion}
          subseccion={selectedSubseccion}
          seccionId={selectedSeccion?.id || ''}
          isEditing={isEditingSubseccion}
        />
      )}

      {/* Diálogo para selección de productos */}
      {showProductSelectionDialog && (
        <ProductSelectionDialog
          isOpen={showProductSelectionDialog}
          onClose={() => setShowProductSelectionDialog(false)}
          subseccionId={isAddingToSeccion ? null : selectedSubseccion?.id}
          seccionId={isAddingToSeccion ? selectedSeccion?.id : null}
          currentProductos={isAddingToSeccion ? productosEnSeccion : productosEnSubseccion}
          allProductos={todosLosProductos}
          onProductosSelected={handleProductosSelected}
        />
      )}
    </div>
  );
}