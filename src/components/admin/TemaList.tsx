'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Tema {
  id: number;
  materia_id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  materias?: { nombre: string };
}

interface TemaListProps {
  refreshTrigger?: number;
}

export default function TemaList({ refreshTrigger }: TemaListProps) {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemas();
  }, [refreshTrigger]);

  const fetchTemas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('temas')
        .select('*, materias(nombre)')
        .order('materia_id')
        .order('nombre');

      if (error) throw error;
      setTemas(data || []);
    } catch (err) {
      console.error('Error fetching temas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Cargando temas...</div>;
  }

  if (temas.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        No hay temas registrados aún
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {temas.map(tema => (
        <div
          key={tema.id}
          className="rounded-lg border border-slate-700 bg-slate-800 p-4 hover:border-sky-500/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white truncate">{tema.nombre}</h3>
              <p className="text-xs text-sky-400 mt-1">
                {typeof tema.materias === 'object' && tema.materias?.nombre}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
              tema.activo
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-700 text-slate-300'
            }`}>
              {tema.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          {tema.descripcion && (
            <p className="text-sm text-slate-400 mt-2 line-clamp-2">
              {tema.descripcion}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-3">
            Creado: {new Date(tema.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
