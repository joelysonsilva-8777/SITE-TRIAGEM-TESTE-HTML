import type { Patient } from '../data/types';
export type Identity = Pick<
  Patient,
  'name' | 'birthDate' | 'sex' | 'phone' | 'complaint' | 'allergies'
>;
export const identityOf = (p?: Patient): Identity => ({
  name: p?.name || '',
  birthDate: p?.birthDate || '',
  sex: p?.sex || 'Não informado',
  phone: p?.phone || '',
  complaint: p?.complaint || '',
  allergies: p?.allergies || '',
});
