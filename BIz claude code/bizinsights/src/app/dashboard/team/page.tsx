'use client'

import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreateOrganizationForm } from '@/components/organization/create-organization-form'
import { useCurrentOrganization } from '@/hooks/useOrganization'
import { useTeam } from '@/hooks/useTeam'
import { Users, UserPlus, Mail, Shield, Crown, User } from 'lucide-react'

export default function Team() {
  const { user, isLoaded } = useUser()
  const { organization, isLoading: orgLoading } = useCurrentOrganization()
  const { 
    teamData, 
    loading: teamLoading, 
    error: teamError,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation
  } = useTeam(organization?.id || '')

  if (!isLoaded || orgLoading || teamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    redirect('/auth/signin')
  }

  if (!organization) {
    return <CreateOrganizationForm />
  }

  const teamMembers = teamData.members
  const pendingInvitations = teamData.pendingInvitations

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Owner':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'Admin':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'Member':
        return <User className="h-4 w-4 text-green-600" />
      case 'Viewer':
        return <User className="h-4 w-4 text-gray-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Owner':
        return 'bg-yellow-100 text-yellow-800'
      case 'Admin':
        return 'bg-blue-100 text-blue-800'
      case 'Member':
        return 'bg-green-100 text-green-800'
      case 'Viewer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'Inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600">Manage your organization members and permissions</p>
          </div>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>

        {/* Team Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamData.stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamData.stats.activeMembers}</div>
              <p className="text-xs text-muted-foreground">All active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamData.stats.pendingInvites}</div>
              <p className="text-xs text-muted-foreground">Awaiting response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamData.stats.adminUsers}</div>
              <p className="text-xs text-muted-foreground">With admin access</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <p className="text-xs text-gray-500">Joined {member.joinedAt} • Last active {member.lastActive}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(member.role)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                        {member.role}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(member.status)}`}>
                      {member.status}
                    </span>
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-gray-600">
                          Invited as {invitation.role} on {invitation.invitedAt} • Expires {invitation.expiresAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Resend
                      </Button>
                      <Button size="sm" variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Permission</th>
                    <th className="text-center py-2">Owner</th>
                    <th className="text-center py-2">Admin</th>
                    <th className="text-center py-2">Member</th>
                    <th className="text-center py-2">Viewer</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="py-2">View Dashboard</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">✓</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Manage Integrations</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Generate Reports</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Manage Team</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">-</td>
                    <td className="text-center">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Billing & Plans</td>
                    <td className="text-center">✓</td>
                    <td className="text-center">-</td>
                    <td className="text-center">-</td>
                    <td className="text-center">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}