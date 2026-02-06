import { db } from '@/config/database'
import {
  teams,
  teamMembers,
  teamShares,
  type Team,
  type NewTeam,
  type TeamMember,
  type NewTeamMember,
  type TeamShare,
  type NewTeamShare,
} from '@/db/schema/organizations'
import { users } from '@/db/schema/tables'
import { eq, and, inArray } from 'drizzle-orm'
import { logger } from '@/config/logger'
import { notify } from '@/services/notifications'

export class TeamService {
  /**
   * List teams in an organization
   */
  async listTeams(organizationId: string, userId?: string): Promise<Team[]> {
    const conditions = [eq(teams.organizationId, organizationId)]
    
    // If userId provided, only return teams user is member of
    if (userId) {
      const userTeams = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId))
      
      const teamIds = userTeams.map(t => t.teamId)
      if (teamIds.length > 0) {
        conditions.push(inArray(teams.id, teamIds))
      } else {
        // User is not in any teams, return empty
        return []
      }
    }

    return await db
      .select()
      .from(teams)
      .where(and(...conditions))
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<Team | null> {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1)

    return team || null
  }

  /**
   * Create a new team
   */
  async createTeam(
    organizationId: string,
    ownerId: string,
    data: { name: string; description?: string }
  ): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values({
        organizationId,
        ownerId,
        name: data.name,
        description: data.description,
      })
      .returning()

    if (!team) {
      throw new Error('Failed to create team')
    }

    // Add owner as admin member
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: ownerId,
      role: 'admin',
      invitedByUserId: ownerId,
    })

    logger.info({ teamId: team.id, organizationId, ownerId }, 'Created new team')
    return team
  }

  /**
   * Update team
   */
  async updateTeam(
    teamId: string,
    userId: string,
    data: { name?: string; description?: string }
  ): Promise<Team> {
    // Verify user is team admin
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.role, 'admin')
      ))
      .limit(1)

    if (!member) {
      throw new Error('User is not an admin of this team')
    }

    const [updated] = await db
      .update(teams)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId))
      .returning()

    if (!updated) {
      throw new Error('Team not found')
    }

    return updated
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string, userId: string): Promise<void> {
    // Verify user is team owner or admin
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1)

    if (!team) {
      throw new Error('Team not found')
    }

    if (team.ownerId !== userId) {
      const [member] = await db
        .select()
        .from(teamMembers)
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.role, 'admin')
        ))
        .limit(1)

      if (!member) {
        throw new Error('Only team owner or admin can delete team')
      }
    }

    await db.delete(teams).where(eq(teams.id, teamId))
    logger.info({ teamId, userId }, 'Deleted team')
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<Array<TeamMember & { user: { id: string; name: string | null; email: string } }>> {
    const members = await db
      .select({
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        invitedByUserId: teamMembers.invitedByUserId,
        createdAt: teamMembers.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId))

    return members as any
  }

  /**
   * Invite member to team by email
   */
  async inviteMember(
    teamId: string,
    inviterId: string,
    email: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<TeamMember> {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      throw new Error('User not found with that email')
    }

    // Check if already a member
    const [existing] = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id)
      ))
      .limit(1)

    if (existing) {
      throw new Error('User is already a member of this team')
    }

    const [member] = await db
      .insert(teamMembers)
      .values({
        teamId,
        userId: user.id,
        role,
        invitedByUserId: inviterId,
      })
      .returning()

    if (!member) {
      throw new Error('Failed to invite member')
    }

    // Get team name for notification
    const [team] = await db
      .select({ name: teams.name })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1)

    // Get inviter name for notification
    const [inviter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, inviterId))
      .limit(1)

    // Send notification
    notify(user.id, 'team_invite', {
      inviterName: inviter?.name || null,
      teamName: team?.name || 'Team',
      role,
    }).catch((error) => {
      logger.error({ error, userId: user.id, teamId }, 'Failed to send team invite notification')
    })

    logger.info({ teamId, userId: user.id, inviterId }, 'Invited member to team')
    return member
  }

  /**
   * Remove member from team
   */
  async removeMember(teamId: string, userId: string, removerId: string): Promise<void> {
    // Verify remover is admin
    const [remover] = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, removerId),
        eq(teamMembers.role, 'admin')
      ))
      .limit(1)

    if (!remover) {
      throw new Error('Only team admins can remove members')
    }

    // Cannot remove team owner
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1)

    if (team?.ownerId === userId) {
      throw new Error('Cannot remove team owner')
    }

    await db
      .delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ))

    logger.info({ teamId, userId, removerId }, 'Removed member from team')
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    teamId: string,
    userId: string,
    newRole: 'admin' | 'member',
    updaterId: string
  ): Promise<TeamMember> {
    // Verify updater is admin
    const [updater] = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, updaterId),
        eq(teamMembers.role, 'admin')
      ))
      .limit(1)

    if (!updater) {
      throw new Error('Only team admins can update member roles')
    }

    const [updated] = await db
      .update(teamMembers)
      .set({ role: newRole })
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ))
      .returning()

    if (!updated) {
      throw new Error('Member not found')
    }

    return updated
  }

  /**
   * Share resource with team
   */
  async shareResource(
    teamId: string,
    resourceType: 'clause' | 'project' | 'playbook' | 'chat_session' | 'document',
    resourceId: string,
    permission: 'view' | 'use' | 'edit' | 'remix' | 'admin',
    sharedByUserId: string
  ): Promise<TeamShare> {
    // Check if already shared
    const [existing] = await db
      .select()
      .from(teamShares)
      .where(and(
        eq(teamShares.teamId, teamId),
        eq(teamShares.resourceType, resourceType),
        eq(teamShares.resourceId, resourceId)
      ))
      .limit(1)

    if (existing) {
      // Update permission
      const [updated] = await db
        .update(teamShares)
        .set({ permission })
        .where(eq(teamShares.id, existing.id))
        .returning()

      return updated!
    }

    const [share] = await db
      .insert(teamShares)
      .values({
        teamId,
        resourceType,
        resourceId,
        permission,
        sharedByUserId,
      })
      .returning()

    if (!share) {
      throw new Error('Failed to share resource')
    }

    // Get team members to notify
    const teamMembersList = await this.getTeamMembers(teamId)

    // Get sharer name
    const [sharer] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, sharedByUserId))
      .limit(1)

    // Notify all team members (except the sharer)
    const notifications = teamMembersList
      .filter((m) => m.user.id !== sharedByUserId)
      .map((member) =>
        notify(member.user.id, 'resource_shared', {
          sharerName: sharer?.name || null,
          resourceType,
          resourceName: `${resourceType} ${resourceId.slice(0, 8)}`, // Use resource ID as name fallback
        }).catch((error) => {
          logger.error({ error, userId: member.user.id }, 'Failed to send resource share notification')
        })
      )

    await Promise.allSettled(notifications)

    logger.info({ teamId, resourceType, resourceId, sharedByUserId }, 'Shared resource with team')
    return share
  }

  /**
   * Unshare resource from team
   */
  async unshareResource(shareId: string, userId: string): Promise<void> {
    // Verify user has permission (team admin or shared by user)
    const [share] = await db
      .select()
      .from(teamShares)
      .where(eq(teamShares.id, shareId))
      .limit(1)

    if (!share) {
      throw new Error('Share not found')
    }

    // Check if user is team admin
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, share.teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.role, 'admin')
      ))
      .limit(1)

    if (!member && share.sharedByUserId !== userId) {
      throw new Error('Only team admin or sharer can unshare')
    }

    await db.delete(teamShares).where(eq(teamShares.id, shareId))
    logger.info({ shareId, userId }, 'Unshared resource from team')
  }

  /**
   * Get team shares
   */
  async getTeamShares(teamId: string): Promise<TeamShare[]> {
    return await db
      .select()
      .from(teamShares)
      .where(eq(teamShares.teamId, teamId))
  }
}

export const teamService = new TeamService()

