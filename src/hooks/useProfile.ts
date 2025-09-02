import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Database } from '../lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      setProfile(data);
    }
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (data && !error) {
      setProfile(data);
    }

    return { data, error };
  };

  const incrementUsage = async (type: 'quiz' | 'summary' | 'homework') => {
    if (!profile) return;

    const field = `${type}_count`;
    const newCount = (profile[field as keyof Profile] as number) + 1;
    
    // Update streak logic
    const today = new Date().toDateString();
    const lastActivity = profile.last_activity ? new Date(profile.last_activity).toDateString() : null;
    
    let newStreak = profile.current_streak;
    if (lastActivity !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastActivity === yesterday.toDateString()) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    const updates = {
      [field]: newCount,
      current_streak: newStreak,
      longest_streak: Math.max(profile.longest_streak, newStreak),
      last_activity: new Date().toISOString(),
    };

    await updateProfile(updates);
  };

  const canUseFeature = (type: 'quiz' | 'summary' | 'homework') => {
    if (!profile) return false;
    if (profile.subscription_type === 'premium') return true;

    const limits = { quiz: 3, summary: 2, homework: 1 };
    const field = `${type}_count`;
    const currentCount = profile[field as keyof Profile] as number;
    
    return currentCount < limits[type];
  };

  return { profile, loading, updateProfile, incrementUsage, canUseFeature, fetchProfile };
}