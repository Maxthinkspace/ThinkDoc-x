import { cn } from "@/lib/utils";

interface CitationPillProps {
  citationId: number;
  onClick: (citationId: number) => void;
  className?: string;
}

export default function CitationPill({ citationId, onClick, className }: CitationPillProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('CitationPill clicked:', citationId);
    onClick(citationId);
  };

  return (
    <span
      className={cn(
        "not-prose inline-flex items-center justify-center",
        "px-1.5 py-0 h-5 min-w-[1.5rem] ml-1.5 rounded-md",
        "bg-slate-900 text-white text-xs font-semibold",
        "cursor-pointer select-none",
        "shadow-sm hover:shadow-md",
        "transition-all duration-150",
        "hover:-translate-y-0.5",
        "hover:bg-slate-800",
        "active:bg-slate-700",
        "relative z-10",
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Citation ${citationId}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          console.log('CitationPill key pressed:', citationId);
          onClick(citationId);
        }
      }}
      style={{ pointerEvents: 'auto' }}
    >
      [{citationId}]
    </span>
  );
}

