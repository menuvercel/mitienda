'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

interface Venta {
  _id: string;
  producto: string;
  producto_nombre: string;
  producto_foto: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  vendedor: string;
  fecha: string;
}

interface VentasPorVendedor {
  [vendedor: string]: number;
}

export default function SalesSection({ vendedores }: { vendedores: { id: string; nombre: string }[] }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [ventasPorVendedor, setVentasPorVendedor] = useState<VentasPorVendedor>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const obtenerVentasDelDia = async (fecha: Date) => {
    setIsLoading(true)
    setError(null)
    const ventasPorVendedor: VentasPorVendedor = {}

    try {
      const startDate = format(fecha, 'yyyy-MM-dd')
      const endDate = format(fecha, 'yyyy-MM-dd')

      for (const vendedor of vendedores) {
        const response = await fetch(`/api/ventas?vendedorId=${vendedor.id}&startDate=${startDate}&endDate=${endDate}`)
        if (!response.ok) {
          throw new Error(`Error al obtener ventas para ${vendedor.nombre}`)
        }
        const ventas: Venta[] = await response.json()
        const totalVentas = ventas.reduce((sum, venta) => sum + venta.total, 0)
        ventasPorVendedor[vendedor.nombre] = totalVentas
      }

      setVentasPorVendedor(ventasPorVendedor)
    } catch (error) {
      console.error('Error al obtener ventas:', error)
      setError('Error al obtener las ventas. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMostrarVentas = () => {
    if (selectedDate) {
      obtenerVentasDelDia(selectedDate)
    }
  }

  const totalVentas = Object.values(ventasPorVendedor).reduce((sum, total) => sum + total, 0)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Ventas</CardTitle>
      </CardHeader>
      <CardContent>
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
                {selectedDate ? format(selectedDate, "PPP") : <span>Seleccionar fecha</span>}
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
          <Button onClick={handleMostrarVentas} disabled={isLoading}>
            {isLoading ? 'Cargando...' : 'Mostrar'}
          </Button>
        </div>

        {error && (
          <div className="text-red-500 mb-4">{error}</div>
        )}

        {!isLoading && Object.keys(ventasPorVendedor).length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Ingresos Totales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(ventasPorVendedor).map(([vendedor, total]) => (
                <TableRow key={vendedor}>
                  <TableCell>{vendedor}</TableCell>
                  <TableCell className="text-right">${total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">${totalVentas.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        {!isLoading && Object.keys(ventasPorVendedor).length === 0 && (
          <div className="text-center text-gray-500">
            No hay ventas registradas para la fecha seleccionada.
          </div>
        )}
      </CardContent>
    </Card>
  )
}