import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, Users, Plus, Trophy, Swords, LayoutDashboard, List, PlusCircle, Flame, Crown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from 'recharts';
import { db } from './firebaseConfig';
import { ref, onValue, push, set } from "firebase/database";
import Select from 'react-select';
import Tournament from './components/Tournament';
import { customSelectStyles } from './styles/selectStyles';

// --- KONFIGURATION & HELFER ---
const RANKS = [
    { name: "Bronze", minPoints: 0, icon: "🥉", color: "text-amber-600" }, 
    { name: "Silber", minPoints: 20, icon: "🥈", color: "text-gray-300" },
    { name: "Gold", minPoints: 50, icon: "🥇", color: "text-yellow-400" }, 
    { name: "Platin", minPoints: 100, icon: "💎", color: "text-cyan-400" },
    { name: "Diamant", minPoints: 150, icon: "💠", color: "text-blue-400" },
    { name: "Meister", minPoints: 200, icon: "👑", color: "text-purple-400" },
];
const getRankFromPoints = (points) => RANKS.slice().reverse().find(r => points >= r.minPoints) || RANKS[0];


// --- HAUPTKOMPONENTE ---
export default function App() {
    const [mode, setMode] = useState('global');
    const [view, setView] = useState('dashboard');
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        let pLoaded=false, mLoaded=false, tLoaded=false;
        const check = () => { if(pLoaded && mLoaded && tLoaded) setLoading(false); };

        const pRef = ref(db, 'players');
        const mRef = ref(db, 'globalMatches');
        const tRef = ref(db, 'tournaments');

        const pL = onValue(pRef, s => { setPlayers(Object.values(s.val()||{})); pLoaded=true; check(); });
        const mL = onValue(mRef, s => { setMatches(Object.values(s.val()||{}).sort((a,b)=>a.createdAt-b.createdAt)); mLoaded=true; check(); });
        const tL = onValue(tRef, s => { 
            const tourneyData = s.val() || {};
            const tourneyList = Object.entries(tourneyData).map(([id, tourney]) => {
                // Ensure playoffs structure is properly initialized
                let playoffs = tourney.playoffs;
                if (playoffs) {
                    // Ensure each playoff match has the proper structure
                    ['qualifier1', 'eliminator', 'qualifier2', 'final'].forEach(matchKey => {
                        if (playoffs[matchKey]) {
                            if (!playoffs[matchKey].games || !Array.isArray(playoffs[matchKey].games)) {
                                playoffs[matchKey].games = [
                                    { score1: null, score2: null },
                                    { score1: null, score2: null },
                                    { score1: null, score2: null }
                                ];
                            }
                            if (playoffs[matchKey].completed === undefined) {
                                playoffs[matchKey].completed = false;
                            }
                            if (playoffs[matchKey].winner === undefined) {
                                playoffs[matchKey].winner = null;
                            }
                        }
                    });
                }
                
                return {
                    id,
                    ...tourney,
                    participants: tourney.participants || [],
                    games: tourney.games ? Object.values(tourney.games).sort((a, b) => (a.player1.name+a.player2.name).localeCompare(b.player1.name+b.player2.name)) : [],
                    playoffs: playoffs
                };
            });
            setTournaments(tourneyList.sort((a,b) => b.createdAt - a.createdAt)); 
            tLoaded=true; check(); 
        });

        return () => { pL(); mL(); tL(); };
    }, []);
    
    const leaderboardData = useMemo(() => {
        const stats = new Map(players.map(p => [p.id, { ...p, points: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, played: 0, tournamentWins: p.tournamentWins || 0 }]));
        matches.forEach(m => {
            const p1 = stats.get(m.player1Id); const p2 = stats.get(m.player2Id); if (!p1 || !p2) return;
            p1.played++; p2.played++; p1.gf += m.player1Score; p1.ga += m.player2Score; p2.gf += m.player2Score; p2.ga += m.player1Score;
            if (m.player1Score > m.player2Score) { p1.points += 3; p1.wins++; p2.losses++; }
            else if (m.player2Score > m.player1Score) { p2.points += 3; p2.wins++; p1.losses++; }
            else { p1.points++; p2.points++; p1.draws++; p2.draws++; }
        });
        return [...stats.values()].sort((a,b) => b.points - a.points || b.tournamentWins - a.tournamentWins || (b.gf - b.ga) - (a.gf - a.ga));
    }, [players, matches]);
    
    const handleAddPlayer = (name) => { 
        const id = push(ref(db, 'players')).key; 
        set(ref(db, `players/${id}`), { id, name })
            .catch((error) => {
                console.error('Error adding player:', error);
                alert('Fehler beim Hinzufügen des Spielers. Bitte versuchen Sie es erneut.');
            });
    };
    const handleAddMatch = (data) => { 
        const id = push(ref(db, 'globalMatches')).key; 
        set(ref(db, `globalMatches/${id}`), { id, ...data, createdAt: Date.now() })
            .catch((error) => {
                console.error('Error adding match:', error);
                alert('Fehler beim Hinzufügen des Spiels. Bitte versuchen Sie es erneut.');
            });
    };
    
    const renderGlobalView = () => {
        if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div></div>;
        switch (view) {
            case 'rangliste': return <Rangliste data={leaderboardData} />;
            case 'spieler': return <Spieler players={players} onAddPlayer={handleAddPlayer} />;
            case 'neuesSpiel': return <NeuesSpiel players={players} onAddMatch={handleAddMatch} />;
            case 'dashboard': default: return <Dashboard stats={{totalPlayers: players.length, totalMatches: matches.length, topPlayer: leaderboardData[0]}} leaderboardData={leaderboardData} matches={matches} players={players} tournaments={tournaments}/>;
        }
    };
    
    const renderTournamentView = () => <Tournament allPlayers={players} tournaments={tournaments} setTournaments={setTournaments} />;
    
    return (
        <div className="min-h-screen">
            <div className="font-sans text-white flex min-h-screen">
                <Sidebar mode={mode} setMode={setMode} view={view} setView={setView} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    <Header title={getPageTitle(view, mode)} />
                    <div className="mt-6">
                        {mode === 'global' ? renderGlobalView() : renderTournamentView()}
                    </div>
                </main>
            </div>
        </div>
    );
}

