import React, { useState } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Mail,
  Building,
  MapPin,
  Phone,
  Edit3,
  Check,
  X,
  RotateCcw,
  Fingerprint,
  Award,
  Lock,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import type { UserProfile } from '@/types';

interface ProfileProps {
  onShowToast?: (message: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ onShowToast }) => {
  const { profile, updateProfile, resetProfile } = useUser();
  const { user: authUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(profile);

  // Identity comes from the authenticated user — never from mock defaults
  const displayName = authUser?.full_name || profile.fullName || 'Not provided';
  const displayEmail = authUser?.email || profile.email || 'Not provided';
  const displayRole = authUser?.role || profile.role || 'Not provided';
  // Compute initials from real auth user name, fall back to ? if unknown
  const computedInitials = (() => {
    const src = authUser?.full_name || authUser?.email?.split('@')[0] || '';
    const parts = src.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (src.length >= 2) return src.substring(0, 2).toUpperCase();
    return '?';
  })();

  // Sync formData when entering edit mode
  const handleStartEditing = () => {
    setFormData(profile);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
    setIsEditing(false);
    if (onShowToast) {
      onShowToast('Profile credentials and settings updated successfully.');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset profile to factory air-gapped auditor defaults?')) {
      resetProfile();
      setFormData(profile);
      setIsEditing(false);
      if (onShowToast) {
        onShowToast('Profile reset to default auditor credentials.');
      }
    }
  };

  return (
    <>
      <PageHeader
        title="Auditor profile & credentials"
        description="Air-gapped security officer identity, hardware cryptographic tokens, and role authorizations."
        actions={
          isEditing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEditing}
                className="btn"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary"
              >
                <Check className="h-4 w-4" /> Save changes
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartEditing}
              className="btn-primary"
            >
              <Edit3 className="h-4 w-4" /> Edit profile
            </button>
          )
        }
      />

      <div className="flex flex-col gap-6 max-w-4xl pb-10">
        {/* Main Profile Header Card */}
        <div className="card p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative group shrink-0">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/10 text-primary font-bold text-2xl ring-2 ring-primary/30 shadow-md">
              {computedInitials}
            </div>
            <div className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white" title="Active Air-Gapped Session">
              <Check className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {displayName}
              </h2>
              {authUser?.email && (
                <span className="font-mono text-[12px] text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md border border-purple-200/80 font-semibold">
                  {authUser.email}
                </span>
              )}
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                {displayRole}
              </span>
            </div>

            <p className="text-[13px] text-slate-600 mt-1 max-w-2xl leading-relaxed">
              {profile.bio}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-[12px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span>{profile.organization}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{profile.location || 'Local Secure Enclave'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium text-slate-700">{profile.clearanceLevel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details / Edit Form */}
        <form onSubmit={handleSave} className="card p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-primary" />
              <h3 className="section-title">Identity & Operational Parameters</h3>
            </div>
            {isEditing && (
              <span className="text-[12px] font-medium text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Editing Mode Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-[13px]">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="eyebrow flex items-center gap-1.5">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="h-9 w-full rounded-lg border border-white/80 bg-white/80 px-3.5 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  required
                />
              ) : (
                <div className="h-9 flex items-center px-3.5 rounded-lg bg-white/50 border border-slate-200/60 font-medium text-slate-900">
                  {profile.fullName}
                </div>
              )}
            </div>

            {/* Display Handle */}
            <div className="flex flex-col gap-1.5">
              <label className="eyebrow flex items-center gap-1.5">
                Display Name / Handle
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9 w-full rounded-lg border border-white/80 bg-white/80 px-3.5 text-[13px] font-mono text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  required
                />
              ) : (
                <div className="h-9 flex items-center px-3.5 rounded-lg bg-white/50 border border-slate-200/60 font-mono text-slate-900">
                  {profile.name}
                </div>
              )}
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="eyebrow flex items-center gap-1.5">
                <Mail className="h-3 w-3 text-slate-400" />
                Air-Gapped Email / Address
              </label>
                <div className="h-9 flex items-center px-3.5 rounded-lg bg-white/50 border border-slate-200/60 font-mono text-[12.5px] text-slate-900">
                  {/* Email comes from authenticated session — not editable here */}
                  {displayEmail}
                </div>
              {/* Email from auth session is always read-only */}
              {isEditing && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Email is managed by your authentication provider and cannot be changed here.
                </p>
              )}
            </div>

            {/* Role Title */}
            <div className="flex flex-col gap-1.5">
              <label className="eyebrow flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-slate-400" />
                Title / Designation
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-9 w-full rounded-lg border border-white/80 bg-white/80 px-3.5 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  required
                />
              ) : (
                <div className="h-9 flex items-center px-3.5 rounded-lg bg-white/50 border border-slate-200/60 font-medium text-slate-900">
                  {profile.title}
                </div>
              )}
            </div>

            {/* Organization */}
            <div className="flex flex-col gap-1.5">
              <label className="eyebrow flex items-center gap-1.5">
                <Building className="h-3 w-3 text-slate-400" />
                Organization / Security Command
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="h-9 w-full rounded-lg border border-white/80 bg-white/80 px-3.5 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  required
                />
              ) : (
                <div className="h-9 flex items-center px-3.5 rounded-lg bg-white/50 border border-slate-200/60 font-medium text-slate-900">
                  {profile.organization}
                </div>
              )}
            </div>

            {/* Security Clearance Tier */}
            <div className="flex flex-col gap-1.5">
              <label className="eyebrow flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-slate-400" />
                Security Clearance Level
              </label>
              {isEditing ? (
                <select
                  value={formData.clearanceLevel}
                  onChange={(e) => setFormData({ ...formData, clearanceLevel: e.target.value })}
                  className="h-9 w-full rounded-lg border border-white/80 bg-white/80 px-3 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Level 4 (Top Secret / PQC Defense)">Level 4 (Top Secret / PQC Defense)</option>
                  <option value="Level 3 (Secret / Cryptographic Auditor)">Level 3 (Secret / Cryptographic Auditor)</option>
                  <option value="Level 2 (Confidential / Security Analyst)">Level 2 (Confidential / Security Analyst)</option>
                  <option value="Level 1 (Restricted / Read-Only)">Level 1 (Restricted / Read-Only)</option>
                </select>
              ) : (
                <div className="h-9 flex items-center px-3.5 rounded-lg bg-white/50 border border-slate-200/60 font-medium text-slate-900">
                  {profile.clearanceLevel}
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="eyebrow flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-slate-400" />
                Secure Line / Phone
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="h-9 w-full rounded-lg border border-white/80 bg-white/80 px-3.5 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                <div className="h-9 flex items-center px-3.5 rounded-lg bg-white/50 border border-slate-200/60 text-slate-900">
                  {profile.phone || 'Not configured'}
                </div>
              )}
            </div>

            {/* Station Location */}
            <div className="flex flex-col gap-1.5">
              <label className="eyebrow flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-slate-400" />
                Physical Station / Enclave
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. DOC Room 402"
                  className="h-9 w-full rounded-lg border border-white/80 bg-white/80 px-3.5 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                <div className="h-9 flex items-center px-3.5 rounded-lg bg-white/50 border border-slate-200/60 text-slate-900">
                  {profile.location || 'Local Enclave'}
                </div>
              )}
            </div>

            {/* Bio / Mission Description */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="eyebrow flex items-center gap-1.5">
                Mission / Auditor Responsibilities
              </label>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full rounded-lg border border-white/80 bg-white/80 p-3 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 leading-relaxed"
                />
              ) : (
                <div className="p-3.5 rounded-lg bg-white/50 border border-slate-200/60 text-slate-800 leading-relaxed text-[13px]">
                  {profile.bio}
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleCancelEditing}
                className="btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                <Check className="h-4 w-4" /> Save changes
              </button>
            </div>
          )}
        </form>

        {/* Cryptographic Credentials & Enclave Keystore Card */}
        <div className="card p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/25 text-primary">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h3 className="section-title">Cryptographic Hardware Token & Signing Keys</h3>
              <p className="section-sub mt-0.5">
                Local air-gapped cryptographic identity for CBOM audit certifications
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60">
              <span className="eyebrow flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                PGP / Enclave Key ID
              </span>
              <div className="font-mono font-semibold text-purple-700 mt-1 text-[13.5px]">
                {profile.pgpKeyId}
              </div>
              <div className="text-[11.5px] text-emerald-600 mt-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                Hardware token bound & authenticated
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60">
              <span className="eyebrow">PQC Signature Scheme</span>
              <div className="font-semibold text-purple-700 mt-1">
                ML-DSA-65 (FIPS 204 / Dilithium3)
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">
                Quantum-resistant digital signature algorithm
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60">
              <span className="eyebrow">Local Keystore Storage</span>
              <div className="font-mono text-[12px] text-slate-800 mt-1 truncate">
                ~/.pqc-sentinel/keystore/officer-sec.enc
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">
                AES-256-GCM encrypted local vault
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60">
              <span className="eyebrow">Audit Certification Status</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-semibold border border-emerald-300">
                  Authorized Signer
                </span>
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">
                Approved for NIST SP 800-208 CBOM exports
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border text-[12px]">
            <span className="text-slate-500 font-mono text-[11.5px]">
              Last profile update: {new Date(profile.updatedAt).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-slate-500 hover:text-critical transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to default</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
