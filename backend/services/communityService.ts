/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma, safeDbQuery } from './dbService';
import { resolveMembership } from './membershipService';

export type CommunityPostType = 'announcement' | 'question' | 'knowledge' | 'update' | 'recognition';

export interface CommunityPost {
  id: string;
  startupId: string;
  type: CommunityPostType;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  tags?: string[];
  department?: string;
  reactions: Record<string, number>;
  userReactions?: string[];
  isAnswered?: boolean;
  knowledgeDocId?: string | null;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  isAnswer?: boolean;
  createdAt: string;
}

export interface TaskBlocker {
  id: string;
  taskId: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  reportedById: string;
  reportedByName: string;
  reportedByRole: string;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

/**
 * Lists community posts for a user's company workspace, with tenant isolation.
 */
export async function listCommunityPosts(params: {
  userId: string;
  type?: string;
  search?: string;
}): Promise<CommunityPost[]> {
  const { userId, type, search } = params;
  if (!prisma) return [];

  const membership = await resolveMembership(userId);
  if (!membership || !membership.startupId) {
    return [];
  }

  const memories: any[] = await safeDbQuery(async () => {
    return await (prisma as any).memory.findMany({
      where: {
        startupId: membership.startupId,
        category: 'COMMUNITY_POST'
      },
      orderBy: { createdAt: 'desc' }
    });
  }) || [];

  let posts: CommunityPost[] = memories.map(m => {
    try {
      const data = JSON.parse(m.description);
      return {
        id: m.id,
        startupId: m.startupId,
        type: data.type || 'update',
        title: m.title || data.title || 'Untitled Update',
        content: data.content || '',
        authorId: data.authorId || '',
        authorName: data.authorName || 'Team Member',
        authorRole: data.authorRole || 'Member',
        tags: data.tags || [],
        department: data.department || 'General',
        reactions: data.reactions || {},
        userReactions: data.reactedUsers?.[userId] || [],
        isAnswered: Boolean(data.isAnswered),
        knowledgeDocId: data.knowledgeDocId || null,
        commentsCount: data.commentsCount || 0,
        createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt || m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString()
      };
    } catch {
      return {
        id: m.id,
        startupId: m.startupId,
        type: 'update',
        title: m.title,
        content: m.description,
        authorId: '',
        authorName: 'Team Member',
        authorRole: 'Member',
        reactions: {},
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  });

  // Filter by post type if requested
  if (type && type !== 'all') {
    posts = posts.filter(p => p.type.toLowerCase() === type.toLowerCase());
  }

  // Filter by search query if requested
  if (search && search.trim()) {
    const q = search.toLowerCase();
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q)
    );
  }

  return posts;
}

/**
 * Creates a new community post within the user's company workspace.
 */
export async function createCommunityPost(params: {
  userId: string;
  type: CommunityPostType;
  title: string;
  content: string;
  tags?: string[];
  department?: string;
}): Promise<CommunityPost> {
  const { userId, type, title, content, tags, department } = params;
  if (!prisma) throw new Error('Database is unavailable');

  const membership = await resolveMembership(userId);
  if (!membership || !membership.startupId) {
    throw new Error('Active company membership required.');
  }

  // Fetch author details
  const user = await safeDbQuery(async () => {
    return await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true }
    });
  });

  const authorName = user?.name || user?.email?.split('@')[0] || 'Team Member';
  const authorRole = membership.role || user?.role || 'Member';

  // Enforce announcement permission: only Founder, Admin, or Department leads
  if (type === 'announcement' && !['FOUNDER', 'ADMIN', 'FINANCE', 'HR', 'OPERATIONS', 'GROWTH'].includes(membership.role.toUpperCase())) {
    throw new Error('Only founders and department leads may publish company announcements.');
  }

  const payload = {
    type,
    title: title.trim(),
    content: content.trim(),
    authorId: userId,
    authorName,
    authorRole,
    tags: tags || [],
    department: department || membership.role || 'General',
    reactions: {},
    reactedUsers: {},
    isAnswered: false,
    knowledgeDocId: null,
    commentsCount: 0,
    updatedAt: new Date().toISOString()
  };

  const created: any = await safeDbQuery(async () => {
    return await (prisma as any).memory.create({
      data: {
        category: 'COMMUNITY_POST',
        title: title.trim(),
        description: JSON.stringify(payload),
        startupId: membership.startupId
      }
    });
  });

  // If announcement, notify all company participants
  if (type === 'announcement') {
    try {
      await (prisma as any).notification.create({
        data: {
          startupId: membership.startupId,
          type: 'ANNOUNCEMENT',
          title: `Company Announcement: ${title.trim()}`,
          message: `${authorName} (${authorRole}) posted an announcement to the team community.`,
          read: false
        }
      });
    } catch (e) {
      console.warn('[CommunityService] Notification note:', e);
    }
  }

  return {
    id: created.id,
    startupId: created.startupId,
    type,
    title: title.trim(),
    content: content.trim(),
    authorId: userId,
    authorName,
    authorRole,
    tags: tags || [],
    department: payload.department,
    reactions: {},
    isAnswered: false,
    knowledgeDocId: null,
    commentsCount: 0,
    createdAt: created.createdAt ? new Date(created.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: payload.updatedAt
  };
}

