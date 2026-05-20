"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const PUNTOS_POR_SIMULADOR = 1000;
const PUNTOS_POR_PARCIAL = 350;
const PUNTOS_POR_SUBTEMA = 100;

type AlumnoRegistro = {
  id?: string | number;
  user_id?: string | null;
  nombre_completo?: string | null;
  correo_electronico?: string | null;
  alias?: string | null;
  usuario?: string | null;
  alias_publico?: string | null;
  nombre_usuario?: string | null;
  foto_perfil_url?: string | null;
  foto_url?: string | null;
  avatar_url?: string | null;
  imagen_perfil?: string | null;
};

type ResultadoSimulador = {
  id: string | number;
  alumno_id?: string | null;
  alumno_nombre?: string | null;
  alumno_alias?: string | null;
  alias_publico?: string | null;
  alias?: string | null;
  usuario?: string | null;
  simulador_id?: string | number | null;
  examen_nombre?: string | null;
  correctas?: number | null;
  total_preguntas?: number | null;
  puntaje_1300?: number | null;
  created_at?: string | null;
};

type ResultadoParcial = {
  id: string | number;
  alumno_id?: string | null;
  alumno_nombre?: string | null;
  alumno_alias?: string | null;
  alias_publico?: string | null;
  alias?: string | null;
  usuario?: string | null;
  parcial_id?: string | number | null;
  examen_nombre?: string | null;
  correctas?: number | null;
  total_preguntas?: number | null;
  calificacion?: number | null;
  created_at?: string | null;
};

type ProgresoSubtema = {
  id?: string | number;
  user_id?: string | null;
  alumno_id?: string | null;
  subtema_id?: string | number | null;
  id_subtema?: string | number | null;
  subtema?: string | number | null;
  terminado?: boolean | null;
  completado?: boolean | null;
  finalizado?: boolean | null;
  porcentaje?: number | null;
  progreso?: number | null;
  estado?: string | null;
  status?: string | null;
  fecha_terminado?: string | null;
  fecha_finalizado?: string | null;
  completed_at?: string | null;
  terminado_at?: string | null;
};

type RankingAlumno = {
  alumnoId: string;
  alias: string;
  fotoPerfilUrl: string;
  puntosTotal: number;
  puntosSimuladores: number;
  puntosParciales: number;
  puntosSubtemas: number;
  simuladoresCompletados: number;
  parcialesCompletados: number;
  subtemasTerminados: number;
};

