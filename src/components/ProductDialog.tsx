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
import { ChevronDown, Download, Barcode, Scan, Plus, Minus, Calendar as CalendarIcon } from 'lucide-react';
import { format, isBefore, startOfDay, differenceInDays } from 'date-fns';
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
    parametros: Parametro[]
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
    parametros?: Parametro[];
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
    fecha_vencimiento: product.fecha_vencimiento || null,
    tiene_vencimiento: product.tiene_vencimiento || false,
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
      fecha_vencimiento: product.fecha_vencimiento || null,
      tiene_vencimiento: product.tiene_vencimiento || false,
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
    parametros?: Parametro[];
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
              let parametrosVendedor: Parametro[] = [];

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
      fecha_vencimiento: product.fecha_vencimiento || null,
      tiene_vencimiento: product.tiene_vencimiento || false,
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
      if (name === 'precio' || name === 'precio_compra' || name === 'cantidad' || name === 'stock_minimo') {
        return {
          ...prev,
          [name]: value === '' ? (name === 'stock_minimo' ? null : 0) : parseFloat(value) || 0
        };
      }

      // Para el checkbox de vencimiento
      if (name === 'tiene_vencimiento') {
        const checked = (e.target as HTMLInputElement).checked;
        return {
          ...prev,
          tiene_vencimiento: checked,
          fecha_vencimiento: checked ? prev.fecha_vencimiento : null
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
        fecha_vencimiento: editedProduct.fecha_vencimiento || null,
        tiene_vencimiento: editedProduct.tiene_vencimiento || false,
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

// Estilo para las secciones del formulario
const FormSection = ({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon?: any }) => (
  <div className="space-y-4 p-4 bg-gray-50/50 border rounded-xl mb-4">
    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
      {Icon && <Icon className="h-4 w-4 text-blue-600" />}
      <h3 className="font-bold text-sm uppercase tracking-wider text-gray-700">{title}</h3>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

// Actualizo el componente EditMode para agregar los nuevos campos y organizar mejor la UI
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
  onParametroChange: (index: number, field: 'nombre' | 'cantidad' | 'foto' | 'codigo_barras', value: string) => void;
  onAddParametro: () => void;
  onRemoveParametro: (index: number) => void;
  onImageChange: (url: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onShowBarcodeScanner: () => void;
}) => (
  <div className="space-y-6 pb-20 sm:pb-0">
    {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
    <FormSection title="Información Básica" icon={Plus}>
      <div>
        <Label className="text-xs font-bold mb-1.5 block text-gray-600 uppercase">Nombre del Producto</Label>
        <Input
          name="nombre"
          value={editedProduct.nombre}
          onChange={onInputChange}
          placeholder="Ej: Camiseta Oversize"
          className="bg-white border-gray-200 focus:border-blue-400"
        />
      </div>

      <div>
        <Label className="text-xs font-bold mb-1.5 block text-gray-600 uppercase">Descripción</Label>
        <Textarea
          name="descripcion"
          value={editedProduct.descripcion || ''}
          onChange={onInputChange}
          placeholder="Detalles, materiales, etc."
          className="min-h-[80px] bg-white text-sm border-gray-200 focus:border-blue-400"
        />
      </div>

      <div>
        <Label className="text-xs font-bold mb-1.5 block text-gray-600 uppercase">Imagen Principal</Label>
        <div className="bg-white p-2 border rounded-lg border-gray-100">
          <ImageUpload
            id="producto-foto-dialog"
            value={imageUrl}
            onChange={onImageChange}
            disabled={false}
          />
        </div>
      </div>
    </FormSection>

    {/* SECCIÓN 2: PRECIOS Y COSTOS */}
    <FormSection title="Precios y Costos" icon={Download}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-[10px] font-black mb-1.5 block text-green-700 uppercase">Precio Venta ($)</Label>
          <Input
            name="precio"
            type="number"
            value={editedProduct.precio}
            onChange={onInputChange}
            className="bg-white border-green-200 focus:border-green-500 font-bold text-green-700"
          />
        </div>
        <div>
          <Label className="text-[10px] font-black mb-1.5 block text-red-700 uppercase">Precio Compra ($)</Label>
          <Input
            name="precio_compra"
            type="number"
            value={editedProduct.precio_compra || 0}
            onChange={onInputChange}
            className="bg-white border-red-100 focus:border-red-400 text-red-600"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-gray-200">
        <p className="text-[10px] font-black text-blue-600 uppercase mb-3 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
          Valores en USD (Opcional)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-[10px] uppercase text-gray-500 font-bold">Tasa de Cambio (USD)</Label>
            <Input
              name="valor_compra_usd"
              type="number"
              value={editedProduct.valor_compra_usd ?? ''}
              onChange={onInputChange}
              className="bg-white h-9 text-sm border-blue-50 border-gray-200"
              placeholder="Precio del USD hoy"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-gray-500 font-bold">Costo en USD</Label>
            <Input
              name="precio_compra_usd"
              type="number"
              value={editedProduct.precio_compra_usd ?? ''}
              onChange={onInputChange}
              className="bg-white h-9 text-sm border-gray-200"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-gray-500 font-bold">Venta en USD</Label>
            <Input
              name="precio_venta_usd"
              type="number"
              value={editedProduct.precio_venta_usd ?? ''}
              onChange={onInputChange}
              className="bg-white h-9 text-sm border-gray-200"
            />
          </div>
        </div>
      </div>
    </FormSection>

    {/* SECCIÓN 3: INVENTARIO Y VARIANTES */}
    <FormSection title="Inventario" icon={ChevronDown}>
      <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 shadow-sm">
        <div className="space-y-0.5">
          <Label htmlFor="tieneParametros" className="text-sm font-black text-blue-900 cursor-pointer">¿Tiene Variantes?</Label>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Tallas, colores, modelos...</p>
        </div>
        <Checkbox
          id="tieneParametros"
          checked={editedProduct.tieneParametros}
          onCheckedChange={(checked) => onTieneParametrosChange(checked as boolean)}
          className="h-6 w-6 border-blue-300 data-[state=checked]:bg-blue-600"
        />
      </div>

      {!editedProduct.tieneParametros ? (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <Label className="text-[10px] font-black mb-1.5 block text-gray-600 uppercase">Stock Disponible</Label>
            <Input
              name="cantidad"
              type="number"
              value={editedProduct.cantidad}
              onChange={onInputChange}
              className="bg-white border-gray-200 focus:border-blue-400"
            />
          </div>
          <div>
            <Label className="text-[10px] font-black mb-1.5 block text-orange-600 uppercase">Stock Alerta</Label>
            <Input
              name="stock_minimo"
              type="number"
              value={editedProduct.stock_minimo ?? ''}
              onChange={onInputChange}
              placeholder="Ej: 5"
              className="bg-white border-orange-100 focus:border-orange-400 text-orange-700"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center bg-orange-50/50 p-2 rounded-lg border border-orange-100/50">
            <Label className="text-[10px] font-black text-orange-600 uppercase">Alerta de Stock Global</Label>
            <div className="flex items-center gap-2">
               <Input 
                name="stock_minimo"
                type="number" 
                value={editedProduct.stock_minimo ?? ''}
                onChange={onInputChange}
                className="w-16 h-8 text-xs bg-white border-orange-200"
                placeholder="Cant."
               />
            </div>
          </div>
          
          <div className="space-y-4">
            {(editedProduct.parametros || []).map((param, index) => (
              <div key={index} className="relative p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-7 w-7 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white border border-red-100 shadow-sm transition-all"
                  onClick={() => onRemoveParametro(index)}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-8">
                    <Label className="text-[10px] text-gray-400 font-black uppercase mb-1 block">Variante (Talla/Color)</Label>
                    <Input
                      value={param.nombre}
                      onChange={(e) => onParametroChange(index, 'nombre', e.target.value)}
                      placeholder="Ej: XL / Rojo"
                      className="h-10 border-gray-100 focus:border-blue-400"
                    />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-[10px] text-gray-400 font-black uppercase mb-1 block">Cantidad</Label>
                    <Input
                      type="number"
                      value={param.cantidad}
                      onChange={(e) => onParametroChange(index, 'cantidad', e.target.value)}
                      className="h-10 border-gray-100 focus:border-blue-400 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-50">
                  <Label className="text-[10px] text-gray-400 font-black uppercase mb-1 block">Código de Barras Específico</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        value={param.codigo_barras || ''}
                        onChange={(e) => onParametroChange(index, 'codigo_barras', e.target.value)}
                        placeholder="Escanea o escribe"
                        className="h-9 pl-9 text-xs font-mono bg-gray-50/50 border-gray-100"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9 text-[10px] px-3 font-bold bg-gray-100 hover:bg-gray-200"
                      onClick={() => {
                        const random = Math.floor(Math.random() * 900000000000) + 100000000000;
                        onParametroChange(index, 'codigo_barras', random.toString());
                      }}
                    >
                      GENERAR
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="text-[10px] text-gray-400 font-black uppercase mb-2 block text-center">Foto de Variante (Opcional)</Label>
                  <div className="bg-gray-50/30 p-2 border border-dashed rounded-xl">
                    <ImageUpload
                      id={`param-foto-${index}`}
                      value={param.foto || ''}
                      onChange={(url) => onParametroChange(index, 'foto', url)}
                      disabled={false}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={onAddParametro}
            className="w-full border-dashed border-2 py-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 rounded-2xl transition-all duration-300 group"
          >
            <div className="flex flex-col items-center gap-1">
              <Plus className="h-6 w-6 mb-1 group-hover:scale-110 transition-transform" />
              <span className="font-black text-xs uppercase tracking-widest">Añadir Nueva Variante</span>
            </div>
          </Button>
        </div>
      )}
    </FormSection>

    {/* SECCIÓN 4: AVANZADO (CÓDIGOS Y VENCIMIENTO) */}
    <FormSection title="Avanzado" icon={Barcode}>
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <Label className="text-[10px] font-black mb-3 block text-gray-600 uppercase">Código de Barras Maestro</Label>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                name="codigo_barras"
                value={editedProduct.codigo_barras || ''}
                onChange={onInputChange}
                className="bg-gray-50/50 pl-10 font-mono text-sm tracking-wider border-gray-100"
              />
            </div>
            <Button
              variant="outline"
              className="border-gray-200 hover:bg-gray-100"
              onClick={() => {
                const random = Math.floor(Math.random() * 900000000000) + 100000000000;
                onInputChange({ target: { name: 'codigo_barras', value: random.toString() } } as any);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 rounded-xl transition-all active:scale-[0.98]"
            onClick={onShowBarcodeScanner}
          >
            <Scan className="mr-2 h-5 w-5" />
            <span className="font-black text-xs uppercase tracking-widest">Escanear Cámara</span>
          </Button>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between bg-purple-50/30 p-4 rounded-2xl border border-purple-100/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <Label htmlFor="tiene_vencimiento" className="text-sm font-black text-purple-900 cursor-pointer">Control de Vencimiento</Label>
                <p className="text-[10px] text-purple-500 font-bold uppercase">Alertas automáticas</p>
              </div>
            </div>
            <Checkbox
              id="tiene_vencimiento"
              checked={editedProduct.tiene_vencimiento}
              onCheckedChange={(checked) => onInputChange({ target: { name: 'tiene_vencimiento', checked: checked as boolean } } as any)}
              className="h-6 w-6 border-purple-200 data-[state=checked]:bg-purple-600"
            />
          </div>

          {editedProduct.tiene_vencimiento && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <Input
                name="fecha_vencimiento"
                type="date"
                value={editedProduct.fecha_vencimiento ? new Date(editedProduct.fecha_vencimiento).toISOString().split('T')[0] : ''}
                onChange={onInputChange}
                className="bg-white border-purple-100 focus:border-purple-400 h-11"
              />
              <div className="flex items-start gap-2 mt-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1"></div>
                <p className="text-[10px] text-gray-500 font-medium italic leading-tight">
                  El sistema generará una alerta amarilla 7 días antes y roja al vencer.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </FormSection>

    {/* BOTONES DE ACCIÓN FLOTANTES (PARA MÓVIL) */}
    <div className="fixed bottom-6 left-4 right-4 sm:relative sm:bottom-0 sm:left-0 sm:right-0 grid grid-cols-2 gap-3 z-[60] sm:z-auto">
      <Button 
        variant="outline" 
        onClick={onCancel} 
        className="h-14 font-black uppercase tracking-widest bg-white/90 backdrop-blur-md shadow-xl border-gray-200 text-gray-600 order-2 sm:order-1 rounded-2xl"
      >
        Cancelar
      </Button>
      <Button 
        onClick={onSave} 
        className="h-14 font-black uppercase tracking-widest bg-green-600 hover:bg-green-700 shadow-xl shadow-green-200 text-white order-1 sm:order-2 rounded-2xl transition-all active:scale-95"
      >
        Guardar
      </Button>
    </div>
  </div>
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
    parametros?: Parametro[];
  }>;
  isLoadingVendors: boolean;
  onRefreshVendors: () => void;
}) => {
  return (
    <div className="space-y-4">
      {/* PESTAÑAS REDISEÑADAS */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
        <button
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${!showVendorsTab
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setShowVendorsTab(false)}
        >
          General
        </button>
        <button
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${showVendorsTab
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setShowVendorsTab(true)}
        >
          En Vendedores
        </button>
      </div>

      {showVendorsTab ? (
        <VendorsTab
          vendorsData={vendorsData}
          isLoading={isLoadingVendors}
          onRefresh={onRefreshVendors}
          productName={product.nombre}
        />
      ) : (
        <div className="space-y-6">
          {/* BLOQUE DE PRECIOS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 border border-green-100 rounded-2xl">
              <p className="text-[10px] font-black text-green-600 uppercase mb-1">Precio Venta</p>
              <p className="text-xl font-black text-green-700">${product.precio}</p>
              {product.precio_venta_usd && (
                <p className="text-[10px] font-bold text-green-600/70 italic mt-1">${product.precio_venta_usd} USD</p>
              )}
            </div>
            <div className="p-3 bg-red-50 border border-red-100 rounded-2xl">
              <p className="text-[10px] font-black text-red-600 uppercase mb-1">Precio Compra</p>
              <p className="text-xl font-black text-red-700">${product.precio_compra || 0}</p>
              {product.precio_compra_usd && (
                <p className="text-[10px] font-bold text-red-600/70 italic mt-1">${product.precio_compra_usd} USD</p>
              )}
            </div>
          </div>

          {/* ESTADO DE STOCK Y VENCIMIENTO */}
          <div className="space-y-3">
             {/* ALERTA DE VENCIMIENTO */}
             {product.tiene_vencimiento && product.fecha_vencimiento && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                  isBefore(startOfDay(new Date(product.fecha_vencimiento)), startOfDay(new Date()))
                  ? 'bg-red-600 text-white border-red-700'
                  : differenceInDays(startOfDay(new Date(product.fecha_vencimiento)), startOfDay(new Date())) <= 7
                  ? 'bg-yellow-400 text-yellow-900 border-yellow-500'
                  : 'bg-blue-50 text-blue-700 border-blue-100'
                }`}>
                  <CalendarIcon className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase leading-tight opacity-80">Vencimiento</p>
                    <p className="text-sm font-black">
                      {format(new Date(product.fecha_vencimiento), 'dd/MM/yyyy')}
                      {isBefore(startOfDay(new Date(product.fecha_vencimiento)), startOfDay(new Date())) && ' (VENCIDO)'}
                    </p>
                  </div>
                </div>
              )}

              {/* STOCK TOTAL */}
              <div className="p-4 bg-gray-50 border rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase">Stock en Almacén</p>
                  <p className="text-2xl font-black text-gray-800">{getTotalCantidad()}</p>
                </div>
                {product.stock_minimo && getTotalCantidad() <= product.stock_minimo && (
                  <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black uppercase animate-pulse">
                    Stock Bajo
                  </div>
                )}
              </div>
          </div>

          {/* DESCRIPCIÓN */}
          {product.descripcion && (
            <div className="px-1">
              <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Descripción</h4>
              <p className="text-sm text-gray-600 leading-relaxed bg-white p-3 rounded-xl border border-gray-100 italic">
                "{product.descripcion}"
              </p>
            </div>
          )}

          {/* VARIANTES / PARÁMETROS */}
          {(product.tiene_parametros || product.tieneParametros) && product.parametros && product.parametros.length > 0 && (
            <div className="space-y-3">
               <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest px-1">Desglose de Variantes</h4>
               <div className="grid grid-cols-1 gap-2">
                 {product.parametros.map((param, idx) => (
                   <div key={idx} className="flex flex-col p-3 bg-white border border-gray-100 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {param.foto ? (
                            <div className="w-10 h-10 relative">
                              <Image src={param.foto} alt={param.nombre} fill className="rounded-lg object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                              <Plus className="h-4 w-4" />
                            </div>
                          )}
                          <span className="text-sm font-bold text-gray-700">{param.nombre}</span>
                        </div>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-black text-sm">{param.cantidad}</span>
                      </div>
                      
                      {param.codigo_barras && (
                        <div className="pt-2 border-t border-gray-50">
                          <p className="text-[8px] font-black text-gray-400 uppercase mb-2 text-center">Código Variante</p>
                          <BarcodeDisplay value={param.codigo_barras} name={`${product.nombre} - ${param.nombre}`} />
                        </div>
                      )}
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* CÓDIGO DE BARRAS PRINCIPAL */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest text-center">Identificación Escaneable</h4>
            {product.codigo_barras ? (
              <BarcodeDisplay value={product.codigo_barras} name={product.nombre} />
            ) : (
              <p className="text-xs text-gray-400 text-center italic">Sin código de barras asignado</p>
            )}
          </div>

          {/* ACCIONES PRINCIPALES */}
          <div className="grid grid-cols-3 gap-3 pt-6">
            <Button onClick={onDeliver} className="h-12 bg-blue-600 font-black uppercase text-[10px] rounded-xl shadow-lg shadow-blue-100">
              Entregar
            </Button>
            <Button onClick={onEdit} variant="outline" className="h-12 font-black uppercase text-[10px] rounded-xl border-gray-200">
              Editar
            </Button>
            <Button onClick={onDelete} variant="destructive" className="h-12 font-black uppercase text-[10px] rounded-xl shadow-lg shadow-red-100">
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};