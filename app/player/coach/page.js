"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Play, Video, Loader, Cpu, BarChart2, ShieldAlert } from "lucide-react";

export default function AICoachTerminal() {
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [logMessages, setLogMessages] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  
  const canvasRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logMessages]);

  useEffect(() => {
    loadVideoHistory();
  }, []);

  const loadVideoHistory = () => {
    setLoadingVideos(true);
    api.get("/videos/history")
      .then(res => {
        setVideos(res);
        setLoadingVideos(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load video list.");
        setLoadingVideos(false);
      });
  };

  const handleStartAnalysis = async () => {
    if (!selectedVideo) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    setCurrentFrame(null);
    setLogMessages(["Establishing handshake with Node.js analysis proxy..."]);
    setError(null);

    const token = localStorage.getItem("accessToken");
    const url = `http://localhost:5000/api/videos/${selectedVideo._id}/analyze`;

    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setLogMessages(prev => [...prev, "Connected to AI pipeline. Commencing OpenCV frame extraction..."]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // keep partial last line

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.substring(6));
              
              if (payload.type === "frame") {
                // Image frame update
                setCurrentFrame(`data:image/jpeg;base64,${payload.data}`);
              } else if (payload.type === "log") {
                // Append processing logging text
                setLogMessages(prev => [...prev, payload.data]);
              } else if (payload.type === "result") {
                // Final result
                setAnalysisResult(payload.data);
                setLogMessages(prev => [...prev, "Processing complete! Writing stats and coaching logs to database."]);
              } else if (payload.type === "error") {
                setError(payload.data);
              }
            } catch (e) {
              // Parse fail on partial lines, safe to skip
            }
          }
        }
      }

      // Re-fetch video lists to show analyzed badge update
      loadVideoHistory();

    } catch (err) {
      console.error(err);
      setError(err.message || "Connection to analysis pipeline lost.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Draw image to canvas for smooth sizing
  useEffect(() => {
    if (currentFrame && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = currentFrame;
    }
  }, [currentFrame]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-black uppercase text-white tracking-wider">AI Training Terminal</h2>
          <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest font-bold">
            Execute MediaPipe joint tracking and YOLO ball telemetry on uploads
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* SIDEBAR: VIDEO SELECTOR */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-3">
              Upload History
            </h3>

            {loadingVideos ? (
              <div className="text-center py-10 space-y-3">
                <Loader className="w-6 h-6 animate-spin text-yellow-400 mx-auto" />
                <span className="text-xs text-zinc-500 font-bold uppercase">Loading Videos...</span>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs">
                No videos uploaded yet. Go to "Upload Video" page.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {videos.map((vid) => (
                  <div
                    key={vid._id}
                    onClick={() => {
                      if (!analyzing) {
                        setSelectedVideo(vid);
                        setAnalysisResult(null);
                        setCurrentFrame(null);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                      selectedVideo?._id === vid._id
                        ? "bg-yellow-400/10 border-yellow-400/80 text-yellow-400"
                        : "bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <div className="truncate pr-3">
                      <h4 className="font-bold text-xs truncate text-white">{vid.title}</h4>
                      <span className="text-[9px] uppercase tracking-widest font-bold mt-1 block">
                        {vid.drillType}
                      </span>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                      vid.isAnalyzed 
                        ? "bg-green-400/10 text-green-400 border-green-500/20" 
                        : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}>
                      {vid.isAnalyzed ? "Analyzed" : "New"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {selectedVideo && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-4">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Ready To Run</span>
                  <h4 className="text-white font-bold text-sm">{selectedVideo.title}</h4>
                </div>
                <button
                  onClick={handleStartAnalysis}
                  disabled={analyzing}
                  className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black uppercase tracking-wider py-3 rounded-lg text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin text-black" />
                      <span>Running Models...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-black fill-black" />
                      <span>Commence Analysis</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* MAIN SCREEN: STREAMING ENGINE */}
          <div className="lg:col-span-2 space-y-8">
            {error && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-200 text-xs flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* MONITOR PANEL */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="flex justify-between items-center bg-zinc-900/40 px-6 py-4 border-b border-zinc-850">
                <span className="text-xs uppercase tracking-widest font-black text-zinc-400 flex items-center gap-2">
                  <Cpu className="text-yellow-400 w-4 h-4" /> Live AI Engine Telemetry
                </span>
                {analyzing && (
                  <span className="bg-yellow-400 text-black text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full animate-pulse">
                    Live Feed
                  </span>
                )}
              </div>

              <div className="aspect-video bg-zinc-900 flex items-center justify-center relative">
                {currentFrame ? (
                  <canvas ref={canvasRef} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-6 text-zinc-650 space-y-3">
                    <Video className="w-16 h-16 mx-auto stroke-1" />
                    <p className="text-xs uppercase tracking-wider font-bold">Select a video and click Commence Analysis</p>
                  </div>
                )}
              </div>

              {/* CONSOLE STATUS */}
              {logMessages.length > 0 && (
                <div className="bg-black/85 p-5 border-t border-zinc-850 max-h-48 overflow-y-auto font-mono text-[10px] text-yellow-400/80 space-y-1.5 scrollbar-thin">
                  {logMessages.map((msg, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-zinc-650 select-none">[{i+1}]</span>
                      <span>{msg}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>

            {/* RESULTS REPORT PANELS */}
            {analysisResult && (
              <div className="space-y-6">
                {/* ATTRIBUTES PANEL */}
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                    <BarChart2 className="text-yellow-400 w-4.5 h-4.5" /> Bio-mechanical Telemetry Results
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analysisResult.stats || {}).map(([key, val]) => (
                      <div key={key} className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                        <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-bold">{key.replace(/_/g, " ")}</span>
                        <span className="text-lg font-black text-white">{typeof val === "number" ? val.toFixed(1) : String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GEMINI REPORT PANEL */}
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-3 flex items-center gap-2">
                    <Cpu className="text-yellow-400 w-4.5 h-4.5" /> Elite Coach AI Report
                  </h3>
                  <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-850 leading-relaxed text-zinc-300 text-sm whitespace-pre-line font-medium">
                    {analysisResult.report}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
