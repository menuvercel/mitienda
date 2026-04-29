import React, { useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Download, Loader2, Upload, FileText, Check, AlertCircle, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Vendedor, Producto } from '@/types';
import * as XLSX from 'xlsx';
import { getProductosVendedor } from '@/app/services/api';
import { toast } from "@/hooks/use-toast";
import * as pdfjs from 'pdfjs-dist';

// Configurar el worker para pdfjs usando un CDN fiable (v4.4.168 estable)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

interface ExportacionComparacionProps {
  vendedores: Vendedor[];
  almacen: Producto[];
}

interface ComparisonItem {
  codigo: string;
  productoNombre: string;
  cantidadWeb: number;
  cantidadPDF: number;
  diferencia: number;
}

interface PDFRow {
  codigo: string;
  cantidad: number;
}

export default function ExportacionComparacion({ vendedores, almacen }: ExportacionComparacionProps) {
  const [activeTab, setActiveTab] = useState('exportacion');
  
  // Estados para Exportación
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [includeAlmacen, setIncludeAlmacen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Estados para Comparación
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareStep, setCompareStep] = useState(1);
  const [pdfData, setPdfData] = useState<PDFRow[]>([]);
  const [isParsingPDF, setIsParsingPDF] = useState(false);
  const [compareVendors, setCompareVendors] = useState<string[]>([]);
  const [compareIncludeAlmacen, setCompareIncludeAlmacen] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Funciones de Exportación (se mantienen)
  const handleToggleVendor = (id: string) => {
    setSelectedVendors(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedVendors.length === 0 && !includeAlmacen) {
      toast({
        title: "Error",
        description: "Selecciona al menos una opción para exportar",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      let allData: any[] = [];

      // 1. Almacén
      if (includeAlmacen) {
        almacen.forEach(prod => {
          const hasParams = prod.tiene_parametros && prod.parametros && prod.parametros.length > 0;
          if (hasParams) {
            prod.parametros!.forEach(param => {
              allData.push({
                codigo: param.codigo_barras || '',
                producto: `${prod.nombre} (${param.nombre})`,
                cantidad: param.cantidad,
                'precio de venta': prod.precio
              });
            });
          } else {
            allData.push({
              codigo: prod.codigo_barras || '',
              producto: prod.nombre,
              cantidad: prod.cantidad,
              'precio de venta': prod.precio
            });
          }
        });
      }

      // 2. Vendedores
      for (const vendorId of selectedVendors) {
        const vendor = vendedores.find(v => v.id === vendorId);
        if (!vendor) continue;
        try {
          const vendorProducts = await getProductosVendedor(vendorId);
          vendorProducts.forEach((prod: Producto) => {
            const hasParams = prod.tiene_parametros && prod.parametros && prod.parametros.length > 0;
            if (hasParams) {
              prod.parametros!.forEach(param => {
                allData.push({
                  codigo: param.codigo_barras || '',
                  producto: `${prod.nombre} (${param.nombre})`,
                  cantidad: param.cantidad,
                  'precio de venta': prod.precio
                });
              });
            } else {
              allData.push({
                codigo: prod.codigo_barras || '',
                producto: prod.nombre,
                cantidad: prod.cantidad,
                'precio de venta': prod.precio
              });
            }
          });
        } catch (error) {
          console.error(`Error fetching products for vendor ${vendor.nombre}:`, error);
        }
      }

      const ws = XLSX.utils.json_to_sheet(allData, { header: ["codigo", "producto", "cantidad", "precio de venta"] });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Exportación");
      ws['!cols'] = [{ wch: 25 }, { wch: 50 }, { wch: 10 }, { wch: 15 }];
      XLSX.writeFile(wb, `Exportacion_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportDialog(false);
      toast({ title: "Éxito", description: "Exportación completada" });
    } catch (error) {
      console.error("Error exporting:", error);
      toast({ title: "Error", description: "No se pudo realizar la exportación", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Funciones de Comparación
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("Archivo seleccionado:", file?.name);
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: "Error", description: "Por favor, sube un archivo PDF", variant: "destructive" });
      return;
    }

    setIsParsingPDF(true);
    try {
      console.log("Iniciando lectura de PDF...");
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      console.log(`PDF cargado. Páginas: ${pdf.numPages}`);
      
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        console.log(`Procesando página ${i}...`);
        
        const pageText = textContent.items
          .map((item: any) => item.str || "")
          .join(" ");
        
        fullText += pageText + "\n";
      }

      console.log("Texto extraído:", fullText.substring(0, 500) + "...");

      // Regex para detectar líneas de productos: Código Descripción ... U Cantidad ...
      const rows: PDFRow[] = [];
      
      // Regex más flexible para v5 y posibles variaciones de espacios
      const productRegex = /(\d{3}\.\d{3}\.\d{5})\s+(.*?)\s+U\s+(\d+(?:\.\d+)?)/g;
      
      let match;
      while ((match = productRegex.exec(fullText)) !== null) {
        rows.push({
          codigo: match[1],
          cantidad: parseFloat(match[3])
        });
      }

      console.log(`Productos detectados (regex global): ${rows.length}`);

      if (rows.length === 0) {
        const lines = fullText.split('\n');
        lines.forEach(line => {
           const lineMatch = line.match(/(\d{3}\.\d{3}\.\d{5})\s+.*?\s+U\s+(\d+(?:\.\d+)?)/);
           if (lineMatch) {
             rows.push({ codigo: lineMatch[1], cantidad: parseFloat(lineMatch[2]) });
           }
        });
        console.log(`Productos detectados (line-by-line): ${rows.length}`);
      }

      if (rows.length === 0) {
        toast({ 
          title: "Aviso", 
          description: "No se detectaron productos. Verifica el formato del PDF.", 
          variant: "destructive" 
        });
      } else {
        setPdfData(rows);
        setCompareStep(2);
        toast({ title: "PDF Procesado", description: `${rows.length} productos detectados.` });
      }
    } catch (error: any) {
      console.error("Error detallado al procesar PDF:", error);
      toast({ title: "Error", description: `Error al procesar el PDF: ${error.message || "Error desconocido"}`, variant: "destructive" });
    } finally {
      setIsParsingPDF(false);
      // Limpiar el input para permitir subir el mismo archivo
      if (e.target) e.target.value = '';
    }
  };

  const handleStartComparison = async () => {
    if (compareVendors.length === 0 && !compareIncludeAlmacen) {
      toast({ title: "Error", description: "Selecciona al menos una fuente (Vendedor o Almacén)", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    try {
      const webInventory: Record<string, { nombre: string, cantidad: number }> = {};

      // 1. Almacén
      if (compareIncludeAlmacen) {
        almacen.forEach(prod => {
          if (prod.tiene_parametros && prod.parametros) {
            prod.parametros.forEach(param => {
              const code = param.codigo_barras || '';
              if (!code) return;
              if (!webInventory[code]) webInventory[code] = { nombre: `${prod.nombre} (${param.nombre})`, cantidad: 0 };
              webInventory[code].cantidad += param.cantidad;
            });
          } else {
            const code = prod.codigo_barras || '';
            if (!code) return;
            if (!webInventory[code]) webInventory[code] = { nombre: prod.nombre, cantidad: 0 };
            webInventory[code].cantidad += prod.cantidad;
          }
        });
      }

      // 2. Vendedores
      for (const vId of compareVendors) {
        const vProducts = await getProductosVendedor(vId);
        vProducts.forEach((prod: Producto) => {
          if (prod.tiene_parametros && prod.parametros) {
            prod.parametros.forEach(param => {
              const code = param.codigo_barras || '';
              if (!code) return;
              if (!webInventory[code]) webInventory[code] = { nombre: `${prod.nombre} (${param.nombre})`, cantidad: 0 };
              webInventory[code].cantidad += param.cantidad;
            });
          } else {
            const code = prod.codigo_barras || '';
            if (!code) return;
            if (!webInventory[code]) webInventory[code] = { nombre: prod.nombre, cantidad: 0 };
            webInventory[code].cantidad += prod.cantidad;
          }
        });
      }

      // 3. Cruzar con PDF
      const results: ComparisonItem[] = [];
      const codesInResults = new Set<string>();

      pdfData.forEach(pdfRow => {
        const webItem = webInventory[pdfRow.codigo];
        const cantWeb = webItem ? webItem.cantidad : 0;
        const nombre = webItem ? webItem.nombre : "No encontrado en web";
        
        results.push({
          codigo: pdfRow.codigo,
          productoNombre: nombre,
          cantidadWeb: cantWeb,
          cantidadPDF: pdfRow.cantidad,
          diferencia: cantWeb - pdfRow.cantidad
        });
        codesInResults.add(pdfRow.codigo);
      });

      setComparisonResults(results);
      setShowCompareDialog(false);
      setCompareStep(1);
      setPdfData([]);
      toast({ title: "Éxito", description: "Comparación generada correctamente" });
    } catch (error) {
      console.error("Error in comparison:", error);
      toast({ title: "Error", description: "Error al realizar la comparativa", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const exportComparisonToExcel = () => {
    const data = comparisonResults.map(item => ({
      'Código': item.codigo,
      'Producto': item.productoNombre,
      'Cantidad Web': item.cantidadWeb,
      'Cantidad PDF': item.cantidadPDF,
      'Diferencia': item.diferencia
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparativa");
    
    ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    
    XLSX.writeFile(wb, `Comparativa_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="exportacion">Exportación</TabsTrigger>
          <TabsTrigger value="comparacion">Comparación</TabsTrigger>
        </TabsList>
        
        <TabsContent value="exportacion" className="mt-4 p-4 border rounded-lg bg-card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Generar Exportación</h2>
            <Button onClick={() => setShowExportDialog(true)} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nueva Exportación
            </Button>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-gray-50/50">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <FileSpreadsheet className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-sm font-medium">Crea un archivo Excel consolidado</p>
            <p className="text-xs mt-1">Selecciona vendedores y el almacén para ver existencias y precios.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="comparacion" className="mt-4 p-4 border rounded-lg bg-card min-h-[400px]">
          {comparisonResults.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Resultados de Comparación</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setComparisonResults([])}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Nueva
                  </Button>
                  <Button onClick={exportComparisonToExcel} className="bg-green-600 hover:bg-green-700 text-white">
                    <Download className="mr-2 h-4 w-4" /> Exportar Comparativa
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant. Web</TableHead>
                      <TableHead className="text-center">Cant. PDF</TableHead>
                      <TableHead className="text-center">Diferencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonResults.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.productoNombre}</TableCell>
                        <TableCell className="text-center font-bold text-blue-600 bg-blue-50/30">{item.cantidadWeb}</TableCell>
                        <TableCell className="text-center font-bold text-purple-600 bg-purple-50/30">{item.cantidadPDF}</TableCell>
                        <TableCell className={`text-center font-bold ${item.diferencia === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-purple-100 p-6 rounded-full mb-4">
                <FileText className="h-12 w-12 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">Comparativa PDF vs Web</h3>
              <p className="text-muted-foreground max-w-md mt-2">
                Sube un reporte en PDF para comparar las cantidades registradas con el inventario actual de la web.
              </p>
              <Button onClick={() => setShowCompareDialog(true)} className="mt-6 bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Iniciar Comparativa
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo de Exportación */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Seleccionar qué exportar</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
              <Checkbox id="almacen-check" checked={includeAlmacen} onCheckedChange={(checked) => setIncludeAlmacen(checked === true)} />
              <label htmlFor="almacen-check" className="flex-grow font-semibold cursor-pointer">Incluir Almacén Central</label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Vendedores</h3>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelectedVendors(selectedVendors.length === vendedores.length ? [] : vendedores.map(v => v.id))}>
                  {selectedVendors.length === vendedores.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                {vendedores.map(v => (
                  <div key={v.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors border border-transparent hover:border-gray-100">
                    <Checkbox id={`vendedor-check-${v.id}`} checked={selectedVendors.includes(v.id)} onCheckedChange={() => handleToggleVendor(v.id)} />
                    <label htmlFor={`vendedor-check-${v.id}`} className="flex-grow text-sm cursor-pointer font-medium">{v.nombre}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setShowExportDialog(false)}>Cancelar</Button>
            <Button onClick={handleExport} disabled={isExporting || (selectedVendors.length === 0 && !includeAlmacen)} className="bg-green-600 hover:bg-green-700 text-white">
              {isExporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : <><Download className="mr-2 h-4 w-4" /> Generar .xlsx</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Comparación (Multi-paso) */}
      <Dialog open={showCompareDialog} onOpenChange={(open) => {
        setShowCompareDialog(open);
        if (!open) {
          setCompareStep(1);
          setPdfData([]);
          setCompareVendors([]);
          setCompareIncludeAlmacen(false);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Comparativa PDF vs Web - Paso {compareStep} de 2
            </DialogTitle>
          </DialogHeader>

          {compareStep === 1 && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4">
              <div 
                className="w-full border-2 border-dashed border-purple-200 rounded-xl p-10 flex flex-col items-center justify-center bg-purple-50/30 hover:bg-purple-50 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                {isParsingPDF ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-12 w-12 text-purple-600 animate-spin mb-4" />
                    <p className="text-sm font-medium">Analizando PDF...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-semibold">Haz clic para subir el PDF</p>
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      El sistema detectará automáticamente los códigos y cantidades.
                    </p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf" 
                  onChange={handleFileChange} 
                />
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border">
                <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <p>Asegúrate de que el PDF contenga la tabla con columnas: Código, Descripción, UM, Cantidad...</p>
              </div>
            </div>
          )}

          {compareStep === 2 && (
            <div className="py-4 space-y-6">
              <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-100">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">PDF procesado: {pdfData.length} productos detectados</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCompareStep(1)} className="text-xs h-7">Cambiar PDF</Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700">Seleccionar fuentes web para comparar:</h3>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                  <Checkbox 
                    id="compare-almacen" 
                    checked={compareIncludeAlmacen} 
                    onCheckedChange={(checked) => setCompareIncludeAlmacen(checked === true)}
                  />
                  <label htmlFor="compare-almacen" className="flex-grow font-semibold cursor-pointer">Almacén Central</label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendedores</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar border rounded-md p-2">
                    {vendedores.map(v => (
                      <div key={v.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors">
                        <Checkbox 
                          id={`compare-v-${v.id}`} 
                          checked={compareVendors.includes(v.id)} 
                          onCheckedChange={() => setCompareVendors(prev => 
                            prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                          )} 
                        />
                        <label htmlFor={`compare-v-${v.id}`} className="flex-grow text-sm cursor-pointer">{v.nombre}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCompareStep(1)}>Atrás</Button>
                <Button 
                  onClick={handleStartComparison} 
                  disabled={isExporting || (compareVendors.length === 0 && !compareIncludeAlmacen)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isExporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Comparando...</> : "Confirmar y Comparar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
