'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageUpload } from '@/components/ImageUpload'
import { Seccion } from '@/types'

interface SeccionDialogProps {
    seccion: Seccion | null
    isOpen: boolean
    onClose: () => void
    onSave: (seccionData: { nombre: string; foto: string }) => void
    isEditing: boolean
}

export default function SeccionDialog({ seccion, isOpen, onClose, onSave, isEditing }: SeccionDialogProps) {
    const [nombre, setNombre] = useState('')
    const [foto, setFoto] = useState('')

    useEffect(() => {
        if (seccion && isEditing) {
            setNombre(seccion.nombre)
            setFoto(seccion.foto || '')
        } else {
            setNombre('')
            setFoto('')
        }
    }, [seccion, isEditing, isOpen])

    const handleSave = () => {
        if (!nombre.trim()) return

        onSave({
            nombre: nombre.trim(),
            foto: foto || ''
        })

        handleClose()
    }

    const handleClose = () => {
        setNombre('')
        setFoto('')
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Editar Sección' : 'Nueva Sección'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre de la sección
                        </label>
                        <Input
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ingresa el nombre de la sección"
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Imagen de la sección
                        </label>
                        <ImageUpload
                            value={foto}
                            onChange={setFoto}
                            disabled={false}
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!nombre.trim()}
                        >
                            {isEditing ? 'Actualizar' : 'Crear'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
