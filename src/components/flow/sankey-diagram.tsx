'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import type { FlowNode, FlowLink, FlowData } from '@/types';

interface SankeyDiagramProps {
  data: FlowData;
  width?: number;
  height?: number;
  className?: string;
  onNodeClick?: (node: FlowNode) => void;
  onLinkClick?: (link: FlowLink) => void;
}

// Internal types for the d3-sankey processed data
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
  color?: string;
}

// Color palette matching the spec
const COLORS = {
  income: '#3B82F6', // flow-blue
  master: '#6B7280', // gray-500
  savings: '#22C55E', // flow-green
  bills: '#EF4444', // flow-red
  discretionary: '#3B82F6', // flow-blue
  goals: '#8B5CF6', // flow-purple
  default: '#94A3B8', // slate-400
};

function getNodeColor(node: FlowNode): string {
  if (node.color) return node.color;

  switch (node.type) {
    case 'income':
      return COLORS.income;
    case 'master':
      return COLORS.master;
    case 'bucket':
      // Determine bucket type from name/context
      if (node.name.toLowerCase().includes('saving') || node.name.toLowerCase().includes('emergency')) {
        return COLORS.savings;
      }
      if (node.name.toLowerCase().includes('rent') || node.name.toLowerCase().includes('bill') || node.name.toLowerCase().includes('utilities')) {
        return COLORS.bills;
      }
      if (node.name.toLowerCase().includes('fun') || node.name.toLowerCase().includes('discretionary') || node.name.toLowerCase().includes('groceries')) {
        return COLORS.discretionary;
      }
      return COLORS.goals;
    case 'destination':
      return COLORS.default;
    default:
      return COLORS.default;
  }
}

export function SankeyDiagram({
  data,
  width = 800,
  height = 400,
  className = '',
  onNodeClick,
  onLinkClick,
}: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Transform data for d3-sankey
  const sankeyData = useMemo(() => {
    if (!data.nodes.length || !data.links.length) {
      return null;
    }

    // Create node index map
    const nodeMap = new Map(data.nodes.map((n, i) => [n.id, i]));

    const nodes = data.nodes.map(n => ({
      ...n,
      color: getNodeColor(n),
    }));

    const links = data.links
      .filter(l => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map(l => ({
        source: nodeMap.get(l.source)!,
        target: nodeMap.get(l.target)!,
        value: l.value,
        color: l.color,
      }));

    return { nodes, links };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !sankeyData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 120, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create sankey generator - using any to bypass strict typing issues with d3-sankey
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sankeyGenerator = (sankey as any)()
      .nodeId((d: { id?: string }) => d.id || '')
      .nodeWidth(20)
      .nodePadding(12)
      .extent([[0, 0], [innerWidth, innerHeight]]);

    // Generate layout
    const { nodes, links } = sankeyGenerator({
      nodes: sankeyData.nodes.map(d => ({ ...d })),
      links: sankeyData.links.map(d => ({ ...d })),
    }) as { nodes: ProcessedNode[]; links: ProcessedLink[] };

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add gradient definitions for links
    const defs = svg.append('defs');

    links.forEach((link, i) => {
      const gradient = defs
        .append('linearGradient')
        .attr('id', `link-gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x1 || 0)
        .attr('x2', link.target.x0 || 0);

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', link.source.color)
        .attr('stop-opacity', 0.5);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', link.target.color)
        .attr('stop-opacity', 0.5);
    });

    // Draw links
    const linkGroup = g
      .append('g')
      .attr('class', 'links')
      .attr('fill', 'none');

    linkGroup
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (_, i) => `url(#link-gradient-${i})`)
      .attr('stroke-width', (d) => Math.max(1, d.width || 0))
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', (d.width || 0) + 2);

        // Show tooltip
        if (tooltipRef.current) {
          tooltipRef.current.innerHTML = `
            <div class="font-medium">${d.source.name} → ${d.target.name}</div>
            <div class="text-lg money-amount">$${d.value.toLocaleString()}</div>
          `;
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.left = `${event.pageX + 10}px`;
          tooltipRef.current.style.top = `${event.pageY - 10}px`;
        }
      })
      .on('mouseout', function(_, d) {
        d3.select(this)
          .attr('opacity', 0.7)
          .attr('stroke-width', Math.max(1, d.width || 0));

        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
      })
      .on('click', (_, d) => {
        if (onLinkClick) {
          onLinkClick({
            source: d.source.id,
            target: d.target.id,
            value: d.value,
          });
        }
      });

    // Draw nodes
    const nodeGroup = g
      .append('g')
      .attr('class', 'nodes');

    const node = nodeGroup
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        if (onNodeClick) {
          onNodeClick({
            id: d.id,
            name: d.name,
            value: d.value || 0,
            color: d.color,
            type: d.type,
          });
        }
      });

    // Node rectangles
    node
      .append('rect')
      .attr('height', (d) => Math.max(1, (d.y1 || 0) - (d.y0 || 0)))
      .attr('width', sankeyGenerator.nodeWidth())
      .attr('fill', (d) => d.color)
      .attr('rx', 4)
      .attr('ry', 4)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 1);
      });

    // Node labels
    node
      .append('text')
      .attr('x', (d) => ((d.x0 || 0) < innerWidth / 2 ? sankeyGenerator.nodeWidth() + 8 : -8))
      .attr('y', (d) => ((d.y1 || 0) - (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => ((d.x0 || 0) < innerWidth / 2 ? 'start' : 'end'))
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', 'currentColor')
      .text((d) => d.name);

    // Node values
    node
      .append('text')
      .attr('x', (d) => ((d.x0 || 0) < innerWidth / 2 ? sankeyGenerator.nodeWidth() + 8 : -8))
      .attr('y', (d) => ((d.y1 || 0) - (d.y0 || 0)) / 2 + 14)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => ((d.x0 || 0) < innerWidth / 2 ? 'start' : 'end'))
      .attr('font-size', '11px')
      .attr('fill', '#6B7280')
      .attr('class', 'money-amount')
      .text((d) => d.value ? `$${d.value.toLocaleString()}` : '');

  }, [sankeyData, width, height, onNodeClick, onLinkClick]);

  if (!data.nodes.length) {
    return (
      <div className={`flex items-center justify-center bg-muted/20 rounded-lg ${className}`} style={{ width, height }}>
        <p className="text-muted-foreground">No allocation data to display</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
      />
      <div
        ref={tooltipRef}
        className="fixed hidden bg-popover text-popover-foreground shadow-lg rounded-md px-3 py-2 text-sm z-50 pointer-events-none border"
        style={{ display: 'none' }}
      />
    </div>
  );
}