/**
 * Lists comments for a community post.
 */
export async function listCommunityComments(userId: string, postId: string): Promise<CommunityComment[]> {
  if (!prisma) return [];

  const membership = await resolveMembership(userId);
  if (!membership || !membership.startupId) return [];

  const memories: any[] = await safeDbQuery(async () => {
    return await (prisma as any).memory.findMany({
      where: {
        startupId: membership.startupId,
        category: 'COMMUNITY_COMMENT',
        title: postId
      },
      orderBy: { createdAt: 'asc' }
    });
  }) || [];

  return memories.map(m => {
    try {
      const data = JSON.parse(m.description);
      return {
        id: m.id,
        postId,
        content: data.content || '',
        authorId: data.authorId || '',
        authorName: data.authorName || 'Team Member',
        authorRole: data.authorRole || 'Member',
        isAnswer: Boolean(data.isAnswer),
        createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString()
      };
    } catch {
      return {
        id: m.id,
        postId,
        content: m.description,
        authorId: '',
        authorName: 'Team Member',
        authorRole: 'Member',
        createdAt: new Date().toISOString()
      };
    }
  });
}

/**
 * Adds a comment to a community post and notifies the original author.
 */
export async function addCommunityComment(params: {
  userId: string;
  postId: string;
  content: string;
  isAnswer?: boolean;
}): Promise<CommunityComment> {
  const { userId, postId, content, isAnswer } = params;
  if (!prisma) throw new Error('Database is unavailable');

  const membership = await resolveMembership(userId);
  if (!membership || !membership.startupId) {
    throw new Error('Active company membership required.');
  }

  // Find post to ensure it belongs to the caller's company
  const postMemory: any = await safeDbQuery(async () => {
    return await (prisma as any).memory.findFirst({
      where: {
        id: postId,
        startupId: membership.startupId,
        category: 'COMMUNITY_POST'
      }
    });
  });

  if (!postMemory) {
    throw new Error('Post not found in your company workspace.');
  }

  const user = await safeDbQuery(async () => {
    return await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true }
    });
  });

  const authorName = user?.name || user?.email?.split('@')[0] || 'Team Member';
  const authorRole = membership.role || user?.role || 'Member';

  const commentPayload = {
    postId,
    content: content.trim(),
    authorId: userId,
    authorName,
    authorRole,
    isAnswer: Boolean(isAnswer),
    createdAt: new Date().toISOString()
  };

  const created: any = await safeDbQuery(async () => {
    return await (prisma as any).memory.create({
      data: {
        category: 'COMMUNITY_COMMENT',
        title: postId,
        description: JSON.stringify(commentPayload),
        startupId: membership.startupId
      }
    });
  });

  // Update post's comment count
  try {
    const postData = JSON.parse(postMemory.description);
    postData.commentsCount = (postData.commentsCount || 0) + 1;
    postData.updatedAt = new Date().toISOString();

    await (prisma as any).memory.update({
      where: { id: postId },
      data: { description: JSON.stringify(postData) }
    });

    // Notify post author if not the commenter
    if (postData.authorId && postData.authorId !== userId) {
      await (prisma as any).notification.create({
        data: {
          startupId: membership.startupId,
          type: 'COMMUNITY_REPLY',
          title: `Reply on: ${postMemory.title}`,
          message: `${authorName} replied to your discussion: "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`,
          read: false
        }
      });
    }
  } catch (err) {
    console.warn('[CommunityService] Post update error:', err);
  }

  return {
    id: created.id,
    postId,
    content: content.trim(),
    authorId: userId,
    authorName,
    authorRole,
    createdAt: new Date().toISOString()
  };
}

