import React, { useState, useEffect, useMemo } from 'react';
import { DelegatedTask, EmployeeWorkspacePayload } from '../types';
import {
  Users, CheckCircle2, Clock, Send, Sparkles, FileText,
  Shield, AlertCircle, ArrowRight, RefreshCw, Copy, Check,
  BookOpen, Lock, UserCheck, ChevronRight, Search, Filter,
  Building2, Award, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EmployeeWorkspaceProps {
  userRole?: string;
  userName?: string;
  companyName?: string;
  onRefreshTasks?: () => Promise<void>;
  onNavigateToApprovals?: () => void;
}

export default function EmployeeWorkspace({
  userRole: propUserRole,
  userName: propUserName,
  companyName = 'Catalyst Venture',
  onRefreshTasks,
  onNavigateToApprovals
}: EmployeeWorkspaceProps) {
  const { apiFetch, user } = useAuth();
  const userRole = propUserRole || user?.role || 'HR';
  const userName = propUserName || user?.name || 'Team Member';
  const [loading, setLoading] = useState<boolean>(true);
  const [workspaceData, setWorkspaceData] = useState<EmployeeWorkspacePayload | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTaskDraft, setActiveTaskDraft] = useState<{
    draftContent: string;
    guidelines: string[];
    companionAgent?: any;
  } | null>(null);
  const [editorText, setEditorText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Fetch employee workspace context
  const loadWorkspace = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/workspace/employee');
      if (res.ok) {
        const data: EmployeeWorkspacePayload = await res.json();
        setWorkspaceData(data);
        if (data.tasks && data.tasks.length > 0 && !selectedTaskId) {
          setSelectedTaskId(data.tasks[0].id);
        }
      }
    } catch (err: any) {
      console.error('[EmployeeWorkspace] Error loading workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const selectedTask = useMemo(() => {
    return workspaceData?.tasks.find(t => t.id === selectedTaskId) || null;
  }, [workspaceData, selectedTaskId]);

  // Load draft when task is selected
  useEffect(() => {
    if (!selectedTaskId) {
      setActiveTaskDraft(null);
      setEditorText('');
      return;
    }

    const loadDraft = async () => {
      try {
        const res = await apiFetch(`/api/tasks/${selectedTaskId}/draft`);
        if (res.ok) {
          const draftData = await res.json();
          setActiveTaskDraft({
            draftContent: draftData.draftContent,
            guidelines: draftData.guidelines || [],
            companionAgent: draftData.companionAgent
          });
          setEditorText(draftData.task?.result || draftData.draftContent || '');
        }
      } catch (err) {
        console.warn('[EmployeeWorkspace] Note loading draft:', err);
      }
    };

    loadDraft();
  }, [selectedTaskId]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!workspaceData?.tasks) return [];
    return workspaceData.tasks.filter(t => {
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter.toLowerCase();
      const matchesSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.department.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [workspaceData, statusFilter, searchQuery]);

  // Handle claiming a task
  const handleClaimTask = async (taskId: string) => {
    try {
      setIsClaiming(true);
      const res = await apiFetch(`/api/tasks/${taskId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: true })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setWorkspaceData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map(t => t.id === taskId ? updatedTask : t)
          };
        });
        setStatusMessage({ type: 'success', text: 'Task successfully claimed! Ready for execution.' });
        if (onRefreshTasks) await onRefreshTasks();
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err?.error || 'Could not claim task.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error claiming task.' });
    } finally {
      setIsClaiming(false);
    }
  };

  // Handle saving working draft
  const handleSaveDraft = async () => {
    if (!selectedTaskId) return;
    try {
      setIsSaving(true);
      const res = await apiFetch(`/api/tasks/${selectedTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: editorText })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setWorkspaceData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map(t => t.id === selectedTaskId ? updatedTask : t)
          };
        });
        setStatusMessage({ type: 'success', text: 'Draft saved to company workspace.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to save draft.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle starting work
  const handleStartWork = async () => {
    if (!selectedTaskId) return;
    try {
      setIsSaving(true);
      const res = await apiFetch(`/api/tasks/${selectedTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress', result: editorText })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setWorkspaceData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map(t => t.id === selectedTaskId ? updatedTask : t)
          };
        });
        setStatusMessage({ type: 'info', text: 'Task transitioned to In Progress.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to update task status.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle submitting to founder approval
  const handleSubmitDeliverable = async () => {
    if (!selectedTaskId) return;
    if (!editorText.trim()) {
      setStatusMessage({ type: 'error', text: 'Please formulate deliverable content before submitting.' });
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/tasks/${selectedTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'submitted',
          result: editorText
        })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setWorkspaceData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map(t => t.id === selectedTaskId ? updatedTask : t)
          };
        });
        setStatusMessage({
          type: 'success',
          text: 'Deliverable submitted! Automatically queued in the Founder Approval Inbox.'
        });
        if (onRefreshTasks) await onRefreshTasks();
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err?.error || 'Submission failed.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Error submitting deliverable to founder queue.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyDraftToEditor = () => {
    if (activeTaskDraft?.draftContent) {
      setEditorText(activeTaskDraft.draftContent);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
      setStatusMessage({ type: 'info', text: 'AI Companion draft copied into deliverable editor.' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--c-accent)' }} />
        <p className="text-sm font-mono" style={{ color: 'var(--c-muted)' }}>
          Hydrating Department Workspace & Companion AI...
        </p>
      </div>
    );
  }

  const companion = workspaceData?.companionAgent;
  const metrics = workspaceData?.departmentMetrics;

  return (
    <div className="space-y-6">
      {/* ── Status Toast Alert ────────────────────────────────────────── */}
      {statusMessage && (
        <div 
          className="flex items-center justify-between p-3.5 rounded-xl text-xs font-medium transition-all"
          style={{
            backgroundColor: statusMessage.type === 'success' 
              ? 'rgba(16, 185, 129, 0.12)' 
              : statusMessage.type === 'error' 
                ? 'rgba(239, 68, 68, 0.12)' 
                : 'rgba(59, 130, 246, 0.12)',
            border: `1px solid ${
              statusMessage.type === 'success' 
                ? 'rgba(16, 185, 129, 0.3)' 
                : statusMessage.type === 'error' 
                  ? 'rgba(239, 68, 68, 0.3)' 
                  : 'rgba(59, 130, 246, 0.3)'
            }`,
            color: statusMessage.type === 'success' 
              ? 'rgb(16, 185, 129)' 
              : statusMessage.type === 'error' 
                ? 'rgb(239, 68, 68)' 
                : 'rgb(59, 130, 246)'
          }}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Companion AI Executive Banner ─────────────────────────────── */}
      <div 
        className="p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        style={{
          backgroundColor: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img 
              src={companion?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'} 
              alt={companion?.name || 'Companion Agent'}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-500/30"
            />
            <span 
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-black animate-pulse"
              title="AI Teammate Online"
            />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold font-sans" style={{ color: 'var(--c-fg)' }}>
                {companion?.name} • Companion AI Co-Pilot
              </h2>
              <span 
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}
              >
                {workspaceData?.department} Lead
              </span>
            </div>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--c-muted)' }}>
              {companion?.role}
            </p>
            <p className="text-xs font-sans mt-1.5 line-clamp-1 max-w-xl" style={{ color: 'var(--c-faint)' }}>
              {companion?.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto justify-end">
          <button
            onClick={loadWorkspace}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
            title="Refresh workspace telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
          {onNavigateToApprovals && (
            <button
              onClick={onNavigateToApprovals}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--c-fg)', color: 'var(--c-bg)' }}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Founder Approvals</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Department Metrics Row ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <div className="text-[10px] uppercase font-mono tracking-wider" style={{ color: 'var(--c-muted)' }}>Active Department Tasks</div>
          <div className="text-2xl font-bold font-mono mt-1" style={{ color: 'var(--c-fg)' }}>
            {metrics?.activeTasks || 0}
          </div>
          <div className="text-[10px] font-sans mt-1" style={{ color: 'var(--c-faint)' }}>Pending or in progress</div>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <div className="text-[10px] uppercase font-mono tracking-wider" style={{ color: 'var(--c-muted)' }}>Working In Progress</div>
          <div className="text-2xl font-bold font-mono mt-1 text-amber-500">
            {metrics?.pendingSubmission || 0}
          </div>
          <div className="text-[10px] font-sans mt-1" style={{ color: 'var(--c-faint)' }}>Being authored by employee</div>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <div className="text-[10px] uppercase font-mono tracking-wider" style={{ color: 'var(--c-muted)' }}>Awaiting Founder Review</div>
          <div className="text-2xl font-bold font-mono mt-1 text-blue-500">
            {metrics?.submittedCount || 0}
          </div>
          <div className="text-[10px] font-sans mt-1" style={{ color: 'var(--c-faint)' }}>Queued in founder inbox</div>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <div className="text-[10px] uppercase font-mono tracking-wider" style={{ color: 'var(--c-muted)' }}>Approved Deliverables</div>
          <div className="text-2xl font-bold font-mono mt-1 text-emerald-500">
            {metrics?.approvedCount || 0}
          </div>
          <div className="text-[10px] font-sans mt-1" style={{ color: 'var(--c-faint)' }}>Verified for execution</div>
        </div>
      </div>

      {/* ── Main Split View ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Tasks List & Role-Scoped Vault (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Tasks Filter & Search Card */}
          <div 
            className="p-5 rounded-2xl space-y-4"
            style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-sans flex items-center gap-2" style={{ color: 'var(--c-fg)' }}>
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Department Workload</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--c-surface-2)', color: 'var(--c-muted)' }}>
                {filteredTasks.length} tasks
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['ALL', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer"
                  style={{
                    backgroundColor: statusFilter === tab ? 'var(--c-fg)' : 'var(--c-surface-2)',
                    color: statusFilter === tab ? 'var(--c-bg)' : 'var(--c-muted)',
                    border: `1px solid ${statusFilter === tab ? 'var(--c-fg)' : 'var(--c-border)'}`
                  }}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-muted)' }} />
              <input 
                type="text"
                placeholder="Search department tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs outline-none transition-colors"
                style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-fg)' }}
              />
            </div>

            {/* Task Card List */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredTasks.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono" style={{ color: 'var(--c-muted)' }}>
                  No tasks matching selected filter.
                </div>
              ) : (
                filteredTasks.map(task => {
                  const isSelected = task.id === selectedTaskId;
                  const isAssignedToUser = Boolean(task.assignedUserId);

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="p-3.5 rounded-xl transition-all cursor-pointer relative"
                      style={{
                        backgroundColor: isSelected ? 'var(--c-surface-2)' : 'var(--c-surface)',
                        border: `1px solid ${isSelected ? 'var(--c-fg)' : 'var(--c-border)'}`,
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span 
                          className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                          style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}
                        >
                          {task.department}
                        </span>
                        
                        {/* Status Badge */}
                        <span 
                          className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase tracking-wider font-semibold ${
                            task.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : task.status === 'submitted' 
                                ? 'bg-sky-50 text-sky-700 border border-sky-200' 
                                : task.status === 'in_progress' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold font-sans mt-2 line-clamp-2" style={{ color: 'var(--c-fg)' }}>
                        {task.title}
                      </h4>

                      <div className="flex items-center justify-between mt-3 pt-2 text-[10px] font-mono" style={{ borderTop: '1px solid var(--c-border)' }}>
                        <div className="flex items-center gap-1.5">
                          {isAssignedToUser ? (
                            <span className="flex items-center gap-1 text-emerald-500 font-medium">
                              <UserCheck className="w-3 h-3" />
                              <span>{task.assignedUserName || 'Assigned to You'}</span>
                            </span>
                          ) : task.needsHumanOwner ? (
                            <span className="flex items-center gap-1 text-amber-500 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              <span>Needs Human Owner</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--c-muted)' }}>
                              Role Pool ({task.ownerRole || 'General'})
                            </span>
                          )}
                        </div>

                        {!isAssignedToUser && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimTask(task.id);
                            }}
                            disabled={isClaiming}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                            style={{ backgroundColor: 'var(--c-fg)', color: 'var(--c-bg)' }}
                          >
                            Claim Task
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Role-Scoped Knowledge Documents Card */}
          <div 
            className="p-5 rounded-2xl space-y-4"
            style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold font-sans" style={{ color: 'var(--c-fg)' }}>
                  Role-Scoped Company Vault
                </h3>
              </div>
              <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-500 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">
                <Shield className="w-2.5 h-2.5" />
                Zero Cross-Dept Leaks
              </span>
            </div>

            <p className="text-[11px] font-sans" style={{ color: 'var(--c-faint)' }}>
              Strictly filtered documents authorized for your department ({workspaceData?.department}).
            </p>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {workspaceData?.accessibleDocuments.map(doc => (
                <div 
                  key={doc.id}
                  className="p-3 rounded-xl transition-all"
                  style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span className="text-xs font-semibold font-sans truncate" style={{ color: 'var(--c-fg)' }}>
                      {doc.name}
                    </span>
                  </div>
                  <p className="text-[10px] font-sans mt-1 line-clamp-2" style={{ color: 'var(--c-muted)' }}>
                    {doc.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Co-Pilot Review Studio & Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedTask ? (
            <div 
              className="p-6 rounded-2xl space-y-6"
              style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
            >
              {/* Selected Task Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                      {selectedTask.department} Task
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--c-muted)' }}>
                      Assisting: {selectedTask.agent}
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-sans mt-1.5" style={{ color: 'var(--c-fg)' }}>
                    {selectedTask.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!selectedTask.assignedUserId && (
                    <button
                      onClick={() => handleClaimTask(selectedTask.id)}
                      disabled={isClaiming}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      style={{ backgroundColor: '#f59e0b', color: '#000' }}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Claim Task</span>
                    </button>
                  )}
                  {selectedTask.status === 'pending' && selectedTask.assignedUserId && (
                    <button
                      onClick={handleStartWork}
                      disabled={isSaving}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-fg)' }}
                    >
                      <span>Start Work</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Alert Banner */}
              {selectedTask.status === 'submitted' && (
                <div className="p-3.5 rounded-xl flex items-center gap-3 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-medium">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Deliverable Submitted • Awaiting Founder Review in Approval Inbox</span>
                </div>
              )}
              {selectedTask.status === 'approved' && (
                <div className="p-3.5 rounded-xl flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Approved by Founder • Deliverable signed off and archived</span>
                </div>
              )}

              {/* Missing Human Responsibility Banner (Phase A6) */}
              {selectedTask.needsHumanOwner && (
                <div className="p-3.5 rounded-xl flex items-start sm:items-center justify-between gap-3 text-xs font-medium bg-amber-50 border border-amber-200 text-amber-800">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <div>
                      <span className="font-semibold">Missing Human Responsibility:</span> No employee is assigned for {selectedTask.department}. CatalystOS never invents placeholder employees.
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                    Staffing Required
                  </span>
                </div>
              )}

              {/* Companion AI Draft Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-sans flex items-center gap-2" style={{ color: 'var(--c-fg)' }}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{companion?.name}'s Initial Working Draft</span>
                  </h4>
                  <button
                    onClick={copyDraftToEditor}
                    className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                    style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
                    title="Copy AI draft to your deliverable editor"
                  >
                    {copiedDraft ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy to Editor</span>
                      </>
                    )}
                  </button>
                </div>

                <div 
                  className="p-4 rounded-xl text-xs font-sans leading-relaxed max-h-[220px] overflow-y-auto whitespace-pre-wrap select-text"
                  style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
                >
                  {activeTaskDraft?.draftContent || 'Generating initial AI executive draft...'}
                </div>

                {/* Guidelines */}
                {activeTaskDraft?.guidelines && activeTaskDraft.guidelines.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--c-faint)' }}>
                      Compliance Guidelines
                    </span>
                    <ul className="space-y-1">
                      {activeTaskDraft.guidelines.map((g, idx) => (
                        <li key={idx} className="text-[11px] font-sans flex items-center gap-2" style={{ color: 'var(--c-muted)' }}>
                          <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Employee Interactive Deliverable Editor */}
              <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--c-border)' }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-sans flex items-center gap-2" style={{ color: 'var(--c-fg)' }}>
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Your Final Deliverable (Employee Review & Edit)</span>
                  </h4>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--c-faint)' }}>
                    {editorText.length} characters
                  </span>
                </div>

                <textarea
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  placeholder="Review, edit, and finalize your department's deliverable here..."
                  rows={8}
                  disabled={selectedTask.status === 'approved'}
                  className="w-full p-4 rounded-xl text-xs font-sans outline-none leading-relaxed transition-colors resize-y font-mono"
                  style={{
                    backgroundColor: 'var(--c-surface-2)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-fg)'
                  }}
                />

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveDraft}
                      disabled={isSaving || selectedTask.status === 'approved'}
                      className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                      style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-fg)' }}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                      <span>Save Draft</span>
                    </button>
                  </div>

                  <button
                    onClick={handleSubmitDeliverable}
                    disabled={isSubmitting || selectedTask.status === 'submitted' || selectedTask.status === 'approved'}
                    className="px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                    style={{
                      backgroundColor: selectedTask.status === 'approved' 
                        ? 'var(--c-surface-2)' 
                        : 'var(--c-fg)',
                      color: selectedTask.status === 'approved' 
                        ? 'var(--c-muted)' 
                        : 'var(--c-bg)'
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{selectedTask.status === 'submitted' ? 'Resubmit to Founder' : 'Submit for Founder Approval'}</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div 
              className="p-12 rounded-2xl text-center space-y-3"
              style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
            >
              <Users className="w-8 h-8 mx-auto" style={{ color: 'var(--c-muted)' }} />
              <h4 className="text-sm font-bold font-sans" style={{ color: 'var(--c-fg)' }}>
                Select a Task from your Department
              </h4>
              <p className="text-xs font-sans max-w-sm mx-auto" style={{ color: 'var(--c-muted)' }}>
                Click on any task from the left list to review its initial AI companion draft, inspect authorized company policies, and submit your final work for Founder Approval.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
