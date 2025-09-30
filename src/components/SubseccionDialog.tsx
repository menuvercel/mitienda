'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from './ImageUpload';
import { Subseccion, Seccion } from '@/types';

interface SubseccionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (subseccionData: { nombre: string; foto: string; seccion_id: string }) => void;
    subseccion: Subseccion | null;
    seccionId: string;
    isEditing: boolean;
    secciones?: (Seccion & { productos_count?: number })[];
}

export default function SubseccionDialog({
    isOpen,
    onClose,
    onSave,
    subseccion,
    seccionId,
    isEditing,
    secciones 
}: SubseccionDialogProps) {
    const [nombre, setNombre] = useState('');
    const [foto, setFoto] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (subseccion && isEditing) {
            setNombre(subseccion.nombre);
            setFoto(subseccion.foto || '');
        } else {
            setNombre('');
            setFoto('');
        }
    }, [subseccion, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nombre.trim()) {
            alert('Por favor, ingresa un nombre para la subsección');
            return;
        }

        setIsLoading(true);

        try {
            await onSave({
                nombre,
                foto,
                seccion_id: seccionId
            });

            // Limpiar el formulario
            setNombre('');
            setFoto('');

        } catch (error) {
            console.error('Error al guardar la subsección:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = (url: string) => {
        setFoto(url);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Editar Subsección' : 'Crear Nueva Subsección'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nombre">Nombre de la subsección</Label>
                            <Input
                                id="nombre"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Ingresa el nombre de la subsección"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Imagen de la subsección (opcional)</Label>
                            <ImageUpload
                                value={foto}
                                onChange={handleImageUpload}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}