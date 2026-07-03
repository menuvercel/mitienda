# Documentación de Integración: API para App Móvil de Escaneo y Ventas

Esta documentación detalla la infraestructura, endpoints, autenticación y flujo de datos del proyecto **MiTienda** para permitir que la aplicación móvil de escaneo de códigos de barra y ventas se conecte e integre correctamente.

---

## 🚀 1. Arquitectura y Autenticación

### Base URL
Todas las peticiones deben dirigirse al host donde esté desplegado el proyecto:
- **Desarrollo:** `http://localhost:3000`
- **Producción:** `https://mitienda-cuba.com` o el dominio configurado.

### CORS y Cabeceras
El backend (desarrollado en Next.js) cuenta con un middleware que restringe y valida las cabeceras CORS. Al hacer peticiones desde la app móvil, asegúrate de incluir:
- `Content-Type: application/json`
- `Authorization: Bearer <TOKEN>` (para endpoints que lo requieran)

---

## 🔐 2. Autenticación de Usuarios (Vendedores)

Antes de realizar cualquier operación de ventas, la aplicación móvil debe autenticar al vendedor para obtener su token JWT y su ID único (`vendedorId`).

### Login de Vendedor
* **Ruta:** `POST /api/auth/login`
* **Autenticación:** Pública (No requiere cabecera Bearer).
* **Cuerpo de la Petición (`body` en formato JSON):**
```json
{
  "nombre": "nombre_usuario",
  "password": "contrasena_usuario"
}
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "id": "1",
  "nombre": "Juan Perez",
  "rol": "vendedor",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibm9tYnJlIjoianVhbiIs..."
}
```
> 💡 **Nota:** Guarda el `id` devuelto como el `vendedorId` de la sesión y el `token` para enviarlo en las cabeceras `Authorization: Bearer <token>` si se requiere realizar llamadas autenticadas.

---

## 📦 3. Sincronización de Catálogo e Inventario

Para poder escanear en offline o buscar productos asignados al vendedor logueado, la app debe consultar el inventario asignado a ese vendedor. En la base de datos, el stock de cada producto está individualizado por vendedor en la tabla `usuario_productos`.

### Obtener Productos Asignados al Vendedor
* **Ruta:** `GET /api/users/productos/[vendedorId]` (Reemplazar `[vendedorId]` por el ID del vendedor autenticado).
* **Autenticación:** Recomendable usar cabecera `Authorization`.
* **Respuesta Exitosa (`200 OK`):**
Devuelve una lista con los productos que el vendedor tiene asignados, su stock actual y los códigos de barra correspondientes.

```json
[
  {
    "id": 15,
    "nombre": "Camiseta Deportiva Nike",
    "precio": 25.00,
    "precio_compra": 15.00,
    "foto": "https://url-del-blob.com/foto.jpg",
    "tiene_parametros": true,
    "valor_compra_usd": 15.00,
    "precio_compra_usd": 15.00,
    "precio_venta_usd": 25.00,
    "codigo_barras": null,
    "cantidad": 10,
    "parametros": [
      {
        "nombre": "Talla M / Azul",
        "cantidad": 4,
        "foto": "",
        "codigo_barras": "7501234567890"
      },
      {
        "nombre": "Talla L / Rojo",
        "cantidad": 6,
        "foto": "",
        "codigo_barras": "7501234567891"
      }
    ]
  },
  {
    "id": 18,
    "nombre": "Refresco Cola 350ml",
    "precio": 1.50,
    "precio_compra": 0.80,
    "foto": "https://url-del-blob.com/refresco.jpg",
    "tiene_parametros": false,
    "valor_compra_usd": 0.80,
    "precio_compra_usd": 0.80,
    "precio_venta_usd": 1.50,
    "codigo_barras": "7509876543210",
    "cantidad": 50
  }
]
```

### ⚠️ Reglas Importantes de Modelado de Productos:
1. **Productos Sin Parámetros (`tiene_parametros: false`):**
   * El código de barras se encuentra a nivel raíz en la propiedad `codigo_barras`.
   * El stock disponible está en la propiedad raíz `cantidad`.
