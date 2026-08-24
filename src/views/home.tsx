import { ScrollTerrain } from "@/components/ui/ScrollTerrain";

/**
 * Home view — a Server Component.
 *
 * This is the starting point for new work: if the project is empty and no other
 * instructions are provided, begin developing here (route `/`). Build sections
 * as client leaves so this view stays a Server Component (hard rule #6).
 */
export const HomeView = () => {
  return (
    // `self-stretch`: `body` centers its flex children (globals.css), so
    // without it `main` would shrink-wrap instead of spanning the viewport.
    <main className="min-h-lvh w-screen self-stretch">
      <ScrollTerrain className="h-lvh w-full" />
    </main>
  );
};
