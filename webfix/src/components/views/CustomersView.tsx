import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR } from '../../lib/finance';
import { Customer } from '../../types';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  X,
  CreditCard,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('0.00');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ customers: Customer[] }>('/api/customers');
      setCustomers(res.customers || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCreditLimit('0.00');
    setShowModal(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddress(c.address);
    setCreditLimit((c.creditLimit || 0).toString());
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        phone,
        email,
        address,
        creditLimit: parseFloat(creditLimit) || 0,
      };

      if (editingCustomer) {
        await apiFetch(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to save customer.');
    }
  };

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customer & Corporate Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client profiles, lifetime revenue tracking, and accounts receivable balances
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, phone, or email..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Customer / Company</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-right">Lifetime Spent</th>
                <th className="py-3 px-4 text-right">A/R Balance</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{c.phone || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{c.email || '-'}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">{c.address || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatMYR(c.totalSpent)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={(c.outstandingBalance ?? c.balance ?? 0) > 0 ? 'text-rose-600' : 'text-slate-500'}>
                        {formatMYR(c.outstandingBalance ?? c.balance ?? 0)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Customer"
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
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Customer / Business Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Engineering Sdn Bhd"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +60 12-345 6789"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. client@apex.com"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Billing / Delivery Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, State, Postcode"
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
