import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { testService } from '../services/testService';
import { rosterService } from '../services/rosterService';

export default function TestsAndAssessments() {
    const { activeTeam } = useTeam();
    const [testDefs, setTestDefs] = useState([]);
    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI Tabs: 'definitions' | 'single' | 'group'
    const [activeTab, setActiveTab] = useState('single');

    // Definition Form
    const [showDefForm, setShowDefForm] = useState(false);
    const [newDef, setNewDef] = useState({ name: '', unit: '', isHigherBetter: true });

    // Single Player Form
    const [singleEntry, setSingleEntry] = useState({
        playerId: '',
        testId: '',
        date: new Date().toISOString().split('T')[0],
        result: ''
    });

    // Group Mode Form
    const [groupEntry, setGroupEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        selectedTests: [],
        selectedPlayers: [],
        matrix: {} // matrix[playerId][testId] = result
    });

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                const [defsResult, playersResult] = await Promise.all([
                    testService.getTestDefinitions(activeTeam?.id),
                    rosterService.getPlayers(activeTeam?.id)
                ]);
                setTestDefs(defsResult);
                setPlayers(playersResult);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [activeTeam]);

    const calculateVO2Max = (result, gender) => {
        const level = Math.floor(result);
        const shuttles = result - level;
        const final_velocity_kmh = 8.5 + (0.5 * (level - 1)) + (shuttles * 0.05); // simple approximation
        if (gender === 'female') {
            return (-31.0 + (5.8 * final_velocity_kmh)).toFixed(1);
        }
        return (-27.4 + (6.0 * final_velocity_kmh)).toFixed(1);
    };

    const generateTestsMockData = async () => {
        if (!window.confirm("Generate historic test data for all mock players?")) return;
        setIsLoading(true);
        try {
            if (players.length === 0) {
                alert("Please generate Roster Mock Data first.");
                setIsLoading(false);
                return;
            }

            const date = new Date().toISOString().split('T')[0];
            const getDefId = name => testDefs.find(d => d.name === name)?.id;

            const resultsToSave = [];

            for (const player of players) {
                const isGuard = player.position === 'PG' || player.position === 'SG';
                const mockResults = [
                    { name: 'Beep Test', result: isGuard ? 12.1 : 10.5 },
                    { name: '1RM Barbell Back Squat', result: isGuard ? 130 : 160 },
                    { name: '1RM Conventional Deadlift', result: isGuard ? 150 : 190 },
                    { name: '1RM Barbell Bench Press', result: isGuard ? 90 : 110 },
                    { name: 'Vertical Jump', result: isGuard ? 70 : 55 },
                    { name: 'Broad Jump', result: isGuard ? 260 : 230 },
                    { name: '20m Sprint', result: isGuard ? 2.85 : 3.10 },
                    { name: '5-0-5 Agility Test', result: isGuard ? 2.20 : 2.45 },
                ];

                for (const mr of mockResults) {
                    const defId = getDefId(mr.name);
                    if (!defId) continue;

                    const payload = {
                        playerId: player.id,
                        testId: defId,
                        testName: mr.name,
                        unit: testDefs.find(d => d.id === defId).unit,
                        isHigherBetter: testDefs.find(d => d.id === defId).isHigherBetter,
                        result: mr.result,
                        date
                    };
                    if (mr.name.includes('Beep')) {
                        payload.vo2max = parseFloat(calculateVO2Max(mr.result, player.gender || 'male'));
                    }
                    resultsToSave.push(payload);
                }
            }

            await testService.saveTestResults(resultsToSave, activeTeam?.id);

            alert('Mock test data generated successfully!');
            // clear form states
        } catch (e) {
            console.error(e);
            alert('Failed to initialize mock test data');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Handlers for Definitions ---
    const handleAddDef = async (e) => {
        e.preventDefault();
        try {
            const id = await testService.addTestDefinition(newDef, activeTeam?.id);
            setTestDefs(prev => [...prev, { ...newDef, id }]);
            setNewDef({ name: '', unit: '', isHigherBetter: true });
            setShowDefForm(false);
        } catch (e) {
            alert('Failed to add definition');
        }
    };

    // --- Handlers for Single Entry ---
    const handleSaveSingleEntry = async (e) => {
        e.preventDefault();
        if (!singleEntry.playerId || !singleEntry.testId || !singleEntry.result) {
            return alert('Please fill all required fields');
        }
        try {
            const def = testDefs.find(t => t.id === singleEntry.testId);
            const player = players.find(p => p.id === singleEntry.playerId);
            const resultVal = parseFloat(singleEntry.result);

            const payload = {
                playerId: singleEntry.playerId,
                testId: singleEntry.testId,
                testName: def.name,
                unit: def.unit,
                isHigherBetter: def.isHigherBetter,
                result: resultVal,
                date: singleEntry.date
            };

            if (def.name.toLowerCase().includes('beep')) {
                payload.vo2max = parseFloat(calculateVO2Max(resultVal, player?.gender || 'male'));
            }

            await testService.saveTestResults([payload], activeTeam?.id);
            alert('Result saved!');
            setSingleEntry(prev => ({ ...prev, result: '' }));
        } catch (e) {
            alert('Failed to save result');
        }
    };

    // --- Handlers for Group Entry ---
    const handleToggleGroupTest = (testId) => {
        setGroupEntry(prev => {
            const selected = prev.selectedTests.includes(testId)
                ? prev.selectedTests.filter(id => id !== testId)
                : [...prev.selectedTests, testId];
            return { ...prev, selectedTests: selected };
        });
    };

    const handleToggleGroupPlayer = (playerId) => {
        setGroupEntry(prev => {
            const selected = prev.selectedPlayers.includes(playerId)
                ? prev.selectedPlayers.filter(id => id !== playerId)
                : [...prev.selectedPlayers, playerId];
            return { ...prev, selectedPlayers: selected };
        });
    };

    const handleSelectAllGroupPlayers = () => {
        setGroupEntry(prev => {
            if (prev.selectedPlayers.length === players.length) {
                return { ...prev, selectedPlayers: [] };
            }
            return { ...prev, selectedPlayers: players.map(p => p.id) };
        });
    };

    const handleMatrixChange = (playerId, testId, val) => {
        setGroupEntry(prev => ({
            ...prev,
            matrix: {
                ...prev.matrix,
                [playerId]: {
                    ...(prev.matrix[playerId] || {}),
                    [testId]: val
                }
            }
        }));
    };

    const handleSaveGroupEntry = async () => {
        const results = [];
        groupEntry.selectedPlayers.forEach(pId => {
            groupEntry.selectedTests.forEach(tId => {
                const val = groupEntry.matrix[pId]?.[tId];
                if (val && val.trim() !== '') {
                    const def = testDefs.find(t => t.id === tId);
                    results.push({
                        playerId: pId,
                        testId: tId,
                        testName: def.name,
                        unit: def.unit,
                        isHigherBetter: def.isHigherBetter,
                        result: parseFloat(val),
                        date: groupEntry.date
                    });
                }
            });
        });

        if (results.length === 0) {
            return alert('No results entered to save.');
        }

        try {
            await testService.saveTestResults(results, activeTeam?.id);
            alert('Group results saved successfully!');
            setGroupEntry(prev => ({
                ...prev,
                selectedTests: [],
                selectedPlayers: [],
                matrix: {}
            }));
        } catch (e) {
            alert('Failed to save group results');
        }
    };


    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading tests...</div>;

    return (
        <div className="p-6">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Athletic Tests & Assessments</h1>
                        <p className="text-gray-500 mt-2">Manage test types and enter results for your team.</p>
                    </div>
                    {activeTeam?.isMock && (
                        <button onClick={generateTestsMockData} className="px-4 py-2 bg-amber-100 text-amber-700 border border-amber-300 font-bold rounded hover:bg-amber-200">
                            ✨ Generate Mock Data
                        </button>
                    )}
                </header>

                {/* Top Navigation */}
                <div className="flex gap-4 mb-6 border-b pb-2">
                    <button
                        className={`pb-2 px-4 font-bold ${activeTab === 'single' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                        onClick={() => setActiveTab('single')}
                    >
                        Single Player Entry
                    </button>
                    <button
                        className={`pb-2 px-4 font-bold ${activeTab === 'group' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                        onClick={() => setActiveTab('group')}
                    >
                        Test Day Mode (Group)
                    </button>
                    <button
                        className={`pb-2 px-4 font-bold ${activeTab === 'definitions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                        onClick={() => setActiveTab('definitions')}
                    >
                        Test Definitions
                    </button>
                </div>

                {/* Active Tab Content */}

                {/* DEFINITIONS TAB */}
                {activeTab === 'definitions' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Available Tests</h2>
                            <button
                                onClick={() => setShowDefForm(!showDefForm)}
                                className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
                            >
                                {showDefForm ? 'Cancel' : 'Add New Test Type'}
                            </button>
                        </div>

                        {showDefForm && (
                            <form onSubmit={handleAddDef} className="bg-white p-6 rounded-xl shadow border mb-6 flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold mb-1">Test Name</label>
                                    <input required className="w-full border p-2 rounded" placeholder="e.g. 10m Sprint" value={newDef.name} onChange={e => setNewDef({ ...newDef, name: e.target.value })} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold mb-1">Unit</label>
                                    <input required className="w-full border p-2 rounded" placeholder="e.g. sec, cm, kg" value={newDef.unit} onChange={e => setNewDef({ ...newDef, unit: e.target.value })} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold mb-1">Scoring</label>
                                    <select className="w-full border p-2 rounded" value={newDef.isHigherBetter} onChange={e => setNewDef({ ...newDef, isHigherBetter: e.target.value === 'true' })}>
                                        <option value="true">Higher Result is Better</option>
                                        <option value="false">Lower Result is Better</option>
                                    </select>
                                </div>
                                <div>
                                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-bold">Save Test</button>
                                </div>
                            </form>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {testDefs.map(def => (
                                <div key={def.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                    <h3 className="font-bold text-lg">{def.name}</h3>
                                    <div className="text-sm text-gray-500 mt-1">
                                        Unit: <span className="font-semibold text-gray-800">{def.unit}</span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        Rule: <span className="font-semibold text-gray-800">{def.isHigherBetter ? 'Higher is Better' : 'Lower is Better'}</span>
                                    </div>
                                </div>
                            ))}
                            {testDefs.length === 0 && (
                                <div className="col-span-full py-8 text-center text-gray-500 border-2 border-dashed rounded bg-gray-50">
                                    No tests defined. Click 'Add New Test Type' to begin.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* SINGLE ENTRY TAB */}
                {activeTab === 'single' && (
                    <div className="max-w-2xl bg-white p-6 rounded-xl shadow border">
                        <h2 className="text-xl font-bold mb-6">Single Player Test Entry</h2>
                        <form onSubmit={handleSaveSingleEntry} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Select Player</label>
                                <select required className="w-full border p-2 rounded" value={singleEntry.playerId} onChange={e => setSingleEntry({ ...singleEntry, playerId: e.target.value })}>
                                    <option value="">-- Choose Player --</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Date</label>
                                    <input required type="date" className="w-full border p-2 rounded" value={singleEntry.date} onChange={e => setSingleEntry({ ...singleEntry, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Select Test</label>
                                    <select required className="w-full border p-2 rounded" value={singleEntry.testId} onChange={e => setSingleEntry({ ...singleEntry, testId: e.target.value })}>
                                        <option value="">-- Choose Test --</option>
                                        {testDefs.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Result</label>
                                <input required type="number" step="any" className="w-full border p-2 rounded font-bold text-lg" placeholder="Enter numeric result..." value={singleEntry.result} onChange={e => setSingleEntry({ ...singleEntry, result: e.target.value })} />
                            </div>

                            {singleEntry.playerId && singleEntry.testId && singleEntry.result && testDefs.find(t => t.id === singleEntry.testId)?.name.toLowerCase().includes('beep') && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 font-semibold text-center mt-2">
                                    Calculated Estimated VO2max: <span className="font-bold text-xl ml-2">{calculateVO2Max(parseFloat(singleEntry.result), players.find(p => p.id === singleEntry.playerId)?.gender || 'male')}</span> ml/kg/min
                                </div>
                            )}

                            <button type="submit" className="w-full mt-4 py-3 bg-blue-600 text-white rounded font-bold text-lg hover:bg-blue-700">
                                Save Result
                            </button>
                        </form>
                    </div>
                )}


                {/* GROUP ENTRY TAB */}
                {activeTab === 'group' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow border">
                            <h2 className="text-xl font-bold mb-4">1. Session Setup</h2>
                            <div className="mb-4 max-w-sm">
                                <label className="block text-sm font-semibold mb-2">Test Date</label>
                                <input required type="date" className="w-full border p-2 rounded" value={groupEntry.date} onChange={e => setGroupEntry({ ...groupEntry, date: e.target.value })} />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-2">Select Tests Conducted (Choose multiple)</label>
                                <div className="flex flex-wrap gap-2">
                                    {testDefs.map(t => {
                                        const isSelected = groupEntry.selectedTests.includes(t.id);
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => handleToggleGroupTest(t.id)}
                                                className={`px-3 py-1.5 rounded-full border text-sm font-bold transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                            >
                                                {t.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold">Select Participating Players</label>
                                    <button onClick={handleSelectAllGroupPlayers} className="text-sm text-blue-600 font-bold hover:underline">
                                        {groupEntry.selectedPlayers.length === players.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {players.map(p => {
                                        const isSelected = groupEntry.selectedPlayers.includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => handleToggleGroupPlayer(p.id)}
                                                className={`px-3 py-1.5 rounded-full border text-sm font-bold transition-colors ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                            >
                                                {p.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Matrix Result Entry */}
                        {groupEntry.selectedTests.length > 0 && groupEntry.selectedPlayers.length > 0 && (
                            <div className="bg-white p-6 rounded-xl shadow border overflow-x-auto">
                                <h2 className="text-xl font-bold mb-4">2. Enter Results</h2>
                                <table className="w-full text-left border-collapse min-w-max">
                                    <thead>
                                        <tr>
                                            <th className="p-3 border-b-2 border-gray-300 bg-gray-50 font-bold text-gray-700">Player</th>
                                            {groupEntry.selectedTests.map(tId => {
                                                const testDef = testDefs.find(t => t.id === tId);
                                                return (
                                                    <th key={tId} className="p-3 border-b-2 border-gray-300 bg-gray-50 text-center font-bold text-gray-700 w-32">
                                                        {testDef?.name}
                                                        <div className="text-xs text-gray-500 font-normal">({testDef?.unit})</div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupEntry.selectedPlayers.map(pId => {
                                            const player = players.find(p => p.id === pId);
                                            return (
                                                <tr key={pId} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 border-b form-semibold">{player?.name}</td>
                                                    {groupEntry.selectedTests.map(tId => (
                                                        <td key={tId} className="p-3 border-b">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                className="w-full p-2 text-center border rounded shadow-inner"
                                                                placeholder="..."
                                                                value={groupEntry.matrix[pId]?.[tId] || ''}
                                                                onChange={(e) => handleMatrixChange(pId, tId, e.target.value)}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                                <div className="mt-6 flex justify-end">
                                    <button onClick={handleSaveGroupEntry} className="px-6 py-3 bg-green-600 text-white rounded font-bold text-lg hover:bg-green-700 shadow-md">
                                        Save All Results
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
