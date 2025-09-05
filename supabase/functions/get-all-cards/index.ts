// FIX: Replaced the failing Deno type reference with a manual global declaration.
// This resolves TypeScript errors in non-Deno environments by providing minimal types for the Deno namespace,
// which was previously undefined due to the type reference failing to resolve.
declare global {
  namespace Deno {
    function serve(handler: (req: Request) => Response | Promise<Response>): void;
    const env: {
      get: (key: string) => string | undefined;
    };
  }
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Pass auth header to the client if it exists.
      // This will ensure that RLS policies are applied correctly for authenticated users,
      // and falls back to the anon key for public users.
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    )

    const { data, error } = await supabaseClient.from('cards').select('*')

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ cards: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
