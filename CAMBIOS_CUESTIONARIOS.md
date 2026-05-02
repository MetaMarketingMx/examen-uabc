# 📋 Resumen de Cambios - Sistema de Cuestionarios con Imágenes

## 🎯 Objetivo Completado
Mejorar el sistema de cuestionarios del proyecto Next.js para permitir imágenes en preguntas y opciones, manteniendo compatibilidad con preguntas de solo texto.

---

## 📁 ARCHIVOS CREADOS (6 nuevos)

### 1. `src/lib/storage.ts` ⚙️
**Utilidades para manejar imágenes en Supabase Storage**

Funcionalidades:
- `uploadImageToStorage()` - Sube imagen a Storage con validación
- `deleteImageFromStorage()` - Elimina imagen de Storage
- Validación: JPG, PNG, WEBP | Máximo 3 MB
- Gestión de rutas y URLs públicas

```typescript
// Ejemplo de uso:
const result = await uploadImageToStorage(file, 'preguntas');
if (result.success) {
  const publicUrl = result.publicUrl; // URL para guardar en DB
}
```

---

### 2. `src/components/ImageUpload.tsx` 🖼️
**Componente reutilizable para subir y previsualizar imágenes**

Características:
- Drag & drop (click to upload)
- Preview en tiempo real
- Validación de tipo y tamaño
- Manejo de errores
- Botón para limpiar/cambiar imagen

Props:
```typescript
<ImageUpload
  label="Imagen de la pregunta"
  value={imageUrl}
  onChange={(url) => setImageUrl(url)}
  folder="preguntas" // 'preguntas' u 'opciones'
/>
```

---

### 3. `src/components/admin/PreguntaFormMejora.tsx` 📝
**Formulario mejorado de preguntas con soporte para imágenes**

Campos:
- ✅ Materia (selector)
- ✅ Tema (selector dinámico)
- ✅ Texto de pregunta (opcional)
- ✅ Imagen de pregunta (opcional)
- ✅ Para cada opción (A, B, C, D):
  - Texto (opcional)
  - Imagen (opcional)
- ✅ Respuesta correcta (radio buttons)
- ✅ Explicación (opcional)
- ✅ Dificultad (fácil, media, difícil)

Funcionalidades:
- Crear nuevas preguntas
- Editar preguntas existentes (si se pasa `preguntaId`)
- Validación: La pregunta debe tener texto o imagen
- Validación: Al menos una opción debe tener texto o imagen
- Preview de imágenes antes de guardar

---

### 4. `src/components/admin/PreguntaListMejora.tsx` 📊
**Lista mejorada con preview visual y acciones de editar/eliminar**

Características:
- Grid layout con preview de opciones
- Muestra dificultad y respuesta correcta
- Vista previa de imágenes en miniadura
- Botones: ✏️ Editar y 🗑️ Eliminar
- Eliminación de imágenes de Storage al borrar pregunta
- Muestra explicación si existe

Acciones:
- Click en ✏️ → Carga formulario con datos
- Click en 🗑️ → Elimina pregunta + imágenes

---

### 5. `src/components/PreguntaDisplay.tsx` 👨‍🎓
**Componente para mostrar preguntas a estudiantes**

Uso: En vistas de simulador, panel alumno, o cuestionarios

Características:
- Muestra pregunta con texto + imagen (si existe)
- Botones interactivos para seleccionar opción
- Muestra opciones con texto + imagen (flexible)
- Modo "mostrar respuesta" (readOnly)
- Resaltado de respuesta correcta e incorrecta
- Muestra explicación después de responder
- Responsive (mobile + desktop)

```typescript
<PreguntaDisplay
  pregunta={preguntaData}
  onAnswer={(respuesta) => guardarRespuesta(respuesta)}
  mostrarRespuesta={false}
/>
```

---

### 6. `SQL_SETUP.md` 🗄️
**Documentación con SQL necesario para ejecutar en Supabase**

