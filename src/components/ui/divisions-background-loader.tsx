'use client';

export default function DivisionsBackgroundLoader() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#1466de]/[0.06] rounded-full blur-[100px]" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/[0.05] rounded-full blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#1466de]/[0.03] rounded-full blur-[120px]" />
    </div>
  );
}
