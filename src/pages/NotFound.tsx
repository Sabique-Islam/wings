import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Ascii } from "@/lib/ascii";
import { Dither } from "@/components/ui/Dither";
import { Seo } from "@/components/Seo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background text-foreground overflow-hidden px-4">
      <Seo title="page not found" path={location.pathname} noIndex description="This page does not exist on Wings." />
      <Dither variant="grain" fade="radial" density="sparse" />
      <div className="relative text-center space-y-6">
        <Ascii size="text-[10px] sm:text-xs" className="text-ink-2 inline-block text-left">
{`┌────────────────────┐
│   4 0 4            │
│   page not found   │
│   ·· ── ·· ── ··   │
└────────────────────┘`}
        </Ascii>
        <div className="space-y-2">
          <h1 className="font-display font-bold text-5xl sm:text-6xl tracking-tight">404</h1>
          <p className="text-sm text-ink-1 font-sans">this page drifted off the grid.</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-accent-strong text-accent-strong-foreground px-6 py-3 text-[11px] font-mono uppercase tracking-[0.2em] hover:scale-[1.03] transition-transform"
        >
          return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
