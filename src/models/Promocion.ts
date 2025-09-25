export interface IPromocion {
  id: string;
  nombre: string;
  valor_descuento: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  activa: boolean;
}