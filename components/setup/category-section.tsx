import { ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { MilestoneBlock, type MilestoneBlockData } from "@/components/setup/milestone-block";
import { AddMilestoneButton } from "@/components/setup/add-milestone-dialog";

export interface CategorySectionData {
  id: string;
  name: string;
  description: string | null;
  readiness: number;
  milestones: MilestoneBlockData[];
}

export function CategorySection({ category }: { category: CategorySectionData }) {
  return (
    <details className="group/category rounded-xl border border-border bg-surface" open={category.readiness < 100 && category.readiness > 0}>
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open/category:rotate-90" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{category.name}</div>
          {category.description && <div className="truncate text-xs text-muted-foreground">{category.description}</div>}
        </div>
        <span className="shrink-0 text-sm font-medium text-foreground">{Math.round(category.readiness)}%</span>
        <div className="w-20 shrink-0">
          <Progress value={category.readiness} />
        </div>
      </summary>

      <div className="space-y-2 border-t border-border p-3">
        {category.milestones.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">No milestones yet.</p>}
        {category.milestones.map((m) => (
          <MilestoneBlock key={m.id} milestone={m} />
        ))}
        <AddMilestoneButton categoryId={category.id} />
      </div>
    </details>
  );
}