Contenido:
- SQL para agregar columnas si la tabla ya existe
- SQL para crear tabla desde cero si es primera vez
- Instrucciones paso a paso en Supabase
- Pasos para crear bucket de Storage
- Políticas de Storage (seguridad)
- Validación de que todo esté bien

---

## 📝 ARCHIVOS MODIFICADOS (1 archivo)

### `src/app/admin/page.tsx` 🛠️
**Panel admin actualizado para usar nuevos componentes**

Cambios:
- Importa `PreguntaFormMejora` y `PreguntaListMejora`
- Añade estado `editandoPregunta` para modo edición
- Funciones: `handleEditPregunta()` y `handleCancelEdit()`
- Tab de "Preguntas" ahora muestra botón "Cancelar" cuando se edita
- Scroll automático al formulario al editar
- Se mantiene diseño anterior (tabs, 2 columnas, sticky form)

---

## 🗄️ CAMBIOS EN BASE DE DATOS

### Tabla: `preguntas` (nuevas columnas)

```sql
-- Columnas NUEVAS a agregar a la tabla existente:
texto_pregunta           TEXT
imagen_pregunta          TEXT
imagen_opcion_a          TEXT
imagen_opcion_b          TEXT
imagen_opcion_c          TEXT
imagen_opcion_d          TEXT

-- Columnas EXISTENTES que se mantienen:
id, tema_id, materia_id, opcion_a, opcion_b, opcion_c, opcion_d,
respuesta_correcta, explicacion, dificultad, activa, created_at, updated_at
```

### Bucket de Storage: `cuestionarios` (NUEVO)

```
Ruta: cuestionarios/
  ├─ preguntas/
  │  ├─ 1234567_abc.jpg     (imagen principal de pregunta)
  │  ├─ 1234568_def.png
  │  └─ ...
  └─ opciones/
     ├─ 1234569_ghi.webp    (imagen de opción)
     ├─ 1234570_jkl.jpg
     └─ ...
```

---

## 👥 USO DESDE EL ADMIN

### Crear pregunta CON imágenes:
1. Ir a /admin → Tab "Preguntas"
2. Seleccionar Materia y Tema
3. Ingresar texto de pregunta (o solo imagen)
4. Click en "Haz clic para seleccionar imagen" → Subir imagen
5. Ver preview inmediatamente
6. Para cada opción (A, B, C, D):
   - Ingresar texto (opcional)
   - Subir imagen (opcional)
7. Seleccionar respuesta correcta (radio button)
8. Ingresar explicación (opcional)
9. Click en "Agregar Pregunta"

### Editar pregunta:
1. En lista de preguntas, hacer click en ✏️
2. Formulario se carga con datos actuales
3. Modificar lo que necesites
4. Click en "Actualizar Pregunta"
5. Las imágenes antiguas se mantienen o puedes reemplazar

### Eliminar pregunta:
1. En lista de preguntas, hacer click en 🗑️
2. Confirmar eliminación
3. Automáticamente se eliminan:
   - La pregunta
   - Las imágenes de Supabase Storage
   - Las referencias en la base de datos

---

## 👨‍🎓 USO DESDE LA VISTA DEL ALUMNO

El componente `PreguntaDisplay` se puede usar en cualquier parte:

```tsx
import PreguntaDisplay from '@/components/PreguntaDisplay';

// En página de simulador o cuestionario:
{preguntas.map((pregunta) => (
  <PreguntaDisplay
    key={pregunta.id}
    pregunta={pregunta}
    onAnswer={(respuesta) => {
      // Guardar respuesta del alumno
      guardarRespuesta(pregunta.id, respuesta);
    }}
  />
))}
```

Características para el alumno:
- Ve pregunta con imagen (si existe)
- Ve opciones con imagen o texto
- Puede seleccionar una opción
- Botones cambian de color al seleccionar
- Después de responder: muestra si es correcta
- Muestra explicación
- Interfaz limpia y responsive

