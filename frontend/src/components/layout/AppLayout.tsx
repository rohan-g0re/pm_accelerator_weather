import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-dvh w-full max-w-screen overflow-x-hidden">
      <Sidebar />
      <main className="min-w-0 max-w-full flex-1 px-4 py-8 pb-28 sm:px-8 lg:px-12 lg:pb-8">
        <div className="min-w-0">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
