import { Hero } from "@/components/home/hero";
import { HierarchyFlow } from "@/components/home/hierarchy-flow";
import { ScopeCard } from "@/components/home/scope-card";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-full">
      <Hero />
      <HierarchyFlow />
      <ScopeCard />
    </div>
  );
}
