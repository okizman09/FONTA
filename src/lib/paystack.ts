import { supabase } from './supabase';

export interface PaystackConfig {
  publicKey: string;
  secretKey: string;
}

export interface PaymentData {
  email: string;
  amount: number; // in kobo
  currency: string;
  reference: string;
  metadata?: any;
}

export class PaystackService {
  private publicKey: string;

  constructor(publicKey: string) {
    this.publicKey = publicKey;
  }

  // Initialize payment
  async initializePayment(paymentData: PaymentData): Promise<any> {
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Payment initialization error:', error);
      throw error;
    }
  }

  // Verify payment
  async verifyPayment(reference: string): Promise<any> {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  // Handle successful payment
  async handlePaymentSuccess(reference: string, userId: string): Promise<boolean> {
    try {
      // Verify payment with Paystack
      const verification = await this.verifyPayment(reference);
      
      if (verification.status && verification.data.status === 'success') {
        // Update user subscription in database
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_type: 'premium',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (!error) {
          // Reset daily usage to allow immediate access
          const today = new Date().toISOString().split('T')[0];
          await supabase
            .from('daily_usage')
            .upsert({
              user_id: userId,
              date: today,
              total_count: 0,
              last_reset: new Date().toISOString()
            });

          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Payment success handling error:', error);
      return false;
    }
  }

  // Generate payment reference
  generateReference(userId: string): string {
    return `fonta_${userId}_${Date.now()}`;
  }
}

// Export singleton instance
export const paystackService = new PaystackService(
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''
);

// Webhook handler for payment verification (to be used in edge function)
export async function handlePaystackWebhook(event: any): Promise<boolean> {
  try {
    // Verify webhook signature
    const signature = event.headers['x-paystack-signature'];
    const secret = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
    
    // In production, verify the signature properly
    // const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(event.body)).digest('hex');
    // if (hash !== signature) return false;

    const data = event.body;
    
    if (data.event === 'charge.success') {
      const reference = data.data.reference;
      const email = data.data.customer.email;
      
      // Find user by email and update subscription
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_type: 'premium',
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        // Reset usage limits
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('daily_usage')
          .upsert({
            user_id: profile.id,
            date: today,
            total_count: 0,
            last_reset: new Date().toISOString()
          });

        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Webhook handling error:', error);
    return false;
  }
}