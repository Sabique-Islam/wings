import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getMyUsername } from "@/lib/profile";
import { Seo } from "@/components/Seo";
import { PRICING_TIERS, type PricingTier } from "@/config/pricing";
import { PricingCard } from "@/components/pricing/PricingCard";
import { dodo } from "@/lib/payments/dodo";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Dither } from "@/components/ui/Dither";
import { Check, Minus } from "lucide-react";

const COMPARE: { label: string; tiers: [boolean, boolean, boolean] }[] = [
  { label: "unlimited pages & sub-pages", tiers: [false, true, true] },
  { label: "guest collaboration", tiers: [false, true, true] },
  { label: "agentic ai credits", tiers: [false, true, true] },
  { label: "databases (table / board / gallery)", tiers: [true, true, true] },
  { label: "offline-first + markdown export", tiers: [true, true, true] },
  { label: "private publishing", tiers: [false, false, true] },
  { label: "version history", tiers: [false, true, true] },
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (user) getMyUsername(user.id).then(setUsername);
  }, [user]);

  const ctaHref = user ? (username ? `/${username}` : "/app") : "/auth";

  async function onSelect(tier: PricingTier) {
    if (tier.id === "free") {
      navigate(ctaHref);
      return;
    }
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!tier.productId) {
      toast.message("payments coming soon", { description: `${tier.name} tier isn't connected yet.` });
      return;
    }
    setBusyId(tier.id);
    try {
      await dodo.startCheckout({
        productId: tier.productId,
        customerEmail: user.email ?? undefined,
        returnUrl: `${window.location.origin}/checkout/success`,
        onEvent: (e) => {
          if (e.event_type === "checkout.success") toast.success("payment successful");
        },
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Seo title="pricing" path="/pricing" description="Three tiers. Free, Explorer, and Scholar. Pay for the depth you want — cancel any time." />
      <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
        <Dither variant="dot" fade="radial" density="sparse" className="opacity-40" />
        <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border-subtle">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={26} withWordmark wordmarkClassName="text-sm font-display font-semibold" />
            </Link>
            <Link to={ctaHref} className="rounded-full bg-accent-strong text-accent-strong-foreground text-[10px] sm:text-[11px] font-mono uppercase tracking-widest px-3 sm:px-4 py-1.5">
              {user ? "open app" : "sign in"}
            </Link>
          </div>
        </header>

        <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto text-center space-y-4 sm:space-y-5 mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1/40 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-ink-2">
              <Sparkles className="w-3 h-3" /> pricing
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease }}
              className="font-display font-bold text-4xl sm:text-5xl md:text-7xl tracking-[-0.045em] leading-[0.95]"
            >
              simple. honest.<br /><span className="text-accent-strong">unbundled.</span>
            </motion.h1>
            <p className="text-sm sm:text-base text-ink-1 font-sans max-w-lg mx-auto">pay for the depth you want. cancel any time. no dark patterns.</p>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
            {PRICING_TIERS.map((tier, i) => (
              <PricingCard
                key={tier.id}
                tier={tier}
                index={i}
                onSelect={onSelect}
                busy={busyId === tier.id}
              />
            ))}
          </div>

          <div className="max-w-3xl mx-auto mt-20 sm:mt-28">
            <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-ink-2 mb-6">— compared</div>
            <div className="grid grid-cols-[1fr_repeat(3,3rem)] sm:grid-cols-[1fr_repeat(3,5rem)] items-center gap-y-1 border-y border-border-subtle">
              <div />
              {PRICING_TIERS.map((t) => (
                <div key={t.id} className="text-center font-mono text-[10px] uppercase tracking-widest text-ink-2 py-3">{t.name}</div>
              ))}
              {COMPARE.map((row) => (
                <div key={row.label} className="contents">
                  <div className="font-sans text-sm text-ink-1 py-3 border-t border-border-subtle/60">{row.label}</div>
                  {row.tiers.map((has, i) => (
                    <div key={i} className="flex justify-center py-3 border-t border-border-subtle/60">
                      {has ? <Check className="w-4 h-4 text-accent-strong" /> : <Minus className="w-4 h-4 text-ink-3" />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-2xl mx-auto text-center mt-12 sm:mt-16 text-xs font-mono text-ink-2">
            all plans include offline mode, end-to-end RLS, and a soul. ✦
          </div>
        </section>
      </div>
    </>
  );
}
