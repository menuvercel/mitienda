import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea"; // Nuevo import para el campo de descripción
import Image from 'next/image';
import { toast } from "@/hooks/use-toast";
import { Producto, Vendedor, Parametro } from '@/types';
import { Plus, Minus } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { ChevronDown } from 'lucide-react';


interface ProductDialogProps {
  product: Producto;
  onClose: () => void;
  vendedores: Vendedor[];
  onEdit: (product: Producto, imageUrl: string | undefined) => Promise<void>;
  onDelete: (productId: string, vendedorId: string, cantidad: number) => Promise<void>;
  onDeliver: (
    productId: string,
    vendedorId: string,
    cantidadTotal: number,
    parametros: { nombre: string; cantidad: number }[]
  ) => Promise<void>;
  // NUEVA PROP AGREGADA
  getVendorProducts?: (vendorId: string) => Promise<Producto[]>;
}


type ModeType = 'view' | 'edit' | 'deliver';

const VendorsTab = ({
  vendorsData,
  isLoading,
  onRefresh,
  productName,
}: {
  vendorsData: Array<{
    vendedor: Vendedor;
    cantidad: number;
    parametros?: Array<{ nombre: string; cantidad: number }>;
  }>;
  isLoading: boolean;
  onRefresh: () => void;
  productName: string;
}) => {
  const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});

  const toggleExpand = (vendorId: string) => {
    setExpandedVendors(prev => ({
      ...prev,
      [vendorId]: !prev[vendorId]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Cargando datos de vendedores...</p>
        </div>
      </div>
    );
  }

  const totalEnVendedores = vendorsData.reduce((sum, item) => sum + item.cantidad, 0);
  const vendedoresConStock = vendorsData.filter(item => item.cantidad > 0).length;

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <h4 className="font-medium text-sm mb-2">Resumen de distribución</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total en vendedores:</span>
            <span className="font-semibold ml-1">{totalEnVendedores}</span>
          </div>
        </div>
      </div>

      {/* Botón de actualizar */}
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Distribución por vendedor</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          Actualizar
        </Button>
      </div>

      {/* Lista de vendedores */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {vendorsData.map((item) => (
          <div
            key={item.vendedor.id}
            className={`border rounded-lg p-3 ${item.cantidad > 0 ? 'bg-white' : 'bg-gray-50'
              }`}
          >
            <div
              className={`flex justify-between items-center ${item.parametros ? 'cursor-pointer' : ''
                }`}
              onClick={() => {
                if (item.parametros) {
                  toggleExpand(item.vendedor.id);
                }
              }}
            >
              <div className="flex items-center space-x-2">
                <span className="font-medium">{item.vendedor.nombre}</span>
                {item.parametros && (
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expandedVendors[item.vendedor.id] ? 'rotate-180' : ''
                      }`}
                  />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`font-semibold ${item.cantidad > 0
                    ? item.cantidad < 5
                      ? 'text-yellow-600'
                      : 'text-green-600'
                    : 'text-gray-400'
                    }`}
                >
                  {item.cantidad}
                </span>
                {item.cantidad > 0 && (
                  <div
                    className={`w-2 h-2 rounded-full ${item.cantidad < 5 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                  />
                )}
              </div>
            </div>

            {/* Desglose de parámetros */}
            {item.parametros && expandedVendors[item.vendedor.id] && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Desglose por parámetros:
                  </p>
                  {item.parametros.map((param, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded text-sm"
                    >
                      <span>{param.nombre}</span>
                      <span className="font-medium">{param.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {vendorsData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay vendedores disponibles</p>
        </div>
      )}
    </div>
  );
};

export default function ProductDialog({
  product,
  onClose,
  vendedores,
  onEdit,
  onDelete,
  onDeliver,
  getVendorProducts, // ← LÍNEA AGREGADA
}: ProductDialogProps) {
  const [mode, setMode] = useState<ModeType>('view');
  const [imageUrl, setImageUrl] = useState<string>(product.foto || '');
  const [editedProduct, setEditedProduct] = useState<Producto>({
    ...product,
    tieneParametros: product.tiene_parametros,
    tiene_parametros: product.tiene_parametros,
    parametros: product.parametros || [],
    foto: product.foto || '',
    precio_compra: product.precio_compra || 0, // Aseguramos que precio_compra tenga un valor
    descripcion: product.descripcion || '', // Aseguramos que descripcion tenga un valor
  });

  const [selectedVendedor, setSelectedVendedor] = useState<string | null>(null);
  const [deliveryStep, setDeliveryStep] = useState<1 | 2>(1);
  const [parameterQuantities, setParameterQuantities] = useState<{ [key: string]: number }>({});
  const [totalDeliveryQuantity, setTotalDeliveryQuantity] = useState(0);
  const [simpleDeliveryQuantity, setSimpleDeliveryQuantity] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  // Agregar estos estados al inicio del componente ProductDialog
  const [showVendorsTab, setShowVendorsTab] = useState(false);
  const [vendorsData, setVendorsData] = useState<Array<{
    vendedor: Vendedor;
    cantidad: number;
    parametros?: Array<{ nombre: string; cantidad: number }>;
  }>>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);


  // Función para obtener las cantidades del producto en cada vendedor
  const fetchVendorsData = useCallback(async () => {
    if (!getVendorProducts) {
      toast({
        title: "Error",
        description: "Función de obtención de productos no disponible.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingVendors(true);
    try {
      const vendorsInfo = await Promise.all(
        vendedores.map(async (vendedor) => {
          try {
            const productos = await getVendorProducts(vendedor.id);
            const productoEnVendedor = productos.find(p => p.id === product.id);

            if (productoEnVendedor) {
              // Calcular cantidad total
              let cantidadTotal = 0;
              let parametrosVendedor: Array<{ nombre: string; cantidad: number }> = [];

              if (productoEnVendedor.tiene_parametros && productoEnVendedor.parametros) {
                parametrosVendedor = productoEnVendedor.parametros.filter(p => p.cantidad > 0);
                cantidadTotal = parametrosVendedor.reduce((sum, param) => sum + param.cantidad, 0);
              } else {
                cantidadTotal = productoEnVendedor.cantidad;
              }

              return {
                vendedor,
                cantidad: cantidadTotal,
                parametros: parametrosVendedor.length > 0 ? parametrosVendedor : undefined
              };
            }

            return {
              vendedor,
              cantidad: 0,
              parametros: undefined
            };
          } catch (error) {
            console.error(`Error al obtener productos del vendedor ${vendedor.nombre}:`, error);
            return {
              vendedor,
              cantidad: 0,
              parametros: undefined
            };
          }
        })
      );

      // Ordenar por cantidad (mayor a menor) y luego por nombre
      const sortedVendors = vendorsInfo.sort((a, b) => {
        if (b.cantidad !== a.cantidad) {
          return b.cantidad - a.cantidad;
        }
        return a.vendedor.nombre.localeCompare(b.vendedor.nombre);
      });

      setVendorsData(sortedVendors);
    } catch (error) {
      console.error('Error al obtener datos de vendedores:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos de vendedores.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVendors(false);
    }
  }, [vendedores, product.id, getVendorProducts]);

  // Efecto para cargar datos cuando se abre la pestaña
  useEffect(() => {
    if (showVendorsTab && vendorsData.length === 0) {
      fetchVendorsData();
    }
  }, [showVendorsTab, fetchVendorsData, vendorsData.length]);


  // Subcomponente para la pestaña de vendedores



  // Efecto para sincronizar el estado con el producto recibido
  useEffect(() => {
    setEditedProduct({
      ...product,
      tieneParametros: product.tiene_parametros,
      tiene_parametros: product.tiene_parametros,
      parametros: product.parametros || [],
      foto: product.foto || '',
      precio_compra: product.precio_compra || 0, // Aseguramos que precio_compra tenga un valor
      descripcion: product.descripcion || '', // Aseguramos que descripcion tenga un valor
    });
    setImageUrl(product.foto || '');
  }, [product]);

  // Función para calcular la cantidad total disponible
  const getTotalCantidad = useCallback(() => {
    if ((product.tiene_parametros || product.tieneParametros) && product.parametros) {
      return product.parametros.reduce((sum, param) => sum + param.cantidad, 0);
    }
    return product.cantidad;
  }, [product]);

  // Manejo de cambios en los parámetros
  const handleParameterQuantityChange = useCallback((paramName: string, value: number) => {
    const newQuantities = {
      ...parameterQuantities,
      [paramName]: value,
    };
    setParameterQuantities(newQuantities);
    setTotalDeliveryQuantity(Object.values(newQuantities).reduce((sum, qty) => sum + qty, 0));
  }, [parameterQuantities]);

  // Manejo de cambios en los inputs del formulario
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedProduct((prev) => ({
      ...prev,
      [name]: name === 'precio' || name === 'precio_compra' || name === 'cantidad' ? Number(value) : value,
    }));
  }, []);

  // Manejo de cambios en los parámetros del producto
  const handleParametroChange = useCallback((index: number, field: 'nombre' | 'cantidad', value: string) => {
    setEditedProduct((prev) => {
      const newParametros = [...(prev.parametros || [])];
      newParametros[index] = {
        ...newParametros[index],
        [field]: field === 'cantidad' ? Number(value) : value,
      };
      return {
        ...prev,
        parametros: newParametros,
      };
    });
  }, []);

  // Agregar un nuevo parámetro
  const addParametro = useCallback(() => {
    setEditedProduct((prev) => ({
      ...prev,
      parametros: [...(prev.parametros || []), { nombre: '', cantidad: 0 }],
    }));
  }, []);

  // Eliminar un parámetro
  const removeParametro = useCallback((index: number) => {
    setEditedProduct((prev) => ({
      ...prev,
      parametros: prev.parametros?.filter((_, i) => i !== index),
    }));
  }, []);

  // Manejo del cambio en la propiedad "tieneParametros"
  const handleTieneParametrosChange = useCallback((checked: boolean) => {
    setEditedProduct((prev) => ({
      ...prev,
      tieneParametros: checked,
      tiene_parametros: checked,
      parametros: checked ? (prev.parametros?.length ? prev.parametros : [{ nombre: '', cantidad: 0 }]) : [],
    }));
  }, []);

  // Guardar cambios en el producto
  const handleEdit = async () => {
    try {
      // Solo verificamos la imagen si se está intentando subir una nueva
      if (imageUrl !== product.foto && !imageUrl) {
        toast({
          title: "Advertencia",
          description: "Espera a que la imagen se suba completamente.",
          variant: "default",
        });
        return;
      }

      const updatedProduct: Producto = {
        ...editedProduct,
        foto: imageUrl || product.foto, // Usar la foto existente si no hay nueva
        tiene_parametros: editedProduct.tieneParametros || false,
        tieneParametros: editedProduct.tieneParametros || false,
        parametros: editedProduct.tieneParametros ? editedProduct.parametros : [],
        precio_compra: editedProduct.precio_compra || 0,
        descripcion: editedProduct.descripcion || '', // Incluir descripción en el producto actualizado
      };

      console.log('Producto a guardar:', updatedProduct);
      await onEdit(updatedProduct, imageUrl !== product.foto ? imageUrl : undefined);
      setMode('view');
      toast({
        title: "Éxito",
        description: "Producto actualizado correctamente.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error en handleEdit:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el producto.",
        variant: "destructive",
      });
    }
  };


  // Manejo de la entrega del producto
  const handleDeliver = async () => {
    if (!selectedVendedor) {
      toast({
        title: "Advertencia",
        description: "Por favor seleccione un vendedor.",
        variant: "default",
      });
      return;
    }

    const cantidadAEntregar = product.tiene_parametros ? totalDeliveryQuantity : simpleDeliveryQuantity;

    if (cantidadAEntregar === 0) {
      toast({
        title: "Advertencia",
        description: "Por favor ingrese las cantidades a entregar.",
        variant: "default",
      });
      return;
    }

    if (cantidadAEntregar > getTotalCantidad()) {
      toast({
        title: "Error",
        description: "La cantidad total excede el stock disponible.",
        variant: "destructive",
      });
      return;
    }

    try {
      const parametrosEntrega = product.tiene_parametros && product.parametros ?
        product.parametros.map((param) => ({
          nombre: param.nombre,
          cantidad: parameterQuantities[param.nombre] || 0,
        })) :
        [];

      await onDeliver(
        product.id,
        selectedVendedor,
        cantidadAEntregar,
        parametrosEntrega
      );

      setDeliveryStep(1);
      setSelectedVendedor(null);
      setParameterQuantities({});
      setTotalDeliveryQuantity(0);
      setSimpleDeliveryQuantity(0);
      setMode('view');
      toast({
        title: "Éxito",
        description: "Producto entregado correctamente.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error al entregar producto:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido al entregar producto.",
        variant: "destructive",
      });
    }
  };

  // Eliminar el producto
  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        await onDelete(product.id, '', getTotalCantidad());
        onClose();
        toast({
          title: "Éxito",
          description: "Producto eliminado correctamente.",
          variant: "default",
        });
      } catch (error) {
        console.error('Error al eliminar producto:', error);
        toast({
          title: "Error",
          description: "Error al eliminar el producto.",
          variant: "destructive",
        });
      }
    }
  };

  // Renderizado del componente
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.nombre}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center">
            <Image
              src={imageUrl || '/placeholder.svg'}
              alt={product.nombre}
              width={200}
              height={200}
              className="object-cover rounded"
            />
          </div>

          {mode === 'edit' ? (
            <EditMode
              editedProduct={editedProduct}
              imageUrl={imageUrl}
              onInputChange={handleInputChange}
              onTieneParametrosChange={handleTieneParametrosChange}
              onParametroChange={handleParametroChange}
              onAddParametro={addParametro}
              onRemoveParametro={removeParametro}
              onImageChange={(url) => setImageUrl(url)}
              onSave={handleEdit}
              onCancel={() => setMode('view')}
            />
          ) : mode === 'deliver' ? (
            <DeliverMode
              deliveryStep={deliveryStep}
              product={product}
              vendedores={vendedores}
              selectedVendedor={selectedVendedor}
              parameterQuantities={parameterQuantities}
              simpleDeliveryQuantity={simpleDeliveryQuantity}
              totalDeliveryQuantity={totalDeliveryQuantity}
              onVendedorSelect={(id) => {
                setSelectedVendedor(id);
                setDeliveryStep(2);
              }}
              onParameterQuantityChange={handleParameterQuantityChange}
              onSimpleDeliveryChange={(value) => setSimpleDeliveryQuantity(value)}
              onBack={() => {
                setDeliveryStep(1);
                setParameterQuantities({});
                setTotalDeliveryQuantity(0);
                setSimpleDeliveryQuantity(0);
              }}
              onDeliver={handleDeliver}
              getTotalCantidad={getTotalCantidad}
            />
            // En la parte del renderizado principal, reemplaza la llamada a ViewMode:
          ) : (
            <ViewMode
              product={product}
              onEdit={() => setMode('edit')}
              onDeliver={() => setMode('deliver')}
              onDelete={handleDelete}
              getTotalCantidad={getTotalCantidad}
              showVendorsTab={showVendorsTab}
              setShowVendorsTab={setShowVendorsTab}
              vendorsData={vendorsData}
              isLoadingVendors={isLoadingVendors}
              onRefreshVendors={fetchVendorsData}
            />
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

// Subcomponente para el modo de edición
const EditMode = ({
  editedProduct,
  imageUrl,
  onInputChange,
  onTieneParametrosChange,
  onParametroChange,
  onAddParametro,
  onRemoveParametro,
  onImageChange,
  onSave,
  onCancel,
}: {
  editedProduct: Producto;
  imageUrl: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onTieneParametrosChange: (checked: boolean) => void;
  onParametroChange: (index: number, field: 'nombre' | 'cantidad', value: string) => void;
  onAddParametro: () => void;
  onRemoveParametro: (index: number) => void;
  onImageChange: (url: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) => (
  <>
    <div className="space-y-4">
      <div>
        <Label>Nombre</Label>
        <Input
          name="nombre"
          value={editedProduct.nombre}
          onChange={onInputChange}
          placeholder="Nombre del producto"
        />
      </div>

      <div>
        <Label>Descripción</Label>
        <Textarea
          name="descripcion"
          value={editedProduct.descripcion || ''}
          onChange={onInputChange}
          placeholder="Descripción del producto"
          className="min-h-[100px]"
        />
      </div>

      <div>
        <Label>Precio de venta</Label>
        <Input
          name="precio"
          type="number"
          value={editedProduct.precio}
          onChange={onInputChange}
          placeholder="Precio de venta"
        />
      </div>

      <div>
        <Label>Precio de compra</Label>
        <Input
          name="precio_compra"
          type="number"
          value={editedProduct.precio_compra || 0}
          onChange={onInputChange}
          placeholder="Precio de compra"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="tieneParametros"
          checked={editedProduct.tieneParametros}
          onCheckedChange={(checked) => onTieneParametrosChange(checked as boolean)}
        />
        <Label htmlFor="tieneParametros">Tiene parámetros</Label>
      </div>

      {editedProduct.tieneParametros ? (
        <div className="space-y-4">
          <Label>Parámetros</Label>
          {(editedProduct.parametros || []).map((param, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={param.nombre}
                onChange={(e) => onParametroChange(index, 'nombre', e.target.value)}
                placeholder="Nombre del parámetro"
                className="flex-1"
              />
              <Input
                type="number"
                value={param.cantidad}
                onChange={(e) => onParametroChange(index, 'cantidad', e.target.value)}
                placeholder="Cantidad"
                className="w-24"
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onRemoveParametro(index)}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={onAddParametro}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar parámetro
          </Button>
        </div>
      ) : (
        <div>
          <Label>Cantidad</Label>
          <Input
            name="cantidad"
            type="number"
            value={editedProduct.cantidad}
            onChange={onInputChange}
            placeholder="Cantidad"
          />
        </div>
      )}

      <div>
        <Label>Imagen del producto</Label>
        <ImageUpload
          value={imageUrl}
          onChange={onImageChange}
          disabled={false}
        />
      </div>

      <div className="flex justify-between gap-2">
        <Button onClick={onSave} className="flex-1">Guardar cambios</Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </div>
  </>
);

// Subcomponente para el modo de entrega
const DeliverMode = ({
  deliveryStep,
  product,
  vendedores,
  selectedVendedor,
  parameterQuantities,
  simpleDeliveryQuantity,
  totalDeliveryQuantity,
  onVendedorSelect,
  onParameterQuantityChange,
  onSimpleDeliveryChange,
  onBack,
  onDeliver,
  getTotalCantidad,
}: {
  deliveryStep: 1 | 2;
  product: Producto;
  vendedores: Vendedor[];
  selectedVendedor: string | null;
  parameterQuantities: { [key: string]: number };
  simpleDeliveryQuantity: number;
  totalDeliveryQuantity: number;
  onVendedorSelect: (id: string) => void;
  onParameterQuantityChange: (paramName: string, value: number) => void;
  onSimpleDeliveryChange: (value: number) => void;
  onBack: () => void;
  onDeliver: () => void;
  getTotalCantidad: () => number;
}) => (
  <>
    {deliveryStep === 1 ? (
      <div className="space-y-4">
        <Label>Seleccionar vendedor:</Label>
        <div className="grid gap-2">
          {vendedores.map((vendedor) => (
            <Button
              key={vendedor.id}
              onClick={() => onVendedorSelect(vendedor.id)}
              variant={selectedVendedor === vendedor.id ? 'default' : 'outline'}
              className="w-full"
            >
              {vendedor.nombre}
            </Button>
          ))}
        </div>
        <Button
          onClick={onBack}
          className="w-full mt-4"
        >
          Cancelar
        </Button>
      </div>
    ) : (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Cantidades a entregar</h3>
          <div className="text-sm">
            <span className="font-medium">Total: </span>
            <span
              className={`${(product.tiene_parametros ? totalDeliveryQuantity : simpleDeliveryQuantity) > getTotalCantidad()
                ? 'text-red-500'
                : 'text-green-600'
                }`}
            >
              {product.tiene_parametros ? totalDeliveryQuantity : simpleDeliveryQuantity}
            </span>
          </div>
        </div>

        {product.tiene_parametros && product.parametros ? (
          product.parametros.map((param, index) => (
            <div key={index} className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">{param.nombre}</Label>
                <span className="text-xs text-gray-500">
                  Disponible: {param.cantidad}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={parameterQuantities[param.nombre] || 0}
                  onChange={(e) =>
                    onParameterQuantityChange(
                      param.nombre,
                      Math.min(Number(e.target.value), param.cantidad)
                    )
                  }
                  min={0}
                  max={param.cantidad}
                  className="w-full"
                />
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Cantidad</Label>
              <span className="text-xs text-gray-500">
                Disponible: {product.cantidad}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={simpleDeliveryQuantity}
                onChange={(e) =>
                  onSimpleDeliveryChange(Math.min(Number(e.target.value), product.cantidad))
                }
                min={0}
                max={product.cantidad}
                className="w-full"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            Atrás
          </Button>
          <Button
            onClick={onDeliver}
            disabled={
              product.tiene_parametros
                ? totalDeliveryQuantity === 0 || totalDeliveryQuantity > getTotalCantidad()
                : simpleDeliveryQuantity === 0 || simpleDeliveryQuantity > getTotalCantidad()
            }
            className="flex-1"
          >
            Confirmar entrega
          </Button>
        </div>
      </div>
    )}
  </>
);

// Subcomponente para el modo de visualización con pestañas
const ViewMode = ({
  product,
  onEdit,
  onDeliver,
  onDelete,
  getTotalCantidad,
  showVendorsTab,
  setShowVendorsTab,
  vendorsData,
  isLoadingVendors,
  onRefreshVendors,
}: {
  product: Producto;
  onEdit: () => void;
  onDeliver: () => void;
  onDelete: () => void;
  getTotalCantidad: () => number;
  showVendorsTab: boolean;
  setShowVendorsTab: (show: boolean) => void;
  vendorsData: Array<{
    vendedor: Vendedor;
    cantidad: number;
    parametros?: Array<{ nombre: string; cantidad: number }>;
  }>;
  isLoadingVendors: boolean;
  onRefreshVendors: () => void;
}) => (
  <>
    {/* Pestañas */}
    <div className="flex border-b border-gray-200 mb-4">
      <button
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${!showVendorsTab
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        onClick={() => setShowVendorsTab(false)}
      >
        Información General
      </button>
      <button
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${showVendorsTab
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        onClick={() => setShowVendorsTab(true)}
      >
        En Vendedores
      </button>
    </div>

    {/* Contenido de las pestañas */}
    {showVendorsTab ? (
      <VendorsTab
        vendorsData={vendorsData}
        isLoading={isLoadingVendors}
        onRefresh={onRefreshVendors}
        productName={product.nombre}
      />
    ) : (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-lg font-medium">Precio de venta: ${product.precio}</p>
          <p className="text-md text-gray-700">Precio de compra: ${product.precio_compra || 0}</p>

          {/* Mostrar la descripción si existe */}
          {product.descripcion && (
            <div className="mt-2">
              <h4 className="font-medium text-sm text-gray-700">Descripción:</h4>
              <p className="text-gray-600 mt-1 whitespace-pre-wrap">{product.descripcion}</p>
            </div>
          )}

          {(product.tiene_parametros || product.tieneParametros) && product.parametros && product.parametros.length > 0 ? (
            <div className="space-y-2 mt-4">
              <h4 className="font-medium text-sm text-gray-700">Parámetros:</h4>
              <div className="grid grid-cols-1 gap-2">
                {product.parametros.map((param, index) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-50 rounded-md flex justify-between items-center"
                  >
                    <span className="font-medium">{param.nombre}:</span>
                    <span className="text-gray-600">{param.cantidad}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Cantidad total: {getTotalCantidad()}
              </p>
            </div>
          ) : (
            <p className="text-gray-700 mt-4">Cantidad disponible: {product.cantidad}</p>
          )}
        </div>

        <div className="flex justify-between gap-2">
          <Button onClick={onEdit} className="w-full">Editar</Button>
          <Button onClick={onDeliver} className="w-full">Entregar</Button>
          <Button onClick={onDelete} variant="destructive" className="w-full">
            Eliminar
          </Button>
        </div>
      </div>
    )}
  </>
);