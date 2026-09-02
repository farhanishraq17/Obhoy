import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { HeartPulse, Wheat, Car, Building } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Products: React.FC = () => {
  return (
    <PageContainer isPublic>
      <div className="max-w-5xl mx-auto space-y-8 py-6">
        <div className="text-center space-y-3">
          <Badge variant="purple">Multi-Line Protocol Architecture</Badge>
          <h1 className="text-3xl font-extrabold text-slate-900">Supported Insurance Product Lines</h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            One underlying claims-integrity protocol handles hospitalization, crop parametric index, motor scheduled benefit, and catastrophic property cover.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card hoverable className="space-y-4 border-teal-300 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Catastrophic Hospitalization</h3>
                  <p className="text-xs text-slate-500 font-mono">Healthcare Pilot Line (Deployed)</p>
                </div>
              </div>
              <Badge variant="success">Active Pilot</Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Defined-benefit payout of BDT 50,000 for inpatient surgery/hospitalization. Uniqueness key H(NIDCommitment || admissionWindow) prevents double claiming while allowing transfers via `continueEvent()`.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="primary" size="sm" className="w-full">
                  Access Policyholder Portal
                </Button>
              </Link>
            </div>
          </Card>

          <Card hoverable className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Wheat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Parametric Crop Yield</h3>
                  <p className="text-xs text-slate-500 font-mono">Weather Station Index Trigger</p>
                </div>
              </div>
              <Badge variant="warning">Specification</Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automatic payout triggered when automated weather station records drought/flood breach. Zero claimant-supplied documents required; removes invoice inflation.
            </p>
          </Card>

          <Card hoverable className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Scheduled Motor Third-Party</h3>
                  <p className="text-xs text-slate-500 font-mono">Traffic Authority & Workshop Attestation</p>
                </div>
              </div>
              <Badge variant="purple">Specification</Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Vehicle incident key H(vehicleID || timestamp). Workshop cannot attest alone without independent traffic authority report.
            </p>
          </Card>

          <Card hoverable className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Catastrophic Property Protection</h3>
                  <p className="text-xs text-slate-500 font-mono">Fire Service & Adjuster Quorum</p>
                </div>
              </div>
              <Badge variant="info">Specification</Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Peril window key H(parcelID || perilWindow). Settles against certified disaster authority reports.
            </p>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};
