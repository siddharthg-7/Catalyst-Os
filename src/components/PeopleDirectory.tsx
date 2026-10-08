import React, { useState } from 'react';
import { TeamMember, UserRole, CompanyInvitation, CompanyMembership } from '../types';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Briefcase, 
  Building2,
  Trash2, 
  X, 
  AlertCircle,
  Send,
  RotateCcw,
  Ban,
  ShieldCheck,
  Bot,
  Sparkles,
  Lock,
  Cpu,
  CheckCircle2,
  UserMinus
} from 'lucide-react';

const ASSIGNABLE_ROLES = [
  { value: 'ADMIN',      label: 'Admin',      hint: 'Full access to every area, agent and approval.' },
  { value: 'FINANCE',    label: 'Finance',    hint: 'Dashboard, Finance/Auditor/Investment agents, scenarios. Approvals read-only.' },
  { value: 'HR',         label: 'HR',         hint: 'Dashboard, Talent and Legal agents, People (can add members).' },
  { value: 'OPERATIONS', label: 'Operations', hint: 'Workflows, Operations and CEO agents, decision ledger.' },
  { value: 'GROWTH',     label: 'Growth',     hint: 'Workflows, Growth and CEO agents, knowledge base.' }
] as const;

// The 8 AI Executive Agents
const AI_EXECUTIVES = [
  {
    id: 'atlas',
    name: 'Atlas',
    title: 'Chief Executive Officer',
    department: 'Executive Office',
    mandate: 'Strategic orchestration, council synthesis, and quarterly milestone execution.',
    autonomy: 'Tier 1 Orchestrator',
    guardrail: '$25,000 Cap'
  },
  {
    id: 'aura',
    name: 'Aura',
    title: 'Chief Marketing Officer',
    department: 'Marketing & Brand',
    mandate: 'Brand positioning, competitive benchmarking, and top-of-funnel customer narrative.',
    autonomy: 'Autonomous GTM',
    guardrail: '$10,000 Cap'
  },
  {
    id: 'echo',
    name: 'Echo',
    title: 'Chief Technology Officer',
    department: 'Engineering & Tech',
    mandate: 'System architecture, technical security, and scalable infrastructure.',
    autonomy: 'Autonomous Architecture',
    guardrail: '$15,000 Cap'
  },
  {
    id: 'vector',
    name: 'Vector',
    title: 'Chief Operating Officer',
    department: 'Operations',
    mandate: 'Operational cadence, multi-agent sprint execution, and SOC-2 compliance.',
    autonomy: 'Autonomous Sprints',
    guardrail: '$15,000 Cap'
  },
  {
    id: 'nexus',
    name: 'Nexus',
    title: 'Chief Compliance & Audit Officer',
    department: 'Audit & Governance',
    mandate: 'Ledger verification, audit trails, and deterministic treasury arithmetic check.',
    autonomy: 'Governance Sentinel',
    guardrail: 'Full Veto Authority'
  },
  {
    id: 'helix',
    name: 'Helix',
    title: 'Chief Investment Officer',
    department: 'Treasury & Finance',
    mandate: 'Cash runway forecasting, investor pitch scripts, and cap table scenario stress testing.',
    autonomy: 'Treasury Modeling',
    guardrail: '$50,000 Cap'
  },
  {
    id: 'apex',
    name: 'Apex',
    title: 'Chief Revenue Officer',
    department: 'Sales & Growth',
    mandate: 'CAC payback modeling, conversion funnel optimization, and commercial contracts.',
    autonomy: 'Autonomous Growth',
    guardrail: '$10,000 Cap'
  },
  {
    id: 'sentry',
    name: 'Sentry',
    title: 'Chief Information Security Officer',
    department: 'Security & InfoSec',
    mandate: 'Continuous vulnerability scanning, policy generation, and vendor risk mitigation.',
    autonomy: 'Autonomous InfoSec',
    guardrail: 'Immediate Threat Freeze'
  }
];

