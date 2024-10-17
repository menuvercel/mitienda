import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import Image from 'next/image'

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
  [vendedor: string]: Venta[]
}

export default function SalesSection({ ventas = [] }: { ventas: Venta[] }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [ventasPorDia, setVentasPorDia] = useState<VentasPorVendedor>({})
  const [ventasPorSemana, setVentasPorSemana] = useState<VentasPorVendedor>({})
  const [mostrarPresionado, setMostrarPresionado] = useState(false)

  useEffect(() => {
    if (selectedDate) {
      const ventasDia = ventas.filter(venta => 
        new Date(venta.fecha).toDateString() === selectedDate.toDateString()
      )
      
      const ventasSemana = ventas.filter(venta => {
        const ventaDate = new Date(venta.fecha)
        const weekStart = new Date(selectedDate)
        weekStart.setDate(selectedDate.getDate() - selectedDate.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return ventaDate >= weekStart && ventaDate <= weekEnd
      })

      const agruparPorVendedor = (ventas: Venta[]) => {
        return ventas.reduce((acc, venta) => {
          if (!acc[venta.vendedor]) {
            acc[venta.vendedor] = []
          }
          acc[venta.vendedor].push(venta)
          return acc
        }, {} as VentasPorVendedor)
      }

      setVentasPorDia(agruparPorVendedor(ventasDia))
      setVentasPorSemana(agruparPorVendedor(ventasSemana))
    }
  }, [selectedDate, ventas])

  const renderVentas = (ventasPorVendedor: VentasPorVendedor) => {
    return Object.entries(ventasPorVendedor).map(([vendedor, ventas]) => (
      <Card key={vendedor} className="mb-4">
        <CardHeader>
          <CardTitle>{vendedor}</CardTitle>
        </CardHeader>
        <CardContent>
          {ventas.map(venta => (
            <div key={venta._id} className="mb-4 p-4 bg-gray-100 rounded-lg shadow">
              <div className="flex items-center mb-2">
                <Image
                  src={venta.producto_foto || '/placeholder.svg'}
                  alt={venta.producto_nombre}
                  width={50}
                  height={50}
                  className="rounded-full mr-4"
                />
                <div>
                  <h4 className="font-semibold">{venta.producto_nombre}</h4>
                  <p className="text-sm text-gray-600">ID: {venta.producto}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="font-medium">Fecha:</span> {new Date(venta.fecha).toLocaleDateString()}</p>
                <p><span className="font-medium">Cantidad:</span> {venta.cantidad}</p>
                <p><span className="font-medium">Precio unitario:</span> ${venta.precio_unitario.toFixed(2)}</p>
                <p><span className="font-medium">Total:</span> ${venta.total.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    ))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Ventas</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="por-dia">
          <TabsList>
            <TabsTrigger value="por-dia">Por día</TabsTrigger>
            <TabsTrigger value="por-semana">Por semana</TabsTrigger>
          </TabsList>
          <div className="my-4 flex items-center gap-4">
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
            <Button onClick={() => {
              setSelectedDate(new Date(selectedDate || new Date()))
              setMostrarPresionado(true)
            }}>Mostrar</Button>
          </div>
          <TabsContent value="por-dia">
            <h3 className="text-lg font-semibold mb-4">Ventas del día</h3>
            {mostrarPresionado ? (
              Object.keys(ventasPorDia).length > 0 ? (
                renderVentas(ventasPorDia)
              ) : (
                <p className="text-center text-gray-500">No hay ventas registradas para este día.</p>
              )
            ) : (
              <p className="text-center text-gray-500">Selecciona una fecha y presiona "Mostrar" para ver las ventas.</p>
            )}
          </TabsContent>
          <TabsContent value="por-semana">
            <h3 className="text-lg font-semibold mb-4">Ventas de la semana</h3>
            {mostrarPresionado ? (
              Object.keys(ventasPorSemana).length > 0 ? (
                renderVentas(ventasPorSemana)
              ) : (
                <p className="text-center text-gray-500">No hay ventas registradas para esta semana.</p>
              )
            ) : (
              <p className="text-center text-gray-500">Selecciona una fecha y presiona "Mostrar" para ver las ventas de la semana.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}