"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Map, Calendar, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const topLinks = [
  { href: "/", icon: LayoutGrid, label: "Dashboard" },
  { href: "/saved", icon: Map, label: "Saved Locations" },
  { href: "/history", icon: Calendar, label: "History" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col justify-between w-20 py-10 items-center bg-black/25 backdrop-blur-xl rounded-[40px] h-[calc(100vh-4rem)] sticky top-8 ml-8 shrink-0">
      <div className="flex flex-col gap-8">
        {topLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={cn(
                "p-3 rounded-full transition-colors hover:bg-white/10",
                isActive ? "text-white" : "text-white/60"
              )}
              title={link.label}
            >
              <Icon className="w-6 h-6" />
            </Link>
          );
        })}
      </div>
      
      <div className="flex flex-col gap-8">
        <button className="p-3 rounded-full transition-colors text-white/60 hover:text-white hover:bg-white/10" title="Log Out">
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </aside>
  );
}
