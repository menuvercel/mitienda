'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, Trash2, Percent, Calendar } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { GastoVendedor, Vendedor } from '@/types'

interface GastosVendedorDialogProps {
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
  vendedor: VendedorConSalario | null
}

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

interface VendedorConSalario extends Vendedor {
  salario?: number;
}

export default function GastosVendedorDialog({ isOpen, onClose, onRefresh, vendedor }: GastosVendedorDialogProps) {
  const [activeTab, setActiveTab] = useState<'gastos' | 'salario'>('gastos')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [gastos, setGastos] = useState<GastoVendedor[]>([])
  const [newGasto, setNewGasto] = useState({ nombre: '', valor: '' })
  const [salaryPercentage, setSalaryPercentage] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && vendedor) {
      loadExpenses()
      loadSalary()
    }
  }, [isOpen, vendedor, selectedMonth, selectedYear, activeTab])

  useEffect(() => {
    if (isOpen && activeTab === 'salario' && vendedor) {
      loadSalary()
    }
  }, [isOpen, activeTab, vendedor])

  const loadExpenses = async () => {
    if (!vendedor) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/gastos-vendedores?vendedorId=${vendedor.id}&mes=${selectedMonth}&anio=${selectedYear}`
      )
      if (response.ok) {
        const data = await response.json()
        setGastos(data.map((item: any) => ({
          id: item.id.toString(),
          vendedor_id: item.vendedor_id.toString(),
          nombre: item.nombre,
          valor: parseFloat(item.valor),
          mes: item.mes,
          anio: item.anio
        })))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadSalary = async () => {
    if (!vendedor) return

    try {
      // Make API call to get current salary
      const response = await fetch(`/api/usuarios/salario?vendedorId=${vendedor.id}`)
      if (response.ok) {
        const data = await response.json()
        const salary = parseFloat(data.salario) || 0
        setSalaryPercentage(salary)
        console.log('Loaded salary for seller', vendedor.id, ':', salary)
      } else {
        console.log('Failed to load salary, setting to 0')
        setSalaryPercentage(0)
      }
    } catch (error) {
      console.error('Error loading salary:', error)
      setSalaryPercentage(0)
    }
  }

  const handleAddGasto = async () => {
    if (!newGasto.nombre.trim() || !newGasto.valor || parseFloat(newGasto.valor) <= 0) {
      toast({
        title: "Error",
        description: "El nombre y el valor son obligatorios y el valor debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/gastos-vendedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedorId: vendedor?.id,
          nombre: newGasto.nombre.trim(),
          valor: parseFloat(newGasto.valor),
          mes: selectedMonth,
          anio: selectedYear
        })
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Gasto agregado correctamente",
        })
        setNewGasto({ nombre: '', valor: '' })
        loadExpenses()
      } else {
        throw new Error('Failed to add expense')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el gasto",
        variant: "destructive",
      })
    }
  }

  const handleDeleteGasto = async (gasto: GastoVendedor) => {
    try {
      const response = await fetch(
        `/api/gastos-vendedores?vendedorId=${gasto.vendedor_id}&nombre=${encodeURIComponent(gasto.nombre)}&mes=${gasto.mes}&anio=${gasto.anio}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Gasto eliminado correctamente",
        })
        loadExpenses()
      } else {
        throw new Error('Failed to delete expense')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el gasto",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSalary = async () => {
    if (salaryPercentage < 0 || salaryPercentage > 100) {
      toast({
        title: "Error",
        description: "El porcentaje debe estar entre 0 y 100",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/usuarios/salario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedorId: vendedor?.id,
          salario: salaryPercentage
        })
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Salario actualizado correctamente",
        })
        // Refresh the parent component to show updated salary
        onClose()
        onRefresh()
      } else {
        throw new Error('Failed to update salary')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el salario",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CU', {
      style: 'currency',
      currency: 'CUP',
      minimumFractionDigits: 2
    }).format(value)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Gestión de Gastos y Salario - {vendedor?.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <Button
            variant={activeTab === 'gastos' ? 'default' : 'outline'}
            onClick={() => setActiveTab('gastos')}
            className="flex-1"
          >
            Gastos Mensuales
          </Button>
          <Button
            variant={activeTab === 'salario' ? 'default' : 'outline'}
            onClick={() => setActiveTab('salario')}
            className="flex-1"
          >
            Salario
          </Button>
        </div>

        {activeTab === 'gastos' && (
          <div className="flex-1 overflow-auto">
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Label htmlFor="month">Mes</Label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="year">Año</Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Agregar Nuevo Gasto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Nombre del gasto (ej: renta, servicios, etc.)"
                      value={newGasto.nombre}
                      onChange={(e) => setNewGasto({ ...newGasto, nombre: e.target.value })}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Valor"
                      value={newGasto.valor}
                      onChange={(e) => setNewGasto({ ...newGasto, valor: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddGasto} disabled={isLoading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Gastos de {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">Cargando...</div>
                ) : gastos.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No hay gastos registrados para este mes
                  </div>
                ) : (
                  <div className="space-y-2">
                    {gastos.map((gasto) => (
                      <div
                        key={`${gasto.nombre}-${gasto.mes}-${gasto.anio}`}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{gasto.nombre}</div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(gasto.valor)}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que deseas eliminar el gasto &quot;{gasto.nombre}&quot;?
                              </AlertDialogDescription>

                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteGasto(gasto)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'salario' && (
          <div className="flex-1 overflow-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuración de Salario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="salary-percentage">
                      Porcentaje de Salario sobre Ventas (%)
                    </Label>
                    <div className="text-sm text-gray-600 bg-blue-50 px-2 py-1 rounded">
                      Actual: {salaryPercentage}%
                    </div>
                  </div>
                  <Input
                    id="salary-percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={salaryPercentage}
                    onChange={(e) => setSalaryPercentage(parseFloat(e.target.value) || 0)}
                    placeholder="Ej: 10.5"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Este porcentaje se aplicará al total de ventas del período seleccionado
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Ejemplo de cálculo:</h4>
                  <div className="text-sm text-gray-600">
                    <p>Si las ventas del período son: {formatCurrency(10000)}</p>
                    <p>Con salario del {salaryPercentage}%:</p>
                    <p className="font-medium">
                      Salario = {formatCurrency(10000)} × {salaryPercentage}% = {formatCurrency((10000 * salaryPercentage) / 100)}
                    </p>
                  </div>
                </div>

                <Button onClick={handleUpdateSalary} className="w-full">
                  Actualizar Salario
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}