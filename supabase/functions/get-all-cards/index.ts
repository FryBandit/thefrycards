/*
 * DEPRECATED: This Supabase function is no longer in use.
 *
 * The application has been updated to use a local, version-controlled card library
 * for improved performance, offline capabilities, and consistent game state.
 *
 * The single source of truth for card definitions is now located at:
 * /src/game/card-definitions.ts
 *
 * This file is kept for historical purposes but should not be deployed or relied upon.
 */

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
  // Return a clear "Gone" response if this function is ever called.
  // This makes its deprecated status programmatically clear.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return new Response(JSON.stringify({ error: "This function is deprecated. Card data is now served locally from the client application." }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 410, // HTTP 410 Gone
  });
})