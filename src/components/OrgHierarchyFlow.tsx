/**
 * CatalystOS - Interactive Team Members Hierarchy (React Flow)
 * Visual organizational tree: Founder & CEO -> Core Operational Domains -> Team Members.
 * Built with @xyflow/react, Aura light theme styling, and interactive detail drawers.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Panel,
  Handle,
  Position,
  MarkerType,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TeamMember } from '../types';
import {
  Crown,
  Users,
  Code2,
  Compass,
  TrendingUp,
  Coins,
  Boxes,
  ShieldCheck,
  Mail,
  UserPlus,
  Trash2,
  X,
  Search,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

// ── DOMAIN METADATA CONFIGURATION ──────────────────────────────────────────
export interface DomainConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const CORE_DOMAINS: DomainConfig[] = [
  {
    id: 'engineering',
    label: 'Engineering & Platform',
    icon: Code2,
    color: '#4f46e5',
    bgColor: 'rgba(79, 70, 229, 0.06)',
    borderColor: 'rgba(79, 70, 229, 0.25)',
    description: 'UPI stack, backend architecture, payment security & microservices.'
  },
  {
    id: 'product',
    label: 'Product & Design',
    icon: Compass,
    color: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.06)',
    borderColor: 'rgba(217, 119, 6, 0.25)',
    description: 'Merchant checkout UX, feature roadmaps & D2C buyer workflows.'
  },
  {
    id: 'growth',
    label: 'Growth & Marketing',
    icon: TrendingUp,
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.06)',
    borderColor: 'rgba(5, 150, 105, 0.25)',
    description: 'Customer acquisition, partner ecosystem, brand campaigns & GTM.'
  },
  {
    id: 'finance',
    label: 'Finance & Treasury',
    icon: Coins,
    color: '#7c3aed',
    bgColor: 'rgba(124, 58, 237, 0.06)',
    borderColor: 'rgba(124, 58, 237, 0.25)',
    description: 'Runway modeling, FP&A forecasts, nodal accounts & tax compliance.'
  },
  {
    id: 'operations',
    label: 'Operations & Logistics',
    icon: Boxes,
    color: '#0891b2',
    bgColor: 'rgba(8, 145, 178, 0.06)',
    borderColor: 'rgba(8, 145, 178, 0.25)',
    description: 'Pan-India shipping coordination, KYC verification & SLA tracking.'
  },
  {
    id: 'people_legal',
    label: 'People & Legal Governance',
    icon: ShieldCheck,
    color: '#e11d48',
    bgColor: 'rgba(225, 29, 72, 0.06)',
    borderColor: 'rgba(225, 29, 72, 0.25)',
    description: 'Talent hiring pipelines, corporate contracts, and regulatory filings.'
  }
];

export const INITIAL_DEMO_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'team_rajesh',
    fullName: 'Rajesh Verma',
    name: 'Rajesh Verma',
    email: 'rajesh.verma@catalyst.os',
    role: 'Head of Fintech Operations',
    department: 'Engineering & Platform',
    status: 'Active',
    joinedAt: '2025-01-10T09:00:00.000Z'
  },
  {
    id: 'team_priya',
    fullName: 'Priya Nair',
    name: 'Priya Nair',
    email: 'priya.nair@catalyst.os',
    role: 'Lead Integrations Engineer',
    department: 'Engineering & Platform',
    status: 'Active',
    joinedAt: '2025-01-15T09:00:00.000Z'
  },
  {
    id: 'team_arjun',
    fullName: 'Arjun Patel',
    name: 'Arjun Patel',
    email: 'arjun.patel@catalyst.os',
    role: 'Platform & Cloud Architect',
    department: 'Engineering & Platform',
    status: 'Active',
    joinedAt: '2025-02-01T09:00:00.000Z'
  },
  {
    id: 'team_ananya',
    fullName: 'Ananya Sharma',
    name: 'Ananya Sharma',
    email: 'ananya.sharma@catalyst.os',
    role: 'VP of Product & Growth',
    department: 'Product & Design',
    status: 'Active',
    joinedAt: '2025-01-12T09:00:00.000Z'
  },
  {
    id: 'team_vikram',
    fullName: 'Vikram Sen',
    name: 'Vikram Sen',
    email: 'vikram.sen@catalyst.os',
    role: 'Growth Marketing Director',
    department: 'Growth & Marketing',
    status: 'Active',
    joinedAt: '2025-02-10T09:00:00.000Z'
  },
  {
    id: 'team_rohit',
    fullName: 'Rohit Mehra',
    name: 'Rohit Mehra',
    email: 'rohit.mehra@catalyst.os',
    role: 'Head of Treasury & FP&A',
    department: 'Finance & Treasury',
    status: 'Active',
    joinedAt: '2025-01-20T09:00:00.000Z'
  },
  {
    id: 'team_aditi',
    fullName: 'Aditi Rao',
    name: 'Aditi Rao',
    email: 'aditi.rao@catalyst.os',
    role: 'Operations & Logistics Lead',
    department: 'Operations & Logistics',
    status: 'Active',
    joinedAt: '2025-02-15T09:00:00.000Z'
  },
  {
    id: 'team_ritu',
    fullName: 'Ritu Mathur',
    name: 'Ritu Mathur',
    email: 'ritu.mathur@catalyst.os',
    role: 'People Operations & Legal Lead',
    department: 'People & Legal Governance',
    status: 'Active',
    joinedAt: '2025-01-25T09:00:00.000Z'
  }
];

// Helper to match or create domain config from member's department string
export function resolveDomain(department: string): DomainConfig {
  const norm = (department || '').toLowerCase().trim();
  if (norm.includes('eng') || norm.includes('platform') || norm.includes('tech') || norm.includes('dev') || norm.includes('cloud')) {
    return CORE_DOMAINS[0];
  }
  if (norm.includes('prod') || norm.includes('design') || norm.includes('ux') || norm.includes('ui')) {
    return CORE_DOMAINS[1];
  }
  if (norm.includes('growth') || norm.includes('market') || norm.includes('sales') || norm.includes('rev')) {
    return CORE_DOMAINS[2];
  }
  if (norm.includes('fin') || norm.includes('treas') || norm.includes('acc') || norm.includes('tax')) {
    return CORE_DOMAINS[3];
  }
  if (norm.includes('op') || norm.includes('logist') || norm.includes('fulfill') || norm.includes('supply')) {
    return CORE_DOMAINS[4];
  }
  if (norm.includes('peop') || norm.includes('hr') || norm.includes('talent') || norm.includes('legal') || norm.includes('gov')) {
    return CORE_DOMAINS[5];
  }
  // Fallback for custom domains
  return {
    id: `custom_${norm.replace(/\s+/g, '_')}`,
    label: department || 'General Operations',
    icon: Layers,
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.06)',
    borderColor: 'rgba(100, 116, 139, 0.25)',
    description: `Dedicated ${department} operations and strategic execution.`
  };
}

// ── CUSTOM NODE: FOUNDER / ROOT NODE ───────────────────────────────────────
function FounderNode({ data }: { data: any }) {
  return (
    <div 
      className="p-5 rounded-2xl border transition-all cursor-pointer select-none min-w-[300px] max-w-[340px] shadow-sm hover:shadow-md"
      style={{
        backgroundColor: 'var(--c-surface)',
        borderColor: 'var(--c-fg)',
        boxShadow: 'var(--shadow-md)'
      }}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--c-border)' }}>
        <div className="flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--c-accent)' }}>
            Venture Founder & Owner
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
          Apex Authority
        </span>
      </div>

      <div className="flex items-center gap-3.5">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-sm uppercase shrink-0 shadow-sm"
          style={{ backgroundColor: 'var(--c-fg)', color: 'var(--c-bg)' }}
        >
          {data.name?.slice(0, 2) || 'FO'}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--c-fg)' }}>{data.name}</h3>
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--c-muted)' }}>{data.role || 'Founder & CEO'}</p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono" style={{ color: 'var(--c-muted)' }}>
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{data.email}</span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t flex items-center justify-between text-[11px] font-mono" style={{ borderColor: 'var(--c-border)' }}>
        <span style={{ color: 'var(--c-muted)' }}>Organization Scale:</span>
        <span className="font-bold" style={{ color: 'var(--c-fg)' }}>
          {data.totalMembers} Members · {data.numDomains} Domains
        </span>
      </div>

      {/* Connection Handle to Domains */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: 'var(--c-fg)', width: 8, height: 8 }} 
      />
    </div>
  );
}

