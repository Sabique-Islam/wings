import { useState } from "react";
import { Seo } from "@/components/Seo";
import { toast } from "sonner";
import { sendMagicLink } from "@/lib/auth";
import { signInWithGoogle } from "@/lib/auth/oauth";
import { Logo } from "@/components/Logo";
import { Dither } from "@/components/ui/Dither";
import { Ascii, WINGS_TAGLINE } from "@/lib/ascii";
import { Link } from "react-router-dom";

type Stage = "request" | "sent";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("request");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await sendMagicLink(email);
    setLoading(false);
    if (error) return toast.error(error.message);
    setStage("sent");
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setOauthLoading(false);
      toast.error(result.error.message);
    }
  };

  return (
    <>
      <Seo title="sign in" path="/auth" noIndex />
      <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-2">
        {/* Left — dither illustration + wordmark */}
        <div className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-border-subtle p-10">
          <Dither variant="grain" fade="radial" density="sparse" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-accent-strong/[0.06] blur-3xl" />
          <Link to="/" className="relative z-10"><Logo size={30} withWordmark wordmarkClassName="text-sm font-display font-semibold" /></Link>
          <div className="relative z-10 space-y-4">
            <Ascii size="text-[9px] xl:text-[11px]" className="text-ink-1">
{` ██╗    ██╗██╗███╗   ██╗ ██████╗ ███████╗
 ██║    ██║██║████╗  ██║██╔════╝ ██╔════╝
 ██║ █╗ ██║██║██╔██╗ ██║██║  ███╗███████╗
 ██║███╗██║██║██║╚██╗██║██║   ██║╚════██║
 ╚███╔███╔╝██║██║ ╚████║╚██████╔╝███████║
  ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝`}
            </Ascii>
            <p className="font-display text-2xl tracking-tight max-w-sm">{WINGS_TAGLINE}.</p>
          </div>
          <div className="relative z-10 text-[10px] font-mono text-ink-2">pages · math · drawings · ai</div>
        </div>

        {/* Right — form */}
        <div className="relative flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-sm space-y-8">
            <div className="lg:hidden flex justify-center"><Logo size={40} withWordmark wordmarkClassName="text-base font-display font-semibold" /></div>

            <div className="space-y-1 text-center lg:text-left">
              <h1 className="font-display font-bold text-2xl tracking-tight">welcome back</h1>
              <p className="text-sm text-ink-2 font-sans">sign in to create and edit pages.</p>
            </div>

            <div className="border border-border-subtle rounded-xl bg-surface-1 p-6 space-y-5">
              {stage === "sent" ? (
                <div className="text-center space-y-3">
                  <Ascii className="text-ink-2 mx-auto inline-block">
{`  ┌─────────────┐
  │  ✉ check    │
  │  your inbox │
  └─────────────┘`}
                  </Ascii>
                  <p className="text-xs text-ink-1">
                    magic link sent to <span className="text-foreground">{email}</span>
                  </p>
                  <button
                    onClick={() => setStage("request")}
                    className="text-[10px] text-ink-2 hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    try another email
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={oauthLoading}
                    className="w-full inline-flex items-center justify-center gap-2 border border-border-strong rounded-md px-3 py-2.5 text-xs hover:bg-accent/40 transition-colors disabled:opacity-50 font-mono"
                  >
                    <GoogleGlyph />
                    {oauthLoading ? "redirecting..." : "continue with google"}
                  </button>

                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ink-3">
                    <span className="h-px flex-1 bg-border-subtle" />
                    or
                    <span className="h-px flex-1 bg-border-subtle" />
                  </div>

                  <form onSubmit={handleRequest} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-ink-2 font-mono">email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-accent-strong text-accent-strong-foreground rounded-md px-3 py-2 text-xs font-medium hover:bg-accent-strong-hover transition-colors disabled:opacity-50 font-mono uppercase tracking-wider"
                    >
                      {loading ? "sending..." : "send magic link"}
                    </button>
                    <p className="text-[10px] text-ink-2 text-center">no password — just your email</p>
                  </form>
                </div>
              )}
            </div>

            <p className="text-center text-[10px] text-ink-3 font-mono">block editor · magic link or Google</p>
          </div>
        </div>
      </div>
    </>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 11v3.2h8.94c-.36 2.1-2.66 6.18-8.94 6.18-5.38 0-9.78-4.46-9.78-9.96S6.62 .46 12 .46c3.06 0 5.12 1.3 6.3 2.42l2.16-2.08C18.66-1.06 15.62-2 12-2 5.36-2-.06 3.42-.06 10.42S5.36 22.84 12 22.84c6.92 0 11.5-4.86 11.5-11.7 0-.78-.08-1.38-.18-1.96H12z"/>
    </svg>
  );
}