---

## 🔒 SEGURIDAD

✅ **Implementado:**
- Validación de tipos MIME (no acepta ejecutables)
- Límite de tamaño (3 MB máximo)
- URLs públicas desde Storage (protegidas por Supabase)
- No se usa service_role key en frontend
- Se usa cliente ya configurado: `src/lib/supabase.ts`
- .env.local NO fue modificado

---

## ⚙️ INSTALACIÓN / SETUP

### 1. Ejecutar SQL en Supabase
```bash
# Ver archivo: SQL_SETUP.md
# Copiar y ejecutar el SQL para:
# - Agregar columnas a tabla preguntas
# - O crear tabla desde cero
```

### 2. Crear Bucket de Storage
```bash
# En Supabase Dashboard:
# Storage → Create bucket → Nombre: "cuestionarios"
```

### 3. Iniciar servidor
```bash
npm run dev
```

### 4. Probar en admin
```bash
# Ir a: http://localhost:3000/admin
# Tab: Preguntas → Crear pregunta con imagen
```

---

## ✅ VERIFICACIÓN

```bash
# Compilación
npm run build        # ✅ Success
npm run lint         # ✅ No errors
npm run dev          # ✅ Runs successfully
```

### Testing después de setup:
- [ ] Crear pregunta con solo texto
- [ ] Crear pregunta con imagen
- [ ] Crear pregunta con texto + imagen
- [ ] Crear opción con solo texto
- [ ] Crear opción con imagen
- [ ] Crear opción con texto + imagen
- [ ] Ver preguntas en lista con previews
- [ ] Editar pregunta existente
- [ ] Eliminar pregunta (verifica que se eliminen imágenes)
- [ ] Ver pregunta desde componente PreguntaDisplay
- [ ] Verificar compatibilidad con preguntas antiguas

---

## 🎨 DISEÑO

- **Admin:** Tarjetas claras, previews inline, secciones bien definidas
- **Alumno:** Interfaz limpia, imágenes responsive, botones grandes
- **Colores:** Slate (fondo) + Sky (acciones) + Emerald (correcto) + Red (incorrecto)
- **Typography:** Tailwind CSS, responsive, accesible
- **Mobile:** Funciona perfectamente en celular

---

## 📊 ARCHIVOS FINALES

```
proyecto/
├── src/
│   ├── lib/
│   │   ├── supabase.ts (original)
│   │   └── storage.ts (NUEVO)
│   ├── components/
│   │   ├── ImageUpload.tsx (NUEVO)
│   │   ├── PreguntaDisplay.tsx (NUEVO)
│   │   └── admin/
│   │       ├── PreguntaFormMejora.tsx (NUEVO)
│   │       ├── PreguntaListMejora.tsx (NUEVO)
│   │       ├── PreguntaForm.tsx (antiguo, no se usa)
│   │       └── PreguntaList.tsx (antiguo, no se usa)
│   └── app/
│       └── admin/
│           └── page.tsx (MODIFICADO)
└── SQL_SETUP.md (NUEVO)
```

---

## 🚀 PRÓXIMOS PASOS (Opcionales)

1. Integrar `PreguntaDisplay` en `/simuladores` y `/panel-alumno`
2. Crear almacenamiento de respuestas del alumno
3. Agregar estadísticas (preguntas acertadas/fallidas)
4. Implementar autenticación en admin
5. Agregar búsqueda y filtros en lista de preguntas
6. Permitir reordenar preguntas o cambiar orden de opciones

---

## 📞 SOPORTE

Si algo no funciona:
1. Verifica que el bucket `cuestionarios` existe en Storage
2. Verifica que ejecutaste el SQL de alterar tabla
3. Revisa console.log en browser (F12 → Console)
4. Verifica que las imágenes sean .jpg, .png o .webp
5. Verifica que las imágenes sean menores a 3 MB
6. Revisa que NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY estén en `.env.local`