// ── CUSTOM NODE: DOMAIN NODE ───────────────────────────────────────────────
function DomainNode({ data }: { data: any }) {
  const Icon = data.domain.icon;
  return (
    <div 
      className="p-4 rounded-xl border transition-all cursor-pointer select-none min-w-[240px] max-w-[270px] shadow-sm hover:shadow-md"
      style={{
        backgroundColor: 'var(--c-surface)',
        borderColor: data.domain.borderColor,
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: data.domain.color, width: 7, height: 7 }} 
      />

      <div className="flex items-center justify-between mb-2">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
          style={{ backgroundColor: data.domain.bgColor, color: data.domain.color }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-1">
          <span 
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: data.domain.bgColor, color: data.domain.color }}
          >
            {data.memberCount} {data.memberCount === 1 ? 'Person' : 'People'}
          </span>
          {data.onAddClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onAddClick(data.domain.label);
              }}
              title={`Add member to ${data.domain.label}`}
              className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <h4 className="text-xs font-bold" style={{ color: 'var(--c-fg)' }}>
        {data.domain.label}
      </h4>
      <p className="text-[10px] line-clamp-2 mt-0.5 leading-relaxed" style={{ color: 'var(--c-muted)' }}>
        {data.domain.description}
      </p>

      <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] font-mono" style={{ borderColor: 'var(--c-border)' }}>
        <span style={{ color: 'var(--c-muted)' }}>Reports to:</span>
        <span className="font-semibold" style={{ color: 'var(--c-fg)' }}>Founder / Owner</span>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: data.domain.color, width: 7, height: 7 }} 
      />
    </div>
  );
}

