'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUpload } from "@/components/ImageUpload";
import { Trash2, Plus } from 'lucide-react';
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";

interface CarouselImage {
  id: string;
  url: string;
  orden: number;
}

export default function CarouselImagesManager() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const { toast } = useToast();

  // Cargar imágenes del carrusel al iniciar
  const fetchCarouselImages = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/carousel-images');
      
      if (!response.ok) {
        throw new Error('Error al cargar imágenes del carrusel');
      }
      
      const data = await response.json();
      setImages(data);
    } catch (error) {
      console.error('Error al cargar imágenes del carrusel:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las imágenes del carrusel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCarouselImages();
  }, [fetchCarouselImages]);

  // Agregar nueva imagen al carrusel
  const handleAddImage = async () => {
    if (!newImageUrl) {
      toast({
        title: "Error",
        description: "Por favor, sube una imagen primero",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/carousel-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: newImageUrl,
          orden: images.length + 1
        }),
      });

      if (!response.ok) {
        throw new Error('Error al agregar imagen al carrusel');
      }

      await fetchCarouselImages();
      setNewImageUrl('');
      
      toast({
        title: "Éxito",
        description: "Imagen agregada al carrusel correctamente",
      });
    } catch (error) {
      console.error('Error al agregar imagen:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar la imagen al carrusel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar imagen del carrusel
  const handleDeleteImage = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen del carrusel?')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/carousel-images/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar imagen del carrusel');
      }

      await fetchCarouselImages();
      
      toast({
        title: "Éxito",
        description: "Imagen eliminada del carrusel correctamente",
      });
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la imagen del carrusel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar orden de las imágenes (arrastrar y soltar)
  const handleReorderImages = async (draggedId: string, targetId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/carousel-images/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          draggedId,
          targetId
        }),
      });

      if (!response.ok) {
        throw new Error('Error al reordenar imágenes');
      }

      await fetchCarouselImages();
      
      toast({
        title: "Éxito",
        description: "Orden de imágenes actualizado correctamente",
      });
    } catch (error) {
      console.error('Error al reordenar imágenes:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el orden de las imágenes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Agregar nueva imagen al carrusel</h3>
        <div className="space-y-4">
          <ImageUpload
            id="carrusel-nueva-imagen-manager"
            value={newImageUrl}
            onChange={setNewImageUrl}
            disabled={isLoading}
          />
          <Button 
            onClick={handleAddImage} 
            disabled={isLoading || !newImageUrl} 
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar al carrusel
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Imágenes del carrusel</h3>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">🖼️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay imágenes en el carrusel
            </h3>
            <p className="text-gray-500 mb-4">
              Agrega imágenes para mostrar en el carrusel de la página principal
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <div className="relative h-48">
                  <Image
                    src={image.url}
                    alt="Imagen del carrusel"
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Orden: {image.orden}</span>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={() => handleDeleteImage(image.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}