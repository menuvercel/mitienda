'use client'

import { useState, useCallback, useEffect } from 'react'
import { format, parseISO, startOfWeek, endOfWeek, isValid } from "date-fns"
import { es } from 'date-fns/locale'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon } from "lucide-react"

interface Venta {
  _id: string;
  vendedor_id: string;
  vendedor_nombre: string;
  total: number;
  fecha: string;
}

interface VentaSemana {
  week_start: string;
  week_end: string;
  ventas: Venta[];
  total_ventas: number;
}

interface SalesSectionProps {
  userRole: 'Almacen' | 'Vendedor';
}

export default function SalesSection({ userRole }: SalesSectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [ventasDiarias, setVentasDiarias] = useState<Venta[]>([])
  const [ventasSemanales, setVentasSemanales] = useState<VentaSemana[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const obtenerVentasDelDia = useCallback(async (fecha: Date) => {
    setIsLoading(true)
    setError(null)

    try {
      const formattedDate = format(fecha, 'yyyy-MM-dd')
      const response = await fetch(`/api/ventas-diarias?fecha=${formattedDate}`)
      
      if (!response.ok) {
        throw new Error('Error al obtener las ventas diarias')
      }

      const data: Venta[] = await response.json()
      setVentasDiarias(data)
    } catch (error) {
      console.error('Error al obtener ventas diarias:', error)
      setError('Error al obtener las ventas diarias. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const obtenerVentasSemanales = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ventas-semanales')
      
      if (!response.ok) {
        throw new Error('Error al obtener las ventas semanales')
      }

      const data: Venta[] = await response.json()
      
      const weekMap = new Map<string, VentaSemana>()

      const getWeekKey = (date: Date) => {
        const mondayOfWeek = startOfWeek(date, { weekStartsOn: 1 })
        const sundayOfWeek = endOfWeek(date, { weekStartsOn: 1 })
        return `${format(mondayOfWeek, 'yyyy-MM-dd')}_${format(sundayOfWeek, 'yyyy-MM-dd')}`
      }

      data.forEach((venta) => {
        const ventaDate = parseISO(venta.fecha)
        if (!isValid(ventaDate)) {
          console.error(`Invalid date in venta: ${venta.fecha}`)
          return
        }
        const weekKey = getWeekKey(ventaDate)

        if (!weekMap.has(weekKey)) {
          const mondayOfWeek = startOfWeek(ventaDate, { weekStartsOn: 1 })
          const sundayOfWeek = endOfWeek(ventaDate, { weekStartsOn: 1 })
          weekMap.set(weekKey, {
            week_start: format(mondayOfWeek, 'yyyy-MM-dd'),
            week_end: format(sundayOfWeek, 'yyyy-MM-dd'),
            ventas: [],
            total_ventas: 0
          })
        }

        const currentWeek = weekMap.get(weekKey)!
        currentWeek.ventas.push(venta)
        currentWeek.total_ventas += venta.total
      })

      const uniqueWeeksArray = Array.from(weekMap.values()).sort((a, b) => {
        const dateA = parseISO(a.week_start)
        const dateB = parseISO(b.week_start)
        return isValid(dateB) && isValid(dateA) ? dateB.getTime() - dateA.getTime() : 0
      })

      setVentasSemanales(uniqueWeeksArray)
      
      if (uniqueWeeksArray.length > 0 && !selectedWeek) {
        setSelectedWeek(`${uniqueWeeksArray[0].week_start},${uniqueWeeksArray[0].week_end}`)
      }
    } catch (error) {
      console.error('Error al obtener ventas semanales:', error)
      setError('Error al obtener las ventas semanales. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWeek])

  useEffect(() => {
    obtenerVentasSemanales()
  }, [obtenerVentasSemanales])

  const handleMostrarVentasDiarias = () => {
    if (selectedDate) {
      obtenerVentasDelDia(selectedDate)
    }
  }

  const formatTotalVentas = (total: number | string | null): string => {
    if (total === null) return '$0.00'
    const numTotal = typeof total === 'string' ? parseFloat(total) : total
    return isNaN(numTotal) ? '$0.00' : `$${numTotal.toFixed(2)}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Ventas</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Por Día</TabsTrigger>
            <TabsTrigger value="weekly">Por Semana</TabsTrigger>
          </TabsList>
          <TabsContent value="daily">
            <div className="mb-4 flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleMostrarVentasDiarias} disabled={isLoading}>
                {isLoading ? 'Cargando...' : 'Cargar'}
              </Button>
            </div>

            {error && (
              <div className="text-red-500 mb-4">{error}</div>
            )}

            {!isLoading && ventasDiarias.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Ingresos Totales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventasDiarias.map((venta) => (
                    <TableRow key={venta._id}>
                      <TableCell>{venta.vendedor_nombre}</TableCell>
                      <TableCell className="text-right">{formatTotalVentas(venta.total)}</TableCell>
                    </TableRow>
                  ))}
                  {userRole === 'Almacen' && (
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {formatTotalVentas(ventasDiarias.reduce((sum, venta) => sum + venta.total, 0))}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {!isLoading && ventasDiarias.length === 0 && (
              <div className="text-center text-gray-500">
                No hay ventas registradas para la fecha seleccionada.
              </div>
            )}
          </TabsContent>
          <TabsContent value="weekly">
            <div className="mb-4 flex items-center gap-4">
              <Select value={selectedWeek || ''} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Seleccionar semana" />
                </SelectTrigger>
                <SelectContent>
                  {ventasSemanales.map((semana, index) => (
                    <SelectItem key={index} value={`${semana.week_start},${semana.week_end}`}>
                      {`${format(parseISO(semana.week_start), 'dd/MM/yyyy', { locale: es })} - ${format(parseISO(semana.week_end), 'dd/MM/yyyy', { locale: es })}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={obtenerVentasSemanales} disabled={isLoading}>
                {isLoading ? 'Cargando...' : 'Cargar'}
              </Button>
            </div>

            {error && (
              <div className="text-red-500 mb-4">{error}</div>
            )}

            {!isLoading && ventasSemanales.length > 0 && selectedWeek && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Ingresos Totales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventasSemanales.find(semana => `${semana.week_start},${semana.week_end}` === selectedWeek)?.ventas.map((venta) => (
                    <TableRow key={venta._id}>
                      <TableCell>{venta.vendedor_nombre}</TableCell>
                      <TableCell className="text-right">{formatTotalVentas(venta.total)}</TableCell>
                    </TableRow>
                  ))}
                  {userRole === 'Almacen' && (
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {formatTotalVentas(
                          ventasSemanales.find(semana => `${semana.week_start},${semana.week_end}` === selectedWeek)?.total_ventas || 0
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {!isLoading && ventasSemanales.length === 0 && (
              <div className="text-center text-gray-500">
                No hay ventas registradas para la semana seleccionada.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}