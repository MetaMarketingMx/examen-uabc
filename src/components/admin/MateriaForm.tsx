'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface MateriaFormProps {
  onSuccess?: () => void;
}

export default function MateriaForm({ onSuccess }: MateriaFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    orden: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'orden' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: supabaseError } = await supabase
        .from('materias')
        .insert([
          {
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            orden: formData.orden,
            activa: true,
          },
        ]);

      if (supabaseError) throw supabaseError;

      setSuccess(true);
      setFormData({ nombre: '', descripcion: '', orden: 0 });
      
      setTimeout(() => setSuccess(false), 3000);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar materia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Nombre de la Materia *
        </label>
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          placeholder="Ej: Matemáticas"
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
          placeholder="Descripción de la materia..."
          rows={3}
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Orden
        </label>
        <input
          type="number"
          name="orden"
          value={formData.orden}
          onChange={handleChange}
          min="0"
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/50 text-emerald-300 text-sm">
          ✓ Materia agregada exitosamente
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-600 text-white font-medium transition-colors"
      >
        {loading ? 'Agregando...' : 'Agregar Materia'}
      </button>
    </form>
  );
}