// --- HELPER & UI KOMPONENTEN ---
const getPageTitle = (page, mode) => {
    if (mode === 'tournament') return "Turnier Modus";
    const titles = { dashboard: 'Dashboard', rangliste: 'Globale Rangliste', spieler: 'Spieler verwalten', neuesSpiel: 'Neues Spiel eintragen' };
    return titles[page] || 'Kicker Arena';
};

const Sidebar = ({ mode, setMode, view, setView }) => {
    const menuItems = {
        global: [ { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'rangliste', label: 'Rangliste', icon: Trophy }, { id: 'spieler', label: 'Spieler', icon: Users }, { id: 'neuesSpiel', label: 'Neues Spiel', icon: PlusCircle } ],
        tournament: [] // Navigation handled within Tournament component
    };
    return (
        <aside className="w-64 sidebar-gradient p-6">
            <div className="mb-12"> 
                <h1 className="text-3xl font-bold text-red-400 flex items-center gap-2 red-glow">
                    <Flame className="animate-pulse-glow"/> WAMOCON Arena
                </h1> 
            </div>
            <nav className="space-y-6">
                <div> 
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Modus</h3>
                    <SidebarButton label="Gesamt" active={mode === 'global'} onClick={() => { setMode('global'); setView('dashboard'); }}/>
                    <SidebarButton label="Turnier" active={mode === 'tournament'} onClick={() => { setMode('tournament'); setView('tournament-list'); }}/>
                </div>
                {menuItems[mode].length > 0 && <div><h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Navigation</h3>{menuItems[mode].map(item => <SubSidebarButton key={item.id} {...item} active={view === item.id} onClick={() => setView(item.id)}/>)}</div>}
            </nav>
        </aside>
    );
};

const SidebarButton = ({ label, active, onClick }) => (
    <button onClick={onClick} className={`w-full text-left px-4 py-2 text-lg rounded-lg transition-all duration-300 ${
        active ? 'btn-primary text-white red-glow' : 'btn-secondary hover:red-glow-hover'
    }`}>
        {label}
    </button>
);

