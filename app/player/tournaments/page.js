"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { MapPin, Trophy, Calendar, Users, Map, CheckCircle2, AlertCircle } from "lucide-react";

export default function PlayerTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Simulating user GPS coordinate choices
  const [gpsSim, setGpsSim] = useState({ name: "Delhi NCR", lat: 28.6139, lng: 77.2090 });

  const locations = [
    { name: "Delhi NCR", lat: 28.6139, lng: 77.2090 },
    { name: "Mumbai Hub", lat: 19.0760, lng: 72.8777 },
    { name: "Bengaluru South", lat: 12.9716, lng: 77.5946 },
    { name: "Kolkata East", lat: 22.5726, lng: 88.3639 }
  ];

  useEffect(() => {
    loadNearbyTournaments();
  }, [gpsSim]);

  const loadNearbyTournaments = () => {
    setLoading(true);
    // Simulating nearby search API query
    api.get(`/tournaments/nearby?lat=${gpsSim.lat}&lng=${gpsSim.lng}`)
      .then(res => {
        setTournaments(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleRegister = async (tId) => {
    setRegisteringId(tId);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await api.post(`/tournaments/${tId}/join`);
      setSuccessMsg("Registration application submitted successfully!");
      // reload lists
      loadNearbyTournaments();
    } catch (err) {
      setErrorMsg(err.message || "Failed to register for tournament.");
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-850 pb-6">
          <div>
            <h2 className="text-3xl font-black uppercase text-white tracking-wider">Tournament Board</h2>
            <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest font-bold">
              Find and apply for scout-monitored regional leagues
            </p>
          </div>

          {/* GPS Simulator Selector */}
          <div className="flex items-center space-x-3 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase pl-2">My Simulated Location:</span>
            <select
              value={gpsSim.name}
              onChange={(e) => {
                const targetLoc = locations.find(l => l.name === e.target.value);
                if (targetLoc) setGpsSim(targetLoc);
              }}
              className="bg-zinc-950 border-none text-xs text-yellow-400 font-bold focus:outline-none rounded p-1 cursor-pointer"
            >
              {locations.map(loc => (
                <option key={loc.name} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-green-950/40 border border-green-500/50 flex items-center gap-3 text-green-200 text-sm">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="h-60 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Calculating distances...</span>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="p-12 bg-zinc-900/35 border border-zinc-800 rounded-3xl text-center text-zinc-500 text-xs">
            No upcoming tournaments found near this region. Try changing the simulated location!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <div key={t._id} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <span className="bg-yellow-400/10 text-yellow-400 text-[9px] font-black uppercase px-2.5 py-0.5 rounded border border-yellow-400/20">
                      Championship
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                      <Map className="w-3.5 h-3.5 text-yellow-400" /> {t.distanceKm} km away
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white uppercase truncate">{t.name}</h3>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed h-12 overflow-hidden line-clamp-3">
                    {t.description}
                  </p>

                  <div className="mt-6 space-y-2 border-t border-zinc-850 pt-4 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-550 shrink-0" />
                      <span>Starts: {new Date(t.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-550 shrink-0" />
                      <span className="truncate">{t.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-zinc-550 shrink-0" />
                      <span>Organizer: {t.organizer}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-850">
                  <button
                    onClick={() => handleRegister(t._id)}
                    disabled={registeringId === t._id}
                    className="w-full bg-zinc-950 hover:bg-zinc-900 text-yellow-400 font-black uppercase tracking-wider py-3 rounded-xl border border-zinc-800 text-xs transition-all flex items-center justify-center gap-2"
                  >
                    {registeringId === t._id ? "Registering..." : "Apply to Register"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