interface PeopleDirectoryProps {
  user: {
    id?: string;
    name?: string;
    email?: string;
    role?: UserRole | string;
  } | null;
  companyName?: string;
  teamMembers: TeamMember[];
  onAddMember?: (member: { 
    fullName: string; 
    email: string; 
    role: string; 
    department: string; 
    status?: 'Active' | 'Invited' 
  }) => Promise<void>;
  onRemoveMember?: (id: string) => Promise<void>;
  memberships?: CompanyMembership[];
  invitations?: CompanyInvitation[];
  /** Omitted when the signed-in role lacks 'people:access' (P1 Task 10). */
  onInviteMember?: (invite: { email: string; role: string }) => Promise<void>;
  onRevokeInvitation?: (id: string) => Promise<void>;
  onResendInvitation?: (id: string) => Promise<void>;
  /** P1 Task 9/10 — revokes account access. Omitted without 'people:access'. */
  onRemoveMembership?: (id: string) => Promise<void>;
}

export default function PeopleDirectory({
  user,
  companyName = 'Venture',
  teamMembers,
  onAddMember,
  onRemoveMember,
  memberships = [],
  invitations = [],
  onInviteMember,
  onRevokeInvitation,
  onResendInvitation,
  onRemoveMembership,
}: PeopleDirectoryProps) {
  const [activeTab, setActiveTab] = useState<'humans' | 'agents'>('humans');

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Add member modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // P1 Task 9 reconciliation: roster entries that match a live company account
  // (by email or hasAccount) appear under Company Accounts.
  const accountEmails = new Set(
    memberships.map(m => (m.email || '').trim().toLowerCase()).filter(Boolean)
  );
  const rosterOnly = teamMembers.filter(m => {
    if (m.hasAccount) return false;
    const rosterEmail = (m.email || '').trim().toLowerCase();
    return !(rosterEmail && accountEmails.has(rosterEmail));
  });

  const pendingInvitations = invitations.filter(i => i.status === 'PENDING');
  const closedInvitations = invitations.filter(i => i.status !== 'PENDING');

  const founderName = user?.name?.trim() || 'Siddharth';
  const founderEmail = user?.email?.trim() || 'founder@catalyst.os';
  const founderRole = user?.role ? `${user.role} / Owner` : 'Founder / Owner';

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setRole('');
    setDepartment('');
    setError(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setModalOpen(false);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!inviteEmail.includes('@')) {
      setInviteError('Enter a valid email address.');
      return;
    }
    if (!inviteRole) {
      setInviteError('Select a role for this person.');
      return;
    }
    setInviteSubmitting(true);
    try {
      await onInviteMember?.({ email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      setInviteRole('');
      setInviteOpen(false);
    } catch (err: any) {
      setInviteError(err?.message || 'The invitation could not be sent.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedRole = role.trim();
    const trimmedDept = department.trim();

    if (!trimmedName) {
      setError('Please provide the person\'s full name.');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!trimmedRole) {
      setError('Please enter a role.');
      return;
    }
    if (!trimmedDept) {
      setError('Please enter a department.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!onAddMember) return;
      await onAddMember({
        fullName: trimmedName,
        email: trimmedEmail,
        role: trimmedRole,
        department: trimmedDept,
        status: 'Active'
      });
      resetForm();
      setModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to add team member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="people-directory-container" className="space-y-6 font-sans">
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#141413]/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#696969]">
              Organization & Access Control
            </span>
            <span className="w-1 h-1 rounded-full bg-[#141413]/30" />
            <span className="text-[11px] font-mono text-[#696969]">
              {companyName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141413]">
            People & Executives
          </h1>
          <p className="text-sm text-[#696969] mt-1 max-w-2xl">
            Venture ownership, human team members, sign-in accounts, and autonomous AI executive roster.
          </p>
        </div>

        {/* Tab Switcher: Human Team vs AI Executives */}
        <div className="flex items-center p-1 rounded-xl bg-[#141413]/05 border border-[#141413]/10 text-xs font-semibold self-start md:self-center">
          <button
            onClick={() => setActiveTab('humans')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'humans'
                ? 'bg-white text-[#141413] shadow-sm font-bold'
                : 'text-[#696969] hover:text-[#141413]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Human Team ({teamMembers.length + 1})</span>
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'agents'
                ? 'bg-white text-[#141413] shadow-sm font-bold'
                : 'text-[#696969] hover:text-[#141413]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Executive Suite (8)</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: HUMAN TEAM MEMBERS & ACCOUNTS ───────────────────────────── */}
      {activeTab === 'humans' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* 1. Founder Card */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-[#696969] font-bold">
                Venture Founder & Owner
              </span>
              <span className="text-[10px] font-mono text-emerald-800 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-bold">
                Ultimate Governance Authority
              </span>
            </div>

            <div className="catalyst-card p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#141413] text-[#F3F0EE] flex items-center justify-center font-mono font-bold text-sm uppercase shrink-0 shadow-sm">
                  {founderName.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#141413]">
                      {founderName}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#141413]/05 text-[#141413]">
                      {founderRole}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#696969]">
                    <Mail className="w-3.5 h-3.5 text-[#696969]" />
                    <span className="font-mono">{founderEmail}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Active Founder
                </span>
              </div>
            </div>
          </section>

          {/* 2. Company Accounts (Sign-in access) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#696969] font-bold">
                  Company Accounts (Sign-In Access)
                </span>
                <p className="text-xs text-[#696969] mt-0.5">
                  Authenticated accounts who can sign in to {companyName} and participate in operations.
                </p>
              </div>

              {onInviteMember && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="interactive-btn px-3.5 py-2 rounded-xl bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Invite Member</span>
                </button>
              )}
            </div>

            {memberships.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-[#141413]/15 bg-white text-center text-xs text-[#696969]">
                No additional sign-in accounts created yet. Use "Invite Member" above to grant portal access.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memberships.map((member) => (
                  <div
                    key={member.id}
                    className="catalyst-card p-4 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#141413]/05 border border-[#141413]/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-[#141413]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#141413] truncate">{member.fullName}</p>
                        <p className="text-[11px] font-mono text-[#696969] truncate">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#141413]/05 text-[#141413] font-bold">
                        {member.role}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {member.status}
                      </span>
                      {member.isOwner ? (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#F3F0EE] text-[#696969] border border-[#141413]/10">
                          Owner
                        </span>
                      ) : onRemoveMembership ? (
                        <button
                          onClick={() => onRemoveMembership(member.id)}
                          title={`Revoke access for ${member.fullName}`}
                          className="p-1.5 text-[#696969] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Team Member Roster (Roster Only) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#696969] font-bold">
                  Operational Team Roster
                </span>
                <p className="text-xs text-[#696969] mt-0.5">
                  Core employees, contract engineers, and department heads tracked in venture memory.
                </p>
              </div>

              {onAddMember && (
                <button
                  onClick={handleOpenModal}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#141413]/15 text-xs font-bold text-[#141413] hover:border-[#141413] flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Team Member</span>
                </button>
              )}
            </div>

            {rosterOnly.length === 0 ? (
              <div className="p-10 rounded-2xl border border-dashed border-[#141413]/15 bg-white text-center space-y-2">
                <Users className="w-6 h-6 text-[#696969] mx-auto" />
                <h4 className="text-xs font-bold text-[#141413]">No roster-only members</h4>
                <p className="text-xs text-[#696969] max-w-sm mx-auto">
                  All active team members currently hold company accounts, or click below to track new roster members.
                </p>
              </div>
            ) : (
              <div className="catalyst-card rounded-2xl overflow-hidden divide-y divide-[#141413]/05">
                {rosterOnly.map((member) => {
                  const displayName = member.fullName || member.name || 'Team Member';
                  const memberRole = member.role || 'Member';
                  const memberDept = member.department || 'General';
                  const memberEmail = member.email || '';

                  return (
                    <div
                      key={member.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-[#FCFBFA] transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#141413]/05 text-[#141413] flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0">
                          {displayName.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#141413] truncate">{displayName}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#696969] font-medium">
                            <span className="text-[#141413]">{memberRole}</span>
                            <span>·</span>
                            <span>{memberDept}</span>
                            {memberEmail && (
                              <>
                                <span>·</span>
                                <span className="font-mono text-[10px]">{memberEmail}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#F3F0EE] text-[#696969] border border-[#141413]/10">
                          Roster Only
                        </span>

                        {onRemoveMember && (
                          <button
                            onClick={() => onRemoveMember(member.id)}
                            title="Remove member"
                            className="p-1.5 text-[#696969] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Pending Invitations */}
          {(pendingInvitations.length > 0 || closedInvitations.length > 0) && (
            <section className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#696969] font-bold">
                Invitations Sent ({pendingInvitations.length} Pending)
              </span>

              <div className="space-y-2">
                {[...pendingInvitations, ...closedInvitations].map((invite) => (
                  <div
                    key={invite.id}
                    className="p-3.5 rounded-xl border border-[#141413]/10 bg-white flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Mail className="w-4 h-4 text-[#696969] shrink-0" />
                      <div className="min-w-0">
                        <span className="font-semibold text-[#141413] truncate block">{invite.email}</span>
                        <span className="text-[10px] font-mono text-[#696969]">
                          Role: {invite.role} · Sent: {new Date(invite.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                        invite.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {invite.status}
                      </span>

                      {invite.status !== 'ACCEPTED' && onResendInvitation && (
                        <button
                          onClick={() => onResendInvitation(invite.id)}
                          title="Resend invitation link"
                          className="p-1 text-[#696969] hover:text-[#141413]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {invite.status === 'PENDING' && onRevokeInvitation && (
                        <button
                          onClick={() => onRevokeInvitation(invite.id)}
                          className="p-1 text-[#696969] hover:text-rose-600"
                          title="Revoke invitation"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}

      {/* ── TAB 2: AI EXECUTIVE COUNCIL SUITE ──────────────────────────────── */}
      {activeTab === 'agents' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#696969] font-bold">
                Autonomous Executive Council
              </span>
              <p className="text-xs text-[#696969] mt-0.5">
                8 specialized cognitive agents executing corporate functions within founder governance guardrails.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#141413]/05 border border-[#141413]/10 text-xs font-mono font-bold text-[#141413]">
              8 Active Agents
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AI_EXECUTIVES.map((agent) => (
              <div
                key={agent.id}
                className="catalyst-card catalyst-card-hover p-5 rounded-2xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-md bg-[#141413] text-[#F3F0EE]">
                      AI Executive
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#141413]">{agent.name}</h3>
                    <p className="text-xs font-semibold text-[#696969]">{agent.title}</p>
                    <span className="text-[10px] font-mono text-[#696969] block mt-0.5">{agent.department}</span>
                  </div>

                  <p className="text-xs text-[#696969] leading-relaxed line-clamp-3">
                    {agent.mandate}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#141413]/08 space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-[#696969]">
                    <span>Autonomy:</span>
                    <span className="font-bold text-[#141413]">{agent.autonomy}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#696969]">
                    <span>Guardrail:</span>
                    <span className="font-bold text-emerald-800">{agent.guardrail}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INVITE MODAL ───────────────────────────────────────────────────── */}
      {inviteOpen && onInviteMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141413]/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#141413]/10 shadow-2xl p-6 space-y-5 animate-scale-up">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#141413]">Invite Team Member</h3>
                <p className="text-xs text-[#696969] mt-0.5">
                  Sends an access link to join {companyName} with role-based permissions.
                </p>
              </div>
              <button
                onClick={() => { setInviteOpen(false); setInviteError(null); }}
                className="p-1 rounded-full text-[#696969] hover:text-[#141413]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-[#696969] block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#141413]/15 text-xs text-[#141413]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-[#696969] block mb-1">
                  Access Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#141413]/15 text-xs text-[#141413]"
                >
                  <option value="">Select a role…</option>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-[#696969] mt-1">
                  {ASSIGNABLE_ROLES.find(r => r.value === inviteRole)?.hint || 'Determines which modules and AI agents they can access.'}
                </p>
              </div>

              {inviteError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setInviteOpen(false); setInviteError(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#696969]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="interactive-btn px-5 py-2 rounded-xl bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] text-xs font-bold"
                >
                  {inviteSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD TEAM MEMBER MODAL ──────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141413]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#141413]/15 shadow-2xl w-full max-w-md p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#141413]/10">
              <h3 className="text-base font-bold text-[#141413]">Add Team Member</h3>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-full text-[#696969] hover:text-[#141413]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-[#696969] block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g., Alex Chen"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#141413]/15 text-xs text-[#141413]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-[#696969] block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="e.g., alex@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#141413]/15 text-xs text-[#141413]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-[#696969] block mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#141413]/15 text-xs text-[#141413]"
                  required
                >
                  <option value="">Select a role…</option>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-[#696969] block mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g., Engineering, Growth, Finance"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#141413]/15 text-xs text-[#141413]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#141413]/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#696969]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="interactive-btn px-5 py-2 rounded-xl bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] text-xs font-bold"
                >
                  {isSubmitting ? 'Saving...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
