import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useUsageLimits(userId: string) {
  const [totalUsage, setTotalUsage] = useState(0);
  const [canUse, setCanUse] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadUsageData();
      // Set up interval to update time until reset
      const interval = setInterval(() => {
        updateTimeUntilReset();
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [userId]);

  const loadUsageData = async () => {
    try {
      // Get or create usage record for today
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create new record if doesn't exist
        const { data: newData } = await supabase
          .from('daily_usage')
          .insert({
            user_id: userId,
            date: today,
            total_count: 0,
            last_reset: new Date().toISOString()
          })
          .select()
          .single();
        
        if (newData) {
          setTotalUsage(0);
          setCanUse(true);
          setTimeUntilReset(calculateTimeUntilReset(newData.last_reset));
        }
      } else if (data) {
        setTotalUsage(data.total_count);
        
        // Check if 6 hours have passed since last reset
        const timeSinceReset = new Date().getTime() - new Date(data.last_reset).getTime();
        const sixHours = 6 * 60 * 60 * 1000;
        
        if (timeSinceReset >= sixHours && data.total_count >= 15) {
          // Reset usage
          await resetUsage();
        } else {
          const canUseNow = data.total_count < 15;
          setCanUse(canUseNow);
          setTimeUntilReset(calculateTimeUntilReset(data.last_reset));
        }
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeUntilReset = (lastReset: string) => {
    const resetTime = new Date(lastReset).getTime() + 6 * 60 * 60 * 1000;
    return Math.max(0, resetTime - new Date().getTime());
  };

  const updateTimeUntilReset = () => {
    if (totalUsage >= 15) {
      loadUsageData(); // Reload to check if reset time has passed
    }
  };

  const incrementUsage = async () => {
    if (!canUse) return false;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('daily_usage')
        .update({ 
          total_count: totalUsage + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('date', today)
        .select()
        .single();

      if (data) {
        setTotalUsage(data.total_count);
        setCanUse(data.total_count < 15);
        return true;
      }
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
    return false;
  };

  const resetUsage = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('daily_usage')
        .update({ 
          total_count: 0,
          last_reset: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('date', today)
        .select()
        .single();

      if (data) {
        setTotalUsage(0);
        setCanUse(true);
        setTimeUntilReset(6 * 60 * 60 * 1000);
      }
    } catch (error) {
      console.error('Error resetting usage:', error);
    }
  };

  return {
    totalUsage,
    canUse,
    timeUntilReset,
    loading,
    incrementUsage,
    resetUsage,
    remainingUses: Math.max(0, 15 - totalUsage)
  };
}