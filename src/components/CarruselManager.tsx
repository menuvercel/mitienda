'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, MoveUp, MoveDown, Eye, EyeOff, Upload, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { ImageUpload } from '@/components/ImageUpload';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface CarruselImage {
  id: number;
  foto: string;
  orden: number;
  activo: boolean;
  fecha_creacion?: string;
}

export function CarruselManager() {
  const [images, setImages] = useState<CarruselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const { toast } = useToast();

  // Cargar imágenes al iniciar
  useEffect(() => {
    fetchImages();
  }, []);

  // Función para cargar las imágenes
  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/carrusel');
      if (!response.ok) {
        throw new Error('Error al cargar imágenes');
      }
      const data = await response.json();
      setImages(data.sort((a: CarruselImage, b: CarruselImage) => a.orden - b.orden));

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las imágenes del carrusel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para agregar una nueva imagen
  const handleAddImage = async () => {
    if (!newImageUrl) {
      toast({
        title: "Error",
        description: "Debes seleccionar una imagen",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/carrusel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foto: newImageUrl,
          orden: images.length,
          activo: true
        }),
      });

      if (!response.ok) {
        throw new Error('Error al agregar imagen');
      }

      setNewImageUrl('');
      fetchImages();
      toast({
        title: "Éxito",
        description: "Imagen agregada correctamente",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar la imagen",
        variant: "destructive",
      });
    }
  };

  // Función para eliminar una imagen
  const handleDeleteImage = async () => {
    if (imageToDelete === null) return;

    try {
      const response = await fetch(`/api/carrusel/${imageToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar imagen');
      }

      setImageToDelete(null);
      fetchImages();
      toast({
        title: "Éxito",
        description: "Imagen eliminada correctamente",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la imagen",
        variant: "destructive",
      });
    }
  };

  // Función para mover una imagen hacia arriba (disminuir orden)
  const handleMoveUp = async (id: number, currentOrder: number) => {
    if (currentOrder <= 0) return;

    try {
      // Encontrar la imagen anterior
      const prevImage = images.find(img => img.orden === currentOrder - 1);
      if (!prevImage) return;

      // Actualizar la imagen actual
      await fetch(`/api/carrusel/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orden: currentOrder - 1,
        }),
      });

      // Actualizar la imagen anterior
      await fetch(`/api/carrusel/${prevImage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orden: currentOrder,
        }),
      });

      fetchImages();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el orden de la imagen",
        variant: "destructive",
      });
    }
  };

  // Función para mover una imagen hacia abajo (aumentar orden)
  const handleMoveDown = async (id: number, currentOrder: number) => {
    if (currentOrder >= images.length - 1) return;

    try {
      // Encontrar la imagen siguiente
      const nextImage = images.find(img => img.orden === currentOrder + 1);
      if (!nextImage) return;

      // Actualizar la imagen actual
      await fetch(`/api/carrusel/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orden: currentOrder + 1,
        }),
      });

      // Actualizar la imagen siguiente
      await fetch(`/api/carrusel/${nextImage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orden: currentOrder,
        }),
      });

      fetchImages();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el orden de la imagen",
        variant: "destructive",
      });
    }
  };

  // Función para cambiar el estado activo/inactivo de una imagen
  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await fetch(`/api/carrusel/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activo: !currentActive,
        }),
      });

      fetchImages();
      toast({
        title: "Éxito",
        description: `Imagen ${!currentActive ? 'activada' : 'desactivada'} correctamente`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la imagen",
        variant: "destructive",
      });
    }
  };

  // Función para avanzar a la siguiente imagen en la vista previa
  const nextPreviewImage = () => {
    setCurrentPreviewIndex((prevIndex) =>
      (prevIndex + 1) % images.filter(img => img.activo).length
    );
  };

  // Función para ir a la imagen anterior en la vista previa
  const prevPreviewImage = () => {
    setCurrentPreviewIndex((prevIndex) => {
      const activeImages = images.filter(img => img.activo);
      return prevIndex === 0 ? activeImages.length - 1 : prevIndex - 1;
    });
  };

  // Vista de carga
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Vista previa del carrusel
  if (previewMode) {
    const activeImages = images.filter(img => img.activo);
    if (activeImages.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="mb-4">No hay imágenes activas para mostrar</p>
          <Button onClick={() => setPreviewMode(false)}>Volver</Button>
        </div>
      );
    }

    return (
      <div className="relative h-[400px] w-full bg-gray-100 rounded-lg overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={activeImages[currentPreviewIndex].foto}
            alt="Vista previa del carrusel"
            fill
            className="object-cover"
          />
        </div>

        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
          {activeImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPreviewIndex(index)}
              className={`w-3 h-3 rounded-full ${index === currentPreviewIndex ? 'bg-white' : 'bg-white/50'
                }`}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>

        <div className="absolute top-4 right-4">
          <Button variant="outline" onClick={() => setPreviewMode(false)}>
            Cerrar vista previa
          </Button>
        </div>

        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <Button variant="outline" size="icon" onClick={prevPreviewImage}>
            &lt;
          </Button>
        </div>

        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <Button variant="outline" size="icon" onClick={nextPreviewImage}>
            &gt;
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Imágenes del Carrusel</h3>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(true)}
            disabled={images.filter(img => img.activo).length === 0}
          >
            <Eye className="mr-2 h-4 w-4" />
            Vista previa
          </Button>
        </div>
      </div>

      {/* Formulario para agregar nueva imagen */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Agregar nueva imagen</h4>
        <div className="space-y-4">
          <ImageUpload
            value={newImageUrl}
            onChange={(url) => setNewImageUrl(url)}
            disabled={false}
          />
          <Button onClick={handleAddImage} disabled={!newImageUrl}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar imagen
          </Button>
        </div>
      </Card>

      {/* Lista de imágenes */}
      <div className="space-y-4">
        {images.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg border">
            <p className="text-gray-500">No hay imágenes en el carrusel</p>
          </div>
        ) : (
          images.map((image) => (
            <Card key={image.id} className={`p-4 ${!image.activo ? 'bg-gray-50' : ''}`}>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 relative rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    src={image.foto}
                    alt="Imagen del carrusel"
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-grow">
                  <p className="text-sm text-gray-500">Orden: {image.orden + 1}</p>
                  <p className="text-sm text-gray-500">
                    Estado: {image.activo ? 'Activa' : 'Inactiva'}
                  </p>
                </div>

                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleMoveUp(image.id, image.orden)}
                    disabled={image.orden === 0}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleMoveDown(image.id, image.orden)}
                    disabled={image.orden === images.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleToggleActive(image.id, image.activo)}
                  >
                    {image.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setImageToDelete(image.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Diálogo de confirmación para eliminar imagen */}
      <AlertDialog open={imageToDelete !== null} onOpenChange={(open) => !open && setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la imagen del carrusel y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImage} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}