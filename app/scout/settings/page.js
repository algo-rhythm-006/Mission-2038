"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ScoutSettings() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bio: "",
    profilePhoto: "",
    organization: "",
    clubRepresenting: "",
    designation: "",
    license: "",
    areasOfInterest: "",
    ageGroupsCovered: "",
    positionsInterested: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/dashboard/profile")
      .then(res => {
        setFormData({
          name: res.name || "",
          phone: res.phone || "",
          bio: res.bio || "",
          profilePhoto: res.profilePhoto || "",
          organization: res.organization || "",
          clubRepresenting: res.clubRepresenting || "",
          designation: res.designation || "",
          license: res.license || "",
          areasOfInterest: Array.isArray(res.areasOfInterest) ? res.areasOfInterest.join(", ") : "",
          ageGroupsCovered: Array.isArray(res.ageGroupsCovered) ? res.ageGroupsCovered.join(", ") : "",
          positionsInterested: Array.isArray(res.positionsInterested) ? res.positionsInterested.join(", ") : ""
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load scout settings.");
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const payload = {
        ...formData,
        areasOfInterest: formData.areasOfInterest.split(",").map(s => s.trim()).filter(Boolean),
        ageGroupsCovered: formData.ageGroupsCovered.split(",").map(s => s.trim()).filter(Boolean),
        positionsInterested: formData.positionsInterested.split(",").map(s => s.trim()).filter(Boolean)
      };

      const res = await api.put("/dashboard/profile", payload);
      setSuccess(true);
      localStorage.setItem("profile", JSON.stringify(res.profile));
    } catch (err) {
      setError(err.message || "Failed to update scout settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-96 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 text-sm tracking-widest font-bold uppercase font-sans">Accessing Settings...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-black uppercase text-white tracking-wider">Scout Profile Settings</h2>
          <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest font-bold font-sans">
            Maintain your club details and targets
          </p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-center gap-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-950/40 border border-green-500/50 flex items-center gap-3 text-green-200 text-sm">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-zinc-805 pb-2 mb-4">
                Personal Credentials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Contact Phone</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Profile Photo Link</label>
                  <input type="text" name="profilePhoto" value={formData.profilePhoto} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-zinc-805 pb-2 mb-4">
                Scouting Scope
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Organization / Agency</label>
                  <input type="text" name="organization" value={formData.organization} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Club Representing</label>
                  <input type="text" name="clubRepresenting" value={formData.clubRepresenting} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Designation</label>
                  <input type="text" name="designation" value={formData.designation} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Scouting License</label>
                  <input type="text" name="license" value={formData.license} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Areas of Interest (comma-separated)</label>
                  <input type="text" name="areasOfInterest" value={formData.areasOfInterest} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Age Groups Covered (comma-separated)</label>
                  <input type="text" name="ageGroupsCovered" value={formData.ageGroupsCovered} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Positions Target (comma-separated)</label>
                  <input type="text" name="positionsInterested" value={formData.positionsInterested} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Biography</label>
              <textarea name="bio" rows="4" value={formData.bio} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 text-black" />
              <span>{saving ? "Saving Changes..." : "Save Configuration"}</span>
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