// Helper function to generate flow data from allocation results
export function generateFlowData(
  incomeAmount: number,
  masterAccountName: string,
  buckets: Array<{
    name: string;
    virtualBalance: number;
    allocated?: number;
    targetExternalAccountId?: string;
    targetAccountName?: string;
  }>
): FlowData {
  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];

  // Filter buckets to only include those with positive allocation
  const activeBuckets = buckets.filter(b => {
    const amount = b.allocated ?? b.virtualBalance;
    return amount > 0;
  });

  // If no active buckets, return empty data
  if (activeBuckets.length === 0 || incomeAmount <= 0) {
    return { nodes: [], links: [] };
  }

  // Income node
  nodes.push({
    id: 'income',
    name: 'Income',
    value: incomeAmount,
    color: COLORS.income,
    type: 'income',
  });

  // Master account node
  nodes.push({
    id: 'master',
    name: masterAccountName || 'Main Account',
    value: incomeAmount,
    color: COLORS.master,
    type: 'master',
  });

  // Link income to master
  links.push({
    source: 'income',
    target: 'master',
    value: incomeAmount,
  });

  // Destination accounts (deduplicated)
  const destinationAccounts = new Map<string, string>();

  // Bucket nodes and links (only for active buckets)
  activeBuckets.forEach((bucket, index) => {
    const bucketId = `bucket-${index}`;
    const amount = bucket.allocated ?? bucket.virtualBalance;

    nodes.push({
      id: bucketId,
      name: bucket.name,
      value: amount,
      color: getNodeColor({ id: bucketId, name: bucket.name, value: amount, color: '', type: 'bucket' }),
      type: 'bucket',
    });

    // Link master to bucket
    links.push({
      source: 'master',
      target: bucketId,
      value: amount,
    });

    // If bucket has a target account, add destination node and link
    if (bucket.targetExternalAccountId) {
      const destId = `dest-${bucket.targetExternalAccountId}`;

      if (!destinationAccounts.has(destId)) {
        destinationAccounts.set(destId, bucket.targetAccountName || 'External Account');
        nodes.push({
          id: destId,
          name: bucket.targetAccountName || 'External Account',
          value: 0,
          color: COLORS.default,
          type: 'destination',
        });
      }

      links.push({
        source: bucketId,
        target: destId,
        value: amount,
      });
    }
  });

  // Update destination values
  links.forEach(link => {
    if (typeof link.target === 'string' && link.target.startsWith('dest-')) {
      const destNode = nodes.find(n => n.id === link.target);
      if (destNode) {
        destNode.value += link.value;
      }
    }
  });

  return { nodes, links };
}
