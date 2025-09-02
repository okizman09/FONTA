import React from 'react';
import { BookOpen, FileText, HelpCircle, Trophy, LogOut } from 'lucide-react';
import logo from "../assets/fonta-logo.png.jpg"

interface NavigationProps {
  activeTab: 'summarizer' | 'quiz' | 'homework';
  onTabChange: (tab: 'summarizer' | 'quiz' | 'homework') => void;
  profile: any;
  onSignOut: () => void;
}

// Changed from named export to default export
const Navigation = ({ activeTab, onTabChange, profile, onSignOut }: NavigationProps) => {
  const tabs = [
    {
      id: 'summarizer' as const,
      name: 'Summarize Notes',
      icon: FileText,
      description: 'AI-powered summaries',
    },
    {
      id: 'quiz' as const,
      name: 'Generate Quiz',
      icon: BookOpen,
      description: 'MCQs & short answers',
    },
    {
      id: 'homework' as const,
      name: 'Homework Help',
      icon: HelpCircle,
      description: 'Step-by-step guidance',
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <img
              src={logo}
              alt="Logo"
              className="h-24 w-auto object-contain"/>
              
          </div>

          <div className="flex items-center space-x-4">
            {/* Streak Counter */}
            <div className="flex items-center space-x-2 bg-orange-50 px-3 py-1 rounded-lg">
              <Trophy className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-700">
                {profile?.current_streak || 0} day streak
              </span>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.subscription_type || 'free'}</p>
              </div>
              <button
                onClick={onSignOut}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 pb-4 border-b-2 transition-all duration-200 ${
                  isActive
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Navigation; // Changed to default export