import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { UmlClassNodeData } from '../components/UmlClassNode';

const DEFAULT_WIDTH = 200;
const HEADER_HEIGHT = 40;
const ATTRIBUTE_ROW_HEIGHT = 18;
const EMPTY_ROW_HEIGHT = 24;

function estimateHeight(node: Node<UmlClassNodeData>): number {
  const attrCount = node.data.umlClass.attributes.length;
  const rowsHeight = attrCount > 0 ? attrCount * ATTRIBUTE_ROW_HEIGHT : EMPTY_ROW_HEIGHT;
  return HEADER_HEIGHT + rowsHeight;
}

/**
 * Re-arranges UML class nodes into a top-down hierarchical layout with
 * dagre, using inheritance/relations as the edges that drive ranking.
 * Node sizes fall back to an attribute-count estimate when the actual
 * rendered size (node.measured) isn't available yet.
 */
export function layoutNodes(
  nodes: Node<UmlClassNodeData>[],
  edges: Edge[],
): Node<UmlClassNodeData>[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 100 });

  for (const node of nodes) {
    const width = node.measured?.width ?? DEFAULT_WIDTH;
    const height = node.measured?.height ?? estimateHeight(node);
    graph.setNode(node.id, { width, height });
  }
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const laidOut = graph.node(node.id);
    if (!laidOut) return node;
    const width = node.measured?.width ?? DEFAULT_WIDTH;
    const height = node.measured?.height ?? estimateHeight(node);
    return {
      ...node,
      position: { x: laidOut.x - width / 2, y: laidOut.y - height / 2 },
    };
  });
}
