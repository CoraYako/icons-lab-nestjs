import type { ValueTransformer } from 'typeorm';

export const bigintToNumber: ValueTransformer = {
  // al guardar: el number se envía tal cual
  to: (value?: number | null) => value,
  // al leer: el string de la base se convierte a number
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
