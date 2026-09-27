'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeftRight, Calendar, Users, ChevronDown, X, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import { getContabilidadVendedores } from '@/app/services/api'
import { CalculoContabilidadVendedor } from '@/types'

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
]

export default function ComparativaPage() {
  const [mesA, setMesA] = useState<number>(new Date().getMonth() || 12)
  const [anioA, setAnioA] = useState<number>(new Date().getFullYear())
  const [mesB, setMesB] = useState<number>(new Date().getMonth() + 1)
  const [anioB, setAnioB] = useState<number>(new Date().getFullYear())

  const [isLoading, setIsLoading] = useState(false)
  const [dataA, setDataA] = useState<CalculoContabilidadVendedor[]>([])
  const [dataB, setDataB] = useState<CalculoContabilidadVendedor[]>([])
  const [hasCompared, setHasCompared] = useState(false)

  // Filtro de selección múltiple de vendedores
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([])
  const [vendorSearchTerm, setVendorSearchTerm] = useState('')

  const handleComparar = async () => {
    setIsLoading(true)
    try {
      const startA = new Date(anioA, mesA - 1, 1)
      const endA = new Date(anioA, mesA, 0)
      const fechaStartAStr = format(startA, 'yyyy-MM-dd')
      const fechaEndAStr = format(endA, 'yyyy-MM-dd')

      const startB = new Date(anioB, mesB - 1, 1)
      const endB = new Date(anioB, mesB, 0)
      const fechaStartBStr = format(startB, 'yyyy-MM-dd')
      const fechaEndBStr = format(endB, 'yyyy-MM-dd')

      const [resA, resB] = await Promise.all([
        getContabilidadVendedores(fechaStartAStr, fechaEndAStr),
        getContabilidadVendedores(fechaStartBStr, fechaEndBStr)
      ])

      setDataA(resA)
      setDataB(resB)
      setHasCompared(true)
      toast({ title: 'Éxito', description: 'Comparativa generada correctamente' })
    } catch (error) {
      console.error('Error al comparar períodos:', error)
      toast({ title: 'Error', description: 'No se pudieron comparar los períodos', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CU', { style: 'currency', currency: 'CUP', minimumFractionDigits: 2 }).format(val)
  }

  // Lista de vendedores únicos presentes en los datos
  const allVendorsMap = new Map<string, string>()
  dataA.forEach(d => allVendorsMap.set(String(d.vendedorId), d.vendedorNombre))
  dataB.forEach(d => allVendorsMap.set(String(d.vendedorId), d.vendedorNombre))
  const availableVendors = Array.from(allVendorsMap.entries()).map(([id, nombre]) => ({ id, nombre }))

  const toggleVendor = (id: string) => {
    setSelectedVendorIds(prev =>
      prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]
    )
  }

  const selectAllVendors = () => {
    setSelectedVendorIds(availableVendors.map(v => v.id))
  }

  const clearVendors = () => {
    setSelectedVendorIds([])
  }

  // Filtrar datasets de acuerdo a los vendedores elegidos
  const activeDataA = selectedVendorIds.length > 0
    ? dataA.filter(d => selectedVendorIds.includes(String(d.vendedorId)))
    : dataA
  const activeDataB = selectedVendorIds.length > 0
    ? dataB.filter(d => selectedVendorIds.includes(String(d.vendedorId)))
    : dataB

  const calcSum = (arr: CalculoContabilidadVendedor[], key: keyof CalculoContabilidadVendedor) => {
    return arr.reduce((sum, item) => sum + (typeof item[key] === 'number' ? (item[key] as number) : 0), 0)
  }

  const totalVentaA = calcSum(activeDataA, 'ventaTotal')
  const totalVentaB = calcSum(activeDataB, 'ventaTotal')

  const totalEfectivoA = calcSum(activeDataA, 'ventaEfectivo')
  const totalEfectivoB = calcSum(activeDataB, 'ventaEfectivo')

  const totalTransferenciaA = calcSum(activeDataA, 'ventaTransferencia')
  const totalTransferenciaB = calcSum(activeDataB, 'ventaTransferencia')

  const gananciaBrutaA = calcSum(activeDataA, 'gananciaBruta')
  const gananciaBrutaB = calcSum(activeDataB, 'gananciaBruta')

  const gastosFijosA = calcSum(activeDataA, 'gastosFijos')
  const gastosFijosB = calcSum(activeDataB, 'gastosFijos')

  const gastosVariablesA = calcSum(activeDataA, 'gastosVariables')
  const gastosVariablesB = calcSum(activeDataB, 'gastosVariables')

  const gastosMermaA = activeDataA.length > 0 ? calcSum(activeDataA, 'gastosMerma') : 0
  const gastosMermaB = activeDataB.length > 0 ? calcSum(activeDataB, 'gastosMerma') : 0

  const salariosA = calcSum(activeDataA, 'salario')
  const salariosB = calcSum(activeDataB, 'salario')

  const gastosTotalesA = calcSum(activeDataA, 'gastos') + gastosMermaA + salariosA
  const gastosTotalesB = calcSum(activeDataB, 'gastos') + gastosMermaB + salariosB

  const utilidadA = gananciaBrutaA - gastosTotalesA
  const utilidadB = gananciaBrutaB - gastosTotalesB

  const getDiffPct = (valA: number, valB: number) => {
    if (valA === 0) return valB > 0 ? '+100%' : '0%'
    const diff = ((valB - valA) / Math.abs(valA)) * 100
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="p-3.5 sm:p-5">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-indigo-600 flex-shrink-0" />
            <span>Comparativa de Rendimiento Financiero</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Período A */}
            <div className="p-3.5 sm:p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2.5">
              <h3 className="font-semibold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" /> Período A (Base)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] sm:text-xs text-slate-500 font-medium block mb-1">Mes</label>
                  <Select value={mesA.toString()} onValueChange={v => setMesA(parseInt(v))}>
                    <SelectTrigger className="h-9 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => (
                        <SelectItem key={m.value} value={m.value.toString()} className="text-xs">{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] sm:text-xs text-slate-500 font-medium block mb-1">Año</label>
                  <Select value={anioA.toString()} onValueChange={v => setAnioA(parseInt(v))}>
                    <SelectTrigger className="h-9 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                        <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Período B */}
            <div className="p-3.5 sm:p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2.5">
              <h3 className="font-semibold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-500 flex-shrink-0" /> Período B (Comparar)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] sm:text-xs text-slate-500 font-medium block mb-1">Mes</label>
                  <Select value={mesB.toString()} onValueChange={v => setMesB(parseInt(v))}>
                    <SelectTrigger className="h-9 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => (
                        <SelectItem key={m.value} value={m.value.toString()} className="text-xs">{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] sm:text-xs text-slate-500 font-medium block mb-1">Año</label>
                  <Select value={anioB.toString()} onValueChange={v => setAnioB(parseInt(v))}>
                    <SelectTrigger className="h-9 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                        <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleComparar}
            disabled={isLoading}
            className="w-full mt-3 sm:mt-4 h-10 sm:h-11 font-semibold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 shadow-xs"
          >
            {isLoading ? 'Generando Comparativa...' : 'Generar Comparativa'}
          </Button>
        </CardContent>
      </Card>

      {hasCompared && (
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="p-3.5 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">Resultados de la Comparativa</CardTitle>
                <span className="text-xs font-medium text-slate-500">
                  {MONTHS.find(m => m.value === mesA)?.label} {anioA} vs {MONTHS.find(m => m.value === mesB)?.label} {anioB}
                </span>
              </div>

              {/* Filtro Multi-Selección de Vendedores a Comparar */}
              {availableVendors.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 text-xs bg-white border-slate-300">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                      <span>
                        {selectedVendorIds.length === 0
                          ? `Todos los vendedores (${availableVendors.length})`
                          : `${selectedVendorIds.length} seleccionados`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3 bg-white shadow-lg border border-slate-200 z-50" align="end">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold text-slate-800">Filtrar Vendedores</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={selectAllVendors}
                            className="text-[11px] text-blue-600 hover:underline font-semibold"
                          >
                            Todos
                          </button>
                          <span className="text-slate-300 text-xs">|</span>
                          <button
                            type="button"
                            onClick={clearVendors}
                            className="text-[11px] text-slate-500 hover:underline font-semibold"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>
                      <Input
                        placeholder="Buscar vendedor..."
                        value={vendorSearchTerm}
                        onChange={(e) => setVendorSearchTerm(e.target.value)}
                        className="h-8 text-xs bg-slate-50"
                      />
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                        {availableVendors
                          .filter(v => v.nombre.toLowerCase().includes(vendorSearchTerm.toLowerCase()))
                          .map((v) => {
                            const isChecked = selectedVendorIds.includes(v.id);
                            return (
                              <label
                                key={v.id}
                                className="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded-md cursor-pointer text-xs"
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleVendor(v.id)}
                                />
                                <span className="flex-1 truncate font-medium text-slate-700">
                                  {v.nombre}
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Badges de vendedores seleccionados */}
            {selectedVendorIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t mt-2">
                <span className="text-[11px] font-semibold text-slate-500">Filtrando por:</span>
                {availableVendors.filter(v => selectedVendorIds.includes(v.id)).map(v => (
                  <Badge
                    key={v.id}
                    variant="secondary"
                    className="text-[11px] py-0.5 px-2 bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"
                  >
                    <span>{v.nombre}</span>
                    <button
                      type="button"
                      onClick={() => toggleVendor(v.id)}
                      className="hover:text-blue-900 ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <button
                  type="button"
                  onClick={clearVendors}
                  className="text-[11px] text-slate-500 hover:text-rose-600 underline ml-1"
                >
                  Comparar todos
                </button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0 sm:pt-0">
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <div className="min-w-[480px] space-y-1.5">
                <div className="grid grid-cols-4 gap-2 font-bold text-xs sm:text-sm bg-slate-100 p-2.5 sm:p-3 rounded-lg text-slate-700">
                  <div>Métrica</div>
                  <div className="text-right">{MONTHS.find(m => m.value === mesA)?.label} {anioA}</div>
                  <div className="text-right">{MONTHS.find(m => m.value === mesB)?.label} {anioB}</div>
                  <div className="text-center">Variación</div>
                </div>

                {[
                  { label: 'Venta Total', valA: totalVentaA, valB: totalVentaB, highlight: true },
                  { label: '  • Venta Efectivo', valA: totalEfectivoA, valB: totalEfectivoB },
                  { label: '  • Venta Transferencia', valA: totalTransferenciaA, valB: totalTransferenciaB },
                  { label: 'Ganancia Bruta', valA: gananciaBrutaA, valB: gananciaBrutaB, highlight: true },
                  { label: 'Gastos Fijos', valA: gastosFijosA, valB: gastosFijosB },
                  { label: 'Gastos Variables', valA: gastosVariablesA, valB: gastosVariablesB },
                  { label: 'Gastos Merma', valA: gastosMermaA, valB: gastosMermaB },
                  { label: 'Salarios', valA: salariosA, valB: salariosB },
                  { label: 'Gastos Totales', valA: gastosTotalesA, valB: gastosTotalesB, highlight: true },
                  { label: 'Utilidad Final', valA: utilidadA, valB: utilidadB, isProfit: true }
                ].map((row, idx) => {
                  const diffPct = getDiffPct(row.valA, row.valB)
                  const isPositive = row.valB >= row.valA
                  return (
                    <div key={idx} className={`grid grid-cols-4 gap-2 items-center p-2 sm:p-2.5 rounded-lg ${row.isProfit ? 'bg-emerald-50 font-bold border border-emerald-200' : row.highlight ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50/80'}`}>
                      <div className="text-xs sm:text-sm text-slate-800 truncate">{row.label}</div>
                      <div className="text-right text-xs sm:text-sm break-all">{formatCurrency(row.valA)}</div>
                      <div className="text-right text-xs sm:text-sm break-all">{formatCurrency(row.valB)}</div>
                      <div className="text-center text-[10px] sm:text-xs font-semibold">
                        <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-full ${isPositive ? (row.label.includes('Gastos') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700') : (row.label.includes('Gastos') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}`}>
                          {diffPct}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Desglose individual si hay vendedores seleccionados */}
            {selectedVendorIds.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 mb-3 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Desglose por Vendedor Seleccionado
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableVendors
                    .filter(v => selectedVendorIds.includes(v.id))
                    .map(v => {
                      const selA = dataA.find(d => d.vendedorId === v.id);
                      const selB = dataB.find(d => d.vendedorId === v.id);
                      const vA = selA ? selA.ventaTotal : 0;
                      const vB = selB ? selB.ventaTotal : 0;
                      const uA = selA ? selA.utilidadFinal : 0;
                      const uB = selB ? selB.utilidadFinal : 0;
                      const vDiff = getDiffPct(vA, vB);

                      return (
                        <div key={v.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-slate-800 truncate">{v.nombre}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${vB >= vA ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {vDiff}
                            </span>
                          </div>
                          <div className="text-[11px] grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Ventas Per. A:</span>
                              <span className="font-semibold text-slate-700">{formatCurrency(vA)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Ventas Per. B:</span>
                              <span className="font-semibold text-slate-700">{formatCurrency(vB)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Utilidad A:</span>
                              <span className={`font-semibold ${uA >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(uA)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Utilidad B:</span>
                              <span className={`font-semibold ${uB >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(uB)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
