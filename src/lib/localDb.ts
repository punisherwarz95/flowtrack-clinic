import Dexie, { type Table } from 'dexie';

// ── Local mirror types ──────────────────────────────────────────────────
export interface LocalAtencion {
  id: string;
  paciente_id: string;
  box_id: string | null;
  estado: string;
  fecha_ingreso: string;
  fecha_inicio_atencion: string | null;
  fecha_fin_atencion: string | null;
  created_at: string | null;
  numero_ingreso: number | null;
  estado_ficha: string;
  observaciones: string | null;
  prereserva_id: string | null;
  // Denormalized joins stored locally
  paciente_nombre?: string;
  paciente_rut?: string;
  paciente_tipo_servicio?: string;
  paciente_fecha_nacimiento?: string | null;
  paciente_email?: string | null;
  paciente_telefono?: string | null;
  paciente_direccion?: string | null;
  paciente_empresa_id?: string | null;
  paciente_empresa_nombre?: string | null;
  box_nombre?: string | null;
}

export interface LocalAtencionExamen {
  id: string;
  atencion_id: string;
  examen_id: string;
  estado: string;
  fecha_realizacion: string | null;
  created_at: string | null;
  realizado_por: string | null;
  observaciones: string | null;
  examen_nombre?: string;
}

export interface LocalAtencionDocumento {
  id: string;
  atencion_id: string;
  documento_id: string;
  estado: string;
}

export interface LocalPaciente {
  id: string;
  nombre: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  tipo_servicio: string | null;
  empresa_id: string | null;
  faena_id: string | null;
  cargo: string | null;
}

// Reference data types
export interface LocalEmpresa {
  id: string;
  nombre: string;
  rut: string | null;
  razon_social: string | null;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean | null;
  afecto_iva: boolean;
  centro_costo: string | null;
}

export interface LocalBox {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean | null;
}

export interface LocalBoxExamen {
  id: string;
  box_id: string;
  examen_id: string;
}

export interface LocalExamen {
  id: string;
  nombre: string;
  descripcion: string | null;
  codigo: string | null;
}

export interface LocalPaquete {
  id: string;
  nombre: string;
  descripcion: string | null;
}

export interface LocalPaqueteExamenItem {
  id: string;
  paquete_id: string;
  examen_id: string;
}

export interface LocalFaena {
  id: string;
  nombre: string;
  direccion: string | null;
  empresa_id: string | null;
  activo: boolean | null;
}

export interface LocalBateriaFaena {
  id: string;
  paquete_id: string;
  faena_id: string;
  activo: boolean | null;
}

export interface LocalEmpresaFaena {
  id: string;
  empresa_id: string;
  faena_id: string;
  activo: boolean | null;
}

export interface LocalFaenaExamen {
  id: string;
  faena_id: string;
  examen_id: string;
  valor_venta: number;
  activo: boolean | null;
}

export interface LocalDocumentoFormulario {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  activo: boolean;
}

export interface LocalCotizacion {
  id: string;
  numero_cotizacion: number;
  fecha_cotizacion: string;
  empresa_id: string | null;
  empresa_nombre: string | null;
  empresa_rut: string | null;
  empresa_razon_social: string | null;
  subtotal_neto: number;
  total_iva: number;
  total_con_iva: number;
  total_con_margen: number;
  estado: string;
  created_at: string | null;
  observaciones: string | null;
  afecto_iva: boolean;
}

export interface LocalCotizacionSolicitud {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  created_at: string | null;
  empresa_nombre: string | null;
  empresa_id: string | null;
  faena_nombre: string | null;
  faena_id: string | null;
  items_json: string; // JSON stringified items
}

// ── Outbox ──────────────────────────────────────────────────────────────
export interface OutboxOperation {
  id?: number; // auto-increment
  table: string;
  operation: 'update' | 'insert' | 'delete';
  recordId: string;
  payload: Record<string, any>;
  createdAt: string;
  retries: number;
}

// ── Sync metadata ───────────────────────────────────────────────────────
export interface SyncMeta {
  key: string;
  value: string;
}

// ── Dexie DB class ──────────────────────────────────────────────────────
class MediFlowLocalDB extends Dexie {
  atenciones!: Table<LocalAtencion, string>;
  atencionExamenes!: Table<LocalAtencionExamen, string>;
  atencionDocumentos!: Table<LocalAtencionDocumento, string>;
  pacientes!: Table<LocalPaciente, string>;