export default function RankingGeneralCompetitivo() {
  const [cargando, setCargando] = useState(true);
  const [ranking, setRanking] = useState<RankingAlumno[]>([]);
  const [userIdActual, setUserIdActual] = useState<string | null>(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  useEffect(() => {
    cargarRankingGeneral();
  }, []);

  function normalizarId(valor: any) {
    return String(valor ?? "").trim();
  }

  function obtenerAliasAlumno(alumno?: AlumnoRegistro | null) {
    const alias = String(
      alumno?.alias ??
        alumno?.usuario ??
        alumno?.alias_publico ??
        alumno?.nombre_usuario ??
        ""
    ).trim();

    if (alias) return alias;

    const nombre = String(alumno?.nombre_completo ?? "").trim();

    if (nombre) return nombre;

    const correo = String(alumno?.correo_electronico ?? "").trim();

    if (correo) return correo.split("@")[0];

    return "Alumno";
  }

  function obtenerFotoAlumno(alumno?: AlumnoRegistro | null) {
    return String(
      alumno?.foto_perfil_url ??
        alumno?.foto_url ??
        alumno?.avatar_url ??
        alumno?.imagen_perfil ??
        ""
    ).trim();
  }

  function obtenerAliasDesdeResultado(
    resultado: ResultadoSimulador | ResultadoParcial
  ) {
    const alias = String(
      resultado.alias_publico ??
        resultado.alumno_alias ??
        resultado.alias ??
        resultado.usuario ??
        ""
    ).trim();

    if (alias) return alias;

    const nombre = String(resultado.alumno_nombre ?? "").trim();

    if (nombre && !nombre.includes("@")) return nombre;

    if (nombre.includes("@")) return nombre.split("@")[0];

    return "Alumno";
  }

  function obtenerClaveAlumnoDesdeResultado(
    resultado: ResultadoSimulador | ResultadoParcial
  ) {
    const alumnoId = normalizarId(resultado.alumno_id);

    if (alumnoId && alumnoId !== "sin-login") {
      return alumnoId;
    }

    return obtenerAliasDesdeResultado(resultado).toLowerCase();
  }

  function obtenerIdSimulador(resultado: ResultadoSimulador) {
    return normalizarId(resultado.simulador_id ?? resultado.examen_nombre);
  }

  function obtenerIdParcial(resultado: ResultadoParcial) {
    return normalizarId(resultado.parcial_id ?? resultado.examen_nombre);
  }

  function obtenerPorcentajeResultado(resultado: {
    correctas?: number | null;
    total_preguntas?: number | null;
    calificacion?: number | null;
  }) {
    const correctas = Number(resultado.correctas ?? 0);
    const total = Number(resultado.total_preguntas ?? 0);

    if (total > 0) {
      return Math.max(0, Math.min(1, correctas / total));
    }

    const calificacion = Number(resultado.calificacion ?? 0);

    if (calificacion > 0) {
      return Math.max(0, Math.min(1, calificacion / 100));
    }

    return 0;
  }

  function puntosSimulador(resultado: ResultadoSimulador) {
    return Math.round(
      obtenerPorcentajeResultado(resultado) * PUNTOS_POR_SIMULADOR
    );
  }

  function puntosParcial(resultado: ResultadoParcial) {
    return Math.round(
      obtenerPorcentajeResultado(resultado) * PUNTOS_POR_PARCIAL
    );
  }

  function esMejorSimulador(
    nuevo: ResultadoSimulador,
    actual: ResultadoSimulador
  ) {
    const puntosNuevo = puntosSimulador(nuevo);
    const puntosActual = puntosSimulador(actual);

    if (puntosNuevo !== puntosActual) return puntosNuevo > puntosActual;

    return (
      new Date(nuevo.created_at ?? 0).getTime() >
      new Date(actual.created_at ?? 0).getTime()
    );
  }

  function esMejorParcial(nuevo: ResultadoParcial, actual: ResultadoParcial) {
    const puntosNuevo = puntosParcial(nuevo);
    const puntosActual = puntosParcial(actual);

    if (puntosNuevo !== puntosActual) return puntosNuevo > puntosActual;

    return (
      new Date(nuevo.created_at ?? 0).getTime() >
      new Date(actual.created_at ?? 0).getTime()
    );
  }

  function estaSubtemaTerminado(item: ProgresoSubtema) {
    const estado = String(item.estado ?? item.status ?? "").toLowerCase();

    return (
      item.terminado === true ||
      item.completado === true ||
      item.finalizado === true ||
      Number(item.porcentaje ?? item.progreso ?? 0) >= 100 ||
      Boolean(item.fecha_terminado) ||
      Boolean(item.fecha_finalizado) ||
      Boolean(item.completed_at) ||
      Boolean(item.terminado_at) ||
      estado === "terminado" ||
      estado === "completado" ||
      estado === "finalizado"
    );
  }

  function obtenerIdSubtema(item: ProgresoSubtema) {
    return normalizarId(
      item.subtema_id ?? item.id_subtema ?? item.subtema ?? item.id
    );
  }

  function obtenerIniciales(alias: string) {
    const limpio = alias.trim();

    if (!limpio) return "AL";

    const partes = limpio.split(/\s+/).filter(Boolean);

    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return `${partes[0][0] ?? "A"}${partes[1][0] ?? "L"}`.toUpperCase();
  }

  async function cargarRankingGeneral() {
    setCargando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user ?? null;

    setUserIdActual(user?.id ?? null);

    const [alumnosRes, simuladoresRes, parcialesRes, progresoSubtemasRes] =
      await Promise.all([
        supabase.from("alumnos_registro").select("*"),
        supabase.from("resultados_simuladores").select("*"),
        supabase.from("resultados_parciales").select("*"),
        supabase.from("progreso_subtemas").select("*"),
      ]);

    if (alumnosRes.error) {
      console.warn("No se pudieron cargar alumnos:", alumnosRes.error);
    }

    if (simuladoresRes.error) {
      console.warn("No se pudieron cargar simuladores:", simuladoresRes.error);
    }

    if (parcialesRes.error) {
      console.warn("No se pudieron cargar parciales:", parcialesRes.error);
    }

    if (progresoSubtemasRes.error) {
      console.warn(
        "No se pudo cargar progreso de subtemas:",
        progresoSubtemasRes.error
      );
    }

    const alumnos = (alumnosRes.data ?? []) as AlumnoRegistro[];
    const resultadosSimuladores =
      (simuladoresRes.data ?? []) as ResultadoSimulador[];
    const resultadosParciales = (parcialesRes.data ?? []) as ResultadoParcial[];
    const progresoSubtemas = (progresoSubtemasRes.data ??
      []) as ProgresoSubtema[];

    const rankingMap = new Map<string, RankingAlumno>();

    function asegurarAlumno(alumnoId: string, alias: string, foto = "") {
      if (!rankingMap.has(alumnoId)) {
        rankingMap.set(alumnoId, {
          alumnoId,
          alias: alias || "Alumno",
          fotoPerfilUrl: foto || "",
          puntosTotal: 0,
          puntosSimuladores: 0,
          puntosParciales: 0,
          puntosSubtemas: 0,
          simuladoresCompletados: 0,
          parcialesCompletados: 0,
          subtemasTerminados: 0,
        });
      }

      const registro = rankingMap.get(alumnoId)!;

      if ((!registro.alias || registro.alias === "Alumno") && alias) {
        registro.alias = alias;
      }

      if (!registro.fotoPerfilUrl && foto) {
        registro.fotoPerfilUrl = foto;
      }

      return registro;
    }

    alumnos.forEach((alumno) => {
      const alumnoId = normalizarId(alumno.user_id ?? alumno.id);

      if (!alumnoId) return;

      asegurarAlumno(
        alumnoId,
        obtenerAliasAlumno(alumno),
        obtenerFotoAlumno(alumno)
      );
    });

    const mejoresSimuladores = new Map<string, ResultadoSimulador>();

    resultadosSimuladores.forEach((resultado) => {
      const alumnoId = obtenerClaveAlumnoDesdeResultado(resultado);
      const simuladorId = obtenerIdSimulador(resultado);

      if (!alumnoId || !simuladorId) return;

      asegurarAlumno(alumnoId, obtenerAliasDesdeResultado(resultado));

      const clave = `${alumnoId}::${simuladorId}`;
      const actual = mejoresSimuladores.get(clave);

      if (!actual || esMejorSimulador(resultado, actual)) {
        mejoresSimuladores.set(clave, resultado);
      }
    });

    mejoresSimuladores.forEach((resultado) => {
      const alumnoId = obtenerClaveAlumnoDesdeResultado(resultado);
      const alumno = asegurarAlumno(
        alumnoId,
        obtenerAliasDesdeResultado(resultado)
      );

      alumno.puntosSimuladores += puntosSimulador(resultado);
      alumno.simuladoresCompletados += 1;
    });

    const mejoresParciales = new Map<string, ResultadoParcial>();

    resultadosParciales.forEach((resultado) => {
      const alumnoId = obtenerClaveAlumnoDesdeResultado(resultado);
      const parcialId = obtenerIdParcial(resultado);

      if (!alumnoId || !parcialId) return;

      asegurarAlumno(alumnoId, obtenerAliasDesdeResultado(resultado));

      const clave = `${alumnoId}::${parcialId}`;
      const actual = mejoresParciales.get(clave);

      if (!actual || esMejorParcial(resultado, actual)) {
        mejoresParciales.set(clave, resultado);
      }
    });

    mejoresParciales.forEach((resultado) => {
      const alumnoId = obtenerClaveAlumnoDesdeResultado(resultado);
      const alumno = asegurarAlumno(
        alumnoId,
        obtenerAliasDesdeResultado(resultado)
      );

      alumno.puntosParciales += puntosParcial(resultado);
      alumno.parcialesCompletados += 1;
    });

    const subtemasTerminadosPorAlumno = new Map<string, Set<string>>();

    progresoSubtemas.forEach((item) => {
      if (!estaSubtemaTerminado(item)) return;

      const alumnoId = normalizarId(item.user_id ?? item.alumno_id);
      const subtemaId = obtenerIdSubtema(item);

      if (!alumnoId || !subtemaId) return;

      if (!subtemasTerminadosPorAlumno.has(alumnoId)) {
        subtemasTerminadosPorAlumno.set(alumnoId, new Set());
      }

      subtemasTerminadosPorAlumno.get(alumnoId)!.add(subtemaId);
    });

    subtemasTerminadosPorAlumno.forEach((subtemas, alumnoId) => {
      const alumno = asegurarAlumno(alumnoId, "Alumno");

      alumno.subtemasTerminados = subtemas.size;
      alumno.puntosSubtemas = subtemas.size * PUNTOS_POR_SUBTEMA;
    });

    const rankingFinal = Array.from(rankingMap.values())
      .map((alumno) => ({
        ...alumno,
        puntosTotal:
          alumno.puntosSimuladores +
          alumno.puntosParciales +
          alumno.puntosSubtemas,
      }))
      .filter((alumno) => alumno.puntosTotal > 0)
      .sort((a, b) => b.puntosTotal - a.puntosTotal);

    setRanking(rankingFinal);
    setCargando(false);
  }

  const lugarActual = useMemo(() => {
    if (!userIdActual) return null;

    const indice = ranking.findIndex(
      (alumno) => alumno.alumnoId === userIdActual
    );

    if (indice < 0) return null;

    return {
      lugar: indice + 1,
      alumno: ranking[indice],
      total: ranking.length,
    };
  }, [ranking, userIdActual]);

  const rankingVisible = mostrarTodos ? ranking : ranking.slice(0, 10);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-600">
            Ranking general competitivo 🏆
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-900">
            Tabla general de puntos 📊
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Se toma el mejor intento de cada simulador y parcial. Cada simulador
            puede dar hasta 1,000 pts, cada parcial hasta 350 pts y cada subtema
            terminado suma 100 pts.
          </p>
        </div>

        {lugarActual && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm shadow-sm">
            <p className="font-bold text-blue-700">Tu lugar actual 👑</p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              #{lugarActual.lugar}
              <span className="text-sm font-semibold text-slate-500">
                {" "}
                de {lugarActual.total}
              </span>
            </p>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
          Cargando ranking general...
        </div>
      ) : ranking.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
          Todavía no hay puntos suficientes para mostrar el ranking.
        </div>
      ) : (
        <>
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Lugar</th>
                    <th className="px-5 py-3">Alumno</th>
                    <th className="px-5 py-3 text-right">Total pts</th>
                    <th className="px-5 py-3 text-right">Simuladores</th>
                    <th className="px-5 py-3 text-right">Parciales</th>
                    <th className="px-5 py-3 text-right">Subtemas</th>
                  </tr>
                </thead>

                <tbody>
                  {rankingVisible.map((alumno, index) => {
                    const lugar = index + 1;
                    const esAlumnoActual = alumno.alumnoId === userIdActual;

                    return (
                      <tr
                        key={alumno.alumnoId}
                        className={`border-t border-slate-100 text-sm ${
                          esAlumnoActual ? "bg-blue-50" : "bg-white"
                        }`}
                      >
                        <td className="px-5 py-4">
                          <LugarCompetitivo lugar={lugar} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <AvatarRanking
                              fotoPerfilUrl={alumno.fotoPerfilUrl}
                              alias={alumno.alias}
                            />

                            <div className="min-w-0">
                              <p className="font-black text-slate-900">
                                {alumno.alias}
                                {esAlumnoActual && (
                                  <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                                    Tú
                                  </span>
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {alumno.simuladoresCompletados} simuladores ·{" "}
                                {alumno.parcialesCompletados} parciales ·{" "}
                                {alumno.subtemasTerminados} subtemas
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right text-base font-black text-slate-900">
                          {alumno.puntosTotal.toLocaleString("es-MX")}
                        </td>

                        <td className="px-5 py-4 text-right font-black text-blue-700">
                          {alumno.puntosSimuladores.toLocaleString("es-MX")}
                        </td>

                        <td className="px-5 py-4 text-right font-black text-violet-700">
                          {alumno.puntosParciales.toLocaleString("es-MX")}
                        </td>

                        <td className="px-5 py-4 text-right font-black text-emerald-700">
                          {alumno.puntosSubtemas.toLocaleString("es-MX")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {ranking.length > 10 && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setMostrarTodos((actual) => !actual)}
                className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                {mostrarTodos ? "Ver solo top 10" : "Ver tabla completa"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );

  function AvatarRanking({
    fotoPerfilUrl,
    alias,
  }: {
    fotoPerfilUrl: string;
    alias: string;
  }) {
    if (fotoPerfilUrl) {
      return (
        <img
          src={fotoPerfilUrl}
          alt={`Foto de ${alias}`}
          className="h-11 w-11 shrink-0 rounded-full object-cover ring-4 ring-blue-50"
        />
      );
    }

    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white ring-4 ring-blue-50">
        {obtenerIniciales(alias)}
      </div>
    );
  }
}

function LugarCompetitivo({ lugar }: { lugar: number }) {
  if (lugar === 1) {
    return (
      <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-amber-100 px-2 text-sm font-black text-amber-700 shadow-sm">
        🥇
      </span>
    );
  }

  if (lugar === 2) {
    return (
      <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-slate-200 px-2 text-sm font-black text-slate-700 shadow-sm">
        🥈
      </span>
    );
  }

  if (lugar === 3) {
    return (
      <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-orange-100 px-2 text-sm font-black text-orange-700 shadow-sm">
        🥉
      </span>
    );
  }

  return (
    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-slate-100 px-2 text-sm font-black text-slate-600">
      #{lugar}
    </span>
  );
}