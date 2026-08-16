import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { rosterService } from '../services/rosterService';
import { scheduleService } from '../services/scheduleService';
import { wellnessService } from '../services/wellnessService';
import { practiceDataService } from '../services/practiceDataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Activity, CheckCircle2, Sparkles, Navigation, Dumbbell } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export default function TeamDashboard() {
   const { activeTeam } = useTeam();
   const { teamId } = useParams();
   const [players, setPlayers] = useState([]);
   const [schedule, setSchedule] = useState([]);
   const [wellness, setWellness] = useState({});
   const [rpeChartData, setRpeChartData] = useState([]);
   const [loading, setLoading] = useState(true);

   const today = new Date();
   today.setHours(0, 0, 0, 0);

   const getDaysArray = (start, days) => {
      return Array.from({ length: days }, (_, i) => {
         const d = new Date(start);
         d.setDate(d.getDate() + i);
         return d;
      });
   };

   // 3-Week Calendar Config
   const currentWeekStart = new Date(today);
   currentWeekStart.setDate(today.getDate() - today.getDay());
   const calendarStart = new Date(currentWeekStart);
   calendarStart.setDate(currentWeekStart.getDate() - 7);
   const calendarDates = getDaysArray(calendarStart, 21);

   // 11-Day Graph Config (5 Past + Today + 5 Future)
   const graphStart = new Date(today);
   graphStart.setDate(today.getDate() - 5);
   const graphDates = getDaysArray(graphStart, 11);

   const fetchDashboardData = async () => {
      setLoading(true);
      try {
         const pData = await rosterService.getPlayers();
         setPlayers(pData);

         const sData = await scheduleService.getScheduleEvents();
         setSchedule(sData);

         const todayIso = new Date().toISOString().split('T')[0];
         const wData = await wellnessService.getWellnessData(todayIso);
         setWellness(wData?.responses || {});

         const newRpeData = [];
         for (const gd of graphDates) {
            const dateStr = gd.toISOString().split('T')[0];
            const dayEvts = sData.filter(s => s.date === dateStr);

            let plannedTotal = 0;
            let actualTotal = 0;
            let countActual = 0;
            let countPlanned = 0;

            for (const ev of dayEvts) {
               if (ev.rpeCourtPlanned) {
                  plannedTotal += Number(ev.rpeCourtPlanned);
                  countPlanned++;
               }

               if (gd <= today) {
                  const svy = await practiceDataService.getSurveyData(ev.firebaseId || ev.id);
                  if (svy) {
                     const rpeVals = Object.values(svy).map(s => s.rpe).filter(r => typeof r === 'number');
                     if (rpeVals.length > 0) {
                        const avg = rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length;
                        actualTotal += avg;
                        countActual++;
                     }
                  }
               }
            }

            const finalPlanned = countPlanned > 0 ? (plannedTotal / countPlanned) : 0;
            const finalActual = countActual > 0 ? (actualTotal / countActual) : 0;

            newRpeData.push({
               dateLabel: `${gd.getMonth() + 1}/${gd.getDate()}`,
               actual: Math.round(finalActual * 10) / 10,
               planned: Math.round(finalPlanned * 10) / 10,
               isFuture: gd > today
            });
         }
         setRpeChartData(newRpeData);
      } catch (err) {
         console.error("Dashboard data load error:", err);
      }
      setLoading(false);
   };

   useEffect(() => {
      if (activeTeam) fetchDashboardData();
   }, [activeTeam]);

   const handleGenerateTodayMock = async () => {
      if (!window.confirm("Generate mock wellness & RPE for dashboard?")) return;
      setLoading(true);

      const todayLocal = new Date();
      const yyyy = todayLocal.getFullYear();
      const mm = String(todayLocal.getMonth() + 1).padStart(2, '0');
      const dd = String(todayLocal.getDate()).padStart(2, '0');
      const todayIso = `${yyyy}-${mm}-${dd}`;

      await wellnessService.clearWellnessData(todayIso);

      // Generate Wellness randomly
      for (const p of players) {
         if (Math.random() > 0.3) {
            await wellnessService.submitWellnessCheck(p.name, {
               sleep: Math.floor(Math.random() * 5) + 6,
               fatigue: Math.floor(Math.random() * 5) + 3,
               soreness: Math.floor(Math.random() * 5) + 3,
               stress: Math.floor(Math.random() * 5) + 3,
               mood: Math.floor(Math.random() * 5) + 6
            });
         }
      }

      // Generate Actual RPE
      for (const gd of graphDates) {
         const iso = gd.toISOString().split('T')[0];
         if (gd <= today) {
            const evts = schedule.filter(s => s.date === iso);
            for (const ev of evts) {
               if (ev.type === "Practice" || ev.type === "Game") {
                  for (const p of players) {
                     if (Math.random() > 0.2) {
                        const target = ev.rpeCourtPlanned ? Number(ev.rpeCourtPlanned) : 7;
                        const variance = (Math.random() * 4) - 2;
                        await practiceDataService.updateSurveyResponse(ev.firebaseId || ev.id, p.name, { rpe: Math.max(1, Math.min(10, Math.round(target + variance))) });
                     }
                  }
               }
            }
         }
      }

      await fetchDashboardData();
   };

   const getReadinessScore = (player) => {
      const w = wellness[player.name];
      if (!w) return null;
      const sum = (w.sleep || 0) + (w.fatigue || 0) + (w.soreness || 0) + (w.stress || 0) + (w.mood || 0);
      return Math.round((sum / 50) * 100);
   };

   if (!activeTeam) return null;

   return (
      <div className="flex bg-slate-50 font-sans h-full overflow-hidden">
         {/* 2. Compact Roster & Wellness Status Panel */}
         <div className="w-[340px] flex-shrink-0 bg-white/95 backdrop-blur-xl border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.03)] flex flex-col relative z-10 hidden xl:flex overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50/60 to-transparent pointer-events-none"></div>
            <div className="px-6 py-5 flex justify-between items-center z-10 border-b border-slate-100/60 bg-white/40 shadow-sm">
               <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <Activity className="text-indigo-500" size={18} />
                     Squad Readiness
                  </h2>
                  <p className="text-[13px] font-medium text-slate-500 mt-0.5">Daily Wellness Status</p>
               </div>
               <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 shadow-sm">{players.length}</span>
            </div>

            <div className="flex-1 px-5 py-4 space-y-2.5 max-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar z-10 overscroll-contain">
               {players.length === 0 && (
                  <div className="text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-sm">
                     <span className="text-slate-500 font-medium">No players found.</span>
                  </div>
               )}
               {players.map(p => {
                  const score = getReadinessScore(p);
                  const hasWellness = score !== null;

                  let scoreColor = "text-slate-400";
                  let barColor = "bg-slate-200";
                  if (hasWellness) {
                     if (score >= 80) { scoreColor = "text-emerald-600"; barColor = "bg-emerald-500"; }
                     else if (score >= 60) { scoreColor = "text-amber-500"; barColor = "bg-amber-400"; }
                     else { scoreColor = "text-rose-600"; barColor = "bg-rose-500"; }
                  }

                  return (
                     <div key={p.id} className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group relative overflow-hidden flex justify-between items-center cursor-pointer">
                        <div className="flex items-center gap-3.5 z-10 w-full">
                           <div className="relative flex-shrink-0">
                              <div className="w-11 h-11 rounded-full bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-700 font-bold shadow-inner text-sm tracking-tighter">
                                 #{p.number}
                              </div>
                              {p.isInjured && (
                                 <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center shadow-md">
                                    <span className="block w-2 relative h-0.5 bg-white rotate-45"><span className="block w-2 absolute h-0.5 bg-white -rotate-90"></span></span>
                                 </div>
                              )}
                           </div>
                           <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-800 text-[15px] truncate">{p.name}</div>
                              <div className="flex items-center gap-1.5 mt-1">
                                 {hasWellness ? <CheckCircle2 size={13} className="text-emerald-500" strokeWidth={3} /> : <div className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300" />}
                                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{hasWellness ? 'Submitted' : 'Pending'}</span>
                              </div>
                           </div>

                           <div className="flex flex-col items-end z-10 pl-2">
                              <div className={`text-2xl font-black ${scoreColor} tracking-tighter`}>
                                 {hasWellness ? score : '--'}
                              </div>
                           </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-full h-[4px] bg-slate-50">
                           {hasWellness && <div className={`h-full ${barColor} transition-all duration-1000 ease-out`} style={{ width: `${score}%` }}></div>}
                        </div>
                     </div>
                  )
               })}
            </div>
         </div>

         {/* 3. Main Center View (Calendar & Graph) */}
         <div className="flex-1 flex flex-col overflow-y-auto relative bg-slate-50/50">

            <div className="p-8 max-w-[1400px] mx-auto w-full space-y-8 pb-16">
               <header className="flex justify-between items-center w-full bg-white/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-slate-200/60 sticky top-0 z-20">
                  <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-800 tracking-tight">
                     Dashboard Overview
                  </h2>
                  {activeTeam?.isMock && (
                     <button onClick={handleGenerateTodayMock} className="px-5 py-2.5 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl shadow-sm hover:bg-indigo-100 border border-indigo-200 flex items-center transition-all shadow-indigo-100/50">
                        <Sparkles size={16} className="mr-2" /> Generate Mock Data
                     </button>
                  )}
               </header>

               {loading ? (
                  <div className="flex items-center justify-center h-64 text-slate-500 font-medium">Loading Dashboard Elements...</div>
               ) : (
                  <div className="flex flex-col space-y-8">

                     {/* Enriched 3-Week Calendar */}
                     <div className="bg-white rounded-3xl p-7 shadow-xl shadow-slate-200/40 border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                           <h3 className="text-2xl font-bold text-slate-800">Operational Calendar</h3>
                           <Link to={`/team/${teamId}/schedule`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                              Full Calendar <Navigation size={14} />
                           </Link>
                        </div>
                        <div className="grid grid-cols-7 gap-3">
                           {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                              <div key={d} className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{d}</div>
                           ))}
                           {calendarDates.map((d, i) => {
                              const isToday = d.toDateString() === today.toDateString();
                              const dateIso = d.toISOString().split('T')[0];
                              const dayEvents = schedule.filter(e => e.date === dateIso);
                              const isPast = d < today;

                              return (
                                 <div key={i} className={`p-4 rounded-2xl transition-all duration-300 border backdrop-blur-md min-h-[160px] flex flex-col
                                ${isToday ? 'bg-indigo-600 border-indigo-500 text-white shadow-2xl shadow-indigo-500/30 transform scale-[1.03] z-10 ring-2 ring-indigo-200 ring-offset-2' :
                                       isPast ? 'bg-slate-50/70 border-slate-100 opacity-80' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300'}`}>
                                    <div className={`text-base font-black mb-3 ${isToday ? 'text-white' : 'text-slate-800'}`}>{d.getDate()}</div>
                                    <div className="space-y-2 flex-1 overflow-visible">
                                       {dayEvents.map((ev, idx) => {
                                          const holdsGym = Number(ev.rpeGymPlanned) > 0;
                                          return (
                                             <div key={idx} className={`text-sm leading-snug px-3 py-2 rounded-xl font-bold flex flex-col gap-1 tracking-wide shadow-sm
                                          ${isToday ? 'bg-indigo-500 text-white shadow-inner border border-indigo-400/50' :
                                                   ev.type === 'Game' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                                      ev.type === 'Recovery' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                         'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                                <div className="w-full whitespace-normal leading-tight">{ev.title || ev.type}</div>
                                                <div className="flex gap-2 flex-wrap items-center mt-1">
                                                   {ev.startTime && <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${isToday ? 'bg-black/15 text-indigo-50' : 'bg-black/5 text-slate-600'}`}>{ev.startTime}</span>}
                                                   {holdsGym && <span className={`text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded flex items-center ${isToday ? 'bg-slate-900 text-white' : 'bg-slate-900 text-white shadow-sm'}`}><Dumbbell size={10} className="mr-1 inline-block" /> GYM</span>}
                                                </div>
                                             </div>
                                          )
                                       })}
                                       {dayEvents.length === 0 && (
                                          <div className="text-[12px] font-medium text-slate-400 opacity-60 px-1 mt-1">No sessions</div>
                                       )}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>

                     {/* 11-Day Dynamic RPE Graph */}
                     <div className="bg-white rounded-3xl p-7 shadow-xl shadow-slate-200/40 border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                           <div>
                              <h3 className="text-xl font-bold text-slate-800">Squad Load Dynamics</h3>
                              <p className="text-sm text-slate-500 font-medium mt-1">11-Day Window: Actual Reported vs. Target Load</p>
                           </div>
                           <Link to={`/team/${teamId}/rpe-report`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                              Analytics <Navigation size={14} />
                           </Link>
                        </div>

                        <div className="h-[380px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={rpeChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                 <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} dy={10} />
                                 <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} domain={[0, 10]} />
                                 <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', fontWeight: 600, padding: '12px 16px' }}
                                    itemStyle={{ paddingTop: 4 }}
                                 />
                                 <Legend iconType="circle" wrapperStyle={{ paddingTop: '24px', fontSize: '14px', fontWeight: 600 }} />

                                 <Bar dataKey="planned" name="Target RPE (Planned)" radius={[8, 8, 0, 0]} barSize={46}>
                                    {rpeChartData.map((entry, index) => (
                                       <Cell key={`cell-planned-${index}`} fill="#cbd5e1" fillOpacity={entry.isFuture ? 0.6 : 0.8} />
                                    ))}
                                 </Bar>

                                 <Bar dataKey="actual" name="Internal RPE (Actual)" radius={[8, 8, 0, 0]} barSize={38}>
                                    {rpeChartData.map((entry, index) => (
                                       <Cell key={`cell-actual-${index}`} fill="url(#colorActual)" fillOpacity={entry.isFuture ? 0 : 1} />
                                    ))}
                                 </Bar>

                                 <defs>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="0%" stopColor="#4338ca" stopOpacity={0.95} />
                                       <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                                    </linearGradient>
                                 </defs>
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                     </div>

                  </div>
               )}
            </div>
         </div>
      </div>
   );
}
