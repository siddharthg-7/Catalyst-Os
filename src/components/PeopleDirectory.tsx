import React, { useState } from 'react';
import { TeamMember, UserRole } from '../types';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Briefcase, 
  Building2,
  Trash2, 
  X, 
  AlertCircle
} from 'lucide-react';

interface PeopleDirectoryProps {
  user: {
    id?: string;
    name?: string;
    email?: string;
    role?: UserRole | string;
  } | null;
  companyName?: string;
  teamMembers: TeamMember[];
  onAddMember: (member: { 
    fullName: string; 
    email: string; 
    role: string; 
    department: string; 
    status?: 'Active' | 'Invited' 
  }) => Promise<void>;
  onRemoveMember: (id: string) => Promise<void>;
}

export default function PeopleDirectory({
  user,
  companyName = 'Venture',
  teamMembers,
  onAddMember,
  onRemoveMember,
}: PeopleDirectoryProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('Please provide a valid email address (e.g., rahul@company.com).');
      return;
    }
    if (!trimmedRole) {
      setError('Please enter a role (e.g., Finance).');
      return;
    }
    if (!trimmedDept) {
      setError('Please enter a department (e.g., Finance).');
      return;
    }

    setIsSubmitting(true);
    try {
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
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-5xl mx-auto font-sans">
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="space-y-1.5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#141413] text-[#F3F0EE] flex items-center justify-center shadow-xs">
            <Users className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold text-[#141413] tracking-tight font-sans">
            People
          </h1>
        </div>
        <p className="text-xs text-[#696969] leading-relaxed max-w-xl font-sans">
          Core venture stakeholders, founding equity holders, and team members allocated to {companyName}.
        </p>
      </div>

      {/* ── Founder Sub-Section ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#696969] font-bold">
            Founder
          </h3>
          <span className="text-[10px] font-mono text-[#696969] px-2 py-0.5 rounded bg-[#141413]/05 border border-[#141413]/10">
            Ownership & Governance
          </span>
        </div>

        <hr className="border-[#141413]/10" />

        <div className="bg-white rounded-[16px] border border-[#141413]/10 p-5 shadow-[rgba(0,0,0,0.02)_0px_2px_8px] transition-all hover:border-[#141413]/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#141413] text-[#F3F0EE] flex items-center justify-center font-mono font-bold text-sm uppercase shrink-0 shadow-xs">
                {founderName.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#141413] font-sans">
                    {founderName}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#141413]/08 text-[#141413] border border-[#141413]/10">
                    {founderRole}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#696969]">
                  <Mail className="w-3.5 h-3.5 text-[#141413]/40" />
                  <span className="font-mono text-[11px]">{founderEmail}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:self-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Active Team Sub-Section ─────────────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#696969] font-bold">
            Active Team
          </h3>
          {teamMembers.length > 0 && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] text-xs font-bold transition-all shadow-2xs cursor-pointer hover:shadow-xs active:scale-[0.98]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Team Member</span>
            </button>
          )}
        </div>

        <hr className="border-[#141413]/10" />

        {/* Empty State vs Members List */}
        {teamMembers.length === 0 ? (
          <div className="bg-white rounded-[16px] border border-dashed border-[#141413]/15 p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F3F0EE] border border-[#141413]/10 flex items-center justify-center mx-auto text-[#696969]">
              <Users className="w-5 h-5 text-[#141413]/60" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#141413] font-sans">
                No team members yet
              </p>
              <p className="text-xs text-[#696969] max-w-sm mx-auto font-sans">
                Expand your core venture roster. Add team members to establish operational reporting and department ownership.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] text-xs font-bold transition-all shadow-sm cursor-pointer hover:shadow-md active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Team Member</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2.5">
              {teamMembers.map((member) => {
                const displayName = member.fullName || member.name || 'Team Member';
                const memberRole = member.role || 'Member';
                const memberDept = member.department || member.role || 'General';
                const memberEmail = member.email || '';

                return (
                  <div
                    key={member.id}
                    className="bg-white rounded-[16px] border border-[#141413]/10 p-4 shadow-[rgba(0,0,0,0.02)_0px_2px_8px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-[#141413]/25 hover:shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#F3F0EE] border border-[#141413]/10 text-[#141413] flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0">
                        {displayName.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#141413] truncate font-sans">
                            {displayName}
                          </span>
                        </div>
                        {/* Role · Department · Email requested in Task 6 */}
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#696969] truncate flex-wrap">
                          <span className="font-sans font-medium text-[#141413]">
                            {memberRole}
                          </span>
                          <span>·</span>
                          <span className="font-sans text-[#696969]">
                            {memberDept}
                          </span>
                          {memberEmail && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-[11px] text-[#696969]">
                                {memberEmail}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                          (member.status || 'Active') === 'Active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                            : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            (member.status || 'Active') === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        <span>{member.status || 'Active'}</span>
                      </span>

                      <button
                        onClick={() => onRemoveMember(member.id)}
                        title="Remove member"
                        className="p-1.5 text-[#696969] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick action bar below list */}
            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={handleOpenModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-[#141413]/15 bg-white hover:bg-[#F3F0EE]/60 text-[#141413] text-xs font-semibold transition-all shadow-2xs cursor-pointer hover:border-[#141413]/30 active:scale-[0.98]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>[ + Add Team Member ]</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Person Modal ─────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141413]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-[20px] border border-[#141413]/15 shadow-[rgba(0,0,0,0.16)_0px_24px_48px] w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#141413]/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#141413] text-[#F3F0EE] flex items-center justify-center">
                  <UserPlus className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-base font-bold text-[#141413] font-sans">
                  Add Person
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-[#696969] hover:text-[#141413] hover:bg-[#F3F0EE] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-[12px] bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-sans leading-relaxed">{error}</span>
              </div>
            )}

            {/* Form */}
            <form id="add-member-form" onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label 
                  htmlFor="fullName" 
                  className="text-[10px] uppercase font-mono tracking-widest text-[#696969] font-bold block"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g., Rahul"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-[#F3F0EE]/40 border border-[#141413]/15 rounded-[12px] px-3.5 py-2.5 text-xs text-[#141413] placeholder-[#696969]/60 focus:outline-none focus:border-[#141413] focus:bg-white font-sans transition-all"
                  autoFocus
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label 
                  htmlFor="email" 
                  className="text-[10px] uppercase font-mono tracking-widest text-[#696969] font-bold block"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="e.g., rahul@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#F3F0EE]/40 border border-[#141413]/15 rounded-[12px] px-3.5 py-2.5 text-xs text-[#141413] placeholder-[#696969]/60 focus:outline-none focus:border-[#141413] focus:bg-white font-sans transition-all"
                  required
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label 
                  htmlFor="role" 
                  className="text-[10px] uppercase font-mono tracking-widest text-[#696969] font-bold block"
                >
                  Role
                </label>
                <input
                  id="role"
                  type="text"
                  placeholder="e.g., Finance"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-[#F3F0EE]/40 border border-[#141413]/15 rounded-[12px] px-3.5 py-2.5 text-xs text-[#141413] placeholder-[#696969]/60 focus:outline-none focus:border-[#141413] focus:bg-white font-sans transition-all"
                  required
                />
              </div>

              {/* Department */}
              <div className="space-y-1">
                <label 
                  htmlFor="department" 
                  className="text-[10px] uppercase font-mono tracking-widest text-[#696969] font-bold block"
                >
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  placeholder="e.g., Finance"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full bg-[#F3F0EE]/40 border border-[#141413]/15 rounded-[12px] px-3.5 py-2.5 text-xs text-[#141413] placeholder-[#696969]/60 focus:outline-none focus:border-[#141413] focus:bg-white font-sans transition-all"
                  required
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#141413]/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-[12px] text-xs font-bold text-[#696969] hover:text-[#141413] hover:bg-[#F3F0EE] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-[12px] bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 hover:shadow-md active:scale-[0.98]"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
