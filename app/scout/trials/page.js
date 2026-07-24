"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Calendar, MapPin, Clock, FileText, Plus, Shield, Users, Lock, Glob,
  CheckCircle2, AlertCircle, Search, UserCheck, X, Check, Eye
} from "lucide-react";

const AGE_OPTIONS = ["U-13", "U-15", "U-17", "U-19", "U-21", "U-23", "Senior"];
const POSITION_OPTIONS = ["ST", "LW", "RW", "CAM", "CM", "CDM", "LB", "RB", "CB", "GK", "WB"];

export default function ScoutTrials() {
  const [trials, setTrials] = useState([]);
  const [playersList, setPlayersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");

  const [inspectingPlayer, setInspectingPlayer] = useState(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    ageCategory: [],
    positionsTarget: [],
    date: "",
    time: "09:00 AM",
    location: "",
    privacy: "public", // 'public' | 'private'
    invitedPlayers: []
  });

  useEffect(() => {
    loadTrials();
    loadPlayersList();
  }, []);

  const loadTrials = () => {
    setLoading(true);
    api.get("/trials")
      .then(res => {
        setTrials(res || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const loadPlayersList = () => {
    api.get("/trials/players-list")
      .then(res => setPlayersList(res || []))
      .catch(err => console.error(err));
  };

  const inspectPlayerProfile = (rawPlayerId) => {
    const pId = typeof rawPlayerId === 'object' ? (rawPlayerId._id || rawPlayerId.id) : rawPlayerId;
    if (!pId) return;
    setLoadingInspect(true);
    api.get(`/dashboard/profile/${pId}`)
      .then(res => {
        setInspectingPlayer(res.profile || res);
        setLoadingInspect(false);
      })
      .catch(err => {
        console.error("Failed to inspect player profile:", err);
        setLoadingInspect(false);
      });
  };

  const toggleAgeGroup = (group) => {
    setFormData(prev => {
      const isSelected = prev.ageCategory.includes(group);
      return {
        ...prev,
        ageCategory: isSelected
          ? prev.ageCategory.filter(g => g !== group)
          : [...prev.ageCategory, group]
      };
    });
  };

  const toggleAllAgeGroups = () => {
    setFormData(prev => ({
      ...prev,
      ageCategory: prev.ageCategory.length === AGE_OPTIONS.length ? [] : [...AGE_OPTIONS]
    }));
  };

  const togglePosition = (pos) => {
    setFormData(prev => {
      const isSelected = prev.positionsTarget.includes(pos);
      return {
        ...prev,
        positionsTarget: isSelected
          ? prev.positionsTarget.filter(p => p !== pos)
          : [...prev.positionsTarget, pos]
      };
    });
  };

  const toggleAllPositions = () => {
    setFormData(prev => ({
      ...prev,
      positionsTarget: prev.positionsTarget.length === POSITION_OPTIONS.length ? [] : [...POSITION_OPTIONS]
    }));
  };

  const toggleInvitedPlayer = (pId) => {
    setFormData(prev => {
      const isInvited = prev.invitedPlayers.includes(pId);
      return {
        ...prev,
        invitedPlayers: isInvited
          ? prev.invitedPlayers.filter(id => id !== pId)
          : [...prev.invitedPlayers, pId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    setError(null);

    try {
      if (!formData.title || !formData.date || !formData.time || !formData.location) {
        throw new Error("Title, date, time, and location are required.");
      }

      await api.post("/trials", formData);
      setSuccess("Trial scheduled successfully! Notifications sent to players.");
      setShowModal(false);
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        ageCategory: [],
        positionsTarget: [],
        date: "",
        time: "09:00 AM",
        location: "",
        privacy: "public",
        invitedPlayers: []
      });

      loadTrials();
    } catch (err) {
      setError(err.message || "Failed to schedule trial.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplicantStatus = async (trialId, rawPlayerId, status) => {
    try {
      const playerId = typeof rawPlayerId === 'object' ? (rawPlayerId._id || rawPlayerId.id) : rawPlayerId;
      await api.put(`/trials/${trialId}/applicant`, { playerId, status });
      loadTrials();
    } catch (err) {
      console.error("Error updating applicant status:", err);
    }
  };

  const filteredPlayers = playersList.filter(p => 
    p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
    p.preferredPosition.toLowerCase().includes(playerSearchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-850 pb-6">
          <div>
            <h2 className="text-3xl font-black uppercase text-white tracking-wider">Scouting Trials Manager</h2>
            <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest font-bold">
              Schedule public trials or invite specific players to private evaluations
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black uppercase tracking-wider px-6 py-3 rounded-xl text-xs hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(250,204,21,0.25)]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Schedule New Trial</span>
          </button>
        </div>

        {success && (
          <div className="p-4 rounded-2xl bg-green-950/40 border border-green-500/50 flex items-center gap-3 text-green-200 text-sm">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* SCHEDULE TRIAL MODAL */}
        {showModal && (
          <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div data-lenis-prevent className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-3xl w-full space-y-6 my-auto max-h-[85vh] overflow-y-auto overscroll-contain shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-850 pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-yellow-400" /> Schedule Scouting Trial
                  </h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-0.5">
                    Define target age, position specs, location & privacy settings
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-center gap-3 text-red-200 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">Trial Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. U-19 Open Scouting Trial & Evaluation"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm"
                    />
                  </div>

                  {/* PRIVACY SELECTOR */}
                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">
                      Trial Type / Privacy Access *
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() => setFormData({ ...formData, privacy: "public" })}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                          formData.privacy === "public"
                            ? "bg-yellow-400/10 border-yellow-400 text-yellow-400"
                            : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs uppercase text-white">PUBLIC TRIAL</h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Propagates to all available players on trials board</p>
                        </div>
                      </div>

                      <div
                        onClick={() => setFormData({ ...formData, privacy: "private" })}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                          formData.privacy === "private"
                            ? "bg-amber-500/10 border-amber-500 text-amber-400"
                            : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs uppercase text-white">PRIVATE INVITATION</h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Restricted to handpicked invited players only</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AGE GROUPS TARGET */}
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold">
                        Age Groups Target
                      </label>
                      <button
                        type="button"
                        onClick={toggleAllAgeGroups}
                        className="text-[10px] font-black uppercase tracking-widest text-yellow-400 hover:underline bg-yellow-400/10 px-2.5 py-1 rounded-lg border border-yellow-400/30"
                      >
                        {formData.ageCategory.length === AGE_OPTIONS.length ? "Clear All" : "Select All"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                      {AGE_OPTIONS.map(group => {
                        const isSelected = formData.ageCategory.includes(group);
                        return (
                          <button
                            key={group}
                            type="button"
                            onClick={() => toggleAgeGroup(group)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
                              isSelected
                                ? "bg-yellow-400 text-black border-yellow-400"
                                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                            }`}
                          >
                            {group} {isSelected ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* POSITIONS TARGET */}
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold">
                        Positions Target
                      </label>
                      <button
                        type="button"
                        onClick={toggleAllPositions}
                        className="text-[10px] font-black uppercase tracking-widest text-amber-400 hover:underline bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/30"
                      >
                        {formData.positionsTarget.length === POSITION_OPTIONS.length ? "Clear All" : "Select All"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                      {POSITION_OPTIONS.map(pos => {
                        const isSelected = formData.positionsTarget.includes(pos);
                        return (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => togglePosition(pos)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
                              isSelected
                                ? "bg-amber-500 text-black border-amber-500"
                                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                            }`}
                          >
                            {pos} {isSelected ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">Time *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 09:00 AM"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">Location / Venue *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ambedkar Stadium, Gate 3, Delhi"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">Trial Description & Requirements</label>
                    <textarea
                      rows="3"
                      placeholder="e.g. Please bring full kit, boots, and ID proof. Match play evaluations start at 09:30 AM sharp."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-white text-sm"
                    />
                  </div>

                  {/* PRIVATE TRIAL PLAYER INVITATIONS */}
                  {formData.privacy === "private" && (
                    <div className="md:col-span-2 space-y-3 border-t border-zinc-850 pt-4">
                      <label className="block text-xs uppercase tracking-wider text-amber-400 font-bold">
                        Select Players to Invite ({formData.invitedPlayers.length} Selected)
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                        <input
                          type="text"
                          placeholder="Search players by name or position..."
                          value={playerSearchQuery}
                          onChange={e => setPlayerSearchQuery(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-400 focus:outline-none rounded-xl pl-9 pr-4 py-2.5 text-xs text-white"
                        />
                      </div>

                      <div data-lenis-prevent className="max-h-48 overflow-y-auto space-y-2 p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                        {filteredPlayers.length === 0 ? (
                          <p className="text-center py-4 text-xs text-zinc-500">No matching players found.</p>
                        ) : (
                          filteredPlayers.map(p => {
                            const isInvited = formData.invitedPlayers.includes(p.userId);
                            return (
                              <div
                                key={p.userId}
                                onClick={() => toggleInvitedPlayer(p.userId)}
                                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                  isInvited
                                    ? "bg-amber-500/10 border-amber-500 text-white"
                                    : "bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-3 truncate">
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                                    <img src={p.profilePhoto || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150"} alt="p" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="truncate">
                                    <h5 className="font-bold text-xs truncate text-white">{p.name}</h5>
                                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">
                                      {p.preferredPosition} • {p.ageCategory} {p.location && `• ${p.location}`}
                                    </span>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                  isInvited ? "bg-amber-500 text-black border-amber-500" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                                }`}>
                                  {isInvited ? "Invited ✓" : "Invite +"}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-850 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black uppercase tracking-wider px-8 py-3 rounded-xl text-xs hover:scale-105 transition-all shadow-lg"
                  >
                    {submitting ? "Scheduling..." : "Broadcast & Schedule Trial"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INSPECT PLAYER PROFILE MODAL */}
        {inspectingPlayer && (
          <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div data-lenis-prevent className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 my-auto shadow-2xl relative">
              <button
                onClick={() => setInspectingPlayer(null)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-3">
                <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-yellow-400/50 overflow-hidden mx-auto shadow-xl">
                  <img src={inspectingPlayer.profilePhoto || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150"} alt="Player" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase text-white">{inspectingPlayer.name}</h3>
                  <p className="text-xs text-yellow-400 font-bold uppercase tracking-widest mt-0.5">
                    {inspectingPlayer.preferredPosition} • {inspectingPlayer.ageCategory || "Senior"} • {inspectingPlayer.currentClub || "Free Agent"}
                  </p>
                  {(inspectingPlayer.city || inspectingPlayer.state) && (
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">
                      📍 {[inspectingPlayer.city, inspectingPlayer.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* SKILL STATS GRID */}
              <div className="grid grid-cols-3 gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
                {[
                  { label: "Overall", val: inspectingPlayer.skills?.aiScore || 60 },
                  { label: "Speed", val: inspectingPlayer.skills?.speed || 60 },
                  { label: "Passing", val: inspectingPlayer.skills?.passing || 60 },
                  { label: "Dribbling", val: inspectingPlayer.skills?.dribbling || 60 },
                  { label: "Finishing", val: inspectingPlayer.skills?.finishing || 60 },
                  { label: "Potential", val: inspectingPlayer.skills?.potential || 70 },
                ].map((s) => (
                  <div key={s.label} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 text-center">
                    <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-bold">{s.label}</span>
                    <span className="text-sm font-black text-white">{s.val}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setInspectingPlayer(null)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black uppercase tracking-wider text-xs shadow-lg"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIST TRIALS */}
        {loading ? (
          <div className="h-60 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Loading scheduled trials...</span>
          </div>
        ) : trials.length === 0 ? (
          <div className="p-12 bg-zinc-900/35 border border-zinc-800 rounded-3xl text-center text-zinc-500 text-xs space-y-3">
            <p>No scouting trials scheduled yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-yellow-400 font-bold hover:underline text-xs uppercase tracking-wider"
            >
              + Schedule Your First Trial
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trials.map(t => (
              <div key={t._id} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                        t.privacy === "public"
                          ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}>
                        {t.privacy === "public" ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {t.privacy === "public" ? "PUBLIC TRIAL" : "PRIVATE INVITATION"}
                      </span>
                      <h3 className="text-lg font-bold text-white uppercase mt-2">{t.title}</h3>
                    </div>
                  </div>

                  {t.description && (
                    <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>
                  )}

                  {/* TARGET TAGS */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {(t.ageCategory || []).map(g => (
                      <span key={g} className="text-[9px] font-bold bg-zinc-950 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                        {g}
                      </span>
                    ))}
                    {(t.positionsTarget || []).map(p => (
                      <span key={p} className="text-[9px] font-bold bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/20">
                        {p}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-zinc-850 pt-4 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span>Date: {new Date(t.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span>Time: {t.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">Venue: {t.location}</span>
                    </div>
                  </div>

                  {/* APPLICANTS LIST */}
                  <div className="border-t border-zinc-850 pt-4 space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex justify-between">
                      <span>Registered Players ({t.applicants?.length || 0})</span>
                    </h4>

                    {(t.applicants || []).length === 0 ? (
                      <p className="text-xs text-zinc-600 italic">No registrations yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {t.applicants.map(app => {
                          const rawPId = app.player?._id || app.player;
                          const isAccepted = app.status === "accepted";
                          const isRejected = app.status === "rejected";

                          return (
                            <div key={app._id || String(rawPId)} className="p-3 rounded-2xl bg-zinc-950 border border-zinc-850 flex justify-between items-center text-xs">
                              <div 
                                onClick={() => inspectPlayerProfile(rawPId)}
                                className="flex items-center gap-3 cursor-pointer group truncate"
                              >
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 group-hover:border-yellow-400 transition-all">
                                  <img src={app.profilePhoto || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150"} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="truncate">
                                  <span className="font-bold text-white block truncate group-hover:text-yellow-400 transition-colors underline-offset-2 group-hover:underline">
                                    {app.playerName} 🔍
                                  </span>
                                  <span className="text-[9px] text-zinc-500 uppercase">{app.preferredPosition} • {app.ageCategory}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isAccepted ? (
                                  <span className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/40 text-[10px] font-black uppercase tracking-wider">
                                    ACCEPTED ✓
                                  </span>
                                ) : isRejected ? (
                                  <span className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black uppercase tracking-wider">
                                    REJECTED ✗
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleApplicantStatus(t._id, rawPId, "accepted")}
                                      className="px-3 py-1.5 rounded-lg bg-green-500 text-black border border-green-500 text-[10px] font-black uppercase tracking-wider hover:bg-green-400 transition-all shadow-md"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleApplicantStatus(t._id, rawPId, "rejected")}
                                      className="px-3 py-1.5 rounded-lg bg-zinc-900 text-red-400 border border-red-500/40 text-[10px] font-black uppercase tracking-wider hover:bg-red-500/10 hover:border-red-500 transition-all"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
