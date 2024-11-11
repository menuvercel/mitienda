import React, { useState, useEffect, useCallback } from 'react';
import { FiCalendar } from 'react-icons/fi';  // Ícono de calendario de react-icons
import { format, startOfWeek, endOfWeek, parseISO, isValid } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";  // Componente Calendar
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";  // Componente Popover
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Importa los tipos que ya tienes definidos
import { Venta, VentaSemana } from '../types';  // Asegúrate de la ruta correcta

// Lógica para agrupar ventas por semana
const agruparVentasPorSemana = useCallback((ventas: Venta[]) => {
  const weekMap = new Map<string, VentaSemana>();

  const getWeekKey = (date: Date) => {
    const mondayOfWeek = startOfWeek(date, { weekStartsOn: 1 });
    const sundayOfWeek = endOfWeek(date, { weekStartsOn: 1 });
    return `${format(mondayOfWeek, 'yyyy-MM-dd')}_${format(sundayOfWeek, 'yyyy-MM-dd')}`;
  };

  ventas.forEach((venta) => {
    const ventaDate = parseISO(venta.fecha);
    if (!isValid(ventaDate)) {
      console.error(`Invalid date in venta: ${venta.fecha}`);
      return;
    }
    const weekKey = getWeekKey(ventaDate);

    if (!weekMap.has(weekKey)) {
      const mondayOfWeek = startOfWeek(ventaDate, { weekStartsOn: 1 });
      const sundayOfWeek = endOfWeek(ventaDate, { weekStartsOn: 1 });
      weekMap.set(weekKey, {
        fechaInicio: format(mondayOfWeek, 'yyyy-MM-dd'),
        fechaFin: format(sundayOfWeek, 'yyyy-MM-dd'),
        ventas: [],
        total: 0,
        ganancia: 0,
      });
    }

    const currentWeek = weekMap.get(weekKey)!;
    currentWeek.ventas.push(venta);
   // Modifica la lógica de esta parte para validar el tipo de 'venta.total'
    currentWeek.total += typeof venta.total === 'number' ? venta.total : parseFloat(venta.total as string) || 0;

    currentWeek.ganancia = parseFloat((currentWeek.total * 0.08).toFixed(2));  // Ajuste de ganancia, por ejemplo, 8%
  });

  const ventasSemanales = Array.from(weekMap.values());

  return ventasSemanales.sort((a, b) => {
    const dateA = parseISO(a.fechaInicio);
    const dateB = parseISO(b.fechaInicio);
    return isValid(dateB) && isValid(dateA) ? dateB.getTime() - dateA.getTime() : 0;
  });
}, []);

// Componente principal
const SalesSection: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventasSemanales, setVentasSemanales] = useState<VentaSemana[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Aquí iría la llamada a tu API para obtener las ventas
    const fetchVentas = async () => {
      setIsLoading(true);
      try {
        // Aquí puedes hacer la solicitud para obtener las ventas desde tu API
        const response = await fetch('/api/ventas');
        const data = await response.json();
        setVentas(data);
      } catch (err) {
        setError('Error al cargar las ventas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVentas();
  }, []);

  // Usamos la lógica de agruparVentasPorSemana para procesar las ventas
  useEffect(() => {
    if (ventas.length > 0) {
      const ventasSemanalesAgrupadas = agruparVentasPorSemana(ventas);
      setVentasSemanales(ventasSemanalesAgrupadas);
    }
  }, [ventas, agruparVentasPorSemana]);

  // Filtrar ventas por semana seleccionada
  const ventasSemanalesFiltradas = selectedWeek
    ? ventasSemanales.filter((venta) => `${venta.fechaInicio}-${venta.fechaFin}` === selectedWeek)
    : ventasSemanales;

  // Función para formatear el total de ventas
  const formatTotalVentas = (total: number) => total.toLocaleString('es-ES', { style: 'currency', currency: 'USD' });

  return (
    <Card>
      <CardContent>
        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily">Por Día</TabsTrigger>
            <TabsTrigger value="weekly">Por Semana</TabsTrigger>
          </TabsList>
          <TabsContent value="daily">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <FiCalendar className="h-4 w-4" />  {/* Usa FiCalendar aquí */}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    {/* Aquí puedes agregar tu calendario */}
                    <Calendar />
                  </PopoverContent>
                </Popover>
                <Button onClick={() => console.log('Mostrar Ventas Diarias')}>Mostrar Ventas</Button>
              </div>
              {isLoading && <div>Cargando...</div>}
              {error && <div>{error}</div>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Total Ventas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map((venta) => (
                    <TableRow key={venta._id}>
                      <TableCell>{venta.vendedor}</TableCell>
                      <TableCell>{formatTotalVentas(venta.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="weekly">
            <div className="space-y-4">
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar semana" />
                </SelectTrigger>
                <SelectContent>
                  {ventasSemanales.map((semana) => (
                    <SelectItem key={semana.fechaInicio} value={`${semana.fechaInicio}-${semana.fechaFin}`}>
                      {`${semana.fechaInicio} - ${semana.fechaFin}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoading && <div>Cargando...</div>}
              {error && <div>{error}</div>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Total Ventas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventasSemanalesFiltradas.map((semana) => (
                    <TableRow key={`${semana.fechaInicio}-${semana.fechaFin}`}>
                      <TableCell>{`${semana.fechaInicio} - ${semana.fechaFin}`}</TableCell>
                      <TableCell>{formatTotalVentas(semana.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SalesSection;
