'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { deleteImageFromStorage } from '@/lib/storage';

interface Pregunta {
  id: number;
  tema_id: number;
  materia_id: number;
  texto_pregunta: string | null;
  imagen_pregunta: string | null;
  opcion_a: string | null;
  imagen_opcion_a: string | null;
  opcion_b: string | null;
  imagen_opcion_b: string | null;
  opcion_c: string | null;
  imagen_opcion_c: string | null;
  opcion_d: string | null;
  imagen_opcion_d: string | null;
  respuesta_correcta: string;
  explicacion?: string | null;
  dificultad: string;
  activa: boolean;
  created_at: string;
  temas?: { nombre: string };
}

interface PreguntaListMejoraProps {
  refreshTrigger?: number;
  onEdit?: (pregunta: Pregunta) => void;
}

export default function PreguntaListMejora({ refreshTrigger, onEdit }: PreguntaListMejoraProps) {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchPreguntas();
  }, [refreshTrigger]);

  const fetchPreguntas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('preguntas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching preguntas:', JSON.stringify(error));
        throw error;
      }
      setPreguntas(data || []);
    } catch (err) {
      console.error('Error fetching preguntas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pregunta: Pregunta) => {
    if (!window.confirm('¿Eliminar esta pregunta?')) return;

    setDeletingId(pregunta.id);
    try {
      // Eliminar imágenes de Storage si existen
      const imagesToDelete = [
        pregunta.imagen_pregunta,
        pregunta.imagen_opcion_a,
        pregunta.imagen_opcion_b,
        pregunta.imagen_opcion_c,
        pregunta.imagen_opcion_d,
      ].filter(Boolean) as string[];

      for (const imageUrl of imagesToDelete) {
        // Extraer path de la URL pública
        const pathMatch = imageUrl.match(/cuestionarios\/(.+)$/);
        if (pathMatch) {
          await deleteImageFromStorage(`cuestionarios/${pathMatch[1]}`);
        }
      }

      // Eliminar pregunta
      const { error } = await supabase
        .from('preguntas')
        .delete()
        .eq('id', pregunta.id);

      if (error) throw error;

      setPreguntas(preguntas.filter(p => p.id !== pregunta.id));
    } catch (err) {
      alert('Error al eliminar pregunta');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

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
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getDificultadColor(pregunta.dificultad)}`}>
                  {pregunta.dificultad}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-sky-500/20 text-sky-300">
                  Respuesta: {pregunta.respuesta_correcta}
                </span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <button
                onClick={() => onEdit?.(pregunta)}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDelete(pregunta)}
                disabled={deletingId === pregunta.id}
                className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {deletingId === pregunta.id ? '...' : '🗑️'}
              </button>
            </div>
          </div>

          {/* Pregunta principal */}
          <div className="mb-4">
            {pregunta.texto_pregunta && (
              <p className="text-sm font-semibold text-slate-200 mb-2">
                {pregunta.texto_pregunta}
              </p>
            )}
            {pregunta.imagen_pregunta && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pregunta.imagen_pregunta}
                alt="Pregunta"
                className="w-full max-h-32 object-cover rounded-lg mb-2"
              />
            )}
            {typeof pregunta.temas === 'object' && (
              <p className="text-xs text-sky-400">
                Tema: {pregunta.temas?.nombre}
              </p>
            )}
          </div>

          {/* Opciones */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(['a', 'b', 'c', 'd'] as const).map((letter) => {
              const textKey = `opcion_${letter}` as keyof Pregunta;
              const imageKey = `imagen_opcion_${letter}` as keyof Pregunta;
              const text = pregunta[textKey] as string | null;
              const image = pregunta[imageKey] as string | null;
              const isCorrect = pregunta.respuesta_correcta === letter.toUpperCase();

              return (
                <div
                  key={letter}
                  className={`p-2 rounded-lg border ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-700/30'
                  }`}
                >
                  <p className={`font-semibold ${isCorrect ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {letter.toUpperCase()}
                  </p>
                  {text && <p className="text-slate-200 line-clamp-2">{text}</p>}
                  {image && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={`Opción ${letter}`}
                        className="w-full h-16 object-cover rounded mt-1"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Explicación */}
          {pregunta.explicacion && (
            <div className="mt-3 p-2 rounded-lg bg-slate-900/50 border border-slate-700">
              <p className="text-xs text-slate-300">
                <span className="font-semibold">Explicación:</span> {pregunta.explicacion}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
