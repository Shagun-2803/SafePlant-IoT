import React, { useState } from 'react';
import { IncidentRecord } from '../../types/safeplant';
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Download
} from 'lucide-react';

interface IncidentsScreenProps {
  incidents: IncidentRecord[];
  onAcknowledgeIncident: (id: string) => void;
}

export const IncidentsScreen: React.FC<IncidentsScreenProps> = ({
  incidents,
  onAcknowledgeIncident,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'medium' | 'low'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(incidents[0]?.id || null);

  const filteredIncidents = incidents.filter((inc) => {
    if (filterSeverity === 'all') return true;
    return inc.severity === filterSeverity;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Incident Audit Log</h1>
          <p className="text-xs text-slate-400">Chronological Safety Log & Acknowledgment</p>
        </div>

        {/* Export / Report Action */}
        <button
          onClick={() => alert('Industrial Safety Audit Report exported as OSHA-Compliant PDF')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141A24] border border-white/5 text-slate-300 hover:text-white text-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#10E575]" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#12161E] rounded-xl border border-white/5 text-xs">
        {(['all', 'critical', 'medium', 'low'] as const).map((sev) => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(sev)}
            className={`flex-1 py-1.5 rounded-lg capitalize transition-colors ${
              filterSeverity === sev
                ? 'bg-[#1E2734] text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* Incident Cards Timeline */}
      <div className="flex flex-col gap-3">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center bg-[#10141C] rounded-2xl border border-white/5">
            <CheckCircle2 className="w-8 h-8 text-[#10E575] mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-white">No Incidents Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              Zero safety discrepancies logged under current filter.
            </p>
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isCrit = inc.severity === 'critical';
            const isMedium = inc.severity === 'medium';
            const isExpanded = expandedId === inc.id;

            const badgeColor = isCrit
              ? 'text-red-400 bg-red-500/10 border-red-500/30'
              : isMedium
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
              : 'text-[#10E575] bg-[#10E575]/10 border-[#10E575]/30';

            return (
              <div
                key={inc.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isExpanded
                    ? 'bg-[#131922] border-white/15 shadow-lg'
                    : 'bg-[#10141B] border-white/5 hover:border-white/10'
                }`}
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(inc.id)}
                  className="p-3.5 flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badgeColor}`}
                    >
                      {isCrit ? (
                        <AlertOctagon className="w-4 h-4 text-red-400" />
                      ) : isMedium ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-[#10E575]" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${badgeColor}`}
                        >
                          {inc.severity}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {inc.timestamp}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-1 leading-snug">
                        {inc.title}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                        {inc.zone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {inc.resolved && (
                      <span className="text-[10px] font-mono text-[#10E575] bg-[#10E575]/10 px-2 py-0.5 rounded">
                        Resolved
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-white/5 flex flex-col gap-3 text-xs bg-[#0E131A]">
                    <p className="text-slate-300 leading-relaxed text-[12px]">
                      {inc.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 bg-[#141A24] p-2.5 rounded-xl border border-white/5 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block">Sensor Trigger</span>
                        <span className="text-slate-200 font-semibold">{inc.sensorTrigger || 'Automated Watchdog'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Peak Metric</span>
                        <span className="text-amber-400 font-semibold">{inc.peakValue || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        Officer: {inc.acknowledgedBy || 'Pending Signature'}
                      </span>

                      {!inc.acknowledged && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAcknowledgeIncident(inc.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#10E575] hover:bg-[#12F07B] text-black font-semibold text-xs transition-colors"
                        >
                          Acknowledge Incident
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
