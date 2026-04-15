// Portal Paciente Translations v1.1.0

export type PortalLang = "es" | "en";

const translations = {
  // Código step
  portalTitle: { es: "Portal del Paciente", en: "Patient Portal" },
  codigoSubtitle: { es: "Ingrese el código del día proporcionado en recepción", en: "Enter the daily code provided at reception" },
  codigoDia: { es: "Código del Día", en: "Daily Code" },
  validando: { es: "Validando...", en: "Validating..." },
  continuar: { es: "Continuar", en: "Continue" },
  ingreseCodigo: { es: "Ingrese el código del día", en: "Enter the daily code" },
  codigoIncorrecto: { es: "El código ingresado no es correcto. Solicítelo al personal de recepción.", en: "The code entered is incorrect. Ask reception staff for the code." },
  errorValidarCodigo: { es: "No se pudo validar el código. Intente nuevamente.", en: "Could not validate the code. Please try again." },

  // Identificación step
  identificacionSubtitle: { es: "Ingrese su RUT para identificarse", en: "Enter your ID to identify yourself" },
  identificacionSubtitlePassport: { es: "Ingrese su pasaporte para identificarse", en: "Enter your passport to identify yourself" },
  rut: { es: "RUT", en: "RUT" },
  pasaporte: { es: "Pasaporte / ID Extranjero", en: "Passport / Foreign ID" },
  placeholderRut: { es: "12.345.678-9", en: "12.345.678-9" },
  placeholderPassport: { es: "Ej: AB1234567", en: "E.g.: AB1234567" },
  ingreseRut: { es: "Ingrese su RUT", en: "Enter your RUT" },
  ingresePasaporte: { es: "Ingrese su pasaporte", en: "Enter your passport" },
  buscando: { es: "Buscando...", en: "Searching..." },
  ingresar: { es: "Ingresar", en: "Enter" },
  extranjero: { es: "Extranjero", en: "Foreign" },

  // Registro step
  registroTitle: { es: "Registro de Paciente", en: "Patient Registration" },
  registroSubtitle: { es: "Complete sus datos para registrarse", en: "Complete your information to register" },
  nombre: { es: "Nombre *", en: "First Name *" },
  apellidoPaterno: { es: "Apellido Paterno *", en: "Last Name *" },
  apellidoMaterno: { es: "Apellido Materno *", en: "Middle Name *" },
  rutLabel: { es: "RUT *", en: "RUT *" },
  pasaporteLabel: { es: "Pasaporte / ID *", en: "Passport / ID *" },
  fechaNacimiento: { es: "Fecha de Nacimiento *", en: "Date of Birth *" },
  email: { es: "Email *", en: "Email *" },
  telefono: { es: "Teléfono *", en: "Phone *" },
  calle: { es: "Calle *", en: "Street *" },
  numeracion: { es: "Numeración *", en: "Number *" },
  ciudad: { es: "Ciudad *", en: "City *" },
  ciudadHint: { es: "Ingrese una ciudad de Chile", en: "Enter a city in Chile" },
  volver: { es: "Volver", en: "Back" },
  registrar: { es: "Registrar", en: "Register" },
  registrando: { es: "Registrando...", en: "Registering..." },

  // Validaciones
  errNombre: { es: "Nombre es obligatorio", en: "First name is required" },
  errApPaterno: { es: "Apellido paterno es obligatorio", en: "Last name is required" },
  errApMaterno: { es: "Apellido materno es obligatorio", en: "Middle name is required" },
  errRut: { es: "RUT es obligatorio", en: "RUT is required" },
  errPasaporte: { es: "Pasaporte es obligatorio", en: "Passport is required" },
  errFechaNac: { es: "Fecha de nacimiento es obligatoria", en: "Date of birth is required" },
  errEmail: { es: "Email es obligatorio", en: "Email is required" },
  errEmailInvalid: { es: "Email no tiene formato válido", en: "Email format is invalid" },
  errTelefono: { es: "Teléfono es obligatorio", en: "Phone is required" },
  errTelefonoLen: { es: "El teléfono debe tener 9 dígitos", en: "Phone must be 9 digits" },
  errCalle: { es: "Calle es obligatoria", en: "Street is required" },
  errNumeracion: { es: "Numeración es obligatoria", en: "Number is required" },
  errCiudad: { es: "Ciudad es obligatoria", en: "City is required" },
  errCiudadInvalid: { es: "Ingrese una ciudad válida de Chile", en: "Enter a valid city in Chile" },

  // Portal view
  verExamenes: { es: "Ver exámenes", en: "View exams" },
  pendientes: { es: "pendientes", en: "pending" },
  pendiente: { es: "pendiente", en: "pending" },
  ingreso: { es: "Ingreso", en: "Admission" },
  esSuTurno: { es: "¡ES SU TURNO!", en: "IT'S YOUR TURN!" },
  dirijaseBox: { es: "Diríjase al Box", en: "Go to Box" },
  enEspera: { es: "En espera de atención — Turno", en: "Waiting for attention — Turn" },
  leInformaremos: { es: "Le informaremos aquí cuando sea llamado a un box", en: "We will notify you here when called to a box" },
  atencionCompletada: { es: "Atención completada", en: "Attention completed" },
  atencionIncompleta: { es: "Atención incompleta — Turno", en: "Attention incomplete — Turn" },
  boxesPendientes: { es: "Boxes pendientes", en: "Pending boxes" },
  esperandoEmpresa: { es: "Esperando asignación de empresa por recepción", en: "Waiting for company assignment by reception" },
  examenesAparecen: { es: "Sus exámenes aparecerán aquí cuando estén asignados", en: "Your exams will appear here when assigned" },
  esperandoRegistro: { es: "Esperando que recepción complete su registro", en: "Waiting for reception to complete your registration" },
  cambiarPaciente: { es: "Cambiar Paciente", en: "Change Patient" },
  documentosCompletar: { es: "Documentos a Completar", en: "Documents to Complete" },
  toqueDocumento: { es: "Toque un documento para expandirlo y completarlo", en: "Tap a document to expand and complete it" },
  formulariosExternos: { es: "Formularios Externos", en: "External Forms" },
  errorBuscarPaciente: { es: "No se pudo buscar el paciente", en: "Could not search for the patient" },
  errorRegistrar: { es: "No se pudo registrar el paciente", en: "Could not register the patient" },
  suNumeroAtencion: { es: "Su número de atención es", en: "Your attention number is" },
  completeDatos: { es: "Complete sus datos.", en: "Complete your information." },
  verifiqueDatos: { es: "Verifique sus datos.", en: "Verify your information." },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: PortalLang): string {
  return translations[key]?.[lang] ?? translations[key]?.es ?? key;
}
