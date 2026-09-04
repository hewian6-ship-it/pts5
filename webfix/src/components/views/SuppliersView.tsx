import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR } from '../../lib/finance';
import { Supplier } from '../../types';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  X,
} from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('30 Days');

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ suppliers: Supplier[] }>('/api/suppliers');
      setSuppliers(res.suppliers || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const openAddModal = () => {
    setEditingSupplier(null);
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setPaymentTerms('30 Days');
    setShowModal(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setCompanyName(s.companyName);
    setContactPerson(s.contactPerson);
    setPhone(s.phone);
    setEmail(s.email);
    setAddress(s.address);
    setPaymentTerms(s.paymentTerms || '30 Days');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        companyName,
        contactPerson,
        phone,
        email,
        address,
        paymentTerms,
      };

      if (editingSupplier) {
        await apiFetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to save supplier.');
    }
  };

  const filtered = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      s.companyName.toLowerCase().includes(term) ||
      s.contactPerson.toLowerCase().includes(term) ||
      s.phone.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hardware Suppliers & Vendors</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authorized tech distributors, direct component suppliers, and purchase history
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add New Supplier
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by company name, contact, or phone..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Payment Terms</th>
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-right">Outstanding Payable</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading suppliers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{s.companyName}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{s.address}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{s.contactPerson}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="space-y-0.5 text-[11px]">
                        <p className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" /> {s.phone}
                        </p>
                        {s.email && (
                          <p className="flex items-center gap-1 text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400" /> {s.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{s.paymentTerms || '30 Days'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatMYR(s.totalPurchases)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {formatMYR(s.outstandingBalance || s.outstandingPayable || 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(s)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Supplier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Company / Business Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Synnex Distribution Sdn Bhd"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Eric Tan"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +60 3-8000 1234"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sales@synnex.com.my"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Credit / Payment Terms</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="30 Days / COD"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Address / Warehouse Location</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, State"
                  rows={2}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
