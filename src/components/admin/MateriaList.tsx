'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Materia {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activa: boolean;
  created_at: string;
}

interface MateriaListProps {
  refreshTrigger?: number;
}

export default function MateriaList({ refreshTrigger }: MateriaListProps) {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterias();
  }, [refreshTrigger]);

  const fetchMaterias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('materias')
        .select('*')
        .order('orden');

      if (error) throw error;
      setMaterias(data || []);
    } catch (err) {
      console.error('Error fetching materias:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Cargando materias...</div>;
  }

  if (materias.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        No hay materias registradas aún
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {materias.map(materia => (
        <div
          key={materia.id}
          className="rounded-lg border border-slate-700 bg-slate-800 p-4 hover:border-sky-500/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white truncate">{materia.nombre}</h3>
            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
              materia.activa 
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-700 text-slate-300'
            }`}>
              {materia.activa ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          {materia.descripcion && (
            <p className="text-sm text-slate-400 mt-2 line-clamp-2">
              {materia.descripcion}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-3">
            Creada: {new Date(materia.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
