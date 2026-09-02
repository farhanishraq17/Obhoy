import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public Pages
import { Home } from '../pages/public/Home';
import { HowItWorks } from '../pages/public/HowItWorks';
import { Products } from '../pages/public/Products';
import { TransparencyExplorer } from '../pages/public/TransparencyExplorer';
import { VerifyRecord } from '../pages/public/VerifyRecord';
import { Login } from '../pages/public/Login';
import { MemberEnrollment } from '../pages/public/MemberEnrollment';

// Policyholder Pages
import { Enrollment } from '../pages/policyholder/Enrollment';
import { PolicyDashboard } from '../pages/policyholder/PolicyDashboard';
import { MyEvents } from '../pages/policyholder/MyEvents';
import { PaymentReceipt } from '../pages/policyholder/PaymentReceipt';
import { AppealPage } from '../pages/policyholder/Appeal';

// Provider Pages
import { ProviderDashboard } from '../pages/provider/ProviderDashboard';
import { PatientLookup } from '../pages/provider/PatientLookup';
import { AssertEvent } from '../pages/provider/AssertEvent';
import { ContinueEvent } from '../pages/provider/ContinueEvent';
import { ProviderHistory } from '../pages/provider/ProviderHistory';

// Verifier Pages
import { VerificationQueue } from '../pages/verifier/VerificationQueue';

// Insurer Pages
import { InsurerDashboard } from '../pages/insurer/InsurerDashboard';
import { InsurerEventQueue } from '../pages/insurer/EventQueue';
import { EntitlementReview } from '../pages/insurer/EntitlementReview';
import { InsurerSettlement } from '../pages/insurer/Settlement';
import { ProviderAnalytics } from '../pages/insurer/ProviderAnalytics';

// Regulator Pages
import { RegulatorDashboard } from '../pages/regulator/RegulatorDashboard';
import { InsurerMonitoring } from '../pages/regulator/InsurerMonitoring';
import { ProviderMonitoring } from '../pages/regulator/ProviderMonitoring';
import { AppealsMonitoring } from '../pages/regulator/AppealsMonitoring';
import { AuditChannelLogs } from '../pages/regulator/AuditChannelLogs';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/how-it-works" element={<Navigate to="/#how-it-works" replace />} />
      <Route path="/products" element={<Products />} />
      <Route path="/transparency" element={<TransparencyExplorer />} />
      <Route path="/verify" element={<VerifyRecord />} />
      <Route path="/login" element={<Login />} />
      <Route path="/member-enrollment" element={<MemberEnrollment />} />
      <Route path="/signup" element={<MemberEnrollment />} />
      <Route path="/enroll" element={<MemberEnrollment />} />

      {/* Policyholder Routes */}
      <Route path="/policyholder" element={<PolicyDashboard />} />
      <Route path="/policyholder/enrollment" element={<Enrollment />} />
      <Route path="/policyholder/events" element={<MyEvents />} />
      <Route path="/policyholder/receipt" element={<PaymentReceipt />} />
      <Route path="/policyholder/appeal" element={<AppealPage />} />

      {/* Provider Routes */}
      <Route path="/provider" element={<ProviderDashboard />} />
      <Route path="/provider/patient" element={<PatientLookup />} />
      <Route path="/provider/patients" element={<PatientLookup />} />
      <Route path="/provider/assert-event" element={<AssertEvent />} />
      <Route path="/provider/events/new" element={<AssertEvent />} />
      <Route path="/provider/continue-event" element={<ContinueEvent />} />
      <Route path="/provider/events/continue" element={<ContinueEvent />} />
      <Route path="/provider/history" element={<ProviderHistory />} />
      <Route path="/provider/attestations" element={<ProviderHistory />} />

      {/* Verifier Routes */}
      <Route path="/verifier" element={<VerificationQueue />} />
      <Route path="/verifier/queue" element={<VerificationQueue />} />
      <Route path="/verifier/history" element={<VerificationQueue />} />
      <Route path="/verifier/records" element={<VerificationQueue />} />

      {/* Insurer Routes (Specification 1) */}
      <Route path="/insurer" element={<InsurerDashboard />} />
      <Route path="/insurer/dashboard" element={<InsurerDashboard />} />
      <Route path="/insurer/queue" element={<InsurerEventQueue />} />
      <Route path="/insurer/events" element={<InsurerEventQueue />} />
      <Route path="/insurer/events/:eventId" element={<EntitlementReview />} />
      <Route path="/insurer/entitlements/:entitlementId" element={<EntitlementReview />} />
      <Route path="/insurer/settlement" element={<InsurerSettlement />} />
      <Route path="/insurer/settlements" element={<InsurerSettlement />} />
      <Route path="/insurer/providers" element={<ProviderAnalytics />} />

      {/* Regulator Routes (Specification 2) */}
      <Route path="/regulator" element={<RegulatorDashboard />} />
      <Route path="/regulator/overview" element={<RegulatorDashboard />} />
      <Route path="/regulator/insurers" element={<InsurerMonitoring />} />
      <Route path="/regulator/providers" element={<ProviderMonitoring />} />
      <Route path="/regulator/appeals" element={<AppealsMonitoring />} />
      <Route path="/regulator/audit" element={<AuditChannelLogs />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
