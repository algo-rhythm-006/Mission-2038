import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import './LoadingState.css';

export default function LoadingState({ videoFrame }) {
  return (
    <div className="loading-container">
      {videoFrame ? (
        <div className="live-visualizer glass-panel">
          <div className="visualizer-header">
            <span className="live-badge">LIVE</span>
            <span className="visualizer-title">AI Processing Feed</span>
          </div>
          <img src={videoFrame} alt="Live AI Analysis" className="live-frame" />
          <p className="loading-subtitle" style={{ marginTop: '1rem' }}>Analyzing Biomechanics...</p>
        </div>
      ) : (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="scanner-circle"
          >
            <Target className="scanner-icon" />
          </motion.div>
          <motion.h3
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Initializing Analysis...
          </motion.h3>
          <p className="loading-subtitle">Uploading and preparing AI visualizer.</p>
        </>
      )}
    </div>
  );
}