// ── CUSTOM NODE: TEAM MEMBER NODE ──────────────────────────────────────────
function MemberNode({ data }: { data: any }) {
  const isSelected = data.isSelected;
  return (
    <div 
      className="p-3.5 rounded-xl border transition-all cursor-pointer select-none min-w-[220px] max-w-[250px] shadow-xs hover:shadow-sm"
      style={{
        backgroundColor: isSelected ? 'var(--c-surface-2)' : 'var(--c-surface)',
        borderColor: isSelected ? 'var(--c-fg)' : 'var(--c-border)',
        outline: isSelected ? '2px solid var(--c-fg)' : 'none'
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: 'var(--c-border-strong)', width: 6, height: 6 }} 
      />

      <div className="flex items-center gap-2.5">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0"
          style={{ backgroundColor: 'var(--c-surface-2)', color: 'var(--c-fg)', border: '1px solid var(--c-border)' }}
        >
          {data.member.fullName?.slice(0, 2) || 'TM'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h5 className="text-xs font-bold truncate" style={{ color: 'var(--c-fg)' }}>
              {data.member.fullName}
            </h5>
            <span 
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${data.member.status === 'Invited' ? 'bg-amber-500' : 'bg-emerald-500'}`} 
              title={data.member.status || 'Active'}
            />
          </div>
          <p className="text-[11px] font-medium truncate" style={{ color: 'var(--c-muted)' }}>
            {data.member.role}
          </p>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] font-mono" style={{ borderColor: 'var(--c-border)' }}>
        <span className="truncate max-w-[130px]" style={{ color: 'var(--c-muted)' }}>
          {data.member.email || 'roster@catalyst.os'}
        </span>
        <span 
          className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold"
          style={{ backgroundColor: 'var(--c-surface-2)', color: 'var(--c-fg)' }}
        >
          {data.member.status || 'Active'}
        </span>
      </div>
    </div>
  );
}

const nodeTypes = {
  founderNode: FounderNode,
  domainNode: DomainNode,
  memberNode: MemberNode
};

// ── COMPONENT PROPS ────────────────────────────────────────────────────────
interface OrgHierarchyFlowProps {
  founder: {
    name: string;
    email: string;
    role: string;
  };
  teamMembers: TeamMember[];
  onAddMemberClick?: (prefillDept?: string) => void;
  onRemoveMember?: (id: string) => Promise<void>;
  companyName?: string;
}

export default function OrgHierarchyFlow({
  founder,
  teamMembers,
  onAddMemberClick,
  onRemoveMember,
  companyName = 'Venture'
}: OrgHierarchyFlowProps) {
  const [selectedNode, setSelectedNode] = useState<{ type: 'founder' | 'domain' | 'member'; data: any } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDomain, setFilterDomain] = useState<string>('ALL');

  // Group team members by resolved domain
  const { domainsWithMembers, totalPeopleCount } = useMemo(() => {
    const map = new Map<string, { domain: DomainConfig; members: TeamMember[] }>();

    // Seed core domains so the org structure is clear even if zero members are in a domain
    CORE_DOMAINS.forEach((d) => {
      map.set(d.id, { domain: d, members: [] });
    });

    // Populate members
    teamMembers.forEach((m) => {
      const resolved = resolveDomain(m.department || m.role || 'General');
      if (!map.has(resolved.id)) {
        map.set(resolved.id, { domain: resolved, members: [] });
      }
      map.get(resolved.id)!.members.push(m);
    });

    const list = Array.from(map.values()).filter(item => {
      if (filterDomain === 'ALL') return true;
      return item.domain.id === filterDomain;
    });

    return {
      domainsWithMembers: list,
      totalPeopleCount: teamMembers.length + 1
    };
  }, [teamMembers, filterDomain]);

  // Construct React Flow Nodes and Edges with clean hierarchical coordinates
  const { nodes: computedNodes, edges: computedEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const activeList = domainsWithMembers;
    const numDomains = activeList.length;

    // Layout configuration
    const colWidth = 270;
    const gapX = 36;
    const startY = 40;
    const domainY = 220;
    const memberStartY = 370;
    const memberGapY = 100;

    const totalWidth = numDomains * colWidth + Math.max(0, numDomains - 1) * gapX;
    const founderX = Math.max(20, (totalWidth - 320) / 2);

    // 1. Root Node: Founder
    nodes.push({
      id: 'founder-root',
      type: 'founderNode',
      position: { x: founderX, y: startY },
      data: {
        name: founder.name,
        email: founder.email,
        role: founder.role,
        totalMembers: totalPeopleCount,
        numDomains: activeList.length
      }
    });

    // 2. Domain & Member Nodes
    activeList.forEach((group, dIdx) => {
      const currentX = dIdx * (colWidth + gapX);
      const domainNodeId = `domain-${group.domain.id}`;

      // Domain Node
      nodes.push({
        id: domainNodeId,
        type: 'domainNode',
        position: { x: currentX, y: domainY },
        data: {
          domain: group.domain,
          memberCount: group.members.length,
          onAddClick: onAddMemberClick
        }
      });

      // Edge from Founder -> Domain
      edges.push({
        id: `e-founder-${group.domain.id}`,
        source: 'founder-root',
        target: domainNodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: group.domain.color, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: group.domain.color,
          width: 14,
          height: 14
        }
      });

      // Member Nodes under this domain
      group.members.forEach((member, mIdx) => {
        const memberNodeId = `member-${member.id}`;
        const isMatched = searchQuery.trim() 
          ? member.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            member.role?.toLowerCase().includes(searchQuery.toLowerCase())
          : false;

        nodes.push({
          id: memberNodeId,
          type: 'memberNode',
          position: { x: currentX + 10, y: memberStartY + mIdx * memberGapY },
          data: {
            member,
            domain: group.domain,
            isSelected: selectedNode?.data?.member?.id === member.id || isMatched
          }
        });

        // Edge from Domain -> Member
        edges.push({
          id: `e-${domainNodeId}-${member.id}`,
          source: domainNodeId,
          target: memberNodeId,
          type: 'smoothstep',
          style: { stroke: '#94a3b8', strokeWidth: 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94a3b8',
            width: 12,
            height: 12
          }
        });
      });
    });

    return { nodes, edges };
  }, [domainsWithMembers, totalPeopleCount, founder, searchQuery, selectedNode, onAddMemberClick]);

  const [nodes, , onNodesChange] = useNodesState(computedNodes);
  const [edges, , onEdgesChange] = useEdgesState(computedEdges);

  // Sync state when computed nodes change
  const currentNodes = useMemo(() => computedNodes, [computedNodes]);
  const currentEdges = useMemo(() => computedEdges, [computedEdges]);

  const handleNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === 'founderNode') {
      setSelectedNode({ type: 'founder', data: node.data });
    } else if (node.type === 'domainNode') {
      setSelectedNode({ type: 'domain', data: node.data });
    } else if (node.type === 'memberNode') {
      setSelectedNode({ type: 'member', data: node.data });
    }
  }, []);

  return (
    <div className="relative w-full h-[680px] rounded-2xl border overflow-hidden transition-all" style={{ backgroundColor: 'var(--c-surface-2)', borderColor: 'var(--c-border)' }}>
      
      {/* ── TOP CONTROL PANEL ────────────────────────────────────────────── */}
      <div 
        className="absolute top-4 left-4 right-4 z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border backdrop-blur-md shadow-sm"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderColor: 'var(--c-border)'
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-muted)' }} />
            <input
              type="text"
              placeholder="Filter people, roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none transition-colors"
              style={{
                backgroundColor: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
                color: 'var(--c-fg)'
              }}
            />
          </div>

          {/* Domain Filter */}
          <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setFilterDomain('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${filterDomain === 'ALL' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              All Domains
            </button>
            {CORE_DOMAINS.map(d => (
              <button
                key={d.id}
                onClick={() => setFilterDomain(d.id)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${filterDomain === d.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {d.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Action: Add Team Member */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 hidden md:block">
            {teamMembers.length} Employees · 1 Founder
          </span>
          {onAddMemberClick && (
            <button
              onClick={() => onAddMemberClick()}
              id="flow-add-team-member-btn"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: 'var(--c-fg)',
                color: 'var(--c-bg)'
              }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* ── REACT FLOW CANVAS ────────────────────────────────────────────── */}
      <ReactFlow
        nodes={currentNodes}
        edges={currentEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1.15 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap 
          position="bottom-right"
          nodeColor={(n) => {
            if (n.type === 'founderNode') return '#1e293b';
            if (n.type === 'domainNode') return '#6366f1';
            return '#94a3b8';
          }}
          style={{ width: 120, height: 80, borderRadius: 12 }}
        />
      </ReactFlow>

      {/* ── INTERACTIVE NODE DETAIL DRAWER ───────────────────────────────── */}
      {selectedNode && (
        <div 
          className="absolute top-20 right-4 z-20 w-80 max-w-[90vw] rounded-2xl p-5 border shadow-xl animate-fade-in space-y-4"
          style={{
            backgroundColor: 'var(--c-surface)',
            borderColor: 'var(--c-border)',
            boxShadow: 'var(--shadow-xl)'
          }}
        >
          <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: 'var(--c-border)' }}>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" style={{ color: 'var(--c-accent)' }} />
              <span className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--c-fg)' }}>
                Hierarchy Information
              </span>
            </div>
            <button 
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Member Details */}
          {selectedNode.type === 'member' && (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-mono font-bold text-sm uppercase shrink-0"
                  style={{ backgroundColor: 'var(--c-surface-2)', color: 'var(--c-fg)', border: '1px solid var(--c-border)' }}
                >
                  {selectedNode.data.member.fullName?.slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: 'var(--c-fg)' }}>
                    {selectedNode.data.member.fullName}
                  </h4>
                  <p className="text-xs font-medium" style={{ color: 'var(--c-muted)' }}>
                    {selectedNode.data.member.role}
                  </p>
                </div>
              </div>

              {/* Reporting Line Breadcrumb */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                  Reporting Line
                </span>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  <span>Founder</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {selectedNode.data.domain.label}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="font-bold">{selectedNode.data.member.fullName.split(' ')[0]}</span>
                </div>
              </div>

              {/* Metadata Fields */}
              <div className="space-y-2 pt-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--c-muted)' }}>Domain:</span>
                  <span className="font-semibold" style={{ color: 'var(--c-fg)' }}>
                    {selectedNode.data.member.department || selectedNode.data.domain.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--c-muted)' }}>Contact:</span>
                  <span className="truncate max-w-[170px]" style={{ color: 'var(--c-fg)' }}>
                    {selectedNode.data.member.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--c-muted)' }}>Status:</span>
                  <span className="text-emerald-500 font-bold">
                    {selectedNode.data.member.status || 'Active Roster'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <a
                  href={`mailto:${selectedNode.data.member.email}`}
                  className="flex-1 py-2 rounded-xl text-center font-semibold text-xs transition-all border flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: 'var(--c-surface-2)',
                    borderColor: 'var(--c-border)',
                    color: 'var(--c-fg)'
                  }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Member
                </a>
                {onRemoveMember && (
                  <button
                    onClick={() => {
                      onRemoveMember(selectedNode.data.member.id);
                      setSelectedNode(null);
                    }}
                    title="Remove from roster"
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors border border-rose-500/20 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Domain Details */}
          {selectedNode.type === 'domain' && (
            <div className="space-y-3.5 text-xs">
              <div>
                <h4 className="text-sm font-bold" style={{ color: 'var(--c-fg)' }}>
                  {selectedNode.data.domain.label}
                </h4>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                  {selectedNode.data.domain.description}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                  Domain Structure
                </span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300">
                  Reports directly to <strong className="text-indigo-600">{founder.name}</strong>. Manages {selectedNode.data.memberCount} operational team members.
                </p>
              </div>

              {onAddMemberClick && (
                <button
                  onClick={() => {
                    onAddMemberClick(selectedNode.data.domain.label);
                    setSelectedNode(null);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                  style={{
                    backgroundColor: 'var(--c-fg)',
                    color: 'var(--c-bg)'
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Member to this Domain</span>
                </button>
              )}
            </div>
          )}

          {/* Founder Details */}
          {selectedNode.type === 'founder' && (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-mono font-bold text-sm uppercase shrink-0"
                  style={{ backgroundColor: 'var(--c-fg)', color: 'var(--c-bg)' }}
                >
                  {founder.name?.slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: 'var(--c-fg)' }}>
                    {founder.name}
                  </h4>
                  <p className="text-xs font-medium" style={{ color: 'var(--c-muted)' }}>
                    {founder.role}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                  Apex Leadership Mandate
                </span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300">
                  Ultimate venture signing authority, cap table oversight, capital allocation, and executive approval gate.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
