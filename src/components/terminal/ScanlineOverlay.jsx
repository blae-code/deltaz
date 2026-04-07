export default function ScanlineOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(223,129,22,0.035) 2px, rgba(223,129,22,0.035) 4px)',
        }}
      />
    </div>
  );
}