import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full max-w-screen overflow-hidden relative z-10">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden pb-24 lg:pb-0 px-4 sm:px-8 lg:px-12 py-8">
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          {children}
        </div>

        {/* Footer Info Section */}
        <footer className="shrink-0 pt-4 pb-1 text-center text-xs text-white/40">
          <p>Built by Rohan</p>
          <p className="mt-2 max-w-2xl mx-auto">
            <strong>Product Manager Accelerator:</strong> Helping professionals transition into Product Management and land their dream jobs at top tech companies through a community-driven, mentorship-based program.
          </p>
        </footer>
      </main>
      <MobileNav />
    </div>
  );
}
