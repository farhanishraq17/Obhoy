import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { MOCK_INSURERS } from '../../data/insurers';
import { MOCK_TRANSPARENCY_RECORDS } from '../../data/transparency';
import { formatBDT, formatPercent, formatTruncatedHash } from '../../lib/format';
import { ShieldCheck, ExternalLink, CheckCircle2, BarChart3 } from 'lucide-react';

export const TransparencyExplorer: React.FC = () => {
  return (
    <PageContainer isPublic>
      <div className="max-w-6xl mx-auto space-y-10 py-6">
        <div className="text-center space-y-3">
          <Badge variant="success" pulse>
            Public Audit Channel
          </Badge>
          <h1 className="text-3xl font-extrabold text-slate-900">Public Transparency & Insurer Comparison</h1>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto">
            Every quarter, Obhoy commits quarterly settlement ratios and payout totals to public audit ledgers. Buyers can verify an insurer's actual payout behavior before purchasing cover.
          </p>
        </div>

        {/* Insurer Comparison Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            <span>Verified Insurer Performance Ratios</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_INSURERS.map((ins) => (
              <Card key={ins.id} hoverable className="space-y-4 border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{ins.name}</span>
                  <Badge variant={ins.settlementRatio > 0.85 ? 'success' : 'warning'}>
                    {formatPercent(ins.settlementRatio)} Settled
                  </Badge>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Denial Ratio:</span>
                    <span className="text-slate-800 font-semibold">{formatPercent(ins.denialRatio)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Median Settlement:</span>
                    <span className="text-teal-700 font-semibold">{ins.medianSettlementDays} days</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Active Policies:</span>
                    <span className="text-slate-800">{ins.activePoliciesCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Total Paid Out:</span>
                    <span className="text-emerald-700 font-bold">{formatBDT(ins.totalClaimsPaidBDT)}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-teal-700 font-medium">
                  <span className="flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Audit Hash Verified</span>
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Public Audit Ledger */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <ExternalLink className="w-5 h-5 text-cyan-700" />
            <span>Public Transparency Audit Ledger</span>
          </h2>

          <DataTable
            data={MOCK_TRANSPARENCY_RECORDS}
            keyExtractor={(r) => r.id}
            columns={[
              { header: 'Period', accessorKey: 'period', className: 'font-bold text-teal-700 font-mono' },
              { header: 'Insurer', accessorKey: 'insurerName' },
              { header: 'Claims Settled / Received', cell: (r) => `${r.totalClaimsSettled} / ${r.totalClaimsReceived}` },
              { header: 'Total Payout', cell: (r) => formatBDT(r.totalPayoutBDT), className: 'text-emerald-700 font-bold' },
              { header: 'Median Days', cell: (r) => `${r.medianSettlementDays} days` },
              { header: 'Audit Root Hash', cell: (r) => <span className="font-mono text-xs text-slate-600">{formatTruncatedHash(r.merkleRoot, 6)}</span> },
              { header: 'Public Ref', cell: (r) => <span className="font-mono text-xs text-cyan-700 font-semibold">{formatTruncatedHash(r.publicChainTxHash, 6)}</span> },
            ]}
          />
        </div>
      </div>
    </PageContainer>
  );
};
