import { Activity } from 'lucide-react';
import './Header.css';

export default function Header() {
  return (
    <header className="glass-panel header">
      <div className="logo-container">
        <Activity className="logo-icon" />
        <span className="logo-text">Mission 2038 <span className="highlight">AI Coach</span></span>
      </div>
      <nav>
        <span className="status-badge">System Online</span>
      </nav>
    </header>
  );
}
