import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';
import { EventDetailDrawer } from '../../components/workflow/EventDetailDrawer';
import { useAuthStore } from '../../store/authStore';
import { useSimulationStore } from '../../store/simulationStore';
import { InsurableEvent } from '../../types/event';
import {
  Building2,
  Award,
  Search,
  PlusCircle,
  RotateCcw,
  Clock,
  AlertTriangle,
  FileCheck,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export const ProviderDashboard: React.FC = () => {
  const { currentProvider } = useAuthStore();
  const { events } = useSimulationStore();

  const [showAccreditationModal, setShowAccreditationModal] = useState(false);
  const [selectedDrawerEvent, setSelectedDrawerEvent] = useState<InsurableEvent | null>(null);

  const mockNeedsAttentionEvents = events.filter((e) => e.status === 'OPEN');

  const accreditationHistory = [
    { date: '12 Apr 2025', action: 'DGHS Initial Accreditation Granted', status: 'ACCREDITED' },
    { date: '03 Feb 2026', action: 'Annual On-Site Audit & Credential Renewal', status: 'RENEWED' },
    { date: '01 Sep 2026', action: 'Active Network Member Status Confirmed', status: 'ACTIVE' },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Section 2.1: Provider Identity Header Card */}
        <Card className="p-6 border-teal-200 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-bold text-slate-900">{currentProvider.name}</h1>
                  <Badge variant="success">Accredited ✓</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono mt-1">
                  <span>Provider ID: <strong className="text-slate-800">PRV-00142</strong></span>
                  <span>Credential Status: <strong className="text-emerald-700">VALID ✓</strong></span>
                  <span>Facility Type: <strong className="text-slate-800">{currentProvider.facilityType}</strong></span>
                  <span>Last Verified: <strong className="text-slate-800">01 Sep 2026</strong></span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAccreditationModal(true)}
              icon={<Award className="w-4 h-4 text-teal-600" />}
            >
              View Accreditation
            </Button>
          </div>
        </Card>

        {/* Section 2.2: Dashboard Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1 border-slate-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">Today's Admissions</span>
            <div className="text-2xl font-extrabold text-slate-900">12</div>
            <span className="text-[10px] text-slate-400 font-mono">Mirpur Upazila Ward</span>
          </Card>

          <Card className="p-4 space-y-1 border-slate-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">Open Events</span>
            <div className="text-2xl font-extrabold text-teal-700">{events.filter((e) => e.status === 'OPEN').length + 7}</div>
            <span className="text-[10px] text-teal-600 font-mono font-semibold">Active Uniqueness Keys</span>
          </Card>

          <Card className="p-4 space-y-1 border-slate-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">Pending Attestations</span>
            <div className="text-2xl font-extrabold text-amber-700">3</div>
            <span className="text-[10px] text-amber-600 font-mono font-semibold">Awaiting Non-Payee Quorum</span>
          </Card>

          <Card className="p-4 space-y-1 border-slate-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">Events Completed</span>
            <div className="text-2xl font-extrabold text-emerald-700">41</div>
            <span className="text-[10px] text-emerald-600 font-mono font-semibold">Settled or Eligible</span>
          </Card>
        </div>

        {/* Section 2.3: Needs Attention Panel */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Needs Attention ({mockNeedsAttentionEvents.length > 0 ? mockNeedsAttentionEvents.length : 1})</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockNeedsAttentionEvents.length === 0 ? (
              <Card className="p-4 space-y-3 border-amber-200 bg-amber-50/30">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-amber-800 text-sm">EVT-1001</span>
                      <Badge variant="warning">Provider Attestation Pending</Badge>
                    </div>
                    <p className="text-xs text-slate-800 font-semibold mt-1">Rahim Uddin (NID: 19922691458000312)</p>
                    <p className="text-[11px] text-slate-600 font-mono">Acute Appendicitis Hospitalization</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-amber-200">
                  <span className="text-slate-600">Quorum: Clinical ✓ | Field —</span>
                  <Link to="/provider/assert-event">
                    <Button variant="primary" size="sm" icon={<FileCheck className="w-4 h-4" />}>
                      Review Event
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              mockNeedsAttentionEvents.map((evt) => (
                <Card key={evt.id} className="p-4 space-y-3 border-teal-200 bg-teal-50/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-teal-800 text-sm">{evt.id}</span>
                        <Badge variant="info">{evt.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-900 font-bold mt-1">{evt.holderName}</p>
                      <p className="text-[11px] text-slate-600 font-mono">{evt.diagnosisCategory}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-teal-200">
                    <span className="text-slate-600">Admitted: {evt.createdAt}</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedDrawerEvent(evt)}
                      icon={<Eye className="w-4 h-4" />}
                    >
                      Review Event
                    </Button>
                  </div>
                </Card>
              ))
            )}

            <Card className="p-4 space-y-3 border-indigo-200 bg-indigo-50/20">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-indigo-800 text-sm">EXISTING EVENT DETECTED</span>
                    <Badge variant="purple">Transfer Segment Available</Badge>
                  </div>
                  <p className="text-xs text-slate-900 font-bold mt-1">Karim Ahmed (EVT-0998)</p>
                  <p className="text-[11px] text-slate-600 font-mono">Transferred from Upazila to District Hospital</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-indigo-200">
                <span className="text-slate-600">Action: Add segment (`continueEvent`)</span>
                <Link to="/provider/continue-event">
                  <Button variant="outline" size="sm" icon={<RotateCcw className="w-4 h-4 text-indigo-600" />}>
                    Continue Event
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {/* Section 2.4: Recent Events Table */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
            Recent Facility Admissions & Assertions
          </h2>

          <DataTable
            data={events}
            keyExtractor={(e) => e.id}
            columns={[
              { header: 'Event ID', accessorKey: 'id', className: 'font-mono font-bold text-teal-700' },
              { header: 'Patient Name', accessorKey: 'holderName', className: 'font-semibold text-slate-900' },
              { header: 'Diagnosis Category', accessorKey: 'diagnosisCategory' },
              { header: 'Admission Date', accessorKey: 'createdAt', className: 'font-mono text-slate-500' },
              {
                header: 'Status',
                cell: (e) => <Badge variant={e.status === 'CLOSED_ELIGIBLE' ? 'success' : 'info'}>{e.status}</Badge>,
              },
              {
                header: 'Action',
                cell: (e) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDrawerEvent(e)}
                    icon={<Eye className="w-3.5 h-3.5" />}
                  >
                    View
                  </Button>
                ),
              },
            ]}
          />
        </div>

        {/* Section 2.5: Quick Action Buttons Bar */}
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-mono font-bold text-slate-600 uppercase">Provider Quick Actions:</span>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/provider/patient">
              <Button variant="glass" size="sm" icon={<Search className="w-4 h-4 text-slate-600" />}>
                Find Patient
              </Button>
            </Link>
            <Link to="/provider/assert-event">
              <Button variant="primary" size="sm" icon={<PlusCircle className="w-4 h-4" />}>
                Assert New Event
              </Button>
            </Link>
            <Link to="/provider/continue-event">
              <Button variant="outline" size="sm" icon={<RotateCcw className="w-4 h-4 text-teal-600" />}>
                Continue Event (Transfer)
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Accreditation History Modal (Section 2.1) */}
      <Modal
        isOpen={showAccreditationModal}
        onClose={() => setShowAccreditationModal(false)}
        title="Facility Accreditation & Credential History"
      >
        <div className="space-y-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 space-y-1">
            <span className="font-bold block">{currentProvider.name}</span>
            <span>Provider ID: PRV-00142 | Status: ACCREDITED ✓</span>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-700 uppercase text-[11px]">Accreditation History Log</h4>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
              {accreditationHistory.map((item, idx) => (
                <div key={idx} className="p-3 bg-white flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 font-mono text-[10px] block">{item.date}</span>
                    <span className="text-slate-800 font-semibold">{item.action}</span>
                  </div>
                  <Badge variant="success">{item.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Reusable Event Detail Drawer */}
      <EventDetailDrawer
        event={selectedDrawerEvent}
        isOpen={!!selectedDrawerEvent}
        onClose={() => setSelectedDrawerEvent(null)}
      />
    </PageContainer>
  );
};
