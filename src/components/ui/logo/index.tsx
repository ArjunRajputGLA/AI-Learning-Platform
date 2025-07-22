export default function Logo({ collapsed = false }) {
  return (
    <div className={cn(
      "relative transition-all duration-300",
      collapsed ? "h-8 w-8" : "h-20 w-36"
    )}>
      {/* ...existing logo content... */}
    </div>
  );
}
