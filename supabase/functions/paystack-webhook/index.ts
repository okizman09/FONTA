import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    const event = JSON.parse(body);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify webhook signature (in production)
    // const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
    // const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(secret + body));
    // if (signature !== Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')) {
    //   return new Response('Invalid signature', { status: 401 });
    // }

    if (event.event === 'charge.success') {
      const { reference, customer, amount } = event.data;
      
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customer.email)
        .single();

      if (profile && !profileError) {
        // Update user to premium
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_type: 'premium',
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (!updateError) {
          // Reset daily usage
          const today = new Date().toISOString().split('T')[0];
          await supabase
            .from('daily_usage')
            .upsert({
              user_id: profile.id,
              date: today,
              total_count: 0,
              last_reset: new Date().toISOString()
            });

          console.log(`Successfully upgraded user ${customer.email} to premium`);
        }
      }
    }

    return new Response(
      JSON.stringify({ status: 'success' }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});