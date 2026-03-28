'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { motion, AnimatePresence } from 'framer-motion';
import type { FlowNode, FlowLink, FlowData } from '@/types';

interface AnimatedSankeyProps {
  data: FlowData;
  width?: number;
  height?: number;
  className?: string;
  animated?: boolean;
  onNodeClick?: (node: FlowNode) => void;
  onLinkClick?: (link: FlowLink) => void;
  onAnimationComplete?: () => void;
}

interface ProcessedNode {
  id: string;
  name: string;
  value: number;
  color: string;
  type: FlowNode['type'];
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

interface ProcessedLink {
  source: ProcessedNode;
  target: ProcessedNode;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
  color?: string;
}

interface Particle {
  id: string;
  linkIndex: number;
  progress: number;
  size: number;
  opacity: number;
}

const COLORS = {
  income: '#3B82F6',
  master: '#6B7280',
  savings: '#22C55E',
  bills: '#EF4444',
  discretionary: '#3B82F6',
  goals: '#8B5CF6',
  default: '#94A3B8',
};

function getNodeColor(node: FlowNode): string {
  if (node.color) return node.color;
  switch (node.type) {
    case 'income': return COLORS.income;
    case 'master': return COLORS.master;
    case 'bucket':
      if (node.name.toLowerCase().includes('saving') || node.name.toLowerCase().includes('emergency')) return COLORS.savings;
      if (node.name.toLowerCase().includes('rent') || node.name.toLowerCase().includes('bill') || node.name.toLowerCase().includes('utilities')) return COLORS.bills;
      if (node.name.toLowerCase().includes('fun') || node.name.toLowerCase().includes('discretionary') || node.name.toLowerCase().includes('groceries')) return COLORS.discretionary;
      return COLORS.goals;
    case 'destination': return COLORS.default;
    default: return COLORS.default;
  }
}

export function AnimatedSankey({
  data,
  width = 800,
  height = 400,
  className = '',
  animated = true,
  onNodeClick,
  onLinkClick,
  onAnimationComplete,
}: AnimatedSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [processedData, setProcessedData] = useState<{ nodes: ProcessedNode[]; links: ProcessedLink[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const animationRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const margin = { top: 20, right: 140, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Calculate total income for percentage display
  const totalIncome = useMemo(() => {
    const incomeNode = data.nodes.find(n => n.type === 'income');
    return incomeNode?.value || data.links.reduce((sum, l) => sum + l.value, 0);
  }, [data]);

  // Transform data for d3-sankey
  const sankeyData = useMemo(() => {
    if (!data.nodes.length || !data.links.length) return null;
    const nodeIds = new Set(data.nodes.map(n => n.id));
    const nodes = data.nodes.map(n => ({ ...n, color: getNodeColor(n) }));
    // Keep links with string IDs - sankey will resolve them via nodeId()
    const links = data.links
      .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
      .map(l => ({
        source: l.source,  // Keep as string ID
        target: l.target,  // Keep as string ID
        value: l.value,
        color: l.color,
      }));
    return { nodes, links };
  }, [data]);

  // Particle animation
  const startParticleAnimation = (links: ProcessedLink[]) => {
    const particleCount = 30;
    const initialParticles: Particle[] = [];

    // Create initial particles distributed across links
    links.forEach((_, linkIndex) => {
      const count = Math.max(2, Math.floor(particleCount * (links[linkIndex].value / links.reduce((s, l) => s + l.value, 0))));
      for (let i = 0; i < count; i++) {
        initialParticles.push({
          id: `${linkIndex}-${i}`,
          linkIndex,
          progress: Math.random(),
          size: 3 + Math.random() * 3,
          opacity: 0.6 + Math.random() * 0.4,
        });
      }
    });

    setParticles(initialParticles);

    let lastTime = performance.now();
    const speed = 0.0004; // Progress per ms

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      setParticles(prev => prev.map(p => ({
        ...p,
        progress: (p.progress + speed * deltaTime) % 1,
      })));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Stop animation after a duration and call completion callback
    setTimeout(() => {
      setIsAnimating(false);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 3000);
  };

  // Generate sankey layout - setState is intentional here for async computation
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!sankeyData || sankeyData.nodes.length === 0) {
      setProcessedData(null);
      setIsProcessing(false);
      return;
    }

    // Need at least one link for sankey to work
    if (sankeyData.links.length === 0) {
      setProcessedData(null);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sankeyGenerator = (sankey as any)()
        .nodeId((d: { id?: string }) => d.id || '')
        .nodeWidth(20)
        .nodePadding(16)
        .extent([[0, 0], [innerWidth, innerHeight]]);

      const { nodes, links } = sankeyGenerator({
        nodes: sankeyData.nodes.map(d => ({ ...d })),
        links: sankeyData.links.map(d => ({ ...d })),
      }) as { nodes: ProcessedNode[]; links: ProcessedLink[] };

      setProcessedData({ nodes, links });
      setIsProcessing(false);

      // Start animation when data changes
      if (animated && links.length > 0) {
        setIsAnimating(true);
        startParticleAnimation(links);
      }
    } catch (error) {
      console.error('Sankey layout error:', error);
      setProcessedData(null);
      setIsProcessing(false);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sankeyData, innerWidth, innerHeight, animated]);

  // Get position along a link path
  const getParticlePosition = (link: ProcessedLink, progress: number) => {
    const sourceX = (link.source.x1 || 0);
    const targetX = (link.target.x0 || 0);
    const sourceY = (link.y0 || 0);
    const targetY = (link.y1 || 0);

    // Cubic bezier curve matching sankeyLinkHorizontal
    const midX = (sourceX + targetX) / 2;
    const t = progress;
    const mt = 1 - t;

    // Bezier control points
    const x = mt * mt * mt * sourceX + 3 * mt * mt * t * midX + 3 * mt * t * t * midX + t * t * t * targetX;
    const y = mt * mt * mt * sourceY + 3 * mt * mt * t * sourceY + 3 * mt * t * t * targetY + t * t * t * targetY;

    return { x: x + margin.left, y: y + margin.top };
  };

  if (!data.nodes.length || !data.links.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center justify-center bg-muted/20 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <p className="text-muted-foreground">Add some income to see your money flow</p>
      </motion.div>
    );
  }

  // If sankey processing is in progress or failed, show appropriate message
  if (!processedData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center justify-center bg-muted/20 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          {isProcessing ? (
            <p className="text-muted-foreground">Processing flow data...</p>
          ) : (
            <>
              <p className="text-muted-foreground">Unable to render flow diagram</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try running an allocation first</p>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <svg ref={svgRef} width={width} height={height} className="overflow-visible">
        <defs>
          {/* Gradients for links */}
          {processedData?.links.map((link, i) => (
            <linearGradient
              key={`gradient-${i}`}
              id={`animated-link-gradient-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={link.source.x1 || 0}
              x2={link.target.x0 || 0}
            >
              <stop offset="0%" stopColor={link.source.color} stopOpacity={0.6} />
              <stop offset="100%" stopColor={link.target.color} stopOpacity={0.6} />
            </linearGradient>
          ))}
          {/* Glow filter for particles */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Links */}
          <g className="links" fill="none">
            {processedData?.links.map((link, i) => (
              <motion.path
                key={`link-${i}`}
                d={sankeyLinkHorizontal()(link as never) || ''}
                stroke={`url(#animated-link-gradient-${i})`}
                strokeWidth={Math.max(1, link.width || 0)}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.7 }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] }}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  if (tooltipRef.current) {
                    const percentage = totalIncome > 0 ? ((link.value / totalIncome) * 100).toFixed(1) : '0';
                    tooltipRef.current.innerHTML = `
                      <div class="font-medium">${link.source.name} → ${link.target.name}</div>
                      <div class="text-lg money-amount">$${link.value.toLocaleString()}</div>
                      <div class="text-xs text-muted-foreground">${percentage}% of your income</div>
                    `;
                    tooltipRef.current.style.display = 'block';
                    tooltipRef.current.style.left = `${e.pageX + 10}px`;
                    tooltipRef.current.style.top = `${e.pageY - 10}px`;
                  }
                }}
                onMouseLeave={() => {
                  if (tooltipRef.current) {
                    tooltipRef.current.style.display = 'none';
                  }
                }}
                onClick={() => onLinkClick?.({ source: link.source.id, target: link.target.id, value: link.value })}
                whileHover={{ strokeWidth: (link.width || 0) + 4, opacity: 1 }}
              />
            ))}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {processedData?.nodes.map((node, i) => (
              <motion.g
                key={`node-${node.id}`}
                transform={`translate(${node.x0},${node.y0})`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.05 }}
                style={{ cursor: 'pointer' }}
                onClick={() => onNodeClick?.({ id: node.id, name: node.name, value: node.value, color: node.color, type: node.type })}
              >
                <motion.rect
                  height={Math.max(1, (node.y1 || 0) - (node.y0 || 0))}
                  width={20}
                  fill={node.color}
                  rx={4}
                  ry={4}
                  whileHover={{ scale: 1.05, filter: 'brightness(1.1)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                />
                {/* Node label */}
                <text
                  x={(node.x0 || 0) < innerWidth / 2 ? 28 : -8}
                  y={((node.y1 || 0) - (node.y0 || 0)) / 2}
                  dy="0.35em"
                  textAnchor={(node.x0 || 0) < innerWidth / 2 ? 'start' : 'end'}
                  fontSize="12px"
                  fontWeight="500"
                  fill="currentColor"
                >
                  {node.name}
                </text>
                {/* Node value */}
                <text
                  x={(node.x0 || 0) < innerWidth / 2 ? 28 : -8}
                  y={((node.y1 || 0) - (node.y0 || 0)) / 2 + 16}
                  dy="0.35em"
                  textAnchor={(node.x0 || 0) < innerWidth / 2 ? 'start' : 'end'}
                  fontSize="11px"
                  fill="#6B7280"
                  className="money-amount"
                >
                  {node.value ? `$${node.value.toLocaleString()}` : ''}
                </text>
              </motion.g>
            ))}
          </g>
        </g>

        {/* Animated particles */}
        <AnimatePresence>
          {isAnimating && processedData?.links.map((link, linkIndex) =>
            particles
              .filter(p => p.linkIndex === linkIndex)
              .map(particle => {
                const pos = getParticlePosition(link, particle.progress);
                return (
                  <motion.circle
                    key={particle.id}
                    cx={pos.x}
                    cy={pos.y}
                    r={particle.size}
                    fill={link.source.color}
                    filter="url(#glow)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: particle.opacity }}
                    exit={{ opacity: 0 }}
                  />
                );
              })
          )}
        </AnimatePresence>
      </svg>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed hidden bg-popover text-popover-foreground shadow-lg rounded-md px-3 py-2 text-sm z-50 pointer-events-none border"
        style={{ display: 'none' }}
      />

      {/* Animation indicator */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-2 right-2 text-xs text-muted-foreground flex items-center gap-1"
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
            Money flowing...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
