import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Promocion } from '@/types';
import { Edit, Trash2, Power, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PromocionCardProps {
  promocion: Promocion;
  onEdit: (promocion: Promocion) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, activa: boolean) => void;
}

const PromocionCard: React.FC<PromocionCardProps> = ({
  promocion,
  onEdit,
  onDelete,
  onToggle,
}) => {
  // Verificar si la promoción está vigente (dentro del rango de fechas)
  const now = new Date();
  const fechaInicio = new Date(promocion.fecha_inicio);
  const fechaFin = new Date(promocion.fecha_fin);
  const isVigente = now >= fechaInicio && now <= fechaFin;
  
  // Determinar el estado de la promoción
  const getEstado = () => {
    if (!promocion.activa) {
      return { label: 'Inactiva', color: 'bg-gray-200 text-gray-700' };
    }
    if (now < fechaInicio) {
      return { label: 'Programada', color: 'bg-blue-100 text-blue-700' };
    }
    if (now > fechaFin) {
      return { label: 'Expirada', color: 'bg-red-100 text-red-700' };
    }
    return { label: 'Activa', color: 'bg-green-100 text-green-700' };
  };
  
  const estado = getEstado();

  return (
    <Card className={`overflow-hidden border ${promocion.activa && isVigente ? 'border-green-200' : 'border-gray-200'}`}>
      <div className={`h-2 w-full ${promocion.activa ? (isVigente ? 'bg-green-500' : 'bg-amber-500') : 'bg-gray-300'}`}></div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-lg">{promocion.nombre}</h3>
          <Badge className={estado.color}>{estado.label}</Badge>
        </div>
        
        <div className="text-3xl font-bold text-center my-4 text-blue-600">
          {promocion.valor_descuento}% <span className="text-sm text-gray-500">descuento</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600 mt-2">
          <Calendar className="h-4 w-4 mr-1" />
          <div>
            <div>Desde: {format(new Date(promocion.fecha_inicio), 'dd MMM yyyy', { locale: es })}</div>
            <div>Hasta: {format(new Date(promocion.fecha_fin), 'dd MMM yyyy', { locale: es })}</div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-gray-50 p-3 flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onToggle(promocion.id, !promocion.activa)}
          className={`${promocion.activa ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}`}
        >
          <Power className="h-4 w-4 mr-1" />
          {promocion.activa ? 'Desactivar' : 'Activar'}
        </Button>
        
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEdit(promocion)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(promocion.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PromocionCard;