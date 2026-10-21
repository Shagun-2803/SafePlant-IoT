import React, { useState } from 'react';
import { IncidentRecord, IncidentStatus, NotificationAttempt } from '../../types/safeplant';
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  MessageSquare, 
  Bell, 
  Check, 
  ShieldCheck, 
  X, 
  Info,
  Calendar,
  Layers,
  Smartphone
} from 'lucide-react';

interface IncidentsScreenProps {
  incidents: IncidentRecord[];
  onAcknowledgeIncident: (id: string, acknowledgedBy?: string) => void;
  onResolveIncident?: (id: string, notes?: string) => void;
}

export const IncidentsScreen: React.FC<IncidentsScreenProps> = ({
  incidents,
  onAcknowledgeIncident,
  onResolveIncident,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'medium' | 'low'>('all');
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  // Newest first sorting (Section 8 requirement)
  const sortedIncidents = [...incidents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filteredIncidents = sortedIncidents.filter((inc) => {
    if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && inc.severity !== filterSeverity) return false;
    return true;
  });

  const handleAcknowledge = (id: string) => {
    onAcknowledgeIncident(id, 'Lead Safety Officer');
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident({
        ...selectedIncident,
        status: 'acknowledged',
        acknowledged: true,
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: 'Lead Safety Officer'
      });
    }
  };

  const handleResolve = (id: string) => {
    if (onResolveIncident) {
      onResolveIncident(id, resolveNotes || 'Abnormality cleared and verified normal.');
    }
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident({
        ...selectedIncident,
        status: 'resolved',
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolutionNotes: resolveNotes || 'Abnormality cleared and verified normal.'
      });
    }
    setResolveNotes('');
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 text-slate-100 max-w-2xl mx-auto">
      {/* 1. Header & Summary */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            <span>Incident Audit Trail & Management</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] font-mono text-slate-400">
            Authoritative Lifecycle: Open · Acknowledged · Resolved
          </p>
        </div>

        <div className="text-right font-mono text-[11px] text-slate-400">
          <span className="text-amber-400 font-bold">
            {incidents.filter(i => i.status === 'open').length}
          </span>{' '}
          Active
        </div>
      </div>

      {/* 2. Lifecycle & Severity Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Status Filter */}
        <div className="flex items-center bg-[#12161D] p-1 rounded-xl border border-white/10 flex-1 text-xs font-mono">
          {(['all', 'open', 'acknowledged', 'resolved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`flex-1 py-1 rounded-lg capitalize transition-colors text-center ${
                filterStatus === st
                  ? 'bg-[#1F2733] text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'open' ? 'Active' : st}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <div className="flex items-center bg-[#12161D] p-1 rounded-xl border border-white/10 text-xs font-mono">
          {(['all', 'critical', 'medium', 'low'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                filterSeverity === sev
                  ? 'bg-[#1F2733] text-[#10E575] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Incidents List (Newest first) */}
      <div className="flex flex-col gap-2.5">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center bg-[#0E1218] rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-[#10E575] opacity-80" />
            <h3 className="text-sm font-bold text-white">No Incidents Found</h3>
            <p className="text-xs text-slate-400 font-mono">
              Zero safety discrepancies logged under current filter. All historical records are retained.
            </p>
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isCrit = inc.severity === 'critical';
            const isMedium = inc.severity === 'medium';
            const isOpen = inc.status === 'open';
            const isAck = inc.status === 'acknowledged';
            const isResolved = inc.status === 'resolved';

            return (
              <div
                key={inc.id}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                  isOpen && isCrit
                    ? 'bg-red-500/10 border-red-500/40 shadow-md'
                    : isOpen
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-[#0E1218] border-white/5 hover:border-white/10'
                }`}
              >
                {/* Header Row: Severity Badge, Status Pill, Timestamp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                      isCrit ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                      isMedium ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {inc.severity}
                    </span>

                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                      isOpen ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                      isAck ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {inc.status.toUpperCase()}
                    </span>

                    <span className="text-[10px] font-mono text-slate-400">
                      {inc.zone}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Title and Description */}
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {inc.title}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    {inc.description}
                  </p>
                </div>

                {/* Sensor Value & Threshold */}
                {(inc.triggeringValue || inc.thresholdValue) && (
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block">TRIGGERING READING</span>
                      <span className={`font-bold ${isCrit ? 'text-red-400' : 'text-amber-400'}`}>
                        {inc.triggeringValue || 'Hazard threshold crossed'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">CONFIGURED CEILING</span>
                      <span className="text-slate-300">{inc.thresholdValue || 'Calibrated Limit'}</span>
                    </div>
                  </div>
                )}

                {/* Notification Delivery Attempt Badges (Section 8 Requirement) */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Notifications:</span>
                    {inc.notificationAttempts && inc.notificationAttempts.length > 0 ? (
                      inc.notificationAttempts.map((att, i) => (
                        <span
                          key={i}
                          className={`flex items-center gap-1 px-1.5 py-0.2 rounded border ${
                            att.status === 'delivered' || att.status === 'accepted'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : att.status === 'queued'
                              ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                              : 'bg-slate-800 text-slate-400 border-white/5'
                          }`}
                          title={att.error || `Status: ${att.status}`}
                        >
                          {att.channel === 'fcm' ? <Bell className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
                          <span className="uppercase">{att.channel}: {att.status}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">Queued</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Acknowledge Button */}
                    {isOpen && (
                      <button
                        onClick={() => handleAcknowledge(inc.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}

                    {/* Resolve Button */}
                    {(isOpen || isAck) && (
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition-colors"
                      >
                        Resolve
                      </button>
                    )}

                    {/* Details Modal Trigger */}
                    <button
                      onClick={() => setSelectedIncident(inc)}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] transition-colors"
                    >
                      Audit Record
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Incident Detail & Resolution Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0F131A] rounded-2xl sm:rounded-3xl border border-white/15 p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Safety Incident Audit Record</h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400 text-[10px] block">INCIDENT ID</span>
                  <span className="text-white font-semibold truncate block">{selectedIncident.id}</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400 text-[10px] block">EVENT TYPE</span>
                  <span className="text-white font-semibold uppercase block">{selectedIncident.eventType}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                <span className="text-slate-400 text-[10px]">DESCRIPTION & LOCATION</span>
                <span className="text-slate-200">{selectedIncident.description}</span>
                <span className="text-emerald-400 text-[10px] mt-0.5">Zone: {selectedIncident.zone} · Source: {selectedIncident.sourceDevice}</span>
              </div>

              {/* Notification Channel Records */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1.5">
                <span className="text-slate-400 text-[10px]">NOTIFICATION ATTEMPT RECORDS</span>
                {selectedIncident.notificationAttempts?.map((att, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] border-b border-white/5 pb-1 last:border-0">
                    <span className="text-white uppercase font-bold">{att.channel} Channel</span>
                    <span className={att.status === 'delivered' || att.status === 'accepted' ? 'text-emerald-400' : 'text-slate-400'}>
                      {att.status.toUpperCase()} {att.error ? `(${att.error})` : ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* Lifecycle State */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                <span className="text-slate-400 text-[10px]">LIFECYCLE TIMESTAMPS</span>
                <div className="text-[10px] text-slate-300">
                  <div>Created: {selectedIncident.timestamp}</div>
                  {selectedIncident.acknowledgedAt && (
                    <div className="text-amber-400">Acknowledged: {selectedIncident.acknowledgedAt} by {selectedIncident.acknowledgedBy}</div>
                  )}
                  {selectedIncident.resolvedAt && (
                    <div className="text-emerald-400">Resolved: {selectedIncident.resolvedAt}</div>
                  )}
                </div>
              </div>

              {/* Resolve Action Form if not resolved */}
              {selectedIncident.status !== 'resolved' && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-[10px] text-slate-300 font-bold">RESOLUTION AUDIT NOTES</label>
                  <input
                    type="text"
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="e.g. Ventilation restored, gas dissipated to safe baseline"
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleResolve(selectedIncident.id)}
                      className="flex-1 py-2 rounded-xl bg-[#10E575] hover:bg-[#12F07B] text-black font-bold text-xs transition-colors"
                    >
                      Confirm Abnormality Resolved
                    </button>
                    {selectedIncident.status === 'open' && (
                      <button
                        onClick={() => handleAcknowledge(selectedIncident.id)}
                        className="px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
