"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "unimed.michel@gmail.com";

type EstadoValidacion = "pendiente" | "aprobado" | "rechazado";
type AccesoPlataforma = "activo" | "suspendido";
type TipoMensajeWhatsApp =
  | "aprobado"
  | "suspendido"
  | "reactivado"
  | "rechazado";

type AlumnoRegistro = {
  id: string;
  user_id: string | null;
  nombre_completo: string;
  whatsapp_alumno: string;
  contacto_principal: string;
  correo_electronico: string;
  usuario_alias: string;
  preparatoria_procedencia: string;
  carrera_deseada: string;
  campus_uabc_deseado: string;
  nombre_responsable_tutor: string | null;
  whatsapp_responsable_tutor: string | null;
  estado_validacion: EstadoValidacion;
  acceso_plataforma: AccesoPlataforma;
  sede: string | null;
  grupo_asignado: string | null;
  observaciones_internas: string | null;
  fecha_registro: string | null;
};

type EdicionRegistro = {
  sede: string;
  grupo_asignado: string;
  observaciones_internas: string;
};

export default function AdminRegistrosPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [revisandoSesion, setRevisandoSesion] = useState(true);

  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");

  const [alumnos, setAlumnos] = useState<AlumnoRegistro[]>([]);
  const [editando, setEditando] = useState<Record<string, EdicionRegistro>>({});

  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [whatsappPendiente, setWhatsappPendiente] = useState<{
    url: string;
    texto: string;
  } | null>(null);

  useEffect(() => {
    revisarSesion();
  }, []);

  async function revisarSesion() {
    setRevisandoSesion(true);
    setError("");

    const { data } = await supabase.auth.getSession();

    if (data.session) {
      const emailUsuario = data.session.user.email?.toLowerCase() || "";

      if (emailUsuario !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        setAutenticado(false);
        setError("No tienes permiso para acceder a este panel.");
        setRevisandoSesion(false);
        return;
      }

      setAutenticado(true);
      await cargarAlumnos();
    } else {
      setAutenticado(false);
    }

    setRevisandoSesion(false);
  }

  async function iniciarSesion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMensaje("");
    setCargando(true);

    const correoLogin = emailLogin.trim().toLowerCase();

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: correoLogin,
      password: passwordLogin,
    });

    if (loginError) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const emailUsuario = sessionData.session?.user.email?.toLowerCase() || "";

    if (emailUsuario !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      setError("No tienes permiso para acceder a este panel.");
      setCargando(false);
      return;
    }

    setAutenticado(true);
    await cargarAlumnos();
    setCargando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setAutenticado(false);
    setAlumnos([]);
    setEditando({});
    setMensaje("");
    setError("");
  }

  async function cargarAlumnos() {
    setCargando(true);
    setError("");
    setMensaje("");

    const { data, error: fetchError } = await supabase
      .from("alumnos_registro")
      .select("*")
      .order("fecha_registro", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setCargando(false);
      return;
    }

    const registros = (data ?? []) as AlumnoRegistro[];

    setAlumnos(registros);

    const ediciones: Record<string, EdicionRegistro> = {};

    registros.forEach((alumno) => {
      ediciones[alumno.id] = {
        sede: alumno.sede || "Sin asignar",
        grupo_asignado: alumno.grupo_asignado || "Sin asignar",
        observaciones_internas: alumno.observaciones_internas || "",
      };
    });

    setEditando(ediciones);
    setCargando(false);
  }

  const alumnosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return alumnos;

    return alumnos.filter((alumno) => {
      return [
        alumno.nombre_completo,
        alumno.whatsapp_alumno,
        alumno.correo_electronico,
        alumno.usuario_alias,
        alumno.preparatoria_procedencia,
        alumno.carrera_deseada,
        alumno.campus_uabc_deseado,
        alumno.sede || "",
        alumno.grupo_asignado || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [alumnos, busqueda]);

  function actualizarCampoEdicion(
    alumnoId: string,
    campo: keyof EdicionRegistro,
    valor: string
  ) {
    setEditando((prev) => ({
      ...prev,
      [alumnoId]: {
        ...prev[alumnoId],
        [campo]: valor,
      },
    }));
  }

  async function guardarCambiosAdministrativos(alumno: AlumnoRegistro) {
    const datos = editando[alumno.id];

    if (!datos) return;

    setGuardandoId(alumno.id);
    setError("");
    setMensaje("");

    const { data, error: updateError } = await supabase
      .from("alumnos_registro")
      .update({
        sede: datos.sede.trim() || "Sin asignar",
        grupo_asignado: datos.grupo_asignado.trim() || "Sin asignar",
        observaciones_internas: datos.observaciones_internas.trim() || null,
      })
      .eq("id", alumno.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setGuardandoId(null);
      return;
    }

    actualizarAlumnoLocal(data as AlumnoRegistro);
    setMensaje("Cambios administrativos guardados correctamente.");
    setGuardandoId(null);
  }

  async function aprobarAlumno(alumno: AlumnoRegistro) {
    const confirmar = window.confirm(
      `¿Aprobar el acceso de ${alumno.nombre_completo}?`
    );

    if (!confirmar) return;

    setGuardandoId(alumno.id);
    setError("");
    setMensaje("");

    const { data, error: updateError } = await supabase
      .from("alumnos_registro")
      .update({
        estado_validacion: "aprobado",
        acceso_plataforma: "activo",
      })
      .eq("id", alumno.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setGuardandoId(null);
      return;
    }

    const actualizado = data as AlumnoRegistro;

    actualizarAlumnoLocal(actualizado);
    setMensaje("Alumno aprobado correctamente.");
    abrirWhatsApp(actualizado, "aprobado");
    setGuardandoId(null);
  }

  async function rechazarAlumno(alumno: AlumnoRegistro) {
    const confirmar = window.confirm(
      `¿Rechazar el registro de ${alumno.nombre_completo}?`
    );

    if (!confirmar) return;

    setGuardandoId(alumno.id);
    setError("");
    setMensaje("");

    const { data, error: updateError } = await supabase
      .from("alumnos_registro")
      .update({
        estado_validacion: "rechazado",
        acceso_plataforma: "suspendido",
      })
      .eq("id", alumno.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setGuardandoId(null);
      return;
    }

    const actualizado = data as AlumnoRegistro;

    actualizarAlumnoLocal(actualizado);
    setMensaje("Registro rechazado correctamente.");
    abrirWhatsApp(actualizado, "rechazado");
    setGuardandoId(null);
  }

  async function suspenderAlumno(alumno: AlumnoRegistro) {
    const confirmar = window.confirm(
      `¿Suspender el acceso de ${alumno.nombre_completo}?`
    );

    if (!confirmar) return;

    setGuardandoId(alumno.id);
    setError("");
    setMensaje("");

    const { data, error: updateError } = await supabase
      .from("alumnos_registro")
      .update({
        acceso_plataforma: "suspendido",
      })
      .eq("id", alumno.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setGuardandoId(null);
      return;
    }

    const actualizado = data as AlumnoRegistro;

    actualizarAlumnoLocal(actualizado);
    setMensaje("Acceso suspendido correctamente.");
    abrirWhatsApp(actualizado, "suspendido");
    setGuardandoId(null);
  }

  async function reactivarAlumno(alumno: AlumnoRegistro) {
    const confirmar = window.confirm(
      `¿Reactivar el acceso de ${alumno.nombre_completo}?`
    );

    if (!confirmar) return;

    setGuardandoId(alumno.id);
    setError("");
    setMensaje("");

    const { data, error: updateError } = await supabase
      .from("alumnos_registro")
      .update({
        estado_validacion: "aprobado",
        acceso_plataforma: "activo",
      })
      .eq("id", alumno.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setGuardandoId(null);
      return;
    }

    const actualizado = data as AlumnoRegistro;

    actualizarAlumnoLocal(actualizado);
    setMensaje("Acceso reactivado correctamente.");
    abrirWhatsApp(actualizado, "reactivado");
    setGuardandoId(null);
  }

  function actualizarAlumnoLocal(alumnoActualizado: AlumnoRegistro) {
    setAlumnos((prev) =>
      prev.map((alumno) =>
        alumno.id === alumnoActualizado.id ? alumnoActualizado : alumno
      )
    );

    setEditando((prev) => ({
      ...prev,
      [alumnoActualizado.id]: {
        sede: alumnoActualizado.sede || "Sin asignar",
        grupo_asignado: alumnoActualizado.grupo_asignado || "Sin asignar",
        observaciones_internas:
          alumnoActualizado.observaciones_internas || "",
      },
    }));
  }

  function abrirWhatsApp(alumno: AlumnoRegistro, tipo: TipoMensajeWhatsApp) {
    const telefono = normalizarTelefonoWhatsApp(alumno.whatsapp_alumno);

    if (!telefono) {
      setError("No se encontró un número de WhatsApp válido para este alumno.");
      return;
    }

    const mensajeWhatsApp = crearMensajeWhatsApp(alumno, tipo);
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(
      mensajeWhatsApp
    )}`;

    setWhatsappPendiente({
      url,
      texto: `Abrir WhatsApp para ${alumno.nombre_completo}`,
    });

    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (revisandoSesion) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
          Revisando sesión...
        </div>
      </main>
    );
  }

  if (!autenticado) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h1 className="text-2xl font-bold">Panel de registros</h1>

          <p className="mt-2 text-sm text-slate-300">
            Inicia sesión para administrar los registros de alumnos.
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Acceso exclusivo para administración.
          </p>

          {error && <Alerta tipo="error" texto={error} />}

          <form onSubmit={iniciarSesion} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Correo electrónico
              </label>
              <input
                type="email"
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Contraseña
              </label>
              <input
                type="password"
                value={passwordLogin}
                onChange={(e) => setPasswordLogin(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                placeholder="Contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {cargando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Registros de alumnos UNIMED
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Revisa solicitudes, aprueba accesos, suspende alumnos y edita
                datos administrativos.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Sesión administrativa: {ADMIN_EMAIL}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={cargarAlumnos}
                disabled={cargando}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                {cargando ? "Cargando..." : "Actualizar"}
              </button>

              <button
                onClick={cerrarSesion}
                className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-950"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              placeholder="Buscar por nombre, WhatsApp, correo, carrera, campus, sede o grupo..."
            />

            <div className="text-sm text-slate-300">
              Total:{" "}
              <span className="font-semibold text-white">
                {alumnosFiltrados.length}
              </span>
            </div>
          </div>

          {mensaje && <Alerta tipo="success" texto={mensaje} />}
          {error && <Alerta tipo="error" texto={error} />}

          {whatsappPendiente && (
            <div className="mt-4 rounded-lg border border-green-600 bg-green-950 p-4 text-sm text-green-100">
              <p className="font-semibold">Aviso de WhatsApp preparado</p>
              <p className="mt-1">
                Si WhatsApp no se abrió automáticamente, usa este botón:
              </p>
              <a
                href={whatsappPendiente.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                {whatsappPendiente.texto}
              </a>
            </div>
          )}
        </section>

        <section className="space-y-4">
          {alumnosFiltrados.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
              No hay registros para mostrar.
            </div>
          )}

          {alumnosFiltrados.map((alumno) => (
            <article
              key={alumno.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">
                      {alumno.nombre_completo}
                    </h2>

                    <BadgeEstado
                      texto={alumno.estado_validacion}
                      tipo={alumno.estado_validacion}
                    />

                    <BadgeAcceso acceso={alumno.acceso_plataforma} />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <Dato titulo="WhatsApp" valor={alumno.whatsapp_alumno} />
                    <Dato titulo="Correo" valor={alumno.correo_electronico} />
                    <Dato
                      titulo="Usuario / alias"
                      valor={alumno.usuario_alias}
                    />
                    <Dato
                      titulo="Preparatoria"
                      valor={alumno.preparatoria_procedencia}
                    />
                    <Dato
                      titulo="Carrera deseada"
                      valor={alumno.carrera_deseada}
                    />
                    <Dato
                      titulo="Campus UABC"
                      valor={alumno.campus_uabc_deseado}
                    />
                    <Dato
                      titulo="Responsable / tutor"
                      valor={alumno.nombre_responsable_tutor || "No capturado"}
                    />
                    <Dato
                      titulo="WhatsApp responsable"
                      valor={
                        alumno.whatsapp_responsable_tutor || "No capturado"
                      }
                    />
                    <Dato
                      titulo="Fecha de registro"
                      valor={formatearFecha(alumno.fecha_registro)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <h3 className="font-semibold">Control administrativo</h3>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                        Sede
                      </label>
                      <input
                        type="text"
                        value={editando[alumno.id]?.sede || ""}
                        onChange={(e) =>
                          actualizarCampoEdicion(
                            alumno.id,
                            "sede",
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        placeholder="Ej. Mexicali"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                        Grupo asignado
                      </label>
                      <input
                        type="text"
                        value={editando[alumno.id]?.grupo_asignado || ""}
                        onChange={(e) =>
                          actualizarCampoEdicion(
                            alumno.id,
                            "grupo_asignado",
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        placeholder="Ej. Sábado 9 a.m."
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                        Observaciones internas
                      </label>
                      <textarea
                        value={
                          editando[alumno.id]?.observaciones_internas || ""
                        }
                        onChange={(e) =>
                          actualizarCampoEdicion(
                            alumno.id,
                            "observaciones_internas",
                            e.target.value
                          )
                        }
                        className="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        placeholder="Notas internas de administración..."
                      />
                    </div>

                    <button
                      onClick={() => guardarCambiosAdministrativos(alumno)}
                      disabled={guardandoId === alumno.id}
                      className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-500"
                    >
                      {guardandoId === alumno.id
                        ? "Guardando..."
                        : "Guardar sede, grupo y observaciones"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                <button
                  onClick={() => aprobarAlumno(alumno)}
                  disabled={guardandoId === alumno.id}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  Aprobar acceso
                </button>

                <button
                  onClick={() => suspenderAlumno(alumno)}
                  disabled={guardandoId === alumno.id}
                  className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-60"
                >
                  Suspender acceso
                </button>

                <button
                  onClick={() => reactivarAlumno(alumno)}
                  disabled={guardandoId === alumno.id}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  Reactivar acceso
                </button>

                <button
                  onClick={() => rechazarAlumno(alumno)}
                  disabled={guardandoId === alumno.id}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  Rechazar registro
                </button>

                <button
                  onClick={() => {
                    const tipo: TipoMensajeWhatsApp =
                      alumno.estado_validacion === "rechazado"
                        ? "rechazado"
                        : alumno.acceso_plataforma === "activo"
                        ? "aprobado"
                        : "suspendido";

                    abrirWhatsApp(alumno, tipo);
                  }}
                  className="rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-200 hover:bg-green-950"
                >
                  Abrir WhatsApp
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 break-words text-sm font-medium text-white">{valor}</p>
    </div>
  );
}

function Alerta({
  tipo,
  texto,
}: {
  tipo: "success" | "error";
  texto: string;
}) {
  const clases =
    tipo === "success"
      ? "border-green-500 bg-green-950 text-green-200"
      : "border-red-500 bg-red-950 text-red-200";

  return (
    <div className={`mt-4 rounded-lg border p-4 text-sm ${clases}`}>
      {texto}
    </div>
  );
}

function BadgeEstado({
  texto,
  tipo,
}: {
  texto: string;
  tipo: EstadoValidacion;
}) {
  const clases =
    tipo === "aprobado"
      ? "bg-green-950 text-green-200 border-green-700"
      : tipo === "rechazado"
      ? "bg-red-950 text-red-200 border-red-700"
      : "bg-yellow-950 text-yellow-200 border-yellow-700";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${clases}`}
    >
      Validación: {texto}
    </span>
  );
}

