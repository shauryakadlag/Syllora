import React from "react";
import { 
  Laptop, 
  CalendarDays, 
  BookOpen, 
  Layers, 
  FileText, 
  ExternalLink 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FlowStep {
  step: number;
  label: string;
  example: string;
  icon: React.ElementType;
  description: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    step: 1,
    label: "Computer Engineering",
    example: "Branch Focus",
    icon: Laptop,
    description: "The core engineering discipline for this MVP release under the SPPU 2024 Pattern.",
  },
  {
    step: 2,
    label: "Semester",
    example: "Semester 3 & Semester 4",
    icon: CalendarDays,
    description: "Coursework organized by academic semester in Second Year Engineering (SE).",
  },
  {
    step: 3,
    label: "Subject",
    example: "Discrete Mathematics, Data Structures, etc.",
    icon: BookOpen,
    description: "Core theory and laboratory subjects defined for the semester.",
  },
  {
    step: 4,
    label: "Unit",
    example: "Unit I to Unit VI",
    icon: Layers,
    description: "Structured syllabus units dividing the course into teaching modules.",
  },
  {
    step: 5,
    label: "Topic",
    example: "Granular Concept",
    icon: FileText,
    description: "Individual concepts and sub-topics specified within each unit.",
  },
  {
    step: 6,
    label: "Learning Resources",
    example: "Videos, Notes, References",
    icon: ExternalLink,
    description: "Curated learning materials mapped topic-by-topic to support student study.",
  },
];

export function HierarchyFlow() {
  return (
    <section id="flow" className="py-12 md:py-16 border-t border-border/70 bg-secondary/30">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            The Syllabus Hierarchy
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            Within the fixed context of SPPU 2024 Pattern, Syllora organizes course material
            through a clear, step-by-step navigation path.
          </p>
        </div>

        {/* Step-by-step hierarchy grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {FLOW_STEPS.map((step) => {
            const IconComponent = step.icon;
            return (
              <Card key={step.step} className="border-border/80 hover:border-primary/40 transition-colors shadow-2xs">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {step.step}
                    </span>
                    <h3 className="font-semibold text-base text-foreground">
                      {step.label}
                    </h3>
                  </div>

                  <div className="text-xs font-medium text-primary mb-2 flex items-center gap-1.5 bg-primary/5 px-2.5 py-1 rounded-md border border-primary/10 w-fit">
                    <IconComponent className="h-3.5 w-3.5" />
                    <span>{step.example}</span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Linear breadcrumb visual summary */}
        <div className="mt-10 p-4 rounded-xl border border-border bg-card text-center shadow-2xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            MVP User Flow
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-medium text-foreground">
            <span className="text-primary font-semibold">Computer Engineering</span>
            <span className="text-muted-foreground">→</span>
            <span>Semester</span>
            <span className="text-muted-foreground">→</span>
            <span>Subject</span>
            <span className="text-muted-foreground">→</span>
            <span>Unit</span>
            <span className="text-muted-foreground">→</span>
            <span>Topic</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-primary font-semibold">Learning Resources</span>
          </div>
        </div>
      </div>
    </section>
  );
}