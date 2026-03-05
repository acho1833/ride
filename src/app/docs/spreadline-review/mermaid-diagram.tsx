'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#3b82f6',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#60a5fa',
      lineColor: '#94a3b8',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
      background: '#0f172a',
      mainBkg: '#1e293b',
      nodeBorder: '#60a5fa',
      clusterBkg: '#1e293b',
      clusterBorder: '#334155',
      titleColor: '#e2e8f0',
      edgeLabelBackground: '#1e293b',
      nodeTextColor: '#e2e8f0',
      actorTextColor: '#e2e8f0',
      actorBkg: '#1e293b',
      actorBorder: '#60a5fa',
      actorLineColor: '#475569',
      signalColor: '#94a3b8',
      signalTextColor: '#e2e8f0',
      labelBoxBkgColor: '#1e293b',
      labelBoxBorderColor: '#334155',
      labelTextColor: '#e2e8f0',
      loopTextColor: '#e2e8f0',
      noteBkgColor: '#1e3a5f',
      noteTextColor: '#e2e8f0',
      noteBorderColor: '#3b82f6',
      activationBkgColor: '#1e3a5f',
      activationBorderColor: '#3b82f6',
      sequenceNumberColor: '#e2e8f0'
    },
    flowchart: { curve: 'basis', padding: 15 },
    sequence: { mirrorActors: false, messageMargin: 40 }
  });
  mermaidInitialized = true;
}

let idCounter = 0;

interface MermaidDiagramProps {
  chart: string;
  caption?: string;
}

export default function MermaidDiagram({ chart, caption }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${++idCounter}-${Date.now()}`);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return;
      try {
        initMermaid();
        const { svg } = await mermaid.render(idRef.current, chart.trim());
        containerRef.current.innerHTML = svg;
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to render diagram');
      }
    };
    render();
  }, [chart]);

  return (
    <div className="my-4">
      <div ref={containerRef} className="bg-muted/50 flex min-h-[80px] justify-center overflow-x-auto rounded-lg p-4">
        {error && <pre className="text-destructive p-2 text-sm">{error}</pre>}
      </div>
      {caption && <p className="text-muted-foreground mt-2 text-center text-sm italic">{caption}</p>}
    </div>
  );
}
