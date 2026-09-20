export interface LayoutNode {
  id: string;
  dependsOnIds: string[];
  sortKey: string;
}

export interface Position {
  x: number;
  y: number;
}

const HORIZONTAL_SPACING = 280;
const VERTICAL_SPACING = 110;

/**
 * A small dependency-aware layered layout (no dagre dependency needed for a few dozen
 * nodes): each node's depth is 1 + the max depth of its prerequisites, so the graph reads
 * left-to-right in the same order work actually has to happen.
 */
export function computeLayeredPositions(nodes: LayoutNode[]): Map<string, Position> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depthCache = new Map<string, number>();
  const visiting = new Set<string>();

  function depthOf(id: string): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    if (visiting.has(id)) return 0; // cycle guard
    visiting.add(id);
    const node = byId.get(id);
    const deps = node?.dependsOnIds.filter((d) => byId.has(d)) ?? [];
    const depth = deps.length === 0 ? 0 : 1 + Math.max(...deps.map(depthOf));
    visiting.delete(id);
    depthCache.set(id, depth);
    return depth;
  }

  const layers = new Map<number, LayoutNode[]>();
  for (const node of nodes) {
    const d = depthOf(node.id);
    const list = layers.get(d) ?? [];
    list.push(node);
    layers.set(d, list);
  }

  const positions = new Map<string, Position>();
  for (const [depth, layerNodes] of layers) {
    layerNodes.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    layerNodes.forEach((node, index) => {
      positions.set(node.id, { x: depth * HORIZONTAL_SPACING, y: index * VERTICAL_SPACING });
    });
  }

  return positions;
}
