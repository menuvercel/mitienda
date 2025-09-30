'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarruselImage {
  id: number;
  foto: string;
  orden: number;
  activo: boolean;
}

export function Carrusel() {
  const [images, setImages] = useState<CarruselImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState(true);

  // Cargar imágenes del carrusel
  useEffect(() => {
    const fetchCarruselImages = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/carrusel');
        if (!response.ok) {
          throw new Error('Error al cargar imágenes del carrusel');
        }
        const data = await response.json();
        // Filtrar solo imágenes activas y ordenar por el campo orden
        const activeImages = data
          .filter((img: CarruselImage) => img.activo)
          .sort((a: CarruselImage, b: CarruselImage) => a.orden - b.orden);

        setImages(activeImages);
      } catch (error) {
        console.error('Error:', error);
        setError('No se pudieron cargar las imágenes del carrusel');
      } finally {
        setLoading(false);
      }
    };

    fetchCarruselImages();
  }, []);

  // Configurar autoplay
  useEffect(() => {
    if (!autoplay || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Cambiar imagen cada 5 segundos

    return () => clearInterval(interval);
  }, [autoplay, images.length]);

  // Navegar a la imagen anterior
  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  // Navegar a la imagen siguiente
  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      (prevIndex + 1) % images.length
    );
  };

  // Si está cargando, mostrar un indicador
  if (loading) {
    return (
      <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] bg-gray-100 animate-pulse rounded-lg">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  // Si hay un error, mostrar mensaje
  if (error || images.length === 0) {
    return null; // No mostrar nada si hay error o no hay imágenes
  }

  return (
    <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden rounded-lg">
      {/* Imágenes del carrusel */}
      <div
        className="h-full transition-transform duration-500 ease-out flex"
        style={{
          width: `${images.length * 100}%`,
          transform: `translateX(-${currentIndex * (100 / images.length)}%)`
        }}
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative h-full"
            style={{ width: `${100 / images.length}%` }}
          >
            <Image
              src={image.foto}
              alt={`Imagen del carrusel ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {/* Controles de navegación */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Indicadores de posición */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-3 h-3 rounded-full transition-colors",
                  index === currentIndex
                    ? "bg-white"
                    : "bg-white/50 hover:bg-white/80"
                )}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}