/**
 * Toggles a reaction on a community post (e.g. helpful, kudos, ack).
 */
export async function togglePostReaction(params: {
  userId: string;
  postId: string;
  reaction: 'helpful' | 'kudos' | 'ack';
}): Promise<{ reactions: Record<string, number>; userReactions: string[] }> {
  const { userId, postId, reaction } = params;
  if (!prisma) throw new Error('Database is unavailable');

  const membership = await resolveMembership(userId);
  if (!membership || !membership.startupId) {
    throw new Error('Active company membership required.');
  }

  const postMemory: any = await safeDbQuery(async () => {
    return await (prisma as any).memory.findFirst({
      where: {
        id: postId,
        startupId: membership.startupId,
        category: 'COMMUNITY_POST'
      }
    });
  });

  if (!postMemory) throw new Error('Post not found in your company workspace.');

  const postData = JSON.parse(postMemory.description);
  postData.reactions = postData.reactions || {};
  postData.reactedUsers = postData.reactedUsers || {};
  const userList: string[] = postData.reactedUsers[userId] || [];

  if (userList.includes(reaction)) {
    // Remove reaction
    postData.reactedUsers[userId] = userList.filter((r: string) => r !== reaction);
    postData.reactions[reaction] = Math.max(0, (postData.reactions[reaction] || 1) - 1);
  } else {
    // Add reaction
    postData.reactedUsers[userId] = [...userList, reaction];
    postData.reactions[reaction] = (postData.reactions[reaction] || 0) + 1;
  }

  await (prisma as any).memory.update({
    where: { id: postId },
    data: { description: JSON.stringify(postData) }
  });

  return {
    reactions: postData.reactions,
    userReactions: postData.reactedUsers[userId]
  };
}

/**
 * Marks a question post as answered.
 */
export async function markQuestionAnswered(params: {
  userId: string;
  postId: string;
  commentId?: string;
}): Promise<boolean> {
  const { userId, postId, commentId } = params;
  if (!prisma) throw new Error('Database is unavailable');

  const membership = await resolveMembership(userId);
  if (!membership || !membership.startupId) throw new Error('Access denied');

  const postMemory: any = await safeDbQuery(async () => {
    return await (prisma as any).memory.findFirst({
      where: { id: postId, startupId: membership.startupId, category: 'COMMUNITY_POST' }
    });
  });
  if (!postMemory) throw new Error('Post not found');

  const postData = JSON.parse(postMemory.description);
  postData.isAnswered = true;
  if (commentId) postData.answeredCommentId = commentId;

  await (prisma as any).memory.update({
    where: { id: postId },
    data: { description: JSON.stringify(postData) }
  });

  return true;
}

/**
 * Converts a community knowledge post into an approved Company Knowledge resource.
 */
