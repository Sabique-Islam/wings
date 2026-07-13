import { Component, type ErrorInfo, type ReactNode } from "react";
import { Ascii } from "@/lib/ascii";
import { Dither } from "@/components/ui/Dither";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background text-foreground overflow-hidden px-4">
        <Dither variant="dot" fade="radial" density="normal" className="opacity-40" />
        <div className="relative text-center space-y-6 max-w-md">
          <Ascii size="text-[10px] sm:text-xs" className="text-ink-2 inline-block text-left">
{`┌────────────────────┐
│   ✦  something     │
│      broke         │
│   ·· ── ×× ── ··   │
└────────────────────┘`}
          </Ascii>
          <div className="space-y-2">
            <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">unexpected error</h1>
            <p className="text-sm text-ink-1 font-sans">the app hit a snag. your work is saved locally.</p>
            {this.state.error.message && (
              <p className="text-[10px] font-mono text-ink-3 break-words px-4">{this.state.error.message}</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-full bg-accent-strong text-accent-strong-foreground px-6 py-3 text-[11px] font-mono uppercase tracking-[0.2em] hover:scale-[1.03] transition-transform"
            >
              try again
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border-strong px-6 py-3 text-[11px] font-mono uppercase tracking-[0.2em] hover:bg-accent/40 transition-colors"
            >
              go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
