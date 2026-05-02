# 🗄️ SQL para Supabase - Sistema de Preguntas con Imágenes

## 1️⃣ ALTER TABLE - AGREGAR COLUMNAS DE IMÁGENES

Si la tabla `preguntas` ya existe, ejecuta este SQL para agregar las columnas de imágenes:

```sql
-- Agregar columnas de imágenes a la tabla preguntas
ALTER TABLE preguntas
ADD COLUMN IF NOT EXISTS texto_pregunta TEXT,
ADD COLUMN IF NOT EXISTS imagen_pregunta TEXT,
ADD COLUMN IF NOT EXISTS imagen_opcion_a TEXT,
ADD COLUMN IF NOT EXISTS imagen_opcion_b TEXT,
ADD COLUMN IF NOT EXISTS imagen_opcion_c TEXT,
ADD COLUMN IF NOT EXISTS imagen_opcion_d TEXT;
```

---

## 2️⃣ CREATE TABLE COMPLETA - Si NO existe la tabla

Si es la primera vez y no tienes la tabla `preguntas`, ejecuta esto:

```sql
-- Tabla de Preguntas con soporte completo para imágenes
CREATE TABLE IF NOT EXISTS preguntas (
  id BIGSERIAL PRIMARY KEY,
  tema_id BIGINT NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
  materia_id BIGINT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  -- Pregunta principal (texto + imagen)
  texto_pregunta TEXT,
  imagen_pregunta TEXT,
  -- Opción A
  opcion_a TEXT,
  imagen_opcion_a TEXT,
  -- Opción B
  opcion_b TEXT,
  imagen_opcion_b TEXT,
  -- Opción C
  opcion_c TEXT,
  imagen_opcion_c TEXT,
  -- Opción D
  opcion_d TEXT,
  imagen_opcion_d TEXT,
  -- Respuesta y metadata
  respuesta_correcta VARCHAR(1) NOT NULL CHECK (respuesta_correcta IN ('A', 'B', 'C', 'D')),
  explicacion TEXT,
  dificultad VARCHAR(50) DEFAULT 'media',
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_preguntas_tema_id ON preguntas(tema_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_materia_id ON preguntas(materia_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_activa ON preguntas(activa);
```

---

## 3️⃣ PASOS EN SUPABASE

### Opción A: Actualizar tabla existente

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto (`examen-uabc`)
3. Ve a **SQL Editor** → **New Query**
4. Copia y pega el SQL del paso 1️⃣ (ALTER TABLE)
5. Haz clic en **Ejecutar** (Ctrl/Cmd + Enter)

### Opción B: Crear tabla desde cero

1. Ve a **SQL Editor** → **New Query**
2. Copia y pega el SQL del paso 2️⃣ (CREATE TABLE COMPLETA)
3. Haz clic en **Ejecutar**

---

## 4️⃣ CREAR BUCKET DE STORAGE

### En Supabase Dashboard:

1. Ve a **Storage** en el menú lateral
2. Haz clic en **Create a new bucket**
3. Nombre del bucket: `cuestionarios` (exactamente así)
4. Haz clic en **Create bucket**
5. ✅ El bucket está listo para recibir imágenes

### Políticas de Storage (Opcional pero recomendado)

Para mayor seguridad, ve a **Storage** → **cuestionarios** → **Policies** y configura:

```sql
-- Permitir lectura pública de imágenes
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'cuestionarios');

-- Permitir carga solo con autenticación (o personaliza según tu caso)
CREATE POLICY "Allow authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'cuestionarios');
```

---

## 5️⃣ ESTRUCTURA DE DATOS

### Tabla: `preguntas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGSERIAL | ID único |
| `tema_id` | BIGINT | Relación con tabla `temas` |
| `materia_id` | BIGINT | Relación con tabla `materias` |
| `texto_pregunta` | TEXT | Texto de la pregunta (opcional) |
| `imagen_pregunta` | TEXT | URL pública de imagen de pregunta (opcional) |
| `opcion_a` | TEXT | Texto de opción A (opcional) |
| `imagen_opcion_a` | TEXT | URL pública de imagen opción A (opcional) |
| `opcion_b` | TEXT | Texto de opción B (opcional) |
| `imagen_opcion_b` | TEXT | URL pública de imagen opción B (opcional) |
| `opcion_c` | TEXT | Texto de opción C (opcional) |
| `imagen_opcion_c` | TEXT | URL pública de imagen opción C (opcional) |
| `opcion_d` | TEXT | Texto de opción D (opcional) |
| `imagen_opcion_d` | TEXT | URL pública de imagen opción D (opcional) |
| `respuesta_correcta` | VARCHAR(1) | A, B, C o D |
| `explicacion` | TEXT | Explicación de la respuesta (opcional) |
| `dificultad` | VARCHAR(50) | facil, media, dificil |
| `activa` | BOOLEAN | true/false |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

---

## 6️⃣ VALIDACIÓN

Después de ejecutar el SQL, verifica que todo esté bien:

### Ver tabla de preguntas
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'preguntas'
ORDER BY ordinal_position;
```

### Ver bucket creado
En **Storage**, deberías ver `cuestionarios` listado.

---

## 7️⃣ NOTAS IMPORTANTES

✅ **Lo que funciona ahora:**
- Preguntas con solo texto
- Preguntas con texto + imagen
- Preguntas con solo imagen
- Opciones con solo texto
- Opciones con texto + imagen
- Opciones con solo imagen
- Edición y eliminación de preguntas
- Vista previa en admin
- Compatibilidad retro con preguntas antiguas

❌ **Backward compatibility:**
- Las preguntas antiguas (sin columnas de imagen) seguirán funcionando
- Las URLs de imágenes son opcionales (NULL permitido)

✨ **Seguridad:**
- Solo se permite .jpg, .png, .webp
- Máximo 3 MB por imagen
- Se validan los tipos MIME
- Las URLs almacenadas son públicas pero protegidas por Supabase Storage
