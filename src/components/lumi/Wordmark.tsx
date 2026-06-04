export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`lumi-wordmark text-foreground ${className}`}>
      lumi<span className="text-primary">.</span>
    </span>
  );
}