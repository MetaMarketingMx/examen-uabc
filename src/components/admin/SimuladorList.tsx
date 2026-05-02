'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Simulador {
  id: number;
  nombre: string;
  descripcion: string | null;
  materia_id: number | null;
  cantidad_preguntas: number;
  duracion_minutos: number;
  activo: boolean;
  created_at: string;
  materias?: { nombre: string };
}

interface SimuladorListProps {
  refreshTrigger?: number;
}

export default function SimuladorList({ refreshTrigger }: SimuladorListProps) {
  const [simuladores, setSimuladores] = useState<Simulador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSimuladores();
  }, [refreshTrigger]);

  const fetchSimuladores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('simuladores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching simuladores:', JSON.stringify(error));
        throw error;
      }
      setSimuladores(data || []);
    } catch (err) {
      console.error('Error fetching simuladores:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Cargando simuladores...</div>;
  }

  if (simuladores.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        No hay simuladores registrados aún
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {simuladores.map(simulador => (
        <div
          key={simulador.id}
          className="rounded-lg border border-slate-700 bg-slate-800 p-4 hover:border-sky-500/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="font-semibold text-white">{simulador.nombre}</h3>
              {simulador.materia_id && typeof simulador.materias === 'object' && (
                <p className="text-xs text-sky-400 mt-1">
                  Materia: {simulador.materias?.nombre}
                </p>
              )}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
              simulador.activo
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-700 text-slate-300'
            }`}>
              {simulador.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {simulador.descripcion && (
            <p className="text-sm text-slate-400 mb-3 line-clamp-2">
              {simulador.descripcion}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 rounded bg-slate-700/50">
              <p className="text-xs text-slate-400">Preguntas</p>
              <p className="font-semibold text-slate-200">{simulador.cantidad_preguntas}</p>
            </div>
            <div className="p-2 rounded bg-slate-700/50">
              <p className="text-xs text-slate-400">Duración</p>
              <p className="font-semibold text-slate-200">{simulador.duracion_minutos} min</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
