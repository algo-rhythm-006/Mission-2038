"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Settings, Save, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PlayerSettings() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bio: "",
    profilePhoto: "",
    height: "",
    weight: "",
    dominantFoot: "right",
    preferredPosition: "",
    secondaryPosition: "",
    currentClub: "",
    previousClub: "",
    preferredLeague: ""
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
          height: res.height || "",
          weight: res.weight || "",
          dominantFoot: res.dominantFoot || "right",
          preferredPosition: res.preferredPosition || "",
          secondaryPosition: res.secondaryPosition || "",
          currentClub: res.currentClub || "",
          previousClub: res.previousClub || "",
          preferredLeague: res.preferredLeague || ""
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load settings.");
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
      const res = await api.put("/dashboard/profile", formData);
      setSuccess(true);
      
      // Update local cache
      localStorage.setItem("profile", JSON.stringify(res.profile));
    } catch (err) {
      setError(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-96 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 text-sm tracking-widest font-bold uppercase">Opening Settings Panel...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-black uppercase text-white tracking-wider">Account Settings</h2>
          <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest font-bold">
            Modify pitch dossier metrics and bio summaries
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
            {/* CORE */}
            <div>
              <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-zinc-805 pb-2 mb-4">
                Personal Profiling
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Phone Number</label>
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

            {/* ATHLETIC */}
            <div>
              <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-zinc-805 pb-2 mb-4">
                Pitch Dossier Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Height (cm)</label>
                  <input type="number" name="height" value={formData.height} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Weight (kg)</label>
                  <input type="number" name="weight" value={formData.weight} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Dominant Foot</label>
                  <select name="dominantFoot" value={formData.dominantFoot} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm">
                    <option value="right">Right</option>
                    <option value="left">Left</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Position</label>
                  <input type="text" name="preferredPosition" value={formData.preferredPosition} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
              </div>
            </div>

            {/* CAREER */}
            <div>
              <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-zinc-805 pb-2 mb-4">
                Club Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Current Club</label>
                  <input type="text" name="currentClub" value={formData.currentClub} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Previous Club</label>
                  <input type="text" name="previousClub" value={formData.previousClub} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Preferred League</label>
                  <input type="text" name="preferredLeague" value={formData.preferredLeague} onChange={handleChange}
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
              className={`w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                saving ? "opacity-75 cursor-not-allowed" : "hover:scale-[1.01]"
              }`}
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
