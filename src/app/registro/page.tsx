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
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        {etapa === "formulario" && (
          <>
            <h1 className="mb-2 text-2xl font-bold">Registro de alumno</h1>

            <p className="mb-6 text-sm text-slate-300">
              Completa tus datos para solicitar acceso a la plataforma del curso
              de admisión UABC.
            </p>

            {error && <Alerta tipo="error" texto={error} />}

            <form onSubmit={handleRevisarDatos} className="space-y-8">
              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  Datos del alumno
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
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
                        className={`mt-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                          passwordsCoinciden
                            ? "border-green-600 bg-green-950 text-green-200"
                            : "border-red-600 bg-red-950 text-red-200"
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

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  Datos académicos
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
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
                    <label className="mb-1 block text-sm font-medium text-slate-200">
                      Campus UABC deseado *
                    </label>
                    <select
                      name="campus_uabc_deseado"
                      value={formData.campus_uabc_deseado}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
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

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  Responsable o tutor
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
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
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Revisar datos antes de enviar
              </button>
            </form>
          </>
        )}

        {etapa === "revision" && (
          <>
            <h1 className="mb-2 text-2xl font-bold">
              Revisa tus datos antes de enviar
            </h1>

            <p className="mb-6 text-sm text-slate-300">
              Verifica que la información sea correcta. Si necesitas cambiar
              algo, puedes regresar a editar.
            </p>

            {error && <Alerta tipo="error" texto={error} />}

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
                className="rounded-lg border border-slate-600 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Editar datos
              </button>

              <button
                type="button"
                onClick={confirmarEnvio}
                disabled={loading}
                className="rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
              >
                {loading ? "Enviando registro..." : "Confirmar y enviar registro"}
              </button>
            </div>
          </>
        )}

        {etapa === "enviado" && registroEnviado && (
          <>
            <h1 className="mb-2 text-2xl font-bold">
              Registro enviado correctamente
            </h1>

            <p className="mb-6 text-sm text-slate-300">
              Tu solicitud quedó pendiente de revisión por administración.
            </p>

            {mensaje && <Alerta tipo="success" texto={mensaje} />}

            <div className="mb-6 rounded-xl border border-blue-700 bg-blue-950/40 p-4 text-sm text-blue-100">
              <p className="font-semibold">Importante:</p>
              <p className="mt-1">
                Aún no tienes acceso activo. Administración revisará tu registro
                y te avisará por WhatsApp cuando tu acceso sea aprobado.
              </p>
            </div>

            <ResumenRegistro datos={registroEnviado} ocultarPassword />

            <p className="mt-8 rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
              Puedes cerrar esta página. No es necesario llenar el formulario
              otra vez.
            </p>
          </>
        )}
      </div>
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
      <label className="mb-1 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
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
      ? "border-green-500 bg-green-950 text-green-200"
      : "border-red-500 bg-red-950 text-red-200";

  return (
    <div className={`mb-5 rounded-lg border p-4 text-sm ${clases}`}>
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
    <div className="space-y-6 rounded-xl border border-slate-700 bg-slate-950 p-5">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">
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
        <h2 className="mb-3 text-lg font-semibold text-white">
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
        <h2 className="mb-3 text-lg font-semibold text-white">
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
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-1 break-words text-sm font-medium text-white">{valor}</p>
    </div>
  );
}