import { clubs } from '../../src/data/clubs.js';

const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '');

export const societies = clubs.map((club) => ({
  id: String(club.id),
  code: club.name,
  name: club.fullName,
  category: club.category,
  email: club.social?.email || '', // TODO: add the real society mailing list email here if needed.
  selectedByDefault: true,
}));

export const defaultSocietyIds = societies.map((society) => society.id);

export function findSocietyByClubName(clubName) {
  const target = normalize(clubName);
  return societies.find((society) => {
    const normalizedCode = normalize(society.code);
    const normalizedName = normalize(society.name);
    return normalizedCode === target || normalizedName === target || normalizedName.includes(target);
  });
}

export function resolveSocietyIds(input) {
  const values = Array.isArray(input) ? input : [input];
  const ids = values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => societies.some((society) => society.id === value || society.code === value || society.name === value));

  return [...new Set(ids.map((value) => {
    const society = societies.find((item) => item.id === value || item.code === value || item.name === value);
    return society?.id || value;
  }))];
}