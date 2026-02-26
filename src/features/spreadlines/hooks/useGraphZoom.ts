import { useCallback, useRef } from 'react';
import * as d3 from 'd3';
import { GRAPH_CONFIG } from '@/features/workspace/const';

interface UseGraphZoomReturn {
  svgRef: React.RefObject<SVGSVGElement | null>;
  zoomRef: React.MutableRefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>;
  transformRef: React.MutableRefObject<d3.ZoomTransform>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomToFit: (nodes: { x?: number; y?: number }[], dimensions: { width: number; height: number }) => void;
}

export function useGraphZoom(): UseGraphZoomReturn {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(GRAPH_CONFIG.zoomAnimationMs).call(zoomRef.current.scaleBy, GRAPH_CONFIG.zoomStep);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(GRAPH_CONFIG.zoomAnimationMs)
      .call(zoomRef.current.scaleBy, 1 / GRAPH_CONFIG.zoomStep);
  }, []);

  const handleZoomToFit = useCallback((nodes: { x?: number; y?: number }[], dimensions: { width: number; height: number }) => {
    if (!svgRef.current || !zoomRef.current) return;
    if (nodes.length === 0) return;

    const { width, height } = dimensions;
    const padding = GRAPH_CONFIG.fitPadding;
    const xExtent = d3.extent(nodes, d => d.x) as [number, number];
    const yExtent = d3.extent(nodes, d => d.y) as [number, number];

    const graphWidth = xExtent[1] - xExtent[0] + GRAPH_CONFIG.nodeRadius * 4;
    const graphHeight = yExtent[1] - yExtent[0] + GRAPH_CONFIG.nodeRadius * 4;
    const graphCenterX = (xExtent[0] + xExtent[1]) / 2;
    const graphCenterY = (yExtent[0] + yExtent[1]) / 2;

    const scale = Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight, 1);
    const fitTranslateX = width / 2 - graphCenterX * scale;
    const fitTranslateY = height / 2 - graphCenterY * scale;

    d3.select(svgRef.current)
      .transition()
      .duration(GRAPH_CONFIG.zoomAnimationMs)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(fitTranslateX, fitTranslateY).scale(scale));
  }, []);

  return { svgRef, zoomRef, transformRef, handleZoomIn, handleZoomOut, handleZoomToFit };
}
