"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type RegistroFormData = {
  nombre_completo: string;
  whatsapp_alumno: string;
  correo_electronico: string;
  usuario_alias: string;
  password: string;
  confirmar_password: string;
  preparatoria_procedencia: string;
  carrera_deseada: string;
  campus_uabc_deseado: string;
  nombre_responsable_tutor: string;
  whatsapp_responsable_tutor: string;
};

type EtapaRegistro = "formulario" | "revision" | "enviado";

const datosIniciales: RegistroFormData = {
  nombre_completo: "",
  whatsapp_alumno: "",
  correo_electronico: "",
  usuario_alias: "",
  password: "",
  confirmar_password: "",
  preparatoria_procedencia: "",
  carrera_deseada: "",
  campus_uabc_deseado: "Mexicali",
  nombre_responsable_tutor: "",
  whatsapp_responsable_tutor: "",
};

export default function RegistroAlumnoPage() {
  const [formData, setFormData] = useState<RegistroFormData>(datosIniciales);
  const [registroEnviado, setRegistroEnviado] =
    useState<RegistroFormData | null>(null);

  const [etapa, setEtapa] = useState<EtapaRegistro>("formulario");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const passwordEscrita = formData.password.trim().length > 0;
  const confirmacionEscrita = formData.confirmar_password.trim().length > 0;
  const passwordsCoinciden =
    passwordEscrita &&
    confirmacionEscrita &&
    formData.password === formData.confirmar_password;

  const mostrarAvisoPassword = passwordEscrita || confirmacionEscrita;

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validarFormulario() {
    if (
      !formData.nombre_completo.trim() ||
      !formData.whatsapp_alumno.trim() ||
      !formData.correo_electronico.trim() ||
      !formData.usuario_alias.trim() ||
      !formData.password.trim() ||
      !formData.confirmar_password.trim() ||
      !formData.preparatoria_procedencia.trim() ||
      !formData.carrera_deseada.trim() ||
      !formData.campus_uabc_deseado.trim()
    ) {
      return "Por favor completa todos los campos obligatorios.";
    }

    if (formData.password.trim().length < 6) {
      return "La contraseña debe tener mínimo 6 caracteres.";
    }

    if (formData.password !== formData.confirmar_password) {
      return "Las contraseñas no coinciden. Revisa la contraseña y su confirmación.";
    }

    return "";
  }

  function handleRevisarDatos(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setError(errorValidacion);
      setMensaje("");
      return;
    }

    setError("");
    setMensaje("");
    setEtapa("revision");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmarEnvio() {
    if (loading) return;

    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setError(errorValidacion);
      setEtapa("formulario");
      return;
    }

    setLoading(true);
    setMensaje("");
    setError("");

    try {
      const correoNormalizado = formData.correo_electronico
        .trim()
        .toLowerCase();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: correoNormalizado,
        password: formData.password.trim(),
      });

      if (authError) {
        if (authError.message.includes("For security purposes")) {
          setError(
            "Por seguridad, Supabase bloqueó temporalmente los intentos seguidos. Espera un minuto y vuelve a intentarlo."
          );
        } else if (authError.message.toLowerCase().includes("rate limit")) {
          setError(
            "Supabase bloqueó temporalmente los registros por varios intentos seguidos. Espera unos minutos y vuelve a intentarlo."
          );
        } else {
          setError(authError.message);
        }

        setLoading(false);
        return;
      }

      const userId = authData.user?.id ?? null;

      const { error: insertError } = await supabase
        .from("alumnos_registro")
        .insert({
          user_id: userId,

          nombre_completo: formData.nombre_completo.trim(),
          whatsapp_alumno: formData.whatsapp_alumno.trim(),

          contacto_principal: "alumno",

          correo_electronico: correoNormalizado,
          usuario_alias: formData.usuario_alias.trim(),

          preparatoria_procedencia:
            formData.preparatoria_procedencia.trim(),
          carrera_deseada: formData.carrera_deseada.trim(),
          campus_uabc_deseado: formData.campus_uabc_deseado,

          nombre_responsable_tutor:
            formData.nombre_responsable_tutor.trim() || null,
          whatsapp_responsable_tutor:
            formData.whatsapp_responsable_tutor.trim() || null,

          estado_validacion: "pendiente",
          acceso_plataforma: "suspendido",
          sede: "Sin asignar",
          grupo_asignado: "Sin asignar",
          observaciones_internas: null,
        });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      setRegistroEnviado({
        ...formData,
        correo_electronico: correoNormalizado,
      });

      setMensaje(
        "Tu registro fue recibido correctamente. Nuestro equipo revisará tu información y te notificará por WhatsApp cuando tu acceso a la plataforma sea aprobado."
      );

      setEtapa("enviado");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Ocurrió un error inesperado al enviar el registro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-96px)] bg-[#f6f8fc] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 p-7 text-white sm:p-8">
            <div className="relative z-10">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                Plataforma académica
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {etapa === "formulario" && "Registro de alumno"}
                {etapa === "revision" && "Revisa tus datos"}
                {etapa === "enviado" && "Registro enviado"}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
                {etapa === "formulario" &&
                  "Completa tus datos para solicitar acceso a la plataforma del curso de admisión a UABC."}
                {etapa === "revision" &&
                  "Verifica que la información sea correcta antes de enviar tu solicitud."}
                {etapa === "enviado" &&
                  "Tu solicitud quedó pendiente de revisión por administración."}
              </p>
            </div>

            <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 left-80 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute right-16 top-10 h-8 w-8 rotate-12 rounded-xl bg-emerald-300/50" />
          </div>

          <div className="p-6 sm:p-7">
            {etapa === "formulario" && (
              <>
                {error && <Alerta tipo="error" texto={error} />}

                <form onSubmit={handleRevisarDatos} className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Datos del alumno
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Información principal para crear y validar la cuenta.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <CampoTexto
                        label="Nombre completo *"
                        name="nombre_completo"
                        value={formData.nombre_completo}
                        onChange={handleChange}
                        placeholder="Ej. Juan Pérez López"
                      />

                      <CampoTexto
                        label="WhatsApp del alumno *"
                        name="whatsapp_alumno"
                        value={formData.whatsapp_alumno}
                        onChange={handleChange}
                        placeholder="Ej. 6861234567"
                      />

                      <CampoTexto
                        label="Correo electrónico *"
                        name="correo_electronico"
                        type="email"
                        value={formData.correo_electronico}
                        onChange={handleChange}
                        placeholder="correo@ejemplo.com"
                      />

                      <CampoTexto
                        label="Nombre de usuario / alias *"
                        name="usuario_alias"
                        value={formData.usuario_alias}
                        onChange={handleChange}
                        placeholder="Ej. juanperez"
                      />

                      <CampoTexto
                        label="Contraseña *"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Mínimo 6 caracteres"
                      />

                      <div>
                        <CampoTexto
                          label="Confirmar contraseña *"
                          name="confirmar_password"
                          type="password"
                          value={formData.confirmar_password}
                          onChange={handleChange}
                          placeholder="Repite tu contraseña"
                        />

                        {mostrarAvisoPassword && (
                          <div
                            className={`mt-2 rounded-2xl border px-4 py-3 text-xs font-semibold ${
                              passwordsCoinciden
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-red-200 bg-red-50 text-red-700"
                            }`}
                          >
                            {passwordsCoinciden
                              ? "✓ Las contraseñas coinciden."
                              : "Las contraseñas todavía no coinciden."}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Datos académicos
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Datos necesarios para ubicar tu preparación y carrera
                      objetivo.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <CampoTexto
                        label="Preparatoria de procedencia *"
                        name="preparatoria_procedencia"
                        value={formData.preparatoria_procedencia}
                        onChange={handleChange}
                        placeholder="Ej. COBACH, CBTIS, Preparatoria Federal..."
                      />

                      <CampoTexto
                        label="Carrera a la que quiere ingresar *"
                        name="carrera_deseada"
                        value={formData.carrera_deseada}
                        onChange={handleChange}
                        placeholder="Ej. Medicina, Derecho, Ingeniería..."
                      />

                      <div>
                        <label className="text-sm font-semibold text-slate-700">
                          Campus UABC deseado *
                        </label>

                        <select
                          name="campus_uabc_deseado"
                          value={formData.campus_uabc_deseado}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                        >
                          <option value="Mexicali">Mexicali</option>
                          <option value="Tijuana">Tijuana</option>
                          <option value="Ensenada">Ensenada</option>
                          <option value="Valle de las Palmas">
                            Valle de las Palmas
                          </option>
                          <option value="Tecate">Tecate</option>
                          <option value="Rosarito">Rosarito</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Responsable o tutor
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Este apartado es opcional, pero ayuda para avisos
                      importantes o alumnos menores de edad.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <CampoTexto
                        label="Nombre del responsable/tutor"
                        name="nombre_responsable_tutor"
                        value={formData.nombre_responsable_tutor}
                        onChange={handleChange}
                        placeholder="Opcional"
                      />

                      <CampoTexto
                        label="WhatsApp del responsable/tutor"
                        name="whatsapp_responsable_tutor"
                        value={formData.whatsapp_responsable_tutor}
                        onChange={handleChange}
                        placeholder="Opcional"
                      />
                    </div>
                  </section>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                  >
                    Revisar datos antes de enviar
                  </button>
                </form>
              </>
            )}

            {etapa === "revision" && (
              <>
                {error && <Alerta tipo="error" texto={error} />}

                <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-semibold text-amber-800">
                    Antes de enviar
                  </p>

                  <p className="mt-2 text-sm leading-6 text-amber-700">
                    Revisa cuidadosamente la información. Si necesitas cambiar
                    algo, puedes regresar a editar.
                  </p>
                </div>

                <ResumenRegistro datos={formData} />

                <div className="mt-8 grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEtapa("formulario");
                      setError("");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={loading}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Editar datos
                  </button>

                  <button
                    type="button"
                    onClick={confirmarEnvio}
                    disabled={loading}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? "Enviando registro..."
                      : "Confirmar y enviar registro"}
                  </button>
                </div>
              </>
            )}

            {etapa === "enviado" && registroEnviado && (
              <>
                {mensaje && <Alerta tipo="success" texto={mensaje} />}

                <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-blue-700">
                    Importante
                  </p>

                  <p className="mt-2 text-sm leading-6 text-blue-700">
                    Aún no tienes acceso activo. Administración revisará tu
                    registro y te avisará por WhatsApp cuando tu acceso sea
                    aprobado.
                  </p>
                </div>

                <ResumenRegistro datos={registroEnviado} ocultarPassword />

                <p className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  Puedes cerrar esta página. No es necesario llenar el
                  formulario otra vez.
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function CampoTexto({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400"
      />
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
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`mb-5 rounded-2xl border p-4 text-sm leading-6 ${clases}`}>
      {texto}
    </div>
  );
}

function ResumenRegistro({
  datos,
  ocultarPassword = false,
}: {
  datos: RegistroFormData;
  ocultarPassword?: boolean;
}) {
  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Datos del alumno
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
          <FilaResumen titulo="Nombre completo" valor={datos.nombre_completo} />
          <FilaResumen
            titulo="WhatsApp del alumno"
            valor={datos.whatsapp_alumno}
          />
          <FilaResumen
            titulo="Correo electrónico"
            valor={datos.correo_electronico}
          />
          <FilaResumen
            titulo="Nombre de usuario / alias"
            valor={datos.usuario_alias}
          />
          <FilaResumen
            titulo="Contraseña"
            valor={ocultarPassword ? "Registrada correctamente" : "Configurada"}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Datos académicos
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
          <FilaResumen
            titulo="Preparatoria de procedencia"
            valor={datos.preparatoria_procedencia}
          />
          <FilaResumen
            titulo="Carrera a la que quiere ingresar"
            valor={datos.carrera_deseada}
          />
          <FilaResumen
            titulo="Campus UABC deseado"
            valor={datos.campus_uabc_deseado}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Responsable o tutor
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
          <FilaResumen
            titulo="Nombre del responsable/tutor"
            valor={datos.nombre_responsable_tutor || "No capturado"}
          />
          <FilaResumen
            titulo="WhatsApp del responsable/tutor"
            valor={datos.whatsapp_responsable_tutor || "No capturado"}
          />
        </div>
      </section>
    </div>
  );
}

function FilaResumen({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {valor}
      </p>
    </div>
  );
}