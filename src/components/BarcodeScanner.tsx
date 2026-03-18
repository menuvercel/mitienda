import React, { useEffect, useRef, useState, useId } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Scan, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  open: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, open }) => {
  const [scannerReady, setScannerReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();
  const scannerContainerId = `barcode-scanner-video-container-${instanceId.replace(/:/g, '')}`;

  // Formatos soportados (movidos fuera para mayor claridad)
  const formats = [
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_39,
  ];

  useEffect(() => {
    if (open) {
      // Usamos un pequeño delay para que el Dialog se monte en el DOM antes de buscar el ID
      const timer = setTimeout(() => {
        startScanner();
      }, 400);
      return () => {
        clearTimeout(timer);
        forceStopScanner();
      };
    } else {
      forceStopScanner();
    }
  }, [open]);

  const forceStopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        // Limpiar el contenedor explícitamente después de detener
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Error during force stop:", err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  };

  const startScanner = async () => {
    try {
      // 1. Limpieza previa profunda
      await forceStopScanner();
      setIsProcessing(false);
      
      // 2. Verificar que el elemento existe antes de inicializar
      const containerNode = document.getElementById(scannerContainerId);
      if (!containerNode) {
        console.warn("Scanner container not yet in DOM");
        return;
      }

      // 3. Nueva instancia con la configuración de formatos CORRECTA (en el constructor)
      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: formats,
        verbose: false
      });
      html5QrCodeRef.current = html5QrCode;

      // 3. Iniciar cámara con configuración optima para móvil
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { 
            fps: 15, 
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.0
        },
        async (decodedText) => {
          // EXTREMADAMENTE IMPORTANTE:
          // Primero apagamos la cámara, esperamos a que termine, y LUEGO avisamos al padre para cerrar el modal.
          // Esto evita el error de "removeChild".
          try {
            setIsProcessing(true);
            setScannerReady(false);
            
            if (html5QrCode.isScanning) {
              await html5QrCode.stop();
              html5QrCode.clear();
            }

            // Pequeño delay artificial para que el usuario vea que se detectó correctamente
            setTimeout(() => {
              onScan(decodedText);
              setIsProcessing(false);
            }, 600);

          } catch (err) {
            console.warn("Scan successful but stop failed", err);
            onScan(decodedText);
            setIsProcessing(false);
          }
        },
        () => { /* Ignorar errores de escaneo fallido entre capturas */ }
      );

      setScannerReady(true);
      setError(null);
    } catch (err: any) {
      console.error("Camera start failure:", err);
      let errorMessage = "No se pudo iniciar la cámara.";
      if (err.name === "NotAllowedError" || err.toString().includes("Permission")) {
        errorMessage = "Permiso de cámara denegado. Por favor, actívalo en tu navegador.";
      } else if (err.name === "NotFoundError") {
        errorMessage = "No se encontró ninguna cámara.";
      }
      setError(errorMessage);
    }
  };

  const handleManualClose = async () => {
    try {
      await forceStopScanner();
    } catch (err) {
      console.error("Error stopping on manual close:", err);
    } finally {
      setScannerReady(false);
      onClose(); // Cerrar el diálogo solo cuando la cámara esté apagada
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleManualClose(); }}>
      <DialogContent className="sm:max-w-[425px] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="p-6">
            <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Scan className="h-6 w-6 text-blue-600" />
                Lector de Barras
            </DialogTitle>
            </DialogHeader>
            
            <div className="relative group bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-100 shadow-2xl aspect-square flex items-center justify-center">
                {/* Contenedor del video - DEBE ESTAR SIEMPRE VACÍO PARA REACT */}
                <div 
                    id={scannerContainerId} 
                    className="w-full h-full"
                ></div>

                {/* Overlays manejados por React (Fuera del contenedor del video) */}
                {!scannerReady && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 z-10">
                        <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-400 text-sm font-medium">Activando cámara...</p>
                    </div>
                )}
                
                {error && (
                    <div className="absolute inset-0 p-8 text-center flex flex-col items-center justify-center gap-4 bg-slate-900 z-20">
                        <div className="bg-red-100/10 p-4 rounded-full">
                            <AlertCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <p className="text-white text-sm leading-relaxed">{error}</p>
                        <Button 
                            type="button" 
                            variant="secondary"
                            className="mt-2 bg-white text-slate-900 hover:bg-slate-100"
                            onClick={startScanner}
                        >
                            Reintentar acceso
                        </Button>
                    </div>
                )}

                {/* Overlay de Procesamiento (Éxito) */}
                {isProcessing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-blue-600/90 z-40 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                        <div className="bg-white/20 p-4 rounded-full">
                            <CheckCircle2 className="h-12 w-12 text-white animate-bounce" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-white font-bold text-lg">¡Código Detectado!</p>
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 text-white/70 animate-spin" />
                                <p className="text-white/80 text-sm">Procesando...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Guía visual de escaneo */}
                {scannerReady && (
                    <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 z-30">
                        <div className="w-full h-full border-2 border-blue-400/50 rounded-lg relative">
                            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
                            {/* Esquinas decorativas */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500"></div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="mt-6 space-y-4">
                <div className="text-center">
                    <p className="text-sm text-slate-500 font-medium">
                        Centra el código de barras para capturarlo
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.2em]">
                        Soporta: EAN • UPC • CODE128
                    </p>
                </div>

                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleManualClose} 
                    className="w-full h-12 text-slate-600 font-bold border-2 rounded-xl hover:bg-slate-50 transition-all"
                >
                    <X className="mr-2 h-5 w-5" />
                    Cancelar
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;

