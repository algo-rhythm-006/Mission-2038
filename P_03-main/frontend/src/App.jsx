import { useState } from 'react';
import axios from 'axios';
import Header from './components/Header';
import UploadModule from './components/UploadModule';
import LoadingState from './components/LoadingState';
import Dashboard from './components/Dashboard';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);
  const [videoFrame, setVideoFrame] = useState(null);

  const handleUpload = async (file, drillType, showVisuals) => {
    setLoading(true);
    setError(null);
    setAnalysisData(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('show_visuals', showVisuals);

    try {
      const response = await fetch(`http://127.0.0.1:8000/analyze/${drillType}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Keep incomplete chunk in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.substring(6));
              if (payload.type === 'frame') {
                setVideoFrame(`data:image/jpeg;base64,${payload.data}`);
              } else if (payload.type === 'result') {
                setAnalysisData(payload.data);
                setVideoFrame(null);
              }
            } catch (e) {
              console.error("Error parsing stream payload:", e);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message || "An error occurred during analysis.");
      setVideoFrame(null);
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysisData(null);
    setError(null);
  };

  return (
    <div className="app-container">
      <Header />
      
      <main>
        {!loading && !analysisData && (
          <UploadModule onUpload={handleUpload} />
        )}

        {loading && <LoadingState videoFrame={videoFrame} />}

        {error && (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--error)' }}>
            <h3 style={{ color: 'var(--error)', marginBottom: '1rem' }}>Analysis Failed</h3>
            <p>{error}</p>
            <button 
              className="analyze-btn" 
              style={{ marginTop: '1.5rem', maxWidth: '200px' }}
              onClick={resetAnalysis}
            >
              Try Again
            </button>
          </div>
        )}

        {analysisData && (
          <Dashboard data={analysisData} onReset={resetAnalysis} />
        )}
      </main>
    </div>
  );
}
