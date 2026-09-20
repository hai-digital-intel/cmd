"use client";

import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Handle,
  Position as FlowPosition,
} from "@xyflow/react";
import Link from "next/link";
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeLayeredPositions } from "@/lib/services/graphLayout";
import { MILESTONE_STATUS_LABEL, type MilestoneNodeStatus } from "@/lib/services/milestoneStatus";
import { cn } from "@/lib/utils";

export interface MapMilestoneData extends Record<string, unknown> {
  id: string;
  title: string;
  categoryName: string;
  status: MilestoneNodeStatus;
  requiredForLaunch: boolean;
  taskCount: number;
  doneTaskCount: number;
  dependsOnIds: string[];
  isCriticalPath: boolean;
}

const STATUS_COLORS: Record<MilestoneNodeStatus, string> = {
  DONE: "border-success bg-success-bg/60",
  BLOCKED: "border-blocked bg-blocked-bg/60",
  WAITING: "border-waiting bg-waiting-bg/60",
  IN_PROGRESS: "border-progress bg-progress-bg/60",
  AVAILABLE: "border-accent bg-surface",
  NOT_STARTED: "border-border bg-surface-sunken",
};

function MilestoneNode({ data }: { data: MapMilestoneData }) {
  return (
    <div className={cn("w-56 rounded-lg border-2 px-3 py-2.5 shadow-sm", STATUS_COLORS[data.status])}>
      <Handle type="target" position={FlowPosition.Left} className="!bg-border-strong" />
      <Handle type="source" position={FlowPosition.Right} className="!bg-border-strong" />
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{data.categoryName}</div>
      <div className="mt-0.5 text-sm font-medium leading-snug text-foreground">{data.title}</div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {data.doneTaskCount}/{data.taskCount} done
        </span>
        {data.isCriticalPath && <span className="font-medium text-accent">Critical path</span>}
      </div>
    </div>
  );
}

const nodeTypes = { milestone: MilestoneNode };

export function SetupMap({ milestones }: { milestones: MapMilestoneData[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selected, setSelected] = useState<MapMilestoneData | null>(null);

  const categories = useMemo(() => Array.from(new Set(milestones.map((m) => m.categoryName))).sort(), [milestones]);

  const positions = useMemo(
    () =>
      computeLayeredPositions(
        milestones.map((m) => ({ id: m.id, dependsOnIds: m.dependsOnIds, sortKey: `${m.categoryName}-${m.title}` })),
      ),
    [milestones],
  );

  const visibleMilestones = categoryFilter === "all" ? milestones : milestones.filter((m) => m.categoryName === categoryFilter);
  const visibleIds = new Set(visibleMilestones.map((m) => m.id));

  const nodes: Node[] = milestones.map((m) => ({
    id: m.id,
    type: "milestone",
    position: positions.get(m.id) ?? { x: 0, y: 0 },
    data: m,
    hidden: !visibleIds.has(m.id),
  }));

  const edges: Edge[] = milestones.flatMap((m) =>
    m.dependsOnIds.map((depId) => ({
      id: `${depId}->${m.id}`,
      source: depId,
      target: m.id,
      animated: m.status !== "DONE",
      style: { stroke: "var(--color-border-strong)" },
      hidden: !visibleIds.has(m.id) || !visibleIds.has(depId),
    })),
  );

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-xl border border-border">
      <div className="absolute left-3 top-3 z-10">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48 bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => setSelected(node.data as MapMilestoneData)}
        minZoom={0.2}
      >
        <Background gap={20} color="var(--color-border)" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-surface" />
      </ReactFlow>

      {selected && (
        <Card className="absolute right-3 top-3 z-10 w-64 p-4">
          <button className="absolute right-2 top-2 text-muted-foreground hover:text-foreground" onClick={() => setSelected(null)} aria-label="Close">
            <X className="size-3.5" />
          </button>
          <div className="text-xs font-medium uppercase tracking-wide text-accent">{selected.categoryName}</div>
          <div className="mt-0.5 text-sm font-semibold text-foreground">{selected.title}</div>
          <div className="mt-2 flex items-center gap-1.5">
            <Badge variant={selected.status === "DONE" ? "success" : selected.status === "BLOCKED" ? "blocked" : selected.status === "WAITING" ? "waiting" : "default"}>
              {MILESTONE_STATUS_LABEL[selected.status]}
            </Badge>
            {selected.requiredForLaunch && <Badge variant="outline">Required</Badge>}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {selected.doneTaskCount}/{selected.taskCount} tasks done
          </div>
          <Link href="/setup" className="focus-ring mt-3 block text-xs text-accent hover:underline">
            View in Setup →
          </Link>
        </Card>
      )}
    </div>
  );
}
