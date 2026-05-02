'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ImageUpload from '@/components/ImageUpload';

interface Materia {
  id: number;
  nombre: string;
}

interface Tema {
  id: number;
  nombre: string;
}

interface PreguntaFormProps {
  onSuccess?: () => void;
  preguntaId?: number; // Para edición
}

export default function PreguntaFormMejora({ onSuccess, preguntaId }: PreguntaFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);

  const [formData, setFormData] = useState({
    materia_id: '',
    tema_id: '',
    texto_pregunta: '',
    imagen_pregunta: '',
    opcion_a: '',
    imagen_opcion_a: '',
    opcion_b: '',
    imagen_opcion_b: '',
    opcion_c: '',
    imagen_opcion_c: '',
    opcion_d: '',
    imagen_opcion_d: '',
    respuesta_correcta: 'A' as 'A' | 'B' | 'C' | 'D',
    explicacion: '',
    dificultad: 'media',
  });

  useEffect(() => {
    fetchMaterias();
  }, []);

  useEffect(() => {
    if (preguntaId) {
      fetchPregunta();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaId]);

  useEffect(() => {
    if (formData.materia_id) {
      fetchTemas(parseInt(formData.materia_id));
    }
  }, [formData.materia_id]);

  const fetchMaterias = async () => {
    try {
      const { data, error } = await supabase
        .from('materias')
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre');

      if (error) throw error;
      setMaterias(data || []);
    } catch (err) {
      console.error('Error fetching materias:', err);
    }
  };

  const fetchTemas = async (materiaId: number) => {
    try {
      const { data, error } = await supabase
        .from('temas')
        .select('id, nombre')
        .eq('materia_id', materiaId)
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setTemas(data || []);
    } catch (err) {
      console.error('Error fetching temas:', err);
    }
  };

  const fetchPregunta = async () => {
    if (!preguntaId) return;
    try {
      const { data, error } = await supabase
        .from('preguntas')
        .select('*')
        .eq('id', preguntaId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          materia_id: data.materia_id?.toString() || '',
          tema_id: data.tema_id?.toString() || '',
          texto_pregunta: data.texto_pregunta || '',
          imagen_pregunta: data.imagen_pregunta || '',
          opcion_a: data.opcion_a || '',
          imagen_opcion_a: data.imagen_opcion_a || '',
          opcion_b: data.opcion_b || '',
          imagen_opcion_b: data.imagen_opcion_b || '',
          opcion_c: data.opcion_c || '',
          imagen_opcion_c: data.imagen_opcion_c || '',
          opcion_d: data.opcion_d || '',
          imagen_opcion_d: data.imagen_opcion_d || '',
          respuesta_correcta: data.respuesta_correcta || 'A',
          explicacion: data.explicacion || '',
          dificultad: data.dificultad || 'media',
        });
        if (data.tema_id) {
          fetchTemas(data.materia_id);
        }
      }
    } catch {
      setError('Error al cargar la pregunta');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (field: keyof typeof formData) => (publicUrl: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: publicUrl || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validaciones
      if (!formData.materia_id || !formData.tema_id) {
        throw new Error('Selecciona materia y tema');
      }

      // Al menos una opción debe tener contenido (texto o imagen)
      const hasAtLeastOneOption = [
        formData.opcion_a || formData.imagen_opcion_a,
        formData.opcion_b || formData.imagen_opcion_b,
        formData.opcion_c || formData.imagen_opcion_c,
        formData.opcion_d || formData.imagen_opcion_d,
      ].some(Boolean);

      if (!hasAtLeastOneOption) {
        throw new Error('Al menos una opción debe tener texto o imagen');
      }

      // La pregunta debe tener al menos texto o imagen
      if (!formData.texto_pregunta && !formData.imagen_pregunta) {
        throw new Error('La pregunta debe tener texto o imagen');
      }

      const dataToSave = {
        materia_id: parseInt(formData.materia_id),
        tema_id: parseInt(formData.tema_id),
        texto_pregunta: formData.texto_pregunta || null,
        imagen_pregunta: formData.imagen_pregunta || null,
        opcion_a: formData.opcion_a || null,
        imagen_opcion_a: formData.imagen_opcion_a || null,
        opcion_b: formData.opcion_b || null,
        imagen_opcion_b: formData.imagen_opcion_b || null,
        opcion_c: formData.opcion_c || null,
        imagen_opcion_c: formData.imagen_opcion_c || null,
        opcion_d: formData.opcion_d || null,
        imagen_opcion_d: formData.imagen_opcion_d || null,
        respuesta_correcta: formData.respuesta_correcta,
        explicacion: formData.explicacion || null,
        dificultad: formData.dificultad,
        activa: true,
      };

      if (preguntaId) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('preguntas')
          .update(dataToSave)
          .eq('id', preguntaId);

        if (updateError) throw updateError;
      } else {
        // Crear
        const { error: insertError } = await supabase
          .from('preguntas')
          .insert([dataToSave]);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSuccess?.();

      // Reset form si es nuevo
      if (!preguntaId) {
        setFormData({
          materia_id: formData.materia_id,
          tema_id: '',
          texto_pregunta: '',
          imagen_pregunta: '',
          opcion_a: '',
          imagen_opcion_a: '',
          opcion_b: '',
          imagen_opcion_b: '',
          opcion_c: '',
          imagen_opcion_c: '',
          opcion_d: '',
          imagen_opcion_d: '',
          respuesta_correcta: 'A',
          explicacion: '',
          dificultad: 'media',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar pregunta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selecciones básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Materia *
          </label>
          <select
            name="materia_id"
            value={formData.materia_id}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">Selecciona materia...</option>
            {materias.map(materia => (
              <option key={materia.id} value={materia.id}>
                {materia.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tema *
          </label>
          <select
            name="tema_id"
            value={formData.tema_id}
            onChange={handleChange}
            required
            disabled={!formData.materia_id}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
          >
            <option value="">Selecciona tema...</option>
            {temas.map(tema => (
              <option key={tema.id} value={tema.id}>
                {tema.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PREGUNTA PRINCIPAL */}
      <div className="border-t border-slate-700 pt-6">
        <h3 className="text-base font-semibold text-sky-300 mb-4 flex items-center gap-2">
          <span>📝</span> Pregunta Principal
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Texto de la pregunta
            </label>
            <textarea
              name="texto_pregunta"
              value={formData.texto_pregunta}
              onChange={handleChange}
              placeholder="Escribe la pregunta (opcional)"
              rows={2}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <ImageUpload
            label="Imagen de la pregunta (opcional)"
            value={formData.imagen_pregunta}
            onChange={handleImageChange('imagen_pregunta')}
            folder="preguntas"
          />
        </div>
      </div>

      {/* OPCIONES */}
      <div className="border-t border-slate-700 pt-6">
        <h3 className="text-base font-semibold text-sky-300 mb-4 flex items-center gap-2">
          <span>🎯</span> Opciones de Respuesta
        </h3>

        <div className="space-y-6">
          {(['a', 'b', 'c', 'd'] as const).map((letter) => (
            <div
              key={letter}
              className={`p-4 rounded-lg border-2 ${
                formData.respuesta_correcta === letter.toUpperCase()
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-slate-300 uppercase">
                  Opción {letter.toUpperCase()}
                </label>
                <input
                  type="radio"
                  name="respuesta_correcta"
                  value={letter.toUpperCase()}
                  checked={formData.respuesta_correcta === letter.toUpperCase()}
                  onChange={handleChange}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  name={`opcion_${letter}`}
                  value={formData[`opcion_${letter}` as keyof typeof formData] as string}
                  onChange={handleChange}
                  placeholder={`Texto para opción ${letter.toUpperCase()} (opcional)`}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />

                <ImageUpload
                  label={`Imagen para opción ${letter.toUpperCase()} (opcional)`}
                  value={formData[`imagen_opcion_${letter}` as keyof typeof formData] as string}
                  onChange={handleImageChange(`imagen_opcion_${letter}` as keyof typeof formData)}
                  folder="opciones"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* METADATA */}
      <div className="border-t border-slate-700 pt-6">
        <h3 className="text-base font-semibold text-sky-300 mb-4 flex items-center gap-2">
          <span>ℹ️</span> Información Adicional
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Dificultad
            </label>
            <select
              name="dificultad"
              value={formData.dificultad}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
            >
              <option value="facil">Fácil</option>
              <option value="media">Media</option>
              <option value="dificil">Difícil</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Explicación de la respuesta correcta (opcional)
          </label>
          <textarea
            name="explicacion"
            value={formData.explicacion}
            onChange={handleChange}
            placeholder="Explica por qué esta es la respuesta correcta..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* ERRORES Y MENSAJES */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/50 text-emerald-300 text-sm">
          ✓ {preguntaId ? 'Pregunta actualizada' : 'Pregunta agregada'} exitosamente
        </div>
      )}

      {/* BOTÓN */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-600 text-white font-medium transition-colors"
      >
        {loading ? 'Guardando...' : preguntaId ? 'Actualizar Pregunta' : 'Agregar Pregunta'}
      </button>
    </form>
  );
}
