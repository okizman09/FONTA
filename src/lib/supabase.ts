import { createClient } from '@supabase/supabase-js';

// Get environment variables with proper fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please add it to your .env file.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please add it to your .env file.');
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL environment variable.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          created_at: string;
          updated_at: string;
          quiz_count: number;
          summary_count: number;
          homework_count: number;
          current_streak: number;
          longest_streak: number;
          last_activity: string | null;
          subscription_type: 'free' | 'premium';
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          quiz_count?: number;
          summary_count?: number;
          homework_count?: number;
          current_streak?: number;
          longest_streak?: number;
          subscription_type?: 'free' | 'premium';
        };
        Update: {
          full_name?: string;
          quiz_count?: number;
          summary_count?: number;
          homework_count?: number;
          current_streak?: number;
          longest_streak?: number;
          last_activity?: string;
          subscription_type?: 'free' | 'premium';
        };
      };
      daily_usage: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          total_count: number;
          last_reset: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          total_count?: number;
          last_reset?: string;
        };
        Update: {
          total_count?: number;
          last_reset?: string;
        };
      };
      summaries: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          original_content: string;
          summary_content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          original_content: string;
          summary_content: string;
        };
        Update: {
          title?: string;
          summary_content?: string;
        };
      };
      quizzes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          questions: any;
          difficulty: 'easy' | 'medium' | 'hard';
          score: number | null;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          content: string;
          questions: any;
          difficulty?: 'easy' | 'medium' | 'hard';
          score?: number;
          completed?: boolean;
        };
        Update: {
          title?: string;
          score?: number;
          completed?: boolean;
        };
      };
      homework_help: {
        Row: {
          id: string;
          user_id: string;
          question: string;
          explanation: string;
          subject: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          question: string;
          explanation: string;
          subject?: string;
        };
        Update: {
          explanation?: string;
          subject?: string;
        };
      };
      shared_quizzes: {
        Row: {
          id: string;
          title: string;
          questions: any;
          difficulty: 'easy' | 'medium' | 'hard';
          created_by: string;
          access_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          questions: any;
          difficulty?: 'easy' | 'medium' | 'hard';
          created_by: string;
          access_count?: number;
        };
        Update: {
          access_count?: number;
        };
      };
    };
  };
};