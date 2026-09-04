import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { BusinessSetting } from '../../types';
import {
  Settings,
  Building,
  CreditCard,
  FileText,
  ShieldCheck,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  QrCode,
} from 'lucide-react';

interface SettingsViewProps {
  settings: BusinessSetting | null;
  onRefreshSettings: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onRefreshSettings }) => {
  // Business Info Form
  const [businessName, setBusinessName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');

  // Prefixes
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [quotationPrefix, setQuotationPrefix] = useState('QT-');
  const [purchasePrefix, setPurchasePrefix] = useState('PO-');
  const [depositPrefix, setDepositPrefix] = useState('DEP-');

  // QR
  const [qrBankName, setQrBankName] = useState('Maybank');
  const [qrAccountNo, setQrAccountNo] = useState('5142 8900 1234');
  const [qrAccountHolder, setQrAccountHolder] = useState('PEACE TECH SOLUTION');

  // Terms
  const [invoiceTerms, setInvoiceTerms] = useState('');
  const [quotationTerms, setQuotationTerms] = useState('');
  const [warrantyTerms, setWarrantyTerms] = useState('');

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName || '');
      setRegistrationNo(settings.registrationNo || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setWebsite(settings.website || '');
      setAddress(settings.address || '');

      setInvoicePrefix(settings.invoicePrefix || 'INV-');
      setQuotationPrefix(settings.quotationPrefix || 'QT-');
      setPurchasePrefix(settings.purchasePrefix || 'PO-');
      setDepositPrefix(settings.depositPrefix || 'DEP-');

      setQrBankName(settings.qrBankName || 'Maybank');
      setQrAccountNo(settings.qrAccountNo || '5142 8900 1234');
      setQrAccountHolder(settings.qrAccountHolder || 'PEACE TECH SOLUTION');

      setInvoiceTerms(settings.invoiceTerms || '');
      setQuotationTerms(settings.quotationTerms || '');
      setWarrantyTerms(settings.warrantyTerms || '');
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          businessName,
          registrationNo,
          phone,
          email,
          website,
          address,
          invoicePrefix,
          quotationPrefix,
          purchasePrefix,
          depositPrefix,
          qrBankName,
          qrAccountNo,
          qrAccountHolder,
          invoiceTerms,
          quotationTerms,
          warrantyTerms,
        }),
      });
      setSaveSuccess(true);
      onRefreshSettings();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccess(null);
    setPwError(null);

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setPwSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">System & Enterprise Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Company profile, receipt headers, DuitNow QR config, document prefixes, and administrator security
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Enterprise Profile & Prefixes */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Company Profile Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Business Profile & Header</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">SSM Registration No *</label>
                  <input
                    type="text"
                    required
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="font-semibold text-slate-700">Official Website</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="text-xs">
                <label className="font-semibold text-slate-700">Shop / Physical Address *</label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* DuitNow QR Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">DuitNow QR & Bank Settlement</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Bank Name</label>
                  <input
                    type="text"
                    value={qrBankName}
                    onChange={(e) => setQrBankName(e.target.value)}
                    placeholder="Maybank"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Account Number</label>
                  <input
                    type="text"
                    value={qrAccountNo}
                    onChange={(e) => setQrAccountNo(e.target.value)}
                    placeholder="5142 8900 1234"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Account Holder</label>
                  <input
                    type="text"
                    value={qrAccountHolder}
                    onChange={(e) => setQrAccountHolder(e.target.value)}
                    placeholder="PEACE TECH SOLUTION"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Document Prefixes Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Sequential Document Prefixes</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Invoice Prefix</label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Quotation Prefix</label>
                  <input
                    type="text"
                    value={quotationPrefix}
                    onChange={(e) => setQuotationPrefix(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">PO Prefix</label>
                  <input
                    type="text"
                    value={purchasePrefix}
                    onChange={(e) => setPurchasePrefix(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Deposit Prefix</label>
                  <input
                    type="text"
                    value={depositPrefix}
                    onChange={(e) => setDepositPrefix(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Terms & Policies Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <div className="flex items-center gap-2 border-b pb-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Terms, Warranties & Return Policy</h3>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Invoice Footer Note & Terms</label>
                <textarea
                  rows={2}
                  value={invoiceTerms}
                  onChange={(e) => setInvoiceTerms(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Hardware Warranty Standard Disclaimer</label>
                <textarea
                  rows={2}
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTerms(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Quotation Terms & Validity Note</label>
                <textarea
                  rows={2}
                  value={quotationTerms}
                  onChange={(e) => setQuotationTerms(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Settings saved successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {savingSettings ? 'Saving...' : 'Save Enterprise Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Admin Security & Password Change */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 border-b pb-3">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Administrator Security</h3>
            </div>

            <p className="text-slate-500">
              Change the password for the single system administrator user <span className="font-bold text-slate-900">007</span>.
            </p>

            {pwError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pwError}</span>
              </div>
            )}

            {pwSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pwSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Current Password *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-lg shadow-sm"
              >
                Update Password
              </button>
            </form>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-900">System Information</h4>
            <div className="space-y-1 text-[11px] font-mono">
              <p>Currency: MYR (RM)</p>
              <p>Timezone: Asia/Kuala_Lumpur (UTC+8)</p>
              <p>Date Format: DD/MM/YYYY</p>
              <p>Persistence: SQLite / Prisma Compliant Engine</p>
              <p>Calculation Standard: Decimal.js (High-Precision)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
