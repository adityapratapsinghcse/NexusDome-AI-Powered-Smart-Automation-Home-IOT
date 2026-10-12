import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Thermometer, Droplets, Wind, Zap, Lightbulb, Fan, Lock, LockOpen,
  Grid3x3, Bell, ShieldCheck, ShieldAlert, Radio, Flame, Car, DoorOpen,
  Activity, ChevronRight,
} from 'lucide-react';
import PanelCard from '../components/ui/PanelCard';
import client from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const OFFLINE_THRESHOLD_MS = 60 * 1000;
const ENERGY_RATE_PER_KWH = 7; // rough estimate only, not a real billing rate

function statusFor(value, warn, crit) {
  if (value === null || value === undefined) return 'safe';
  if (value >= crit) return 'critical';
  if (value >= warn) return 'warning';
  return 'safe';
}

const STATUS_LABEL = { safe: 'NORMAL', warning: 'ELEVATED', critical: 'CRITICAL' };
const STATUS_COLOR = {
  safe: 'var(--status-safe)',
  warning: 'var(--status-warning)',
  critical: 'var(--status-critical)',
};

function StatCard({ icon: Icon, label, value, unit, status, statusText, tint }) {
  const color = tint || STATUS_COLOR[status];
  return (
    <PanelCard className="sn-stat-card">
      <div className="sn-stat-icon-circle" style={{ background: `${color}22`, color }}>
        <Icon size={22} />
      </div>
      <div className="sn-stat-card-body">
        <div className="sn-stat-card-label">{label}</div>
        <div className="sn-stat-card-value">
          {value ?? '--'}<small>{unit}</small>
        </div>
        <div className="sn-stat-card-status" style={{ color: STATUS_COLOR[status] }}>
          {statusText}
        </div>
      </div>
    </PanelCard>
  );
}

const ALERT_ICON = {
  fire: Flame, gas_leak: Wind, water_low: Droplets, intrusion: Radio,
  window_open: DoorOpen, vibration: Activity, overcurrent: Zap,
  rfid_denied: Lock, car_detected: Car, system: ShieldAlert,
};

