import { motion } from 'framer-motion';
import { Activity, Zap, Target, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

export default function Dashboard({ data, onReset }) {
  if (!data) return null;

  const { stats, report, session_log, session_data } = data;

  // Determine chart data
  let chartData = null;
  let chartKey = null;
  let chartColor = "#00ff88"; // neon green

  if (session_log && session_log.length > 0) {
    chartData = session_log.map(log => ({
      name: `Shot ${log.id}`,
      value: log.flexion
    }));
    chartKey = "value";
    chartColor = "#00ccff"; // blue for shooting
  } else if (session_data && session_data.length > 0) {
    chartData = session_data.map((time, idx) => ({
      name: `Save ${idx + 1}`,
      value: time
    }));
    chartKey = "value";
  }

  return (
    <motion.div 
      className="dashboard"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dashboard-header">
        <h2>Analysis Results</h2>
        <button className="reset-btn" onClick={onReset}>
          <RefreshCw size={18} /> New Analysis
        </button>
      </div>

      <div className="stats-grid">
        {Object.entries(stats).map(([key, value], idx) => (
          <motion.div 
            className="glass-panel stat-card"
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="stat-icon">
              {idx === 0 ? <Activity /> : idx === 1 ? <Target /> : <Zap />}
            </div>
            <div className="stat-content">
              <span className="stat-label">{key.replace(/_/g, ' ')}</span>
              <span className="stat-value">{value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {chartData && (
        <motion.div 
          className="glass-panel chart-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="chart-header">
            <h3>Performance Trend</h3>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => session_log ? `${val}°` : `${val}s`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: chartColor, fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey={chartKey} 
                  stroke={chartColor} 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: chartColor, strokeWidth: 2, stroke: '#0a0a0f' }} 
                  activeDot={{ r: 6 }} 
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <motion.div 
        className="glass-panel ai-report"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: chartData ? 0.4 : 0.3 }}
      >
        <div className="report-header">
          <Zap className="report-icon" />
          <h3>Gemini AI Coach Verdict</h3>
        </div>
        <div className="report-content">
          {report.split('\n').map((para, i) => (
            para.trim() ? <p key={i}>{para}</p> : <br key={i} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
