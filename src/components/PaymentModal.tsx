import React, { useState } from 'react';
import { Crown, X, CheckCircle, Zap, Shield } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail: string;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export function PaymentModal({ isOpen, onClose, onSuccess, userEmail }: PaymentModalProps) {
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePayment = () => {
    setProcessing(true);

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder',
      email: userEmail,
      amount: 80000, // ₦800 in kobo
      currency: 'NGN',
      ref: `edumate_${Date.now()}`,
      ref: `fonta_${Date.now()}`,
      metadata: {
        custom_fields: [
          {
            display_name: "Subscription Type",
            variable_name: "subscription_type",
            value: "premium_monthly"
          }
        ]
      },
      callback: function(response: any) {
        // Payment successful
        console.log('Payment successful:', response);
        setProcessing(false);
        onSuccess();
        onClose();
      },
      onClose: function() {
        setProcessing(false);
      }
    });

    handler.openIframe();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-full w-fit mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Upgrade to Premium</h3>
          <p className="text-gray-600 mt-2">Unlock unlimited AI-powered study tools</p>
        </div>

        {/* Pricing */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">₦800</div>
            <div className="text-sm text-gray-600">per month</div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-sm">Unlimited quiz generation</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-sm">Unlimited note summaries</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-sm">Unlimited homework help</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-sm">Priority AI processing</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-sm">Export & share features</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-sm">Nigerian exam formats</span>
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={processing}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 transform hover:scale-105"
        >
          {processing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing Payment...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Pay with Paystack</span>
            </div>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Secure payment powered by Paystack • Cancel anytime
        </p>
      </div>
    </div>
  );
}