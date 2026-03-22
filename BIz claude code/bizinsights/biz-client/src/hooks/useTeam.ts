import { useState, useEffect } from 'react'
import { teamApi } from '../lib/api'

export interface TeamMember {
  id: string
  userId: string
  name: string
  email: string
  image?: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt: string
  lastActive: string
}

export interface TeamInvitation {
  id: string
  email: string
  role: 'ADMIN' | 'MEMBER' | 'VIEWER'
  invitedAt: string
  expiresAt: string
  invitedBy: string
}

export interface TeamStats {
  totalMembers: number
  activeMembers: number
  pendingInvites: number
  adminUsers: number
}

export interface TeamData {
  members: TeamMember[]
  pendingInvitations: TeamInvitation[]
  stats: TeamStats
}

export function useTeam(organizationId: string) {
  const [teamData, setTeamData] = useState<TeamData>({
    members: [],
    pendingInvitations: [],
    stats: {
      totalMembers: 0,
      activeMembers: 0,
      pendingInvites: 0,
      adminUsers: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamData = async () => {
    if (!organizationId) return

    try {
      setLoading(true)
      setError(null)

      const response = await teamApi.getMembers(organizationId)
      const data = response.data

      if (data.success) {
        setTeamData(data.data)
      } else {
        setError(data.error || 'Failed to fetch team data')
      }
    } catch (err) {
      setError('Failed to fetch team data')
      console.error('Error fetching team data:', err)
    } finally {
      setLoading(false)
    }
  }

  const inviteMember = async (email: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    try {
      const response = await teamApi.inviteMember(organizationId, { email, role })
      const data = response.data

      if (data.success) {
        await fetchTeamData()
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error inviting member:', err)
      return { success: false, error: 'Failed to send invitation' }
    }
  }

  const updateMemberRole = async (memberId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    try {
      const response = await teamApi.updateMemberRole(organizationId, memberId, role)
      const data = response.data

      if (data.success) {
        await fetchTeamData()
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error updating member role:', err)
      return { success: false, error: 'Failed to update member role' }
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const response = await teamApi.removeMember(organizationId, memberId)
      const data = response.data

      if (data.success) {
        await fetchTeamData()
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error removing member:', err)
      return { success: false, error: 'Failed to remove member' }
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    try {
      const response = await teamApi.cancelInvitation(invitationId)
      const data = response.data

      if (data.success) {
        await fetchTeamData()
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error cancelling invitation:', err)
      return { success: false, error: 'Failed to cancel invitation' }
    }
  }

  const resendInvitation = async (_invitationId: string) => {
    // TODO: Implement resend invitation functionality
    return { success: false, error: 'Resend functionality not yet implemented' }
  }

  useEffect(() => {
    fetchTeamData()
  }, [organizationId])

  return {
    teamData,
    loading,
    error,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    resendInvitation,
    refetchTeamData: fetchTeamData
  }
}
