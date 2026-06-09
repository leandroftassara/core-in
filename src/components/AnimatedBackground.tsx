export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Blob 1 — large, top-left */}
      <div
        className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-stone-200 opacity-50 blur-[100px] animate-blob"
        style={{ animationDelay: "0s" }}
      />
      {/* Blob 2 — medium, bottom-right */}
      <div
        className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-stone-300 opacity-40 blur-[80px] animate-blob-2"
        style={{ animationDelay: "4s" }}
      />
      {/* Blob 3 — small, center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-stone-100 opacity-60 blur-[120px] animate-blob-3"
        style={{ animationDelay: "8s" }}
      />
      {/* Blob 4 — accent, top-right */}
      <div
        className="absolute top-10 right-10 h-[300px] w-[300px] rounded-full opacity-30 blur-[90px] animate-blob"
        style={{
          background: "radial-gradient(circle, #DCDBDA 0%, transparent 70%)",
          animationDelay: "2s",
          animationDuration: "18s",
        }}
      />
    </div>
  );
}
