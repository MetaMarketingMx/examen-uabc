'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Pregunta {
  id: number;
  tema_id: number;
  materia_id: number;
  enunciado: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: string;
  dificultad: string;
  activa: boolean;
  created_at: string;
  temas?: { nombre: string };
}

interface PreguntaListProps {
  refreshTrigger?: number;
}

export default function PreguntaList({ refreshTrigger }: PreguntaListProps) {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPreguntas = async () => {
    try {
      setLoading(true);
      const query = supabase
        .from('preguntas')
        .select('*, temas(nombre)')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setPreguntas(data || []);
    } catch (err) {
      console.error('Error fetching preguntas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreguntas();
  }, [refreshTrigger]);

  const getDificultadColor = (dificultad: string) => {
    switch (dificultad) {
      case 'facil':
        return 'bg-emerald-500/20 text-emerald-300';
      case 'dificil':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-yellow-500/20 text-yellow-300';
    }
  };

  if (loading) {
    return <div className="text-slate-400">Cargando preguntas...</div>;
  }

  if (preguntas.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        No hay preguntas registradas aún
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {preguntas.map(pregunta => (
        <div
          key={pregunta.id}
          className="rounded-lg border border-slate-700 bg-slate-800 p-4 hover:border-sky-500/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1">
              <p className="font-semibold text-white">
                {pregunta.enunciado}
              </p>
              <p className="text-xs text-sky-400 mt-1">
                Tema: {typeof pregunta.temas === 'object' && pregunta.temas?.nombre}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getDificultadColor(pregunta.dificultad)}`}>
                {pregunta.dificultad}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                pregunta.activa
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {pregunta.activa ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className={`p-2 rounded ${pregunta.respuesta_correcta === 'A' ? 'bg-emerald-500/10 border border-emerald-500/50' : 'bg-slate-700/50'}`}>
              <span className="text-xs text-slate-400">A: </span>
              <span className="text-slate-200">{pregunta.opcion_a}</span>
            </div>
            <div className={`p-2 rounded ${pregunta.respuesta_correcta === 'B' ? 'bg-emerald-500/10 border border-emerald-500/50' : 'bg-slate-700/50'}`}>
              <span className="text-xs text-slate-400">B: </span>
              <span className="text-slate-200">{pregunta.opcion_b}</span>
            </div>
            <div className={`p-2 rounded ${pregunta.respuesta_correcta === 'C' ? 'bg-emerald-500/10 border border-emerald-500/50' : 'bg-slate-700/50'}`}>
              <span className="text-xs text-slate-400">C: </span>
              <span className="text-slate-200">{pregunta.opcion_c}</span>
            </div>
            <div className={`p-2 rounded ${pregunta.respuesta_correcta === 'D' ? 'bg-emerald-500/10 border border-emerald-500/50' : 'bg-slate-700/50'}`}>
              <span className="text-xs text-slate-400">D: </span>
              <span className="text-slate-200">{pregunta.opcion_d}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
