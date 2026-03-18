import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Scan, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  open: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, open }) => {
  const [scannerReady, setScannerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isOperatingRef = useRef(false);
  const scannerContainerId = "barcode-scanner-video";

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        startScanner();
      }, 500);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
        stopScanner();
    }
  }, [open]);

  const startScanner = async () => {
    if (isOperatingRef.current || (html5QrCodeRef.current && html5QrCodeRef.current.isScanning)) return;
    
    isOperatingRef.current = true;
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
            formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_39,
            ],
            verbose: false
        });
      }
      
      const html5QrCode = html5QrCodeRef.current;

      await html5QrCode.start(
        { facingMode: "environment" }, 
        { 
            fps: 10, 
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0, 
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {}
      );
      setScannerReady(true);
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("No se pudo acceder a la cámara. Asegúrate de dar permisos o de estar en un sitio seguro (HTTPS).");
      setScannerReady(false);
    } finally {
        isOperatingRef.current = false;
    }
  };

  const stopScanner = async () => {
    if (isOperatingRef.current) return;
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      isOperatingRef.current = true;
      try {
        await html5QrCodeRef.current.stop();
        setScannerReady(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      } finally {
        isOperatingRef.current = false;
      }
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Escanear Código
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-4 py-2">
          {error ? (
             <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                {error}
             </div>
          ) : (
            <div 
              id={scannerContainerId} 
              className="w-full bg-black rounded-lg overflow-hidden shadow-inner aspect-square flex items-center justify-center"
            >
                {!scannerReady && <p className="text-white text-sm animate-pulse">Iniciando cámara...</p>}
            </div>
          )}
          
          <div className="text-center space-y-1">
             <p className="text-xs text-gray-500 italic">
                Alinea el código de barras dentro del visualizador
             </p>
             <p className="text-[10px] text-gray-400">
                Formatos: CODE128, EAN-13, EAN-8, UPC
             </p>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose} 
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Cerrar Escáner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
