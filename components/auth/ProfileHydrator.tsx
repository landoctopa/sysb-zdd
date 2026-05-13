'use client';

import { useEffect } from 'react';
import { $profile, ProfileRow } from '@/store/profileStore';

export default function ProfileHydrator({ profile }: { profile: ProfileRow | null }) {
  useEffect(() => {
    if (profile) {
      $profile.set(profile);
    }
  }, [profile]);

  return null;
}