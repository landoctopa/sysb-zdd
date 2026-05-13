import { atom } from 'nanostores';
import { Database } from '../database.types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export const $profile = atom<ProfileRow | null>(null);