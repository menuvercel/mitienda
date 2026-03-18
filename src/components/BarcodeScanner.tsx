import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  open: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, open }) => {
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (open) {
      // Configuracion del scanner
      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.777778, // Proporción 16:9 común en celulares
        formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
        ]
      };

      scanner = new Html5QrcodeScanner('reader', config, false);
      
      scanner.render((decodedText) => {
        onScan(decodedText);
        // El scanner se cierra al escanear con éxito si así lo decidimos
        if (scanner) {
            scanner.clear().catch(err => console.error("Failed to clear scanner", err));
        }
      }, (error) => {
        // Errores de escaneo silenciosos para no saturar la consola
      });
    }

    // Cleanup: detener el scanner al desmontar o cerrar
    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error("Failed to cleanup scanner", err));
      }
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Escanear Código de Barras</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4">
          <div id="reader" className="w-full border rounded-lg overflow-hidden shadow-sm"></div>
          <p className="text-xs text-gray-500 text-center italic">
            Coloca el código de barras dentro del recuadro
          </p>
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
