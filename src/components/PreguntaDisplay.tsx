'use client';

import { useState } from 'react';

interface Pregunta {
  id: number;
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
  explicacion: string | null;
}

interface PreguntaDisplayProps {
  pregunta: Pregunta;
  onAnswer?: (respuesta: string) => void;
  mostrarRespuesta?: boolean;
  respuestaUsuario?: string;
}

export default function PreguntaDisplay({
  pregunta,
  onAnswer,
  mostrarRespuesta = false,
  respuestaUsuario,
}: PreguntaDisplayProps) {
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<string>('');

  const handleSelect = (opcion: 'A' | 'B' | 'C' | 'D') => {
    if (!mostrarRespuesta) {
      setRespuestaSeleccionada(opcion);
      onAnswer?.(opcion);
    }
  };

  const esCorrecta = (opcion: string) => opcion === pregunta.respuesta_correcta;

  const getOpcionContent = (letra: 'A' | 'B' | 'C' | 'D') => {
    const textKey = `opcion_${letra.toLowerCase()}`;
    const imageKey = `imagen_opcion_${letra.toLowerCase()}`;

    const text = pregunta[textKey as keyof Pregunta] as string | null;
    const image = pregunta[imageKey as keyof Pregunta] as string | null;

    return { text, image };
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-lg max-w-3xl mx-auto">
      {/* Pregunta Principal */}
      <div className="mb-8">
        {/* Texto */}
        {pregunta.texto_pregunta && (
          <h2 className="text-2xl font-bold text-white mb-4">
            {pregunta.texto_pregunta}
          </h2>
        )}

        {/* Imagen */}
        {pregunta.imagen_pregunta && (
          <div className="mb-4 rounded-xl overflow-hidden bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pregunta.imagen_pregunta}
              alt="Pregunta"
              className="w-full h-auto max-h-96 object-cover"
            />
          </div>
        )}
      </div>

      {/* Opciones */}
      <div className="space-y-3 mb-6">
        {(['A', 'B', 'C', 'D'] as const).map((letra) => {
          const { text, image } = getOpcionContent(letra);
          const isSelected = respuestaSeleccionada === letra;
          const isUserAnswer = respuestaUsuario === letra;
          const isCorrect = esCorrecta(letra);

          // Determinar colores
          let borderColor = 'border-slate-700';
          let bgColor = 'bg-slate-800/50 hover:bg-slate-800';
          let textColor = 'text-slate-200';

          if (mostrarRespuesta) {
            if (isCorrect) {
              borderColor = 'border-emerald-500';
              bgColor = 'bg-emerald-500/10';
              textColor = 'text-emerald-300';
            } else if (isUserAnswer && !isCorrect) {
              borderColor = 'border-red-500';
              bgColor = 'bg-red-500/10';
              textColor = 'text-red-300';
            } else {
              borderColor = 'border-slate-700';
              bgColor = 'bg-slate-800/50';
              textColor = 'text-slate-300';
            }
          } else {
            if (isSelected) {
              borderColor = 'border-sky-500';
              bgColor = 'bg-sky-500/20';
              textColor = 'text-slate-100';
            }
          }

          return (
            <button
              key={letra}
              onClick={() => handleSelect(letra)}
              disabled={mostrarRespuesta}
              className={`w-full text-left border-2 rounded-xl p-4 transition-all ${borderColor} ${bgColor} ${!mostrarRespuesta && 'cursor-pointer'}`}
            >
              {/* Header con letra */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  mostrarRespuesta && isCorrect ? 'bg-emerald-500 text-white' :
                  mostrarRespuesta && isUserAnswer && !isCorrect ? 'bg-red-500 text-white' :
                  isSelected && !mostrarRespuesta ? 'bg-sky-500 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {letra}
                </div>
                <span className={`text-sm font-semibold ${textColor}`}>
                  {mostrarRespuesta && isCorrect && '✓ Correcta'}
                  {mostrarRespuesta && isUserAnswer && !isCorrect && '✗ Incorrecta'}
                </span>
              </div>

              {/* Contenido */}
              <div className="ml-11 space-y-2">
                {/* Texto */}
                {text && (
                  <p className={`text-base ${textColor}`}>
                    {text}
                  </p>
                )}

                {/* Imagen */}
                {image && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`Opción ${letra}`}
                      className="w-full h-auto max-h-48 object-cover rounded-lg"
                    />
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explicación (solo si se muestra respuesta) */}
      {mostrarRespuesta && pregunta.explicacion && (
        <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-sm font-semibold text-blue-300 mb-2">💡 Explicación:</p>
          <p className="text-sm text-blue-100">
            {pregunta.explicacion}
          </p>
        </div>
      )}
    </div>
  );
}
