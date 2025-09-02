import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { AuthForm } from './components/AuthForm';
import Navigation from './components/Navigation';
import { SummarizerTab } from './components/tabs/SummarizerTab';
import { QuizTab } from './components/tabs/QuizTab';
import { HomeworkTab } from './components/tabs/HomeworkTab';
import { PaymentModal } from './components/PaymentModal';
import { LoadingSpinner } from './components/LoadingSpinner';

function App() {
  const { user, loading: authLoading, signUp, signIn, signOut } = useAuth();
  const { profile, loading: profileLoading, fetchProfile } = useProfile(user);
  const [activeTab, setActiveTab] = useState<'summarizer' | 'quiz' | 'homework'>('summarizer');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authFormLoading, setAuthFormLoading] = useState(false);

  const handleSignIn = async (email: string, password: string) => {
    setAuthFormLoading(true);
    setAuthError(null);
    
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setAuthError(error.message);
      }
    } catch (error) {
      setAuthError('An unexpected error occurred');
    } finally {
      setAuthFormLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, fullName: string) => {
    setAuthFormLoading(true);
    setAuthError(null);
    
    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setAuthError(error.message);
      }
    } catch (error) {
      setAuthError('An unexpected error occurred');
    } finally {
      setAuthFormLoading(false);
    }
  };

  const handleUsageUpdate = () => {
    fetchProfile();
  };

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    fetchProfile();
  };

  if (authLoading || profileLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <AuthForm
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        loading={authFormLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={profile}
        onSignOut={signOut}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-lg h-[calc(100vh-200px)]">
          {activeTab === 'summarizer' && (
            <SummarizerTab
              user={user}
              profile={profile}
              onUsageUpdate={handleUsageUpdate}
              onUpgrade={handleUpgrade}
            />
          )}
          {activeTab === 'quiz' && (
            <QuizTab
              user={user}
              profile={profile}
              onUsageUpdate={handleUsageUpdate}
              onUpgrade={handleUpgrade}
            />
          )}
          {activeTab === 'homework' && (
            <HomeworkTab
              user={user}
              profile={profile}
              onUsageUpdate={handleUsageUpdate}
              onUpgrade={handleUpgrade}
            />
          )}
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        userEmail={user.email || ''}
      />
    </div>
  );
}

export default App;