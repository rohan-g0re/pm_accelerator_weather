"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wind, Map, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", icon: Wind, label: "Weather" },
  { href: "/saved", icon: Map, label: "Saved" },
  { href: "/history", icon: Calendar, label: "History" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl pb-safe">
      <div className="flex justify-around items-center p-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                isActive ? "text-[#D4FF00]" : "text-white/60"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium tracking-wide">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}