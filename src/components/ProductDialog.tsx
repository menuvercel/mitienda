import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea"; // Nuevo import para el campo de descripción
import Image from 'next/image';
import { toast } from "@/hooks/use-toast";
import { Producto, Vendedor, Parametro } from '@/types';
import { ChevronDown, Download, Barcode, Scan, Plus, Minus } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { useRef } from 'react';
const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });
import { ImageUpload } from '@/components/ImageUpload';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


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

const BarcodeDisplay = ({ value, name }: { value: string, name: string }) => {
  const barcodeRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value]);

  const downloadBarcode = () => {
    const svg = barcodeRef.current;
    if (!svg) return;
    
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const svgSize = svg.getBBox();
      
      // Aumentar un poco el tamaño para el padding
      canvas.width = svgSize.width + 40;
      canvas.height = svgSize.height + 40;
      
      const ctx = canvas.getContext("2d");
      const img = document.createElement('img');
      
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 20, 20);
          const pngUrl = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = pngUrl;
          downloadLink.download = `barcode-${name}-${value}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
      };
      
      // Convertir SVG a data URL compatible con btoa (UTF-8)
      const encodedData = btoa(unescape(encodeURIComponent(svgData)));
      img.src = "data:image/svg+xml;base64," + encodedData;
    } catch (err) {
      console.error('Error exporting barcode:', err);
      toast({
        title: "Error",
        description: "No se pudo exportar el código de barras",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3 p-4 bg-gray-50 border rounded-lg">
      <div className="bg-white p-2 rounded shadow-sm overflow-x-auto max-w-full">
        <svg ref={barcodeRef}></svg>
      </div>
      <Button variant="outline" size="sm" onClick={downloadBarcode} className="w-full">
        <Download className="mr-2 h-4 w-4" />
        Exportar Código de Barras
      </Button>
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
  // En el componente ProductDialog, actualizar el useState de editedProduct
  const [editedProduct, setEditedProduct] = useState<Producto>({
    ...product,
    tieneParametros: product.tiene_parametros,
    tiene_parametros: product.tiene_parametros,
    parametros: product.parametros || [],
    foto: product.foto || '',
    precio_compra: product.precio_compra || 0,
    descripcion: product.descripcion || '',
    valor_compra_usd: product.valor_compra_usd ?? null,
    precio_compra_usd: product.precio_compra_usd ?? null, // ✅ Usar ?? en lugar de ||
    precio_venta_usd: product.precio_venta_usd ?? null, // ✅ Usar ?? en lugar de ||
    codigo_barras: product.codigo_barras || '',
  });

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);


  // También actualizar el useEffect que sincroniza el estado con el producto recibido
  useEffect(() => {
    setEditedProduct({
      ...product,
      tieneParametros: product.tiene_parametros,
      tiene_parametros: product.tiene_parametros,
      parametros: product.parametros || [],
      foto: product.foto || '',
      precio_compra: product.precio_compra || 0,
      descripcion: product.descripcion || '',
      valor_compra_usd: product.valor_compra_usd ?? null,
      precio_compra_usd: product.precio_compra_usd ?? null, // ✅ Cambiar || por ??
      precio_venta_usd: product.precio_venta_usd ?? null, // ✅ Cambiar || por ??
      codigo_barras: product.codigo_barras || '',
    });
    setImageUrl(product.foto || '');
  }, [product]);


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
      valor_compra_usd: product.valor_compra_usd || null, // Aseguramos que valor_compra_usd tenga un valor
      codigo_barras: product.codigo_barras || '',
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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setEditedProduct((prev) => {
      // Para campos USD opcionales
      if (name === 'valor_compra_usd' || name === 'precio_compra_usd' || name === 'precio_venta_usd') {
        return {
          ...prev,
          [name]: value === '' ? null : parseFloat(value) || null
        };
      }

      // Para campos numéricos obligatorios
      if (name === 'precio' || name === 'precio_compra' || name === 'cantidad') {
        return {
          ...prev,
          [name]: value === '' ? 0 : parseFloat(value) || 0
        };
      }

      // Para campos de texto
      return {
        ...prev,
        [name]: value
      };
    });
  }, []);


  // Mejorar el input en EditMode
  <div>
    <Label>Valor de compra del USD</Label>
    <Input
      name="valor_compra_usd"
      type="number"
      value={editedProduct.valor_compra_usd ?? ''}
      onChange={handleInputChange}
      placeholder="Valor de compra del USD (opcional)"
      step="0.01"
      min="0"
    />
    <p className="text-xs text-gray-500 mt-1">
      Deja vacío si no aplica
    </p>
  </div>


  // Manejo de cambios en los parámetros del producto
  const handleParametroChange = useCallback((index: number, field: 'nombre' | 'cantidad' | 'foto' | 'codigo_barras', value: string) => {
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
      parametros: [...(prev.parametros || []), { nombre: '', cantidad: 0, foto: '' }],
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
      parametros: checked ? (prev.parametros?.length ? prev.parametros : [{ nombre: '', cantidad: 0, foto: '' }]) : [],
    }));
  }, []);

  // Guardar cambios en el producto
  // Actualizar handleEdit para incluir los nuevos campos
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
        descripcion: editedProduct.descripcion || '',
        valor_compra_usd: editedProduct.valor_compra_usd || null,
        precio_compra_usd: editedProduct.precio_compra_usd || null, // Incluir el nuevo campo
        precio_venta_usd: editedProduct.precio_venta_usd || null, // Incluir el nuevo campo
        codigo_barras: editedProduct.codigo_barras || '',
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
              onShowBarcodeScanner={() => setShowBarcodeScanner(true)}
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
        <BarcodeScanner 
            open={showBarcodeScanner}
            onClose={() => setShowBarcodeScanner(false)}
            onScan={(barcode) => {
                setEditedProduct(prev => ({ ...prev, codigo_barras: barcode }));
                setShowBarcodeScanner(false);
                toast({
                    title: "Escaneado",
                    description: `Código detectado: ${barcode}`,
                });
            }}
        />
      </DialogContent>
    </Dialog>
  );
}

// Actualizo el componente EditMode para agregar los nuevos campos
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
  onShowBarcodeScanner,
}: {
  editedProduct: Producto;
  imageUrl: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onTieneParametrosChange: (checked: boolean) => void;
  onParametroChange: (index: number, field: 'nombre' | 'cantidad' | 'foto', value: string) => void;
  onAddParametro: () => void;
  onRemoveParametro: (index: number) => void;
  onImageChange: (url: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onShowBarcodeScanner: () => void;
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

      <div>
        <Label>Valor de compra del USD</Label>
        <Input
          name="valor_compra_usd"
          type="number"
          value={editedProduct.valor_compra_usd || ''}
          onChange={onInputChange}
          placeholder="Valor de compra del USD"
        />
      </div>

      <div>
        <Label>Precio de compra en USD</Label>
        <Input
          name="precio_compra_usd"
          type="number"
          value={editedProduct.precio_compra_usd || ''}
          onChange={onInputChange}
          placeholder="Precio de compra en USD"
        />
      </div>

      <div>
        <Label>Precio de venta en USD</Label>
        <Input
          name="precio_venta_usd"
          type="number"
          value={editedProduct.precio_venta_usd || ''}
          onChange={onInputChange}
          placeholder="Precio de venta en USD"
        />
      </div>
      
      <div>
        <Label>Código de Barras</Label>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              name="codigo_barras"
              value={editedProduct.codigo_barras || ''}
              onChange={onInputChange}
              placeholder="Código de barras"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const random = Math.floor(Math.random() * 900000000000) + 100000000000;
                onInputChange({ target: { name: 'codigo_barras', value: random.toString() } } as any);
              }}
            >
              Aleatorio
            </Button>
          </div>
          <Button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onShowBarcodeScanner}
          >
            <Scan className="mr-2 h-4 w-4" />
            Escanear Código
          </Button>
        </div>
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
            <div key={index} className="space-y-3 p-3 border rounded-lg">
              <div className="flex gap-2 items-center">
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
              <div className="flex gap-2 items-center mt-2">
                <Input
                  value={param.codigo_barras || ''}
                  onChange={(e) => onParametroChange(index, 'codigo_barras', e.target.value)}
                  placeholder="Código de barras del parámetro"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const random = Math.floor(Math.random() * 900000000000) + 100000000000;
                    onParametroChange(index, 'codigo_barras', random.toString());
                  }}
                >
                  Aleatorio
                </Button>
              </div>
              <div>
                <Label className="text-sm">Foto del parámetro (opcional)</Label>
                <ImageUpload
                  id={`param-foto-${index}`}
                  value={param.foto || ''}
                  onChange={(url) => onParametroChange(index, 'foto', url)}
                  disabled={false}
                />
              </div>
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
          id="producto-foto-dialog"
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

// En el componente ViewMode, modifica la sección de precios:

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
}) => {
  return (
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
            {/* Precio de venta SIN USD */}
            <p className="text-lg font-medium">
              Precio de venta: ${product.precio}
            </p>

            {/* Precio de compra SIN USD */}
            <p className="text-md text-gray-700">
              Precio de compra: ${product.precio_compra || 0}
            </p>

            {/* Mostrar el valor de compra del USD si existe */}
            {product.valor_compra_usd !== null && product.valor_compra_usd !== undefined && (
              <p className="text-md text-gray-700">
                Valor de compra del USD: ${product.valor_compra_usd}
              </p>
            )}

            {/* Nuevos campos para precios en USD */}
            {product.precio_compra_usd !== null && product.precio_compra_usd !== undefined && (
              <p className="text-md text-gray-700">
                Precio de compra en USD: ${product.precio_compra_usd}
              </p>
            )}

            {product.precio_venta_usd !== null && product.precio_venta_usd !== undefined && (
              <p className="text-md text-gray-700">
                Precio de venta en USD: ${product.precio_venta_usd}
              </p>
            )}

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
                <div className="grid grid-cols-1 gap-3">
                  {product.parametros.map((param, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{param.nombre}:</span>
                        <span className="text-gray-600">{param.cantidad}</span>
                      </div>
                      {param.foto && (
                        <div className="mt-2">
                          <Image
                            src={param.foto}
                            alt={`Foto de ${param.nombre}`}
                            width={100}
                            height={100}
                            className="object-cover rounded-lg"
                          />
                        </div>
                      )}
                      {param.codigo_barras && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Código de barras: {param.codigo_barras}</p>
                          <BarcodeDisplay value={param.codigo_barras} name={`${product.nombre} - ${param.nombre}`} />
                        </div>
                      )}
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

            {/* Mostrar código de barras */}
            <div className="mt-6 border-t pt-4">
              <h4 className="font-medium text-sm text-gray-700 mb-3">Código de Barras:</h4>
              {product.codigo_barras ? (
                <BarcodeDisplay value={product.codigo_barras} name={product.nombre} />
              ) : (
                <p className="text-sm text-gray-500 italic">No tiene código de barras asignado</p>
              )}
            </div>
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
};