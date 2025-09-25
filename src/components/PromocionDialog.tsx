import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Promocion } from '@/types';
import { Switch } from '@/components/ui/switch';

interface PromocionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (promocion: Omit<Promocion, 'id'> | Promocion) => Promise<void>;
  promocion?: Promocion;
  title: string;
}

const PromocionDialog: React.FC<PromocionDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  promocion,
  title,
}) => {
  const [formData, setFormData] = useState<Omit<Promocion, 'id'> | Promocion>({
    nombre: '',
    valor_descuento: 0,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    activa: true,
    ...(promocion?.id ? { id: promocion.id } : {})
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (promocion) {
      setFormData({
        ...promocion,
        fecha_inicio: typeof promocion.fecha_inicio === 'string'
          ? promocion.fecha_inicio.split('T')[0]
          : new Date(promocion.fecha_inicio).toISOString().split('T')[0],
        fecha_fin: typeof promocion.fecha_fin === 'string'
          ? promocion.fecha_fin.split('T')[0]
          : new Date(promocion.fecha_fin).toISOString().split('T')[0]
      });
    } else {
      setFormData({
        nombre: '',
        valor_descuento: 0,
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        activa: true
      });
    }
    setError(null);
  }, [promocion, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      activa: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.nombre.trim()) {
        throw new Error('El nombre de la promoción es requerido');
      }

      if (formData.valor_descuento <= 0) {
        throw new Error('El valor del descuento debe ser mayor a 0');
      }

      const fechaInicio = new Date(formData.fecha_inicio);
      const fechaFin = new Date(formData.fecha_fin);

      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        throw new Error('Las fechas no son válidas');
      }

      if (fechaFin < fechaInicio) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }

      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar promoción:', error);
      setError(error instanceof Error ? error.message : 'Error al guardar la promoción');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la promoción</Label>
            <Input
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Descuento de verano"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_descuento">Valor del descuento (%)</Label>
            <Input
              id="valor_descuento"
              name="valor_descuento"
              type="number"
              min="1"
              max="100"
              step="1"
              value={formData.valor_descuento}
              onChange={handleChange}
              required
            />
            <p className="text-sm text-gray-500">
              Porcentaje de descuento a aplicar (1-100)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
              <Input
                id="fecha_inicio"
                name="fecha_inicio"
                type="date"
                value={formData.fecha_inicio}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha de fin</Label>
              <Input
                id="fecha_fin"
                name="fecha_fin"
                type="date"
                value={formData.fecha_fin}
                onChange={handleChange}
                required
                className="w-full"
                min={formData.fecha_inicio}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="activa"
              checked={formData.activa}
              onCheckedChange={handleSwitchChange}
            />
            <Label htmlFor="activa">Promoción activa</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PromocionDialog;
