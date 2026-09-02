import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { EventDetailDrawer } from '../../components/workflow/EventDetailDrawer';
import { useSimulationStore } from '../../store/simulationStore';
import { InsurableEvent } from '../../types/event';
import { Clock, Eye, CheckCircle2, FileCheck } from 'lucide-react';

export const ProviderHistory: React.FC = () => {
  const { events } = useSimulationStore();
  const [selectedDrawerEvent, setSelectedDrawerEvent] = useState<InsurableEvent | null>(null);

  const mockAttestations = [
    {
      eventId: 'EVT-1001',
      patientName: 'Rahim Uddin',
      type: 'PROVIDER ASSERTION',
      date: '01 Sep 2026',
      status: 'VALID',
    },
    {
      eventId: 'EVT-0998',
      patientName: 'Karim Ahmed',
      type: 'TRANSFER ATTESTATION',
      date: '31 Aug 2026',
      status: 'VALID',
    },
    {
      eventId: 'EVT-0991',
      patientName: 'Salma Begum',
      type: 'PROVIDER ATTESTATION',
      date: '29 Aug 2026',
      status: 'VALID',
    },
    {
      eventId: 'EVT-0985',
      patientName: 'Abul Hossain',
      type: 'PROVIDER ASSERTION',
      date: '25 Aug 2026',
      status: 'VALID',
    },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Provider Attestation History</h1>
          <p className="text-xs text-slate-500 font-mono">
            Historical record of all events attested by ABC Upazila Health Complex (PRV-00142)
          </p>
        </div>

        {/* Section 6.1 Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1 border-slate-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">Total Attestations</span>
            <div className="text-2xl font-extrabold text-slate-900">428</div>
            <span className="text-[10px] text-slate-400 font-mono">Signed by PRV-00142</span>
          </Card>

          <Card className="p-4 space-y-1 border-slate-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">This Month</span>
            <div className="text-2xl font-extrabold text-teal-700">37</div>
            <span className="text-[10px] text-teal-600 font-mono font-semibold">September 2026</span>
          </Card>

          <Card className="p-4 space-y-1 border-slate-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">Accepted (Valid)</span>
            <div className="text-2xl font-extrabold text-emerald-700">412</div>
            <span className="text-[10px] text-emerald-600 font-mono font-semibold">96.2% Acceptance Rate</span>
          </Card>

          <Card className="p-4 space-y-1 border-slate-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">Flagged / Rejected</span>
            <div className="text-2xl font-extrabold text-rose-700">16</div>
            <span className="text-[10px] text-rose-600 font-mono font-semibold">Overturned or Flagged</span>
          </Card>
        </div>

        {/* Section 6.2 Attestation History Table */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
            Attested Event Logs
          </h2>

          <DataTable
            data={mockAttestations}
            keyExtractor={(a) => a.eventId}
            columns={[
              { header: 'Event ID', accessorKey: 'eventId', className: 'font-mono font-bold text-teal-700' },
              { header: 'Patient', accessorKey: 'patientName', className: 'font-semibold text-slate-900' },
              {
                header: 'Attestation Type',
                cell: (a) => <span className="font-mono text-xs text-indigo-700 font-bold">{a.type}</span>,
              },
              { header: 'Date', accessorKey: 'date', className: 'font-mono text-slate-500' },
              {
                header: 'Status',
                cell: (a) => <Badge variant={a.status === 'VALID' ? 'success' : 'error'}>{a.status}</Badge>,
              },
              {
                header: 'Quorum Detail',
                cell: (a) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const matched = events.find((e) => e.id === a.eventId) || events[0];
                      setSelectedDrawerEvent(matched);
                    }}
                    icon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Inspect
                  </Button>
                ),
              },
            ]}
          />
        </div>

        {/* Reusable Drawer Integration (Section 6.3 & Section 7) */}
        <EventDetailDrawer
          event={selectedDrawerEvent}
          isOpen={!!selectedDrawerEvent}
          onClose={() => setSelectedDrawerEvent(null)}
        />
      </div>
    </PageContainer>
  );
};