function BadgeAcceso({ acceso }: { acceso: AccesoPlataforma }) {
  const clases =
    acceso === "activo"
      ? "bg-blue-950 text-blue-200 border-blue-700"
      : "bg-slate-800 text-slate-200 border-slate-600";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${clases}`}
    >
      Acceso: {acceso}
    </span>
  );
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "Sin fecha";

  return new Date(fecha).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizarTelefonoWhatsApp(telefono: string) {
  const digitos = telefono.replace(/\D/g, "");

  if (!digitos) return "";

  if (digitos.startsWith("52") && digitos.length >= 12) {
    return digitos;
  }

  if (digitos.length === 10) {
    return `52${digitos}`;
  }

  return digitos;
}

function crearMensajeWhatsApp(
  alumno: AlumnoRegistro,
  tipo: TipoMensajeWhatsApp
) {
  const plataforma =
    typeof window !== "undefined" ? window.location.origin : "la plataforma";

  if (tipo === "aprobado") {
    return `Hola, ${alumno.nombre_completo}.

Tu acceso a la plataforma del curso UNIMED para examen de admisión a UABC ha sido aprobado.

Ya puedes ingresar con el correo y contraseña que registraste.

Plataforma:
${plataforma}

Si tienes algún problema para entrar, comunícate con administración.`;
  }

  if (tipo === "reactivado") {
    return `Hola, ${alumno.nombre_completo}.

Tu acceso a la plataforma del curso UNIMED para examen de admisión a UABC ha sido reactivado.

Ya puedes ingresar nuevamente con tu correo y contraseña registrados.

Plataforma:
${plataforma}

Si tienes algún problema para entrar, comunícate con administración.`;
  }

  if (tipo === "rechazado") {
    return `Hola, ${alumno.nombre_completo}.

Te informamos que tu registro para la plataforma del curso UNIMED para examen de admisión a UABC no fue aprobado por el momento.

Si consideras que hubo un error o necesitas más información, comunícate con administración.

Gracias por tu comprensión.`;
  }

  return `Hola, ${alumno.nombre_completo}.

Te informamos que tu acceso a la plataforma del curso UNIMED para examen de admisión a UABC ha sido suspendido temporalmente.

Tus datos, avances y resultados no se eliminarán.

Para revisar tu situación, comunícate con administración.`;
}