  // Reference
  empresas!: Table<LocalEmpresa, string>;
  boxes!: Table<LocalBox, string>;
  boxExamenes!: Table<LocalBoxExamen, string>;
  examenes!: Table<LocalExamen, string>;
  paquetes!: Table<LocalPaquete, string>;
  paqueteExamenItems!: Table<LocalPaqueteExamenItem, string>;
  faenas!: Table<LocalFaena, string>;
  bateriaFaenas!: Table<LocalBateriaFaena, string>;
  empresaFaenas!: Table<LocalEmpresaFaena, string>;
  faenaExamenes!: Table<LocalFaenaExamen, string>;
  documentosFormularios!: Table<LocalDocumentoFormulario, string>;

  // Cotizaciones
  cotizaciones!: Table<LocalCotizacion, string>;
  cotizacionSolicitudes!: Table<LocalCotizacionSolicitud, string>;

  // Sync
  outbox!: Table<OutboxOperation, number>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('mediflow_local');

    this.version(1).stores({
      atenciones: 'id, estado, fecha_ingreso, box_id, paciente_id',
      atencionExamenes: 'id, atencion_id, examen_id, estado',
      atencionDocumentos: 'id, atencion_id, estado',
      pacientes: 'id, rut, empresa_id',

      empresas: 'id',
      boxes: 'id',
      boxExamenes: 'id, box_id, examen_id',
      examenes: 'id',
      paquetes: 'id',
      paqueteExamenItems: 'id, paquete_id, examen_id',
      faenas: 'id, empresa_id',
      bateriaFaenas: 'id, paquete_id, faena_id',

      outbox: '++id, table, createdAt',
      syncMeta: 'key',
    });

    this.version(2).stores({
      atenciones: 'id, estado, fecha_ingreso, box_id, paciente_id',
      atencionExamenes: 'id, atencion_id, examen_id, estado',
      atencionDocumentos: 'id, atencion_id, estado',
      pacientes: 'id, rut, empresa_id',

      empresas: 'id',
      boxes: 'id',
      boxExamenes: 'id, box_id, examen_id',
      examenes: 'id',
      paquetes: 'id',
      paqueteExamenItems: 'id, paquete_id, examen_id',
      faenas: 'id, empresa_id',
      bateriaFaenas: 'id, paquete_id, faena_id',

      cotizaciones: 'id, numero_cotizacion, estado',
      cotizacionSolicitudes: 'id, estado',

      outbox: '++id, table, createdAt',
      syncMeta: 'key',
    });

    this.version(3).stores({
      atenciones: 'id, estado, fecha_ingreso, box_id, paciente_id',
      atencionExamenes: 'id, atencion_id, examen_id, estado',
      atencionDocumentos: 'id, atencion_id, estado',
      pacientes: 'id, rut, empresa_id',

      empresas: 'id',
      boxes: 'id',
      boxExamenes: 'id, box_id, examen_id',
      examenes: 'id',
      paquetes: 'id',
      paqueteExamenItems: 'id, paquete_id, examen_id',
      faenas: 'id, empresa_id',
      bateriaFaenas: 'id, paquete_id, faena_id',
      empresaFaenas: 'id, empresa_id, faena_id',
      faenaExamenes: 'id, faena_id, examen_id',
      documentosFormularios: 'id',

      cotizaciones: 'id, numero_cotizacion, estado',
      cotizacionSolicitudes: 'id, estado',

      outbox: '++id, table, createdAt',
      syncMeta: 'key',
    });
  }
}

export const localDb = new MediFlowLocalDB();

// ── Helper functions ────────────────────────────────────────────────────

export async function addToOutbox(
  table: string,
  operation: 'update' | 'insert' | 'delete',
  recordId: string,
  payload: Record<string, any>,
) {
  await localDb.outbox.add({
    table,
    operation,
    recordId,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
}

export async function getOutboxCount(): Promise<number> {
  return localDb.outbox.count();
}

export async function clearDayData() {
  await Promise.all([
    localDb.atenciones.clear(),
    localDb.atencionExamenes.clear(),
    localDb.atencionDocumentos.clear(),
    localDb.pacientes.clear(),
  ]);
}

export async function getSyncMeta(key: string): Promise<string | undefined> {
  const record = await localDb.syncMeta.get(key);
  return record?.value;
}

export async function setSyncMeta(key: string, value: string) {
  await localDb.syncMeta.put({ key, value });
}