const SubSidebarButton = ({ label, icon: Icon, active, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 ${
        active ? 'btn-primary text-white red-glow' : 'btn-secondary hover:red-glow-hover'
    }`}>
        <Icon size={20}/>{label}
    </button>
);
const Header = ({ title }) => (
    <header className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-bold text-white red-glow-hover">{title}</h1>
    </header>
);

const StatCard = ({ title, value, icon: Icon }) => (
    <div className="gradient-card p-6 rounded-lg shadow-lg hover:gradient-card-hover transition-all duration-300 red-glow-hover">
        <div className="flex justify-between items-center">
            <p className="text-xl font-semibold text-gray-300">{title}</p>
            <Icon size={28} className="text-red-400"/>
        </div>
        <p className="text-4xl font-bold mt-2 text-white">{value}</p>
    </div>
);
const CHART_COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28"];

const Dashboard = ({ stats, leaderboardData, matches, players, tournaments }) => {
    const top5Players = leaderboardData.slice(0, 5);
    const recentMatches = matches.slice(-5).reverse();
    const playerMap = new Map(players.map(p => [p.id, p.name]));

    const pointsHistory = useMemo(() => {
        let history = new Map(players.map(p => [p.id, [{match: 0, points: 0}]]));
        matches.forEach((match, index) => {
            const p1Id = match.player1Id; const p2Id = match.player2Id;
            const p1PrevPoints = history.get(p1Id)?.slice(-1)[0]?.points ?? 0;
            const p2PrevPoints = history.get(p2Id)?.slice(-1)[0]?.points ?? 0;
            let p1NewPoints = p1PrevPoints; let p2NewPoints = p2PrevPoints;
            if(match.player1Score > match.player2Score) { p1NewPoints += 3; } else if (match.player2Score > match.player1Score) { p2NewPoints += 3; } else { p1NewPoints += 1; p2NewPoints += 1; }
            if(history.has(p1Id)) history.get(p1Id).push({ match: index + 1, points: p1NewPoints });
            if(history.has(p2Id)) history.get(p2Id).push({ match: index + 1, points: p2NewPoints });
        });
        const chartData = [];
        for(let i=1; i<=matches.length; i++){
            const entry = {name: `Spiel ${i}`};
            history.forEach((data, playerId) => {
                const point = data.find(d => d.match === i) || data.find(d => d.match < i) || {points: 0};
                if(top5Players.some(p => p.id === playerId)) entry[playerMap.get(playerId)] = point.points;
            });
            chartData.push(entry);
        }
        return chartData;
    }, [matches, players, top5Players, playerMap]);
    
    const winLossData = useMemo(() => {
        return leaderboardData.map(p => ({ name: p.name, Siege: p.wins, Niederlagen: p.losses }));
    }, [leaderboardData]);

    const tournamentData = useMemo(() => {
        const finishedTournaments = tournaments.filter(t => t.status === 'finished' && t.winner);
        const tournamentWinners = {};
        
        finishedTournaments.forEach(tournament => {
            const winnerName = tournament.winner.name;
            tournamentWinners[winnerName] = (tournamentWinners[winnerName] || 0) + 1;
        });
        
        return Object.entries(tournamentWinners)
            .map(([name, wins]) => ({ name, Turniersiege: wins }))
            .sort((a, b) => b.Turniersiege - a.Turniersiege)
            .slice(0, 8); // Top 8 tournament winners
    }, [tournaments]);

    return (
        <div className="space-y-8">
            <div className="gradient-card p-6 rounded-lg mb-8 hover:gradient-card-hover transition-all duration-300">
                <h2 className="text-2xl font-bold text-red-400 mb-2">Willkommen in der WAMOCON Kicker Arena!</h2>
                <p className="text-lg text-gray-300">Dies ist die zentrale Anlaufstelle für alle Tischkicker-Aktivitäten. Verfolgen Sie die globale Rangliste, oder wechseln Sie in den Turniermodus, um Wettbewerbe zu organisieren.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Top Spieler" value={stats.topPlayer?.name || 'N/A'} icon={Crown}/>
                <StatCard title="Punkte" value={stats.topPlayer?.points || 0} icon={Flame}/>
                <StatCard title="Aktive Spieler" value={stats.totalPlayers} icon={Users}/>
            </div>
            <div className="gradient-card p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                <h2 className="text-2xl font-bold mb-4 text-red-400">Punkteverlauf der Top 5</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={pointsHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                        <XAxis dataKey="name" stroke="#9CA3AF"/>
                        <YAxis stroke="#9CA3AF"/>
                        <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151'}} wrapperClassName="rounded-lg"/>
                        <Legend />
                        {top5Players.map((player, i) => (
                            <Line key={player.id} type="monotone" dataKey={player.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2}/>
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="gradient-card p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                    <h2 className="text-2xl font-bold mb-4 text-red-400">Sieg/Niederlage-Verhältnis</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={winLossData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                            <XAxis dataKey="name" stroke="#9CA3AF"/>
                            <YAxis stroke="#9CA3AF"/>
                            <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151'}} wrapperClassName="rounded-lg"/>
                            <Legend />
                            <Bar dataKey="Siege" fill="#22c55e" />
                            <Bar dataKey="Niederlagen" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="gradient-card p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                    <h2 className="text-2xl font-bold mb-4 text-red-400">Letzte Spiele</h2>
                    <div className="space-y-4">
                        {recentMatches.map(m => (
                            <div key={m.id} className="bg-white/5 p-3 rounded-lg text-sm hover:bg-white/10 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div className="text-center w-1/3">
                                        <div className="font-bold">{playerMap.get(m.player1Id) || '?'}</div>
                                        <div className={`text-2xl font-black ${m.player1Score > m.player2Score ? 'text-green-400' : ''}`}>{m.player1Score}</div>
                                    </div>
                                    <div className="text-center w-1/3 text-gray-400 font-semibold">vs.</div>
                                    <div className="text-center w-1/3">
                                        <div className="font-bold">{playerMap.get(m.player2Id) || '?'}</div>
                                        <div className={`text-2xl font-black ${m.player2Score > m.player1Score ? 'text-green-400' : ''}`}>{m.player2Score}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Tournament Results Visualization */}
            <div className="gradient-card p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                <h2 className="text-2xl font-bold mb-4 text-red-400">🏆 Turniersiege</h2>
                {tournamentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={tournamentData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                            <XAxis dataKey="name" stroke="#9CA3AF"/>
                            <YAxis stroke="#9CA3AF"/>
                            <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151'}} wrapperClassName="rounded-lg"/>
                            <Legend />
                            <Bar dataKey="Turniersiege" fill="#fbbf24" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center text-gray-400">
                            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                            <p>Noch keine Turniere abgeschlossen</p>
                            <p className="text-sm">Wechseln Sie in den Turniermodus, um ein Turnier zu erstellen</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Rangliste = ({ data }) => ( 
    <div className="gradient-card rounded-lg overflow-hidden hover:gradient-card-hover transition-all duration-300"> 
        <table className="w-full"> 
            <thead>
                <tr className="border-b border-white/20 bg-white/5">
                    <th className="p-4 text-left text-lg font-bold text-red-400 uppercase">Rang</th>
                    <th className="p-4 text-left text-lg font-bold text-red-400 uppercase">Spieler</th>
                    <th className="p-4 text-left text-lg font-bold text-red-400 uppercase">Punkte</th>
                    <th className="p-4 text-left text-lg font-bold text-red-400 uppercase">Turniere</th>
                    <th className="p-4 text-left text-lg font-bold text-red-400 uppercase">Spiele</th>
                    <th className="p-4 text-left text-lg font-bold text-red-400 uppercase">S/U/N</th>
                </tr>
            </thead> 
            <tbody>
                {data.map((p, i) => {
                    const rank = getRankFromPoints(p.points);
                    return (
                        <tr key={p.id} className="hover:bg-white/10 border-b border-white/5 last:border-0 transition-colors">
                            <td className="p-4 font-bold text-xl">{i + 1}</td>
                            <td className="p-4 font-semibold text-lg flex items-center gap-3">
                                <span className={`text-2xl ${rank.color}`}>{rank.icon}</span>
                                <span className="flex flex-col">
                                    <span>{p.name}</span>
                                    <span className={`text-xs ${rank.color} font-medium`}>{rank.name}</span>
                                </span>
                            </td>
                            <td className="p-4 font-bold text-red-400 text-lg">{p.points}</td>
                            <td className="p-4 text-lg">
                                <span className="flex items-center gap-1">
                                    <span className="text-yellow-400">🏆</span>
                                    <span className="font-bold">{p.tournamentWins || 0}</span>
                                </span>
                            </td>
                            <td className="p-4 text-lg">{p.played}</td>
                            <td className="p-4 text-lg">
                                <span className="text-green-400">{p.wins}</span>/<span className="text-yellow-400">{p.draws}</span>/<span className="text-red-400">{p.losses}</span>
                            </td>
                        </tr>
                    );
                })}
            </tbody> 
        </table> 
    </div> 
);

const Spieler = ({ players, onAddPlayer }) => { 
    const [name, setName] = useState(''); 
    const handleSubmit = e => { e.preventDefault(); onAddPlayer(name); setName(''); }; 
    return (
        <>
            <form onSubmit={handleSubmit} className="gradient-card p-6 rounded-lg flex gap-4 hover:gradient-card-hover transition-all duration-300">
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Spielername" required className="flex-1 px-4 py-2 bg-gray-700 border-gray-600 rounded-lg focus:border-red-500 focus:outline-none transition-colors"/>
                <button type="submit" className="btn-primary px-6 py-2 text-lg font-bold text-white rounded-lg flex items-center gap-2">
                    <Plus/>Hinzufügen
                </button>
            </form>
            <div className="gradient-card rounded-lg mt-6 hover:gradient-card-hover transition-all duration-300">
                {players.map(p => <div key={p.id} className="p-4 border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">{p.name}</div>)}
            </div>
        </>
    ); 
};
const NeuesSpiel = ({ players, onAddMatch }) => {
    const [data, setData] = useState({ player1Id: '', player2Id: '', player1Score: '', player2Score: '' });
    
    const handleSubmit = e => { 
        e.preventDefault(); 
        
        const score1 = Number(data.player1Score);
        const score2 = Number(data.player2Score);
        
        // Validate that one player has reached 10 points
        if (score1 < 10 && score2 < 10) {
            alert('Ein Spieler muss mindestens 10 Punkte erreichen, um das Spiel zu gewinnen.');
            return;
        }
        
        // Validate that the winner has exactly 10 points
        if (score1 > 10 && score2 > 10) {
            alert('Nur ein Spieler kann 10 Punkte erreichen. Das Spiel endet, wenn ein Spieler 10 Punkte erreicht.');
            return;
        }
        
        onAddMatch({ ...data, player1Score: score1, player2Score: score2 }); 
        setData({ player1Id: '', player2Id: '', player1Score: '', player2Score: '' }); 
    };
    
    const playerOptions = players.map(p => ({value: p.id, label: p.name}));
    return ( 
        <form onSubmit={handleSubmit} className="gradient-card p-8 rounded-lg space-y-6 max-w-2xl mx-auto hover:gradient-card-hover transition-all duration-300"> 
            <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
                <p className="text-blue-300 text-sm">📋 <strong>Spielregeln:</strong> Das Spiel endet, wenn ein Spieler 10 Punkte erreicht. Nur ein Spieler kann 10 Punkte haben.</p>
            </div>
            <div className="grid grid-cols-2 gap-6"> 
                <div><label className="block mb-2 text-gray-300">Spieler 1</label><Select styles={customSelectStyles} options={playerOptions} onChange={opt => setData({...data, player1Id: opt.value})} required/></div> 
                <div><label className="block mb-2 text-gray-300">Punkte Spieler 1</label><input type="number" min="0" max="10" placeholder="0-10" value={data.player1Score} onChange={e=>setData({...data, player1Score: e.target.value})} required className="w-full h-[48px] px-4 bg-gray-700 rounded-lg border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"/></div> 
            </div> 
            <div className="grid grid-cols-2 gap-6"> 
                <div><label className="block mb-2 text-gray-300">Spieler 2</label><Select styles={customSelectStyles} options={playerOptions} onChange={opt => setData({...data, player2Id: opt.value})} required/></div> 
                <div><label className="block mb-2 text-gray-300">Punkte Spieler 2</label><input type="number" min="0" max="10" placeholder="0-10" value={data.player2Score} onChange={e=>setData({...data, player2Score: e.target.value})} required className="w-full h-[48px] px-4 bg-gray-700 rounded-lg border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"/></div> 
            </div> 
            <button type="submit" className="w-full py-3 btn-primary text-lg font-bold text-white rounded-lg flex items-center justify-center gap-2"><Swords/>Spiel speichern</button> 
        </form> 
    );
};
