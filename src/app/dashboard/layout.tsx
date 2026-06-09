import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <Sidebar activeItem="calendar" />
      <main className="flex flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