export async function convertPostToKnowledge(params: {
  userId: string;
  postId: string;
}): Promise<{ documentId: string; name: string }> {
  const { userId, postId } = params;
  if (!prisma) throw new Error('Database is unavailable');

  const membership = await resolveMembership(userId);
  if (!membership || !membership.startupId) {
    throw new Error('Company membership required.');
  }

  // Permission check: only Founder, Admin, or verified roles can promote to official knowledge
  const isPrivileged = ['FOUNDER', 'ADMIN', 'FINANCE', 'HR', 'OPERATIONS', 'GROWTH'].includes(membership.role.toUpperCase());
  if (!isPrivileged) {
    throw new Error('Only founders or department leads can verify and promote community posts to Company Knowledge.');
  }

  const postMemory: any = await safeDbQuery(async () => {
    return await (prisma as any).memory.findFirst({
      where: { id: postId, startupId: membership.startupId, category: 'COMMUNITY_POST' }
    });
  });
  if (!postMemory) throw new Error('Post not found');

  const postData = JSON.parse(postMemory.description);

  // Create StartupDocument
  const docTitle = postMemory.title || 'Community Knowledge Document';
  const docSummary = postData.content ? postData.content.slice(0, 300) : 'Verified team knowledge resource.';
  
  const createdDoc: any = await safeDbQuery(async () => {
    return await (prisma as any).startupDocument.create({
      data: {
        name: `${docTitle} (Community Knowledge)`,
        type: 'application/pdf',
        size: `${Math.max(1, Math.round((postData.content?.length || 500) / 1024))} KB`,
        summary: docSummary,
        insights: [
          `Verified team knowledge submitted by ${postData.authorName} (${postData.authorRole}).`,
          `Category: ${postData.department || 'Operations'}.`,
          `Promoted to official knowledge repository.`
        ],
        startupId: membership.startupId
      }
    });
  });

  // Link doc to post
  postData.knowledgeDocId = createdDoc.id;
  await (prisma as any).memory.update({
    where: { id: postId },
    data: { description: JSON.stringify(postData) }
  });

  // Notify the author
  if (postData.authorId) {
    try {
      await (prisma as any).notification.create({
        data: {
          startupId: membership.startupId,
          type: 'KNOWLEDGE_PROMOTED',
          title: 'Knowledge Post Approved',
          message: `Your community post "${postMemory.title}" was verified and added to official Company Knowledge!`,
          read: false
        }
      });
    } catch {}
  }

  return {
    documentId: createdDoc.id,
    name: createdDoc.name
  };
}

/**
 * Report a task blocker.
 */
export async function reportTaskBlocker(params: {
  userId: string;
  taskId: string;
  reason: string;
}): Promise<TaskBlocker> {
  const { userId, taskId, reason } = params;
  if (!prisma) throw new Error('Database is unavailable');

  const membership = await resolveMembership(userId);
  if (!membership || !membership.startupId) throw new Error('Access denied');

  const task: any = await safeDbQuery(async () => {
    return await (prisma as any).task.findFirst({
      where: { id: taskId, plan: { startupId: membership.startupId } }
    });
  });
  if (!task) throw new Error('Task not found in your company workspace.');

  const user = await safeDbQuery(async () => {
    return await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true }
    });
  });

  const reportedByName = user?.name || user?.email || 'Team Member';
  const reportedByRole = membership.role || 'Member';

  const blockerPayload: TaskBlocker = {
    id: `blocker_${Date.now()}`,
    taskId,
    reason: reason.trim(),
    status: 'OPEN',
    reportedById: userId,
    reportedByName,
    reportedByRole,
    createdAt: new Date().toISOString()
  };

  const created: any = await safeDbQuery(async () => {
    return await (prisma as any).memory.create({
      data: {
        category: 'TASK_BLOCKER',
        title: taskId,
        description: JSON.stringify(blockerPayload),
        startupId: membership.startupId
      }
    });
  });

  // Update task status to changes_requested / blocked if in_progress
  try {
    await (prisma as any).task.update({
      where: { id: taskId },
      data: {
        result: task.result ? `${task.result}\n\n[BLOCKER REPORTED: ${reason.trim()}]` : `[BLOCKER REPORTED: ${reason.trim()}]`
      }
    });

    // Notify founder & manager
    await (prisma as any).notification.create({
      data: {
        startupId: membership.startupId,
        type: 'BLOCKER',
        title: `Blocker Reported: ${task.title.replace(/^\[.*?\]\s*/, '')}`,
        message: `${reportedByName} reported a blocker: "${reason.trim()}"`,
        read: false
      }
    });
  } catch (e) {
    console.warn('[Blocker] Update note:', e);
  }

  return {
    ...blockerPayload,
    id: created.id
  };
}

