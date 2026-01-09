import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza un RUT eliminando puntos, guiones y espacios.
 * Retorna solo dígitos y K/k en mayúscula.
 */
export function normalizeRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

/**
 * Formatea un RUT al formato estándar: 00.000.000-0
 * Este formato se usa para guardar en la base de datos.
 */
export function formatRutStandard(rut: string): string {
  const cleaned = normalizeRut(rut);
  
  if (cleaned.length < 2) return cleaned;
  
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  return `${bodyWithDots}-${dv}`;
}
