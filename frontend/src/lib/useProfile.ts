'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

interface Profile {
  id: string;
  email: string;
  username: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('id, email, username')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(data);
        }
        setLoading(false);
      });
  }, [user]);

  const updateUsername = async (username: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);

    if (error) throw error;
    setProfile((prev) => (prev ? { ...prev, username } : prev));
  };

  return { profile, loading, updateUsername };
}