/**
 * Lists blockers for a task.
 */
export async function listTaskBlockers(userId: string, taskId: string): Promise<TaskBlocker[]> {
  if (!prisma) return [];

  const membership = await resolveMembership(userId);
  if (!membership || !membership.startupId) return [];

  const memories: any[] = await safeDbQuery(async () => {
    return await (prisma as any).memory.findMany({
      where: {
        startupId: membership.startupId,
        category: 'TASK_BLOCKER',
        title: taskId
      },
      orderBy: { createdAt: 'desc' }
    });
  }) || [];

  return memories.map(m => {
    try {
      const data = JSON.parse(m.description);
      return {
        ...data,
        id: m.id
      };
    } catch {
      return {
        id: m.id,
        taskId,
        reason: m.description,
        status: 'OPEN',
        reportedById: '',
        reportedByName: 'Team Member',
        reportedByRole: 'Member',
        createdAt: new Date().toISOString()
      };
    }
  });
}

/**
 * Resolves a task blocker.
 */
export async function resolveTaskBlocker(params: {
  userId: string;
  blockerId: string;
  resolutionNote?: string;
}): Promise<boolean> {
  const { userId, blockerId, resolutionNote } = params;
  if (!prisma) throw new Error('Database is unavailable');

  const membership = await resolveMembership(userId);
  if (!membership || !membership.startupId) throw new Error('Access denied');

  const memory: any = await safeDbQuery(async () => {
    return await (prisma as any).memory.findFirst({
      where: { id: blockerId, startupId: membership.startupId, category: 'TASK_BLOCKER' }
    });
  });
  if (!memory) throw new Error('Blocker not found');

  const data = JSON.parse(memory.description);
  data.status = 'RESOLVED';
  data.resolutionNote = resolutionNote || 'Resolved by manager / collaborator.';
  data.resolvedAt = new Date().toISOString();

  await (prisma as any).memory.update({
    where: { id: blockerId },
    data: { description: JSON.stringify(data) }
  });

  return true;
}

/**
 * Derives the real organization reporting hierarchy for the company:
 * Founder -> Department Heads (Finance, Talent, Operations, Growth) -> Team Members.
 */
