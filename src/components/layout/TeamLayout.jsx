import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTeam } from '../../context/TeamContext';
import { Dumbbell, Home, Users, Calendar, Clock, CheckCircle2, LineChart, TestTube, ChevronDown, ChevronRight, ClipboardList } from 'lucide-react';

export default function TeamLayout() {
    const { teamId } = useParams();
    const { activeTeamId, setActiveTeamId, activeTeam } = useTeam();
    const location = useLocation();
    const navigate = useNavigate();

    // Check if current path is a survey path to expand dropdown by default
    const isSurveyRoute = location.pathname.includes('/surveys/');
    const [isSurveysOpen, setIsSurveysOpen] = useState(isSurveyRoute);

    // Sync route teamId with Context TeamId if they differ
    useEffect(() => {
        if (teamId && teamId !== activeTeamId) {
            setActiveTeamId(teamId);
        }
    }, [teamId, activeTeamId, setActiveTeamId]);

    if (!activeTeam) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-slate-500 font-medium">Loading Team Context...</div>
            </div>
        );
    }

    const navLinks = [
        { name: 'Dashboard', path: `/team/${teamId}/dashboard`, icon: <Home size={18} /> },
        { name: 'Roster & Profiles', path: `/team/${teamId}/roster`, icon: <Users size={18} /> },
        { name: 'Schedule Planner', path: `/team/${teamId}/schedule`, icon: <Calendar size={18} /> },
        { name: 'Minutes Tracker', path: `/team/${teamId}/minutes`, icon: <Clock size={18} /> },
        { name: 'Gym Module', path: `/team/${teamId}/gym`, icon: <Dumbbell size={18} /> },
        { name: 'Wellness Dashboard', path: `/team/${teamId}/wellness`, icon: <CheckCircle2 size={18} /> },
        { name: 'RPE Reports', path: `/team/${teamId}/rpe-report`, icon: <LineChart size={18} /> },
        { name: 'Tests & Assessments', path: `/team/${teamId}/tests`, icon: <TestTube size={18} /> },
        {
            name: 'Surveys',
            icon: <ClipboardList size={18} />,
            isDropdown: true,
            children: [
                { name: 'Court Survey', path: `/team/${teamId}/surveys/court` },
                { name: 'Gym Survey', path: `/team/${teamId}/surveys/gym` },
                { name: 'Wellness Survey', path: `/team/${teamId}/surveys/wellness` },
            ]
        }
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">

            {/* 1. Navigation Sidebar (w-64 fixed) strictly persistent */}
            <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 shadow-sm flex flex-col z-20 relative">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 to-slate-800 capitalize tracking-tight flex items-center gap-2">
                        <Dumbbell className="text-indigo-600" size={20} />
                        {activeTeam.name}
                    </h1>
                    <button
                        onClick={() => navigate('/')}
                        className="change-team-btn text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1 hover:text-indigo-600 focus:outline-none"
                    >
                        CHANGE TEAM
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                    {navLinks.map((link, idx) => {
                        if (link.isDropdown) {
                            const hasActiveChild = link.children.some(child => location.pathname.startsWith(child.path));
                            return (
                                <div key={idx} className="flex flex-col">
                                    <div
                                        onClick={() => setIsSurveysOpen(!isSurveysOpen)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${hasActiveChild ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-100' : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 border border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={hasActiveChild ? "text-indigo-600" : "text-slate-400"}>{link.icon}</div>
                                            <span className="text-[14.5px]">{link.name}</span>
                                        </div>
                                        {isSurveysOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                                    </div>
                                    {isSurveysOpen && (
                                        <div className="pl-11 pr-2 py-1 space-y-1 mt-1 border-l-2 border-slate-100 ml-4">
                                            {link.children.map((child, childIdx) => {
                                                const isChildActive = location.pathname.startsWith(child.path);
                                                return (
                                                    <Link
                                                        key={childIdx}
                                                        to={child.path}
                                                        className={`block px-3 py-2 text-[13.5px] rounded-lg transition-colors ${isChildActive ? 'text-indigo-700 font-bold bg-indigo-50/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                                                    >
                                                        {child.name}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const isActive = location.pathname.startsWith(link.path);
                        return (
                            <Link key={idx} to={link.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-100 overflow-hidden relative' : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 border border-transparent'}`}>
                                {isActive && <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500"></div>}
                                <div className={isActive ? "text-indigo-600" : "text-slate-400"}>{link.icon}</div>
                                <span className="text-[14.5px]">{link.name}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* 2. Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                <Outlet />
            </div>
        </div>
    );
}