2. **Productos Con Parámetros (`tiene_parametros: true`):**
   * El código de barras a nivel raíz puede ser `null` o estar vacío.
   * La app debe buscar en la lista de `parametros` el elemento que coincida con el código de barras escaneado (cada parámetro tiene su propio `codigo_barras` y su propia `cantidad` que representa el stock de esa variante).

---

## 🛒 4. Procesamiento y Envío de Ventas

Cuando un vendedor escanea un código de barras y confirma la transacción, la app móvil debe enviar la venta al servidor.

### Registrar Venta (Crear Transacción)
* **Ruta:** `POST /api/ventas`
* **Estructura del Cuerpo (`body`):**
```json
{
  "productoId": 18,
  "cantidad": 2,
  "fecha": "2026-06-07T13:40:48.000Z",
  "vendedorId": 1,
  "parametros": null
}
```

* **Estructura del Cuerpo para Producto con Parámetros/Variantes:**
Si el producto escaneado tiene variantes (`tiene_parametros: true`), debes especificar en el array de `parametros` el nombre del parámetro vendido y su respectiva cantidad:
```json
{
  "productoId": 15,
  "cantidad": 1,
  "fecha": "2026-06-07T13:40:48.000Z",
  "vendedorId": 1,
  "parametros": [
    {
      "nombre": "Talla M / Azul",
      "cantidad": 1
    }
  ]
}
```

* **Respuesta Exitosa (`200 OK`):**
```json
{
  "id": 124,
  "producto": 15,
  "cantidad": 1,
  "precio_unitario": 25.00,
  "precio_compra": 15.00,
  "total": 25.00,
  "vendedor": 1,
  "fecha": "2026-06-07T17:40:48.000Z"
}
```

### Errores Comunes de Validación del Servidor:
* **`400 Bad Request`:**
  * `{"error": "Faltan datos requeridos"}` - Falta alguno de los campos clave.
  * `{"error": "Stock insuficiente"}` - El vendedor no tiene stock suficiente para cubrir la cantidad solicitada.
  * `{"error": "Stock insuficiente para el parámetro <nombre>"}` - Stock insuficiente en la variante específica seleccionada.
* **`404 Not Found`:**
  * `{"error": "Producto no encontrado o no asignado al vendedor"}` - El producto no está asignado al vendedor especificado en `usuario_productos`.

---

## 🔍 5. Flujo de Trabajo Sugerido para la Aplicación Móvil

```
[Inicio de Sesión] 
       │
       ▼
[GET /api/users/productos/:vendedorId] 
       │
   (Almacenar catálogo y stock en memoria o base de datos local SQLite/Room)
       │
       ▼
[Modo Escaneo Activo] ── Escanea Código de Barras ────┐
       │                                             │
       │                                             ▼
       │                     ┌──────────────────────────────────────────────┐
       │                     │ Buscar en catálogo local:                    │
       │                     │ 1. Si producto.codigo_barras == scan         │
       │                     │ 2. O si producto.parametros.codigo_barras    │
       │                     │    coincide con scan.                        │
       │                     └──────────────────────┬───────────────────────┘
       │                                            │
       │                                            ▼
       │                             [¿Producto Encontrado?]
       │                               /                  \
       │                             Sí                  No
       │                            /                      \
       ▼                           ▼                        ▼
[Mostrar Detalles] ──> [Ingresar Cantidad]        [Mostrar Error/No Registrado]
                                   │
                                   ▼
                     [¿Stock Local Suficiente?]
                       /                  \
                     Sí                  No (Error: "Stock Insuficiente")
                    /
                   ▼
       [Confirmar Venta]
                   │
                   ▼
         [POST /api/ventas] ─── Exitoso ───> Actualizar stock localmente
```

---

## 🛠️ 6. Endpoint Auxiliar de Verificación de Código de Barras

Si la aplicación móvil permite dar de alta o asignar nuevos códigos de barras a productos ya existentes, se puede usar este endpoint para validar si un código ya está asignado en la base de datos principal.

### Verificar Existencia de Código
* **Ruta:** `GET /api/productos/verificar-barcode?barcode=[codigo]`
* **Respuesta (`200 OK`):**
```json
{
  "exists": true
}
```
* O si el código está libre:
```json
{
  "exists": false
}
```
