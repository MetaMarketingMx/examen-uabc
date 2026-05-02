'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Resultado {
  id: number;
  tipo: string;
  puntaje: number | null;
  materia_id: number | null;
  simulador_id: number | null;
  duracion_segundos: number | null;
  respuestas_correctas: number | null;
  total_preguntas: number | null;
  created_at: string;
  materias?: { nombre: string };
  simuladores?: { nombre: string };
}

interface ResultadoListProps {
  refreshTrigger?: number;
}

export default function ResultadoList({ refreshTrigger }: ResultadoListProps) {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResultados();
  }, [refreshTrigger]);

  const fetchResultados = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resultados')
        .select('*, materias(nombre), simuladores(nombre)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setResultados(data || []);
    } catch (err) {
      console.error('Error fetching resultados:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'simulador':
        return 'bg-purple-500/20 text-purple-300';
      case 'parcial':
        return 'bg-blue-500/20 text-blue-300';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  if (loading) {
    return <div className="text-slate-400">Cargando resultados...</div>;
  }

  if (resultados.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        No hay resultados registrados aún
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resultados.map(resultado => (
        <div
          key={resultado.id}
          className="rounded-lg border border-slate-700 bg-slate-800 p-4 hover:border-sky-500/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getTipoColor(resultado.tipo)}`}>
                  {resultado.tipo}
                </span>
                {resultado.simulador_id && typeof resultado.simuladores === 'object' && (
                  <span className="text-sm text-slate-300">
                    {resultado.simuladores?.nombre}
                  </span>
                )}
              </div>
              {resultado.materia_id && typeof resultado.materias === 'object' && (
                <p className="text-xs text-sky-400 mt-1">
                  Materia: {resultado.materias?.nombre}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-400">
                {resultado.puntaje ?? '—'}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(resultado.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {resultado.respuestas_correctas !== null && resultado.total_preguntas !== null && (
            <div className="mt-2 p-2 rounded bg-slate-700/50">
              <p className="text-xs text-slate-400">
                Aciertos: {resultado.respuestas_correctas}/{resultado.total_preguntas}
              </p>
            </div>
          )}

          {resultado.duracion_segundos !== null && (
            <p className="text-xs text-slate-500 mt-2">
              Duración: {Math.floor(resultado.duracion_segundos / 60)} min
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
