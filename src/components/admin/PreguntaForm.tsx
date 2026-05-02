'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
}

export default function PreguntaForm({ onSuccess }: PreguntaFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [formData, setFormData] = useState({
    materia_id: '',
    tema_id: '',
    enunciado: '',
    opcion_a: '',
    opcion_b: '',
    opcion_c: '',
    opcion_d: '',
    respuesta_correcta: 'A',
    explicacion: '',
    dificultad: 'media',
  });

  useEffect(() => {
    fetchMaterias();
  }, []);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!formData.materia_id || !formData.tema_id) {
        throw new Error('Selecciona materia y tema');
      }

      if (!formData.enunciado.trim()) {
        throw new Error('Ingresa el enunciado');
      }

      if (!formData.opcion_a.trim() || !formData.opcion_b.trim() || 
          !formData.opcion_c.trim() || !formData.opcion_d.trim()) {
        throw new Error('Todas las opciones son requeridas');
      }

      const { error: supabaseError } = await supabase
        .from('preguntas')
        .insert([
          {
            materia_id: parseInt(formData.materia_id),
            tema_id: parseInt(formData.tema_id),
            enunciado: formData.enunciado,
            opcion_a: formData.opcion_a,
            opcion_b: formData.opcion_b,
            opcion_c: formData.opcion_c,
            opcion_d: formData.opcion_d,
            respuesta_correcta: formData.respuesta_correcta,
            explicacion: formData.explicacion || null,
            dificultad: formData.dificultad,
            activa: true,
          },
        ]);

      if (supabaseError) throw supabaseError;

      setSuccess(true);
      setFormData({
        materia_id: formData.materia_id,
        tema_id: formData.tema_id,
        enunciado: '',
        opcion_a: '',
        opcion_b: '',
        opcion_c: '',
        opcion_d: '',
        respuesta_correcta: 'A',
        explicacion: '',
        dificultad: 'media',
      });
      
      setTimeout(() => setSuccess(false), 3000);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar pregunta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Enunciado de la Pregunta *
        </label>
        <textarea
          name="enunciado"
          value={formData.enunciado}
          onChange={handleChange}
          required
          placeholder="Escribe la pregunta..."
          rows={3}
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-300">Opciones de Respuesta *</p>
        
        {['a', 'b', 'c', 'd'].map((letter) => (
          <div key={letter}>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">
              Opción {letter.toUpperCase()}
            </label>
            <input
              type="text"
              name={`opcion_${letter}`}
              value={formData[`opcion_${letter}` as keyof typeof formData]}
              onChange={handleChange}
              required
              placeholder={`Escribe la opción ${letter.toUpperCase()}...`}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Respuesta Correcta *
          </label>
          <select
            name="respuesta_correcta"
            value={formData.respuesta_correcta}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>

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
          Explicación (Opcional)
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

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/50 text-emerald-300 text-sm">
          ✓ Pregunta agregada exitosamente
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-600 text-white font-medium transition-colors"
      >
        {loading ? 'Agregando...' : 'Agregar Pregunta'}
      </button>
    </form>
  );
}
