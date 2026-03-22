import { useState } from 'react';
import { useCurrentOrganization } from '../hooks/useOrganization';
import { useAlerts, useAcknowledgeAlert, useResolveAlert, useDismissAlert } from '../hooks/useAlerts';
import toast from 'react-hot-toast';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Eye,
  Clock,
  RefreshCw,
  Filter,
} from 'lucide-react';

const severityConfig = {
  CRITICAL: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  HIGH: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  MEDIUM: {
    icon: Info,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  LOW: {
    icon: Info,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
};

const statusConfig = {
  ACTIVE: { label: 'Active', color: 'bg-red-100 text-red-800' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  DISMISSED: { label: 'Dismissed', color: 'bg-gray-100 text-gray-800' },
};

export default function AlertsPage() {
  const { organization } = useCurrentOrganization();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: alerts, isLoading, refetch } = useAlerts(organization?.id || null, statusFilter || undefined);
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();
  const dismissMutation = useDismissAlert();

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeMutation.mutateAsync(alertId);
      toast.success('Alert acknowledged');
      refetch();
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await resolveMutation.mutateAsync(alertId);
      toast.success('Alert resolved');
      refetch();
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  const handleDismiss = async (alertId: string) => {
    try {
      await dismissMutation.mutateAsync(alertId);
      toast.success('Alert dismissed');
      refetch();
    } catch (error) {
      toast.error('Failed to dismiss alert');
    }
  };

  if (!organization) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Organization Found</h2>
        <p className="text-gray-600">Please create an organization to view alerts.</p>
      </div>
    );
  }

  const activeAlerts = alerts?.filter((a: any) => a.status === 'ACTIVE') || [];
  const otherAlerts = alerts?.filter((a: any) => a.status !== 'ACTIVE') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-600">Monitor and manage business alerts</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Active Alerts"
          count={activeAlerts.length}
          icon={<AlertCircle className="h-6 w-6 text-red-600" />}
          color="bg-red-50"
        />
        <SummaryCard
          title="Critical"
          count={alerts?.filter((a: any) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length || 0}
          icon={<AlertTriangle className="h-6 w-6 text-orange-600" />}
          color="bg-orange-50"
        />
        <SummaryCard
          title="Acknowledged"
          count={alerts?.filter((a: any) => a.status === 'ACKNOWLEDGED').length || 0}
          icon={<Eye className="h-6 w-6 text-yellow-600" />}
          color="bg-yellow-50"
        />
        <SummaryCard
          title="Resolved Today"
          count={alerts?.filter((a: any) => {
            if (a.status !== 'RESOLVED' || !a.resolvedAt) return false;
            const today = new Date().toDateString();
            return new Date(a.resolvedAt).toDateString() === today;
          }).length || 0}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          color="bg-green-50"
        />
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-red-600 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Active Alerts ({activeAlerts.length})
            </h2>
          </div>
          <div className="divide-y">
            {activeAlerts.map((alert: any) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Alerts */}
      {otherAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-700">Alert History</h2>
          </div>
          <div className="divide-y">
            {otherAlerts.map((alert: any) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!alerts || alerts.length === 0) && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts</h3>
          <p className="text-gray-600">
            You're all caught up! No alerts to show at this time.
          </p>
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

function SummaryCard({ title, count, icon, color }: SummaryCardProps) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{count}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

interface AlertItemProps {
  alert: any;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onDismiss: (id: string) => void;
}

function AlertItem({ alert, onAcknowledge, onResolve, onDismiss }: AlertItemProps) {
  const severity = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.LOW;
  const status = statusConfig[alert.status as keyof typeof statusConfig] || statusConfig.ACTIVE;
  const SeverityIcon = severity.icon;

  return (
    <div className={`p-4 ${severity.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <SeverityIcon className={`h-6 w-6 ${severity.color} mt-1`} />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900">{alert.title}</h3>
              <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(alert.createdAt).toLocaleString()}
              </span>
              <span className="capitalize">{alert.type.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
        {alert.status === 'ACTIVE' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white"
            >
              Acknowledge
            </button>
            <button
              onClick={() => onResolve(alert.id)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Resolve
            </button>
            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1 text-gray-500 hover:bg-white rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
