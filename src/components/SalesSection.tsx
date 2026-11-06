'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format, parseISO, isValid } from "date-fns"
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon, Banknote, CreditCard, DollarSign } from "lucide-react"

interface VentaDiaria {
  vendedor_id: string;
  vendedor_nombre: string;
  total_efectivo?: number | string | null;
  total_transferencia?: number | string | null;
  total_ventas?: number | string | null;
  detalles_ventas?: any[];
}

interface VentaSemanal {
  week_start: string;
  week_end: string;
  vendedor_id: string;
  vendedor_nombre: string;
  total_efectivo?: number | string | null;
  total_transferencia?: number | string | null;
  total_ventas?: number | string | null;
  detalles_ventas?: any[];
}

interface VentasSemana {
  fechaInicio: string;
  fechaFin: string;
  ventas: VentaSemanal[];
}

interface SalesSectionProps {
  userRole: 'Almacen' | 'Vendedor';
  userId?: string;
}

export default function SalesSection({ userRole, userId }: SalesSectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [ventasDiarias, setVentasDiarias] = useState<VentaDiaria[]>([])
  const [ventasSemanales, setVentasSemanales] = useState<VentasSemana[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const obtenerVentasDelDia = useCallback(async (fecha: Date) => {
    setIsLoading(true)
    setError(null)

    try {
      const formattedDate = format(fecha, 'yyyy-MM-dd')
      const params = new URLSearchParams({
        fecha: formattedDate,
        role: userRole
      })
      if (userRole === 'Vendedor' && userId) {
        params.append('userId', userId)
      }

      const response = await fetch(`/api/ventas-diarias?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Error al obtener las ventas diarias')
      }

      const data: VentaDiaria[] = await response.json()
      setVentasDiarias(data)
    } catch (err) {
      console.error('Error al obtener ventas diarias:', err)
      setError('Error al obtener las ventas diarias. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [userRole, userId])

  const agruparVentasPorSemana = useCallback((ventas: VentaSemanal[]) => {
    const weekMap = new Map<string, VentasSemana>()

    ventas.forEach((venta) => {
      const weekStart = parseISO(venta.week_start)
      const weekEnd = parseISO(venta.week_end)

      if (!isValid(weekStart) || !isValid(weekEnd)) {
        console.error(`Invalid date in venta: ${venta.week_start} - ${venta.week_end}`)
        return
      }

      const weekEndWithTime = new Date(weekEnd)
      weekEndWithTime.setHours(23, 59, 59, 999)

      const weekKey = `${format(weekStart, 'yyyy-MM-dd')}_${format(weekEnd, 'yyyy-MM-dd')}`

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          fechaInicio: format(weekStart, 'yyyy-MM-dd'),
          fechaFin: format(weekEnd, 'yyyy-MM-dd'),
          ventas: []
        })
      }

      const currentWeek = weekMap.get(weekKey)!
      currentWeek.ventas.push({
        ...venta,
        week_start: format(weekStart, 'yyyy-MM-dd'),
        week_end: format(weekEndWithTime, 'yyyy-MM-dd')
      })
    })

    return Array.from(weekMap.values()).sort((a, b) => {
      const dateA = parseISO(a.fechaInicio)
      const dateB = parseISO(b.fechaInicio)
      return isValid(dateB) && isValid(dateA) ? dateB.getTime() - dateA.getTime() : 0
    })
  }, [])

  const obtenerVentasSemanales = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ role: userRole })
      if (userRole === 'Vendedor' && userId) {
        params.append('userId', userId)
      }

      const response = await fetch(`/api/ventas-semanales?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Error al obtener las ventas semanales')
      }

      const data: VentaSemanal[] = await response.json()
      const ventasAgrupadasPorSemana = agruparVentasPorSemana(data)

      setVentasSemanales(ventasAgrupadasPorSemana)

      if (ventasAgrupadasPorSemana.length > 0) {
        setSelectedWeek((prev) => {
          if (prev && ventasAgrupadasPorSemana.some(s => `${s.fechaInicio},${s.fechaFin}` === prev)) {
            return prev
          }
          return `${ventasAgrupadasPorSemana[0].fechaInicio},${ventasAgrupadasPorSemana[0].fechaFin}`
        })
      }
    } catch (err) {
      console.error('Error al obtener ventas semanales:', err)
      setError('Error al obtener las ventas semanales. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [agruparVentasPorSemana, userRole, userId])

  useEffect(() => {
    if (selectedDate) {
      obtenerVentasDelDia(selectedDate)
    }
    obtenerVentasSemanales()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMostrarVentasDiarias = () => {
    if (selectedDate) {
      obtenerVentasDelDia(selectedDate)
    }
  }

  const formatTotalVentas = (total: number | string | null | undefined): string => {
    if (total === null || total === undefined) return '$0.00'
    const numTotal = typeof total === 'string' ? parseFloat(total) : total
    return isNaN(numTotal) ? '$0.00' : `$${numTotal.toFixed(2)}`
  }

  const getRowEfectivo = (v: { total_efectivo?: number | string | null }): number => {
    const val = typeof v.total_efectivo === 'string' ? parseFloat(v.total_efectivo) : (v.total_efectivo || 0)
    return isNaN(val) ? 0 : val
  }

  const getRowTransferencia = (v: { total_transferencia?: number | string | null }): number => {
    const val = typeof v.total_transferencia === 'string' ? parseFloat(v.total_transferencia) : (v.total_transferencia || 0)
    return isNaN(val) ? 0 : val
  }

  const getRowTotal = (v: {
    total_ventas?: number | string | null;
    total_efectivo?: number | string | null;
    total_transferencia?: number | string | null;
  }): number => {
    const efec = getRowEfectivo(v)
    const trans = getRowTransferencia(v)
    const val = typeof v.total_ventas === 'string' ? parseFloat(v.total_ventas) : (v.total_ventas || 0)
    if (!isNaN(val) && val > 0) return val
    return efec + trans
  }

  // Totales Diarios
  const totalEfectivoDiario = ventasDiarias.reduce((sum, v) => sum + getRowEfectivo(v), 0)
  const totalTransferenciaDiario = ventasDiarias.reduce((sum, v) => sum + getRowTransferencia(v), 0)
  const totalIngresosDiario = ventasDiarias.reduce((sum, v) => sum + getRowTotal(v), 0)

  // Totales Semanales
  const ventasSemanalesFiltradas = selectedWeek
    ? ventasSemanales.find(semana => `${semana.fechaInicio},${semana.fechaFin}` === selectedWeek)?.ventas || []
    : []

  const totalEfectivoSemanal = ventasSemanalesFiltradas.reduce((sum, v) => sum + getRowEfectivo(v), 0)
  const totalTransferenciaSemanal = ventasSemanalesFiltradas.reduce((sum, v) => sum + getRowTransferencia(v), 0)
  const totalIngresosSemanal = ventasSemanalesFiltradas.reduce((sum, v) => sum + getRowTotal(v), 0)

  return (
    <Card className="w-full bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none select-none">📊</span>
          <CardTitle className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Ventas
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2 p-1.5 bg-[#f5f5f5] rounded-xl h-auto mb-5 sm:mb-6">
            <TabsTrigger 
              value="daily" 
              className="py-2.5 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            >
              Por Día
            </TabsTrigger>
            <TabsTrigger 
              value="weekly" 
              className="py-2.5 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            >
              Por Semana
            </TabsTrigger>
          </TabsList>

          {/* TAB: POR DÍA */}
          <TabsContent value="daily" className="focus-visible:outline-none mt-0">
            {/* Controles de Filtro */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5 sm:mb-6">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[280px] justify-start text-left font-normal bg-white border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl h-11 px-3.5 shadow-2xs transition-all",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2.5 h-4 w-4 text-slate-500 shrink-0" />
                    {selectedDate ? (
                      <span className="capitalize text-sm font-medium">
                        {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </span>
                    ) : (
                      <span className="text-sm">Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-slate-200" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date)
                      setIsCalendarOpen(false)
                      if (date) {
                        obtenerVentasDelDia(date)
                      }
                    }}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>

              <Button 
                onClick={handleMostrarVentasDiarias} 
                disabled={isLoading}
                className="w-full sm:w-auto bg-[#f97316] hover:bg-[#ea580c] active:scale-[0.98] text-white font-medium px-6 h-11 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isLoading ? 'Cargando...' : 'Cargar Ventas'}
              </Button>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                {error}
              </div>
            )}

            {/* Tarjetas KPI de Desglose */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 mb-6">
              {/* Efectivo */}
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs">
                <div className="min-w-0 pr-2">
                  <p className="text-[11px] sm:text-xs font-bold text-[#16a34a] tracking-wider uppercase mb-1 truncate">
                    EFECTIVO
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#065f46] tracking-tight break-all">
                    {formatTotalVentas(totalEfectivoDiario)}
                  </p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#dcfce7] flex items-center justify-center text-[#16a34a] shrink-0">
                  <Banknote className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>

              {/* Transferencia */}
              <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs">
                <div className="min-w-0 pr-2">
                  <p className="text-[11px] sm:text-xs font-bold text-[#2563eb] tracking-wider uppercase mb-1 truncate">
                    TRANSFERENCIA
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#1e40af] tracking-tight break-all">
                    {formatTotalVentas(totalTransferenciaDiario)}
                  </p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#dbeafe] flex items-center justify-center text-[#2563eb] shrink-0">
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>

              {/* Ingresos Totales */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs sm:col-span-2 lg:col-span-1">
                <div className="min-w-0 pr-2">
                  <p className="text-[11px] sm:text-xs font-bold text-[#64748b] tracking-wider uppercase mb-1 truncate">
                    INGRESOS TOTALES
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight break-all">
                    {formatTotalVentas(totalIngresosDiario)}
                  </p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center text-[#64748b] shrink-0">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </div>

            {/* Tabla de Vendedores */}
            {!isLoading && ventasDiarias.length > 0 && (
              <div className="w-full overflow-x-auto rounded-xl border border-slate-100 shadow-2xs">
                <Table className="w-full min-w-[500px]">
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="text-left font-semibold text-slate-500 text-xs sm:text-sm py-3.5 px-4">
                        Vendedor
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-500 text-xs sm:text-sm py-3.5 px-4">
                        Efectivo
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-500 text-xs sm:text-sm py-3.5 px-4">
                        Transferencia
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-500 text-xs sm:text-sm py-3.5 px-4">
                        Ingresos Totales
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100 bg-white">
                    {ventasDiarias.map((venta) => {
                      const efec = getRowEfectivo(venta)
                      const trans = getRowTransferencia(venta)
                      const tot = getRowTotal(venta)
                      return (
                        <TableRow 
                          key={venta.vendedor_id}
                          className="hover:bg-slate-50/60 transition-colors border-b border-slate-100/80"
                        >
                          <TableCell className="font-medium text-slate-700 text-xs sm:text-sm py-3.5 px-4">
                            {venta.vendedor_nombre}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-[#16a34a] text-xs sm:text-sm py-3.5 px-4">
                            {formatTotalVentas(efec)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-[#2563eb] text-xs sm:text-sm py-3.5 px-4">
                            {formatTotalVentas(trans)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 text-xs sm:text-sm py-3.5 px-4">
                            {formatTotalVentas(tot)}
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {userRole === 'Almacen' && (
                      <TableRow className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                        <TableCell className="font-extrabold text-slate-900 text-xs sm:text-sm py-4 px-4">
                          Total Consolidado
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-[#16a34a] text-xs sm:text-sm py-4 px-4">
                          {formatTotalVentas(totalEfectivoDiario)}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-[#2563eb] text-xs sm:text-sm py-4 px-4">
                          {formatTotalVentas(totalTransferenciaDiario)}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-slate-900 text-xs sm:text-sm py-4 px-4">
                          {formatTotalVentas(totalIngresosDiario)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {!isLoading && ventasDiarias.length === 0 && (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 my-4 bg-slate-50/50">
                <p className="text-slate-500 font-medium text-sm">
                  No hay ventas registradas para la fecha seleccionada.
                </p>
              </div>
            )}
          </TabsContent>

          {/* TAB: POR SEMANA */}
          <TabsContent value="weekly" className="focus-visible:outline-none mt-0">
            {/* Controles de Filtro */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5 sm:mb-6">
              <Select value={selectedWeek || ''} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-full sm:w-[280px] bg-white border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl h-11 px-3.5 shadow-2xs font-medium text-sm transition-all">
                  <SelectValue placeholder="Seleccionar semana" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl border-slate-200 max-h-72">
                  {ventasSemanales.map((semana, index) => (
                    <SelectItem 
                      key={index} 
                      value={`${semana.fechaInicio},${semana.fechaFin}`}
                      className="cursor-pointer text-sm font-medium py-2"
                    >
                      {`${format(parseISO(semana.fechaInicio), 'dd/MM/yyyy')} - ${format(parseISO(semana.fechaFin), 'dd/MM/yyyy')}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={obtenerVentasSemanales} 
                disabled={isLoading}
                className="w-full sm:w-auto bg-[#f97316] hover:bg-[#ea580c] active:scale-[0.98] text-white font-medium px-6 h-11 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isLoading ? 'Cargando...' : 'Cargar Ventas'}
              </Button>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                {error}
              </div>
            )}

            {/* Tarjetas KPI de Desglose Semanal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 mb-6">
              {/* Efectivo Semanal */}
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs">
                <div className="min-w-0 pr-2">
                  <p className="text-[11px] sm:text-xs font-bold text-[#16a34a] tracking-wider uppercase mb-1 truncate">
                    EFECTIVO SEMANAL
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#065f46] tracking-tight break-all">
                    {formatTotalVentas(totalEfectivoSemanal)}
                  </p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#dcfce7] flex items-center justify-center text-[#16a34a] shrink-0">
                  <Banknote className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>

              {/* Transferencia Semanal */}
              <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs">
                <div className="min-w-0 pr-2">
                  <p className="text-[11px] sm:text-xs font-bold text-[#2563eb] tracking-wider uppercase mb-1 truncate">
                    TRANSFERENCIA SEMANAL
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#1e40af] tracking-tight break-all">
                    {formatTotalVentas(totalTransferenciaSemanal)}
                  </p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#dbeafe] flex items-center justify-center text-[#2563eb] shrink-0">
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>

              {/* Ingresos Totales Semanales */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs sm:col-span-2 lg:col-span-1">
                <div className="min-w-0 pr-2">
                  <p className="text-[11px] sm:text-xs font-bold text-[#64748b] tracking-wider uppercase mb-1 truncate">
                    INGRESOS TOTALES SEMANALES
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight break-all">
                    {formatTotalVentas(totalIngresosSemanal)}
                  </p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center text-[#64748b] shrink-0">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </div>

            {/* Tabla Semanal de Vendedores */}
            {!isLoading && ventasSemanales.length > 0 && (
              <div className="w-full overflow-x-auto rounded-xl border border-slate-100 shadow-2xs">
                <Table className="w-full min-w-[500px]">
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="text-left font-semibold text-slate-500 text-xs sm:text-sm py-3.5 px-4">
                        Vendedor
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-500 text-xs sm:text-sm py-3.5 px-4">
                        Efectivo
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-500 text-xs sm:text-sm py-3.5 px-4">
                        Transferencia
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-500 text-xs sm:text-sm py-3.5 px-4">
                        Ingresos Totales
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100 bg-white">
                    {selectedWeek && ventasSemanalesFiltradas.map((venta) => {
                      const efec = getRowEfectivo(venta)
                      const trans = getRowTransferencia(venta)
                      const tot = getRowTotal(venta)
                      return (
                        <TableRow 
                          key={venta.vendedor_id}
                          className="hover:bg-slate-50/60 transition-colors border-b border-slate-100/80"
                        >
                          <TableCell className="font-medium text-slate-700 text-xs sm:text-sm py-3.5 px-4">
                            {venta.vendedor_nombre}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-[#16a34a] text-xs sm:text-sm py-3.5 px-4">
                            {formatTotalVentas(efec)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-[#2563eb] text-xs sm:text-sm py-3.5 px-4">
                            {formatTotalVentas(trans)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 text-xs sm:text-sm py-3.5 px-4">
                            {formatTotalVentas(tot)}
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {userRole === 'Almacen' && selectedWeek && (
                      <TableRow className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                        <TableCell className="font-extrabold text-slate-900 text-xs sm:text-sm py-4 px-4">
                          Total Consolidado
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-[#16a34a] text-xs sm:text-sm py-4 px-4">
                          {formatTotalVentas(totalEfectivoSemanal)}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-[#2563eb] text-xs sm:text-sm py-4 px-4">
                          {formatTotalVentas(totalTransferenciaSemanal)}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-slate-900 text-xs sm:text-sm py-4 px-4">
                          {formatTotalVentas(totalIngresosSemanal)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {!isLoading && ventasSemanales.length === 0 && (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 my-4 bg-slate-50/50">
                <p className="text-slate-500 font-medium text-sm">
                  No hay ventas registradas para la semana seleccionada.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
