/** Minimal Deno globals for Supabase Edge Functions (IDE typecheck only). */
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
  function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

/** Deno npm: specifiers — resolved at runtime by Supabase Edge Functions. */
declare module "npm:resend@^6" {
  interface CreateEmailOptions {
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
    tags?: { name: string; value: string }[];
  }

  interface CreateEmailRequestOptions {
    idempotencyKey?: string;
  }

  export class Resend {
    constructor(apiKey: string);
    emails: {
      send(
        payload: CreateEmailOptions,
        options?: CreateEmailRequestOptions,
      ): Promise<{
        data: { id: string } | null;
        error: { message: string; name?: string } | null;
      }>;
    };
  }
}

declare module "npm:@supabase/supabase-js@2.49.1" {
  export function createClient(
    url: string,
    key: string,
    options?: { global?: { headers?: Record<string, string> } },
  ): {
    auth: {
      getUser(): Promise<{
        data: { user: { id: string; email?: string } | null };
        error: { message: string } | null;
      }>;
    };
  };
}
