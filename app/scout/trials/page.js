"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Calendar, MapPin, Clock, FileText } from "lucide-react";

export default function ScoutTrials() {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/scout/dashboard")
      .then(res => {
        setTrials(res.trials || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-black uppercase text-white tracking-wider">Scheduled Tryouts</h2>
          <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest font-bold">
            Track times and locations of scheduled physical evaluations
          </p>
        </div>

        {loading ? (
          <div className="h-60 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-zinc-550 uppercase tracking-widest font-bold font-sans">Loading calendar...</span>
          </div>
        ) : trials.length === 0 ? (
          <div className="p-12 bg-zinc-900/35 border border-zinc-800 rounded-3xl text-center text-zinc-500 text-xs">
            No tryouts have been scheduled yet. Invite players via search!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trials.map((t) => (
              <div key={t._id} className="bg-zinc-905 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] uppercase font-black text-yellow-400/90 tracking-widest">Tryout Evaluation</span>
                      <h3 className="text-white font-bold text-md mt-1">{t.playerProfile?.name || "Player Prospect"}</h3>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-zinc-850 pt-4 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-550 shrink-0" />
                      <span>Date: {new Date(t.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-zinc-550 shrink-0" />
                      <span>Time: {t.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-550 shrink-0" />
                      <span>Venue: {t.location}</span>
                    </div>
                    {t.notes && (
                      <div className="flex items-start gap-2 pt-2 border-t border-zinc-850/40">
                        <FileText className="w-4 h-4 text-zinc-550 shrink-0 mt-0.5" />
                        <span className="italic text-zinc-500">{t.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-850 flex justify-between items-center text-[10px] text-zinc-550 uppercase font-black">
                  <span>Status: <strong className="text-green-400">{t.status}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
