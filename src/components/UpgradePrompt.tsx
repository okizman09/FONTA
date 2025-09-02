import React from 'react';
import { Crown, Clock, Zap } from 'lucide-react';

interface UpgradePromptProps {
  timeUntilReset: number;
  onUpgrade: () => void;
}

export function UpgradePrompt({ timeUntilReset, onUpgrade }: UpgradePromptProps) {
  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6 m-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-100 p-2 rounded-full">
            <Crown className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Daily Limit Reached</h3>
            <p className="text-sm text-gray-600">
              You've used all 15 daily requests. 
              {timeUntilReset > 0 && (
                <span className="flex items-center mt-1">
                  <Clock className="w-4 h-4 mr-1" />
                  Resets in {formatTime(timeUntilReset)}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2"
        >
          <Zap className="w-4 h-4" />
          <span>Upgrade Now</span>
        </button>
      </div>
    </div>
  );
}