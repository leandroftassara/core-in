"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { CalendarDays, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeItem?: "calendar";
}

export function Sidebar({ activeItem = "calendar" }: SidebarProps) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/");
  }

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-border bg-card py-4">
      {/* Logo */}
      <div className="mb-6 flex items-center justify-center">
        <Image src="/logo.svg" alt="core·in" width={28} height={28} />
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col items-center gap-2">
        <SidebarItem
          icon={<CalendarDays className="h-5 w-5" />}
          label="Calendar"
          active={activeItem === "calendar"}
          onClick={() => router.push("/dashboard")}
        />
      </nav>

      {/* Logout */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="text-muted-foreground hover:text-foreground"
        title="Sign out"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </aside>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {icon}
    </button>
  );
}