export default function Dashboard() {
  const { householdId, householdName } = useAuth();
  const { alerts: bellAlerts, unreadCount, clearUnread } = useNotifications();
  const username = localStorage.getItem('smartnest_username') || 'Operator';

  const [device, setDevice] = useState(null);
  const [deviceCount, setDeviceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [bellOpen, setBellOpen] = useState(false);

  const [readings, setReadings] = useState({
    temperature: null, humidity: null, gas: null, current: null,
    flame: null, motion: null, light_relay: null, fan_relay: null,
  });

  const [history, setHistory] = useState([]);
  const [accessLog, setAccessLog] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [energyToday, setEnergyToday] = useState(null);

  const { lastMessage } = useWebSocket('/ws/sensors/', householdId);
  const { lastMessage: alertMessage } = useWebSocket('/ws/alerts/', householdId);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      try {
        const devicesRes = await client.get('/api/devices/');
        setDeviceCount(devicesRes.data.length);
        if (devicesRes.data.length === 0) { setLoading(false); return; }
        const primaryDevice = devicesRes.data[0];
        setDevice(primaryDevice);

        const [latestRes, histRes, accessRes, alertsRes, energyRes] = await Promise.all([
          client.get(`/api/sensors/latest/?device_id=${primaryDevice.id}`),
          client.get(`/api/sensors/history/?device_id=${primaryDevice.id}&sensor_type=temperature&limit=24`),
          client.get(`/api/access/log/?device_id=${primaryDevice.id}`),
          client.get('/api/alerts/?is_read=false'),
          client.get(`/api/energy/summary/?device_id=${primaryDevice.id}`).catch(() => null),
        ]);

        const merged = {};
        latestRes.data.forEach((r) => { merged[r.sensor_type] = r.value; });
        setReadings((prev) => ({ ...prev, ...merged }));
        if (latestRes.data.length > 0) {
          const newest = latestRes.data.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b));
          setLastSeenAt(new Date(newest.timestamp).getTime());
        }

        setHistory(histRes.data.slice().reverse().map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temp: r.value,
        })));

        setAccessLog(accessRes.data.slice(0, 5));
        setAlerts(alertsRes.data.slice(0, 6));
        if (energyRes?.data) setEnergyToday(energyRes.data.today_kwh);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId]);

  useEffect(() => {
    if (!lastMessage) return;
    setLastSeenAt(Date.now());
    setReadings((prev) => ({
      ...prev,
      temperature: lastMessage.temperature ?? prev.temperature,
      humidity: lastMessage.humidity ?? prev.humidity,
      gas: lastMessage.gas_percent ?? prev.gas,
      current: lastMessage.current_amps ?? prev.current,
      flame: lastMessage.flame_detected !== undefined ? (lastMessage.flame_detected ? 1 : 0) : prev.flame,
      motion: lastMessage.motion !== undefined ? (lastMessage.motion ? 1 : 0) : prev.motion,
      light_relay: lastMessage.light_on !== undefined ? (lastMessage.light_on ? 1 : 0) : prev.light_relay,
      fan_relay: lastMessage.fan_on !== undefined ? (lastMessage.fan_on ? 1 : 0) : prev.fan_relay,
    }));
    if (lastMessage.temperature !== undefined) {
      setHistory((prev) => [...prev.slice(-23), {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: lastMessage.temperature,
      }]);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (!alertMessage) return;
    setAlerts((prev) => [alertMessage, ...prev].slice(0, 6));
  }, [alertMessage]);

  const sendCommand = async (action) => {
    if (!device) return;
    try {
      await client.post('/api/commands/send/', { device: device.id, action });
    } catch (err) {
      console.error('Command failed to send:', err);
    }
  };

  const toggleLight = (on) => {
    setReadings((prev) => ({ ...prev, light_relay: on ? 1 : 0 }));
    sendCommand(on ? 'light_on' : 'light_off');
  };
  const toggleFan = (on) => {
    setReadings((prev) => ({ ...prev, fan_relay: on ? 1 : 0 }));
    sendCommand(on ? 'fan_on' : 'fan_off');
  };
  const unlockGate = () => sendCommand('unlock_door');

  const isOnline = (device && device.is_online) || (lastSeenAt !== null && (now - lastSeenAt) < OFFLINE_THRESHOLD_MS);

  if (loading) return <div className="sn-page-loading">Loading dashboard…</div>;

  if (!device) {
    return (
      <div className="sn-page">
        <h1 className="sn-page-title">Dashboard</h1>
        <p className="sn-page-subtitle">No devices found yet. Add an ESP32 board under Devices to get started.</p>
      </div>
    );
  }

  const tempStatus = statusFor(readings.temperature, 28, 35);
  const humStatus = statusFor(readings.humidity, 70, 90);
  const gasStatus = statusFor(readings.gas, 25, 50);
  const currentStatus = statusFor(readings.current, 2, 3);

  const criticalAlertCount = alerts.filter((a) => a.severity === 'critical').length;
  const systemNormal = isOnline && criticalAlertCount === 0;

  const subtitle = !isOnline
    ? `${device.name} is currently offline — showing last known readings`
    : criticalAlertCount > 0
    ? `${criticalAlertCount} critical alert${criticalAlertCount > 1 ? 's' : ''} need your attention`
    : `Everything looks good at ${householdName}`;

  const recentUnlock = accessLog[0] && accessLog[0].granted
    && (Date.now() - new Date(accessLog[0].timestamp).getTime() < 5 * 60 * 1000);

  const costEstimate = energyToday != null ? (energyToday * ENERGY_RATE_PER_KWH).toFixed(2) : null;
  const onlineDeviceCount = isOnline ? deviceCount : 0;

  return (
    <div className="sn-page">
      <div className="sn-home-header">
        <div>
          <h1 className="sn-page-title">Welcome back, {username} 👋</h1>
          <p className="sn-page-subtitle">{subtitle}</p>
        </div>
        <div className="sn-home-header-actions">
          <div className="sn-home-bell-wrap">
            <button
              className="sn-home-bell"
              onClick={() => { setBellOpen((v) => !v); if (!bellOpen) clearUnread(); }}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="sn-home-bell-badge">{unreadCount}</span>}
            </button>
            {bellOpen && (
              <div className="sn-home-bell-dropdown">
                <PanelCard title="Notifications" icon={Bell}>
                  {bellAlerts.length === 0 && (
                    <p className="label-eyebrow" style={{ padding: '4px 0' }}>All clear — no alerts.</p>
                  )}
                  {bellAlerts.slice(0, 6).map((a) => (
                    <div key={a.id} className="sn-home-alert-row">
                      <div className="sn-home-alert-text">
                        <div className="sn-home-alert-message">{a.message}</div>
                        <span className="sn-home-alert-time">
                          {new Date(a.timestamp || a.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </PanelCard>
              </div>
            )}
          </div>
          <div className="sn-home-avatar">{username.charAt(0).toUpperCase()}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="sn-grid sn-grid-4">
        <StatCard
          icon={Thermometer} label="Temperature"
          value={readings.temperature ?? '--'} unit="°C"
          status={tempStatus}
          statusText={tempStatus === 'safe' ? 'Comfortable' : tempStatus === 'warning' ? 'Warm' : 'Too Hot'}
          tint="var(--accent-copper-bright)"
        />
        <StatCard
          icon={Droplets} label="Humidity"
          value={readings.humidity ?? '--'} unit="%"
          status={humStatus}
          statusText={humStatus === 'safe' ? 'Normal' : humStatus === 'warning' ? 'Humid' : 'Very Humid'}
          tint="var(--accent-info)"
        />
        <StatCard
          icon={Wind} label="Gas Level (MQ-2)"
          value={readings.gas ?? '--'} unit="%"
          status={gasStatus}
          statusText={STATUS_LABEL[gasStatus]}
        />
        <StatCard
          icon={Zap} label="Power Draw"
          value={readings.current ?? '--'} unit="A"
          status={currentStatus}
          statusText={STATUS_LABEL[currentStatus]}
        />
      </div>

      {/* Quick Controls */}
      <PanelCard title="Quick Controls" icon={Activity} style={{ marginBottom: 20 }}>
        <div className="sn-home-quick-grid">
          <button className="sn-home-quick-tile" onClick={() => toggleLight(!readings.light_relay)}>
            <div className="sn-home-quick-icon" style={{ background: 'rgba(232,163,61,0.18)', color: 'var(--status-warning)' }}>
              <Lightbulb size={19} />
            </div>
            <div>
              <div className="sn-home-quick-label">Room Lights</div>
              <span className="ui-pill" style={{
                color: readings.light_relay ? 'var(--status-safe)' : 'var(--text-secondary)',
                borderColor: readings.light_relay ? 'rgba(76,175,125,0.3)' : 'var(--border-subtle)',
                background: readings.light_relay ? 'rgba(76,175,125,0.1)' : 'transparent',
              }}>
                {readings.light_relay ? 'ON' : 'OFF'}
              </span>
            </div>
          </button>

          <button className="sn-home-quick-tile" onClick={() => toggleFan(!readings.fan_relay)}>
            <div className="sn-home-quick-icon" style={{ background: 'rgba(79,163,209,0.18)', color: 'var(--accent-info)' }}>
              <Fan size={19} />
            </div>
            <div>
              <div className="sn-home-quick-label">Cooling Fan</div>
              <span className="ui-pill" style={{
                color: readings.fan_relay ? 'var(--status-safe)' : 'var(--text-secondary)',
                borderColor: readings.fan_relay ? 'rgba(76,175,125,0.3)' : 'var(--border-subtle)',
                background: readings.fan_relay ? 'rgba(76,175,125,0.1)' : 'transparent',
              }}>
                {readings.fan_relay ? 'ON' : 'OFF'}
              </span>
            </div>
          </button>

          <button className="sn-home-quick-tile" onClick={unlockGate}>
            <div className="sn-home-quick-icon" style={{ background: 'rgba(76,175,125,0.18)', color: 'var(--status-safe)' }}>
              {recentUnlock ? <LockOpen size={19} /> : <Lock size={19} />}
            </div>
            <div>
              <div className="sn-home-quick-label">Main Gate</div>
              <span className="ui-pill" style={{
                color: recentUnlock ? 'var(--status-warning)' : 'var(--status-safe)',
                borderColor: recentUnlock ? 'rgba(232,163,61,0.3)' : 'rgba(76,175,125,0.3)',
                background: recentUnlock ? 'rgba(232,163,61,0.1)' : 'rgba(76,175,125,0.1)',
              }}>
                {recentUnlock ? 'UNLOCKED' : 'LOCKED'}
              </span>
            </div>
          </button>

          <div className="sn-home-quick-tile sn-home-quick-tile-static">
            <div className="sn-home-quick-icon" style={{ background: 'rgba(198,129,63,0.18)', color: 'var(--accent-copper-bright)' }}>
              <Grid3x3 size={19} />
            </div>
            <div>
              <div className="sn-home-quick-label">All Devices</div>
              <span className="ui-pill" style={{
                color: onlineDeviceCount > 0 ? 'var(--status-safe)' : 'var(--status-critical)',
                borderColor: onlineDeviceCount > 0 ? 'rgba(76,175,125,0.3)' : 'rgba(225,85,84,0.3)',
                background: onlineDeviceCount > 0 ? 'rgba(76,175,125,0.1)' : 'rgba(225,85,84,0.1)',
              }}>
                {onlineDeviceCount} / {deviceCount} Online
              </span>
            </div>
          </div>
        </div>
      </PanelCard>

      {/* Alerts / Summary / Status */}
      <div className="sn-home-columns">
        <PanelCard title="Recent Alerts" icon={ShieldAlert}>
          {alerts.length === 0 && (
            <p className="label-eyebrow" style={{ padding: '4px 0 8px' }}>No unread alerts — system nominal.</p>
          )}
          {alerts.map((a) => {
            const Icon = ALERT_ICON[a.type] || ShieldAlert;
            const color = STATUS_COLOR[a.severity] || STATUS_COLOR.warning;
            return (
              <div key={a.id} className="sn-home-alert-row">
                <div className="sn-home-alert-icon" style={{ background: `${color}22`, color }}>
                  <Icon size={15} />
                </div>
                <div className="sn-home-alert-text">
                  <div className="sn-home-alert-message">{a.message}</div>
                  <span className="sn-home-alert-time">
                    {new Date(a.timestamp || a.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
          <Link to="/safety" className="sn-home-panel-link" style={{ display: 'inline-block', marginTop: 10 }}>
            View all →
          </Link>
        </PanelCard>

        <PanelCard title="Today's Summary" icon={Activity}>
          <div className="sn-home-summary-row">
            <span className="sn-home-summary-label"><Zap size={14} /> Energy Used</span>
            <span className="sn-home-summary-value">{energyToday != null ? `${energyToday} kWh` : '--'}</span>
          </div>
          <div className="sn-home-summary-row">
            <span className="sn-home-summary-label"><Zap size={14} /> Est. Cost</span>
            <span className="sn-home-summary-value">{costEstimate != null ? `₹${costEstimate}` : '--'}</span>
          </div>
          <div className="sn-home-summary-row">
            <span className="sn-home-summary-label"><Grid3x3 size={14} /> Devices Online</span>
            <span className="sn-home-summary-value">{onlineDeviceCount} / {deviceCount}</span>
          </div>
          <div className="sn-home-summary-row">
            <span className="sn-home-summary-label"><ShieldAlert size={14} /> Active Alerts</span>
            <span className={`sn-home-summary-value ${alerts.length > 0 ? 'critical' : ''}`}>{alerts.length}</span>
          </div>
          {costEstimate != null && (
            <div className="sn-home-eco-note">
              Estimated at ₹{ENERGY_RATE_PER_KWH}/kWh — approximate, not your real utility rate.
            </div>
          )}
        </PanelCard>

        <PanelCard title="Home Status" icon={ShieldCheck}>
          <div className="sn-home-status-card">
            <div
              className="sn-home-status-icon-wrap"
              style={{ background: systemNormal ? 'rgba(76,175,125,0.15)' : 'rgba(225,85,84,0.15)' }}
            >
              <ShieldCheck size={30} color={systemNormal ? 'var(--status-safe)' : 'var(--status-critical)'} />
              <div
                className="sn-home-status-badge"
                style={{ background: systemNormal ? 'var(--status-safe)' : 'var(--status-critical)' }}
              >
                {systemNormal
                  ? <ShieldCheck size={13} color="#0E1A14" />
                  : <ShieldAlert size={13} color="#2A0E0E" />}
              </div>
            </div>
            <div className="sn-home-status-title" style={{ color: systemNormal ? 'var(--status-safe)' : 'var(--status-critical)' }}>
              {systemNormal ? 'All Systems Normal' : 'Attention Needed'}
            </div>
            <div className="sn-home-status-sub">
              {systemNormal
                ? 'Your home is safe, secure and running smoothly.'
                : !isOnline
                ? `${device.name} hasn't reported in over a minute.`
                : 'Check Recent Alerts for details.'}
            </div>
          </div>
        </PanelCard>
      </div>

      {/* Temperature trend */}
      <PanelCard title="Temperature — Last 24 Readings" icon={Thermometer} className="sn-chart-panel" style={{ marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-copper-bright)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--accent-copper-bright)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={11} />
            <YAxis stroke="var(--text-secondary)" fontSize={11} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--border-subtle)', borderRadius: 8 }} />
            <Area type="monotone" dataKey="temp" stroke="var(--accent-copper-bright)" fill="url(#tempGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </PanelCard>

      {/* Security banner */}
      <div className="sn-home-banner">
        <div className="sn-home-banner-left">
          <div className="sn-home-banner-icon"><ShieldCheck size={20} /></div>
          <div>
            <div className="sn-home-banner-title">The Nexus Dome Security</div>
            <div className="sn-home-banner-sub">Your home is monitored 24/7 for your safety and peace of mind.</div>
          </div>
        </div>
        <Link to="/security" className="sn-home-banner-btn">
          Go to Security <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  );
}