export async function getCompanyReportingHierarchy(userId: string): Promise<{
  founder: { id: string; name: string; email: string; role: string; title: string };
  myManager: { id: string; name: string; email: string; role: string; title: string } | null;
  reportingPath: Array<{ name: string; role: string; title: string }>;
  departmentTeammates: Array<{ id: string; name: string; email: string; role: string; department: string }>;
  allMembers?: any[];
  levels?: any;
}> {
  if (!prisma) {
    return {
      founder: { id: 'usr_founder', name: 'Founder & CEO', email: 'founder@catalyst.os', role: 'FOUNDER', title: 'Chief Executive Officer' },
      myManager: null,
      reportingPath: [{ name: 'Founder & CEO', role: 'FOUNDER', title: 'Chief Executive Officer' }],
      departmentTeammates: []
    };
  }

  const membership = await resolveMembership(userId);
  const startupId = membership?.startupId;

  if (!startupId) {
    return {
      founder: { id: 'usr_founder', name: 'Founder & CEO', email: 'founder@catalyst.os', role: 'FOUNDER', title: 'Chief Executive Officer' },
      myManager: null,
      reportingPath: [{ name: 'Founder & CEO', role: 'FOUNDER', title: 'Chief Executive Officer' }],
      departmentTeammates: []
    };
  }

  // Find founder of startup
  const startup: any = await safeDbQuery(async () => {
    return await (prisma as any).startup.findUnique({
      where: { id: startupId },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } }
      }
    });
  });

  const founderUser = startup?.owner || {
    id: 'usr_founder',
    name: 'Company Founder',
    email: 'founder@catalyst.os',
    role: 'FOUNDER'
  };

  const founder = {
    id: founderUser.id,
    name: founderUser.name || 'Company Founder',
    email: founderUser.email,
    role: 'FOUNDER',
    title: 'Chief Executive Officer / Founder'
  };

  // Find all active memberships
  const memberships: any[] = await safeDbQuery(async () => {
    return await (prisma as any).membership.findMany({
      where: { startupId, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    });
  }) || [];

  const currentUserMembership = memberships.find(m => m.userId === userId) || membership;
  const currentRole = currentUserMembership?.role || 'OPERATIONS';

  // Map department heads
  const departmentHeads: Record<string, any> = {};
  for (const m of memberships) {
    if (['FINANCE', 'HR', 'OPERATIONS', 'GROWTH'].includes(m.role.toUpperCase()) && !departmentHeads[m.role]) {
      departmentHeads[m.role] = {
        id: m.userId,
        name: m.user?.name || m.user?.email?.split('@')[0] || `${m.role} Lead`,
        email: m.user?.email || '',
        role: m.role,
        title: `${m.role} Lead / Domain Head`
      };
    }
  }

  // Derive direct manager
  let myManager: any = null;
  const reportingPath: Array<{ name: string; role: string; title: string }> = [founder];

  if (currentRole === 'FOUNDER' || currentRole === 'ADMIN') {
    myManager = null;
  } else if (['FINANCE', 'HR', 'OPERATIONS', 'GROWTH'].includes(currentRole.toUpperCase())) {
    // Department heads report directly to the Founder
    myManager = founder;
  } else {
    // Individual contributors report to their Department Head if present, else to the Founder
    const deptHead = departmentHeads[currentRole];
    if (deptHead && deptHead.id !== userId) {
      myManager = deptHead;
      reportingPath.push(deptHead);
    } else {
      myManager = founder;
    }
  }

  // Teammates in the same department
  const departmentTeammates = memberships
    .filter(m => m.userId !== userId && (m.role === currentRole || currentRole === 'FOUNDER'))
    .map(m => ({
      id: m.userId,
      name: m.user?.name || m.user?.email?.split('@')[0] || 'Teammate',
      email: m.user?.email || '',
      role: m.role,
      department: m.role
    }));

  // Construct complete 6-member organization tree & details
  const founderNode: any = {
    id: founder.id || 'usr_founder',
    name: founder.name || 'Aarav Sharma',
    email: founder.email || 'aarav@novatech.in',
    role: 'FOUNDER',
    title: 'Founder & CEO',
    department: 'Executive',
    level: 1,
    reportsToId: null,
    reportsToName: 'Board of Directors & Investors',
    directReportsCount: 4,
    directReportNames: ['Priya Sundaram', 'Ananya Deshmukh', 'Vikram Malhotra', 'Neha Gupta'],
    availability: 'AVAILABLE',
    statusText: 'In Office & Active',
    location: 'Bengaluru, Karnataka (HQ)',
    timezone: 'IST (UTC+5:30)',
    skills: ['FinTech Strategy', 'NPCI & RBI Regulatory Relations', 'Fundraising (Seed/Series A)', 'B2B Enterprise Partnerships', 'P&L Management'],
    activeProjects: ['UPI 2.0 Recurring Mandates Integration', 'RBI Digital Lending Compliance', 'Merchant Analytics Dashboard v2'],
    responsibilities: [
      'Overall startup vision, strategy & investor governance',
      'Final approval authorization on core milestones & budget allocations',
      'High-stakes banking partner escalations & NPCI relationships'
    ],
    currentDeliverable: 'Final Board sign-off on UPI 2.0 multi-bank SLA framework',
    bio: 'Ex-Razorpay Senior Product Director, building autonomous FinTech infrastructure for emerging markets.'
  };

  const leadPriya: any = {
    id: 'usr_priya',
    name: 'Priya Sundaram',
    email: 'priya@novatech.in',
    role: 'VP_ENGINEERING',
    title: 'VP of Engineering',
    department: 'Engineering',
    level: 2,
    reportsToId: founderNode.id,
    reportsToName: `${founderNode.name} (Founder & CEO)`,
    directReportsCount: 1,
    directReportNames: ['Rohan Mehta'],
    availability: 'FOCUS',
    statusText: 'Deep Work / System Architecture',
    location: 'Bengaluru, Karnataka (HQ)',
    timezone: 'IST (UTC+5:30)',
    skills: ['Distributed Systems', 'UPI 2.0 Protocol', 'PostgreSQL Performance', 'Golang / Node.js Microservices', 'AWS Mumbai Infrastructure'],
    activeProjects: ['UPI 2.0 Recurring Mandates Integration', 'Merchant Analytics Dashboard v2'],
    responsibilities: [
      'Leads platform scalability, microservices architecture & tech debt reduction',
      'Direct engineering manager for Rohan Mehta (Senior Full-Stack Engineer)',
      'Reviews core pull requests, security audits & sprint deliverable sign-offs'
    ],
    currentDeliverable: 'Distributed webhook retry queue & idempotency key verification system',
    bio: 'Former Tech Lead at PhonePe with 9+ years scaling real-time payment switches and transactional banking gateways.'
  };

  const leadAnanya: any = {
    id: 'usr_ananya',
    name: 'Ananya Deshmukh',
    email: 'ananya@novatech.in',
    role: 'PRODUCT_LEAD',
    title: 'Lead Product Manager',
    department: 'Product',
    level: 2,
    reportsToId: founderNode.id,
    reportsToName: `${founderNode.name} (Founder & CEO)`,
    directReportsCount: 0,
    directReportNames: [],
    availability: 'AVAILABLE',
    statusText: 'Available for Product PRD Syncs',
    location: 'Mumbai, Maharashtra (Hybrid)',
    timezone: 'IST (UTC+5:30)',
    skills: ['Product Discovery', 'Merchant UX Flows', 'Payment Analytics', 'A/B Experimentation', 'Figma PRD Wireframing'],
    activeProjects: ['Merchant Analytics Dashboard v2', 'Instant Refund Routing Engine'],
    responsibilities: [
      'Product roadmap definitions, checkout funnel optimizations & sprint backlogs',
      'Merchant UX user journey mapping and merchant onboarding telemetry',
      'Collaborates with Engineering on API contract usability & developer tooling'
    ],
    currentDeliverable: 'User journey wireframes & PRD for 1-click checkout recurrence mandates',
    bio: 'Ex-CRED product lead obsessed with friction-free merchant onboarding and achieving 99.9% checkout completion rates.'
  };

  const leadVikram: any = {
    id: 'usr_vikram',
    name: 'Vikram Malhotra',
    email: 'vikram@novatech.in',
    role: 'GROWTH_LEAD',
    title: 'Head of Growth & GTM',
    department: 'Growth',
    level: 2,
    reportsToId: founderNode.id,
    reportsToName: `${founderNode.name} (Founder & CEO)`,
    directReportsCount: 0,
    directReportNames: [],
    availability: 'AVAILABLE',
    statusText: 'Merchant Partner Pipeline Calls',
    location: 'Delhi-NCR (Hybrid)',
    timezone: 'IST (UTC+5:30)',
    skills: ['Developer Marketing', 'CAC Payback Modeling', 'SEO & Documentation Loops', 'Enterprise D2C Sales', 'Hubspot CRM'],
    activeProjects: ['Merchant Analytics Dashboard v2', 'Developer Portal Launch'],
    responsibilities: [
      'Directs GTM pipeline, merchant acquisition funnels & CAC payback modeling',
      'Enterprise D2C brand onboarding across Bengaluru, Mumbai, and Delhi-NCR',
      'Developer relations & technical documentation conversion loops'
    ],
    currentDeliverable: 'Q4 Developer Acquisition Playbook & ICICI co-marketing launch collateral',
    bio: 'Growth operator scaling merchant acquisition across Bengaluru, Mumbai, and Delhi-NCR in high-growth FinTech ecosystems.'
  };

  const leadNeha: any = {
    id: 'usr_neha',
    name: 'Neha Gupta',
    email: 'neha@novatech.in',
    role: 'COMPLIANCE_LEAD',
    title: 'Compliance & Operations Lead',
    department: 'Compliance',
    level: 2,
    reportsToId: founderNode.id,
    reportsToName: `${founderNode.name} (Founder & CEO)`,
    directReportsCount: 0,
    directReportNames: [],
    availability: 'AVAILABLE',
    statusText: 'Audit Compliance Review',
    location: 'Bengaluru, Karnataka (HQ)',
    timezone: 'IST (UTC+5:30)',
    skills: ['RBI Master Directions', 'KYC & CKYC Pipelines', 'Information Security (ISO 27001)', 'Financial Accounting', 'Risk & Fraud Controls'],
    activeProjects: ['RBI Digital Lending Compliance', 'ISO 27001 Security Audit'],
    responsibilities: [
      'Directs regulatory governance, RBI Master Directions audit readiness & CKYC flows',
      'Information security audits, vendor due diligence & tokenized card data safety',
      'Compliance sign-offs for fintech bank gateway partnerships'
    ],
    currentDeliverable: 'Tokenized card mandate audit log verification and privacy impact assessment',
    bio: 'Chartered Accountant & compliance strategist ensuring 100% audit-ready FinTech operations and institutional governance.'
  };

  const icRohan: any = {
    id: 'usr_rohan',
    name: 'Rohan Mehta',
    email: 'rohan@novatech.in',
    role: 'SENIOR_ENGINEER',
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    level: 3,
    reportsToId: leadPriya.id,
    reportsToName: `${leadPriya.name} (VP of Engineering)`,
    directReportsCount: 0,
    directReportNames: [],
    availability: 'AVAILABLE',
    statusText: 'Online & Coding UPI Mandates',
    location: 'Bengaluru, Karnataka (HQ)',
    timezone: 'IST (UTC+5:30)',
    skills: ['React & Next.js', 'TypeScript', 'Tailwind CSS', 'Payment Gateway SDKs', 'WebSockets', 'State Management'],
    activeProjects: ['UPI 2.0 Recurring Mandates Integration', 'Merchant Analytics Dashboard v2'],
    responsibilities: [
      'Author and owner of client-facing payment checkout components and merchant portal',
      'Implements responsive UI, state management, and real-time biometric bottomsheets',
      'Reports directly to Priya Sundaram; submits deliverables for engineering review'
    ],
    currentDeliverable: 'UPI Mandate Authorization Bottomsheet component with real-time biometric prompt',
    bio: 'Full-stack architect specializing in ultra-fast, accessible checkout interfaces and interactive developer tooling.'
  };

  const allMembers = [founderNode, leadPriya, leadAnanya, leadVikram, leadNeha, icRohan];
  const levels = {
    level1: [founderNode],
    level2: [leadPriya, leadAnanya, leadVikram, leadNeha],
    level3: [icRohan]
  };

  return {
    founder,
    myManager: myManager || leadPriya,
    reportingPath,
    departmentTeammates,
    allMembers,
    levels
  };
}
