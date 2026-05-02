'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Materia {
  id: number;
  nombre: string;
}

interface TemaFormProps {
  onSuccess?: () => void;
}

export default function TemaForm({ onSuccess }: TemaFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [formData, setFormData] = useState({
    materia_id: '',
    nombre: '',
    descripcion: '',
  });

  useEffect(() => {
    fetchMaterias();
  }, []);

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
      if (!formData.materia_id) {
        throw new Error('Selecciona una materia');
      }

      const { error: supabaseError } = await supabase
        .from('temas')
        .insert([
          {
            materia_id: parseInt(formData.materia_id),
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            activo: true,
          },
        ]);

      if (supabaseError) throw supabaseError;

      setSuccess(true);
      setFormData({ materia_id: '', nombre: '', descripcion: '' });
      
      setTimeout(() => setSuccess(false), 3000);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar tema');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          <option value="">Selecciona una materia...</option>
          {materias.map(materia => (
            <option key={materia.id} value={materia.id}>
              {materia.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Nombre del Tema/Lección *
        </label>
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          placeholder="Ej: Ecuaciones de segundo grado"
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Descripción
        </label>
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          placeholder="Descripción del tema..."
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
          ✓ Tema agregado exitosamente
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-600 text-white font-medium transition-colors"
      >
        {loading ? 'Agregando...' : 'Agregar Tema'}
      </button>
    </form>
  );
}
