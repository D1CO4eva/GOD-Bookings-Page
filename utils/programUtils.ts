import { DevotionalProgram } from '../types';

const KNOWN_PROGRAM_TYPES = new Set([
  'radha kalyanam',
  'nikunja utsavam',
  'thirumanjanam',
  'nama ruchi',
  'nama bhiksha',
  'satsang'
]);

export const normalizeProgramType = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (/^radha kalyanam(\s*-.*)?$/.test(normalized)) {
    return 'radha kalyanam';
  }
  return normalized;
};

export const normalizeTimeForMatch = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

export const normalizeEmailForMatch = (value: string): string => value.trim().toLowerCase();

export const normalizeConfirmationForMatch = (value: string): string => value.trim().toLowerCase();

export const isSatsangType = (value: string): boolean => normalizeProgramType(value) === 'satsang';

export const isNamaBhikshaType = (value: string): boolean =>
  normalizeProgramType(value) === 'nama bhiksha';

export const isSpecialProgramType = (value: string): boolean => {
  const normalized = normalizeProgramType(value);
  return normalized.length > 0 && !KNOWN_PROGRAM_TYPES.has(normalized);
};

export const getProgramAvailabilityFlags = (programId?: string): string[] => {
  switch (programId) {
    case 'radha-kalyanam':
      return ['Sundays only'];
    case 'nikunja-utsavam':
      return ['Saturdays & Sundays'];
    case 'thirumanjanam':
      return ['Saturdays & Sundays', 'Mornings only'];
    case 'nama-ruchi':
      return ['Friday evenings', 'Saturdays', 'Sundays'];
    default:
      return [];
  }
};

export const resolveProgramByType = (
  programType: string,
  programs: DevotionalProgram[]
): DevotionalProgram | null => {
  const normalizedTarget = normalizeProgramType(programType);
  return (
    programs.find((program) => normalizeProgramType(program.name) === normalizedTarget) ||
    (normalizedTarget.startsWith('radha kalyanam')
      ? programs.find((program) => normalizeProgramType(program.name) === 'radha kalyanam')
      : null) ||
    null
  );
};
