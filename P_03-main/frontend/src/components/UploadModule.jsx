import { useState, useRef } from 'react';
import { Upload, FileVideo, ChevronDown, MonitorPlay } from 'lucide-react';
import { motion } from 'framer-motion';
import './UploadModule.css';

const DRILL_TYPES = [
  { id: 'shooting', label: 'Shooting Drill' },
  { id: 'dribbling', label: 'Dribbling Drill' },
  { id: 'goalkeeper', label: 'Goalkeeper Drill' }
];

export default function UploadModule({ onUpload }) {
  const [drillType, setDrillType] = useState('shooting');
  const [file, setFile] = useState(null);
  const [showVisuals, setShowVisuals] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = () => {
    if (file && drillType) {
      onUpload(file, drillType, showVisuals);
    }
  };

  return (
    <motion.div 
      className="glass-panel upload-module"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2>Start Analysis</h2>
      <p className="subtitle">Select a drill type and upload your training footage.</p>

      <div className="drill-selector">
        <label>Drill Type</label>
        <div className="select-wrapper">
          <select value={drillType} onChange={(e) => setDrillType(e.target.value)}>
            {DRILL_TYPES.map(drill => (
              <option key={drill.id} value={drill.id}>{drill.label}</option>
            ))}
          </select>
          <ChevronDown className="select-icon" />
        </div>
      </div>

      <div 
        className={`dropzone ${file ? 'has-file' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="video/mp4,video/quicktime" 
          hidden 
        />
        
        {file ? (
          <div className="file-preview">
            <FileVideo className="file-icon" />
            <span className="file-name">{file.name}</span>
            <span className="file-size">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon-wrapper">
              <Upload className="upload-icon" />
            </div>
            <p><strong>Click to upload</strong> or drag and drop</p>
            <p className="hint">MP4 or MOV up to 100MB</p>
          </div>
        )}
      </div>

      <div className="toggle-container">
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={showVisuals} 
            onChange={(e) => setShowVisuals(e.target.checked)} 
          />
          <span className="slider"></span>
        </label>
        <div className="toggle-label">
          <MonitorPlay size={18} className="toggle-icon" />
          <span>Show Live Visualizer</span>
        </div>
      </div>

      <button 
        className={`analyze-btn ${!file ? 'disabled' : ''}`}
        onClick={handleSubmit}
        disabled={!file}
      >
        Analyze Session
      </button>
    </motion.div>
  );
}
