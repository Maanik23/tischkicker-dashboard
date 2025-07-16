import React, { useState, useMemo, useEffect } from 'react';
import { Users, Trophy, PlusCircle, LayoutDashboard, List, BarChart, Sword, Swords, Crown, Flame, Settings, UserPlus, ArrowRight, Lock } from 'lucide-react';
import { db } from './firebaseConfig';
import { ref, onValue, push, set } from "firebase/database";
import Select from 'react-select';
import makeAnimated from 'select/animated';

// --- KONFIGURATION & HELFER ---
const animatedComponents = makeAnimated();
const customSelectStyles = {
    control: (p) => ({...p, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', minHeight: '48px'}),
    menu: (p) => ({...p, background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.2)'}),
    option: (p, {isSelected, isFocused}) => ({...p, background: isSelected ? 'rgba(234,88,12,0.5)' : isFocused ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff'}),
    singleValue: (p) => ({...p, color: '#fff'}),
    multiValue: (p) => ({...p, background: 'rgba(234,88,12,0.2)'}),
    multiValueLabel: (p) => ({...p, color: '#ea580c'}),
    input: (p) => ({...p, color: '#fff'}),
};

// --- HAUPTKOMPONENTE ---
function App() {
    // --- STATE ---
    const [mode, setMode] = useState('global');
    const [view, setView] = useState('dashboard');
    const [players, setPlayers] = useState([]);
    const [globalMatches, setGlobalMatches] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [selectedTournament, setSelectedTournament] = useState(null);

    // --- DATENABRUF ---
    useEffect(() => {
        onValue(ref(db, 'players'), snap => setPlayers(Object.values(snap.val() || {})));
        onValue(ref(db, 'globalMatches'), snap => setGlobalMatches(Object.values(snap.val() || {})));
        onValue(ref(db, 'tournaments'), snap => {
            const tourneyData = Object.values(snap.val() || {});
            setTournaments(tourneyData.sort((a,b) => b.createdAt - a.createdAt));
            if(selectedTournament) {
                const updatedSelected = tourneyData.find(t => t.id === selectedTournament.id);
                if(updatedSelected) setSelectedTournament(updatedSelected);
            }
        });
    }, [selectedTournament]);

    // --- MEMOIZED DATA LOGIC ---
    const globalLeaderboard = useMemo(() => {
        const stats = new Map(players.map(p => [p.id, { ...p, points: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, played: 0 }]));
        globalMatches.forEach(m => {
            const p1 = stats.get(m.p1Id); const p2 = stats.get(m.p2Id); if (!p1 || !p2) return;
            p1.played++; p2.played++; p1.gf += m.p1Score; p1.ga += m.p2Score; p2.gf += m.p2Score; p2.ga += m.p1Score;
            if (m.p1Score > m.p2Score) { p1.points += 3; p1.wins++; p2.losses++; }
            else if (m.p2Score > m.p1Score) { p2.points += 3; p2.wins++; p1.losses++; }
            else { p1.points++; p2.points++; p1.draws++; p2.draws++; }
        });
        return [...stats.values()].sort((a,b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
    }, [players, globalMatches]);

    const tournamentData = useMemo(() => {
        if (!selectedTournament) return null;
        const tournamentPlayers = players.filter(p => selectedTournament.playerIds?.includes(p.id));
        const tournamentMatches = Object.values(selectedTournament.matches || {});
        const stats = new Map(tournamentPlayers.map(p => [p.id, { ...p, points: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, played: 0 }]));
        tournamentMatches.forEach(m => {
            const p1 = stats.get(m.p1Id); const p2 = stats.get(m.p2Id); if (!p1 || !p2) return;
            p1.played++; p2.played++; p1.gf += m.p1Score; p1.ga += m.p2Score; p2.gf += m.p2Score; p2.ga += m.p1Score;
            if (m.p1Score > m.p2Score) { p1.points += 3; p1.wins++; p2.losses++; }
            else if (m.p2Score > m.p1Score) { p2.points += 3; p2.wins++; p1.losses++; }
            else { p1.points++; p2.points++; p1.draws++; p2.draws++; }
        });
        return {
            leaderboard: [...stats.values()].sort((a,b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga)),
            matches: tournamentMatches,
            players: tournamentPlayers
        };
    }, [selectedTournament, players]);

    // --- HANDLER ---
    const addPlayer = (name) => { const id = push(ref(db, 'players')).key; set(ref(db, `players/${id}`), { id, name }); };
    const addGlobalMatch = (p1Id, p2Id, p1Score, p2Score) => { const id = push(ref(db, 'globalMatches')).key; set(ref(db, `globalMatches/${id}`), { id, p1Id, p2Id, p1Score: Number(p1Score), p2Score: Number(p2Score), createdAt: Date.now() }); };
    const createTournament = (name, playerIds) => { const id = push(ref(db, 'tournaments')).key; set(ref(db, `tournaments/${id}`), { id, name, playerIds, status: 'ongoing', createdAt: Date.now() }); setView('tournament-list'); };
    const addTournamentMatch = (p1Id, p2Id, p1Score, p2Score) => { const id = push(ref(db, `tournaments/${selectedTournament.id}/matches`)).key; set(ref(db, `tournaments/${selectedTournament.id}/matches/${id}`), { id, p1Id, p2Id, p1Score: Number(p1Score), p2Score: Number(p2Score) }); };
    const endTournament = () => { const winner = tournamentData?.leaderboard[0]; if (winner) { set(ref(db, `tournaments/${selectedTournament.id}/winner`), {id: winner.id, name: winner.name}); set(ref(db, `tournaments/${selectedTournament.id}/status`), 'finished'); } };
    const selectTournament = (t) => { setSelectedTournament(t); setMode('tournament'); setView('tournament-dashboard'); };
    const switchToGlobal = () => { setMode('global'); setView('dashboard'); setSelectedTournament(null); };
    const switchToTournamentCenter = () => { setMode('tournament'); setView('tournament-list'); setSelectedTournament(null); };
    
    // --- UI-RENDERER ---
    const Header = ({ title, subtitle }) => ( <header className="border-b border-white/10 pb-4 mb-8"> <h1 className="text-5xl font-bold text-white">{title}</h1> {subtitle && <p className="text-xl text-gray-400 mt-2">{subtitle}</p>} </header> );
    const StatCard = ({ title, value, icon: Icon }) => ( <div className="bg-black/40 p-6 rounded-lg border border-white/10 shadow-lg h-full backdrop-blur-sm"> <div className="flex items-center justify-between"> <div> <h3 className="text-lg font-semibold text-gray-400">{title}</h3> <p className="text-4xl font-bold text-white mt-2">{value}</p> </div> <div className="bg-gradient-to-br from-orange-600 to-red-600 p-4 rounded-full shadow-lg"> <Icon size={32} className="text-white" /> </div> </div> </div> );
    const SidebarButton = ({ active, onClick, icon: Icon, label }) => ( <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-lg font-semibold ${ active ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/10 hover:text-white' }`}> <Icon size={24} /> <span>{label}</span> </button> );
    const SubSidebarButton = ({ active, onClick, icon: Icon, label, disabled }) => ( <button onClick={onClick} disabled={disabled} className={`w-full flex items-center space-x-3 px-4 py-2 mt-1 rounded-lg transition-colors text-md ${ active ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white' } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}> <Icon size={20} /> <span>{label}</span> </button> );
    
    const Sidebar = () => (
        <aside className="w-72 bg-black/30 text-white p-6 h-screen fixed backdrop-blur-sm border-r border-white/10">
            <div className="mb-12"> <h1 className="text-3xl font-bold text-orange-500 flex items-center gap-2"><Flame/> WAMOCON Kicker-Arena</h1> </div>
            <nav className="space-y-6">
                <div> <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Modus</h3> <SidebarButton label="Gesamtübersicht" icon={LayoutDashboard} active={mode === 'global'} onClick={switchToGlobal} /> <SidebarButton label="Turnier-Center" icon={Trophy} active={mode === 'tournament'} onClick={switchToTournamentCenter} /> </div>
                {mode === 'global' && <div> <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Global</h3> <SubSidebarButton label="Dashboard" icon={LayoutDashboard} active={view === 'dashboard'} onClick={() => setView('dashboard')} /> <SubSidebarButton label="Rangliste" icon={List} active={view === 'leaderboard'} onClick={() => setView('leaderboard')} /> <SubSidebarButton label="Aktionen" icon={PlusCircle} active={view === 'actions'} onClick={() => setView('actions')} /> </div>}
                {mode === 'tournament' && <div> <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Turnier</h3> <SubSidebarButton label="Alle Turniere" icon={List} active={view === 'tournament-list'} onClick={switchToTournamentCenter} /> {selectedTournament && <div className="mt-4 pt-4 border-t border-white/20"> <h4 className="text-orange-400 font-bold truncate mb-2">{selectedTournament.name}</h4> <SubSidebarButton label="Übersicht" icon={LayoutDashboard} active={view === 'tournament-dashboard'} onClick={() => setView('tournament-dashboard')} /> <SubSidebarButton label="Rangliste" icon={List} active={view === 'tournament-leaderboard'} onClick={() => setView('tournament-leaderboard')} /> <SubSidebarButton label="Spiel hinzufügen" icon={PlusCircle} active={view === 'tournament-add-match'} onClick={() => setView('tournament-add-match')} disabled={selectedTournament.status === 'finished'} /></div>} </div>}
            </nav>
        </aside>
    );

    const LeaderboardTable = ({leaderboard}) => (
        <div className="mt-8 bg-black/40 p-4 rounded-lg border border-white/10 backdrop-blur-sm">
            <table className="min-w-full">
                <thead><tr className="border-b border-white/20"><th className="p-4 text-left text-sm font-semibold text-orange-400 uppercase">Rang</th><th className="p-4 text-left text-sm font-semibold text-orange-400 uppercase">Spieler</th><th className="p-4 text-left text-sm font-semibold text-orange-400 uppercase">Punkte</th><th className="p-4 text-left text-sm font-semibold text-orange-400 uppercase">Sp</th><th className="p-4 text-left text-sm font-semibold text-orange-400 uppercase">S/U/N</th><th className="p-4 text-left text-sm font-semibold text-orange-400 uppercase">Tore</th></tr></thead>
                <tbody>{leaderboard.map((p, i) => (<tr key={p.id} className="hover:bg-white/10"><td className="p-4 font-bold text-xl">{i+1}</td><td className="p-4 font-semibold text-lg">{p.name}</td><td className="p-4 font-bold text-orange-400 text-lg">{p.points}</td><td className="p-4 text-lg">{p.played}</td><td className="p-4 text-lg"><span className="text-green-400">{p.wins}</span>/<span className="text-yellow-400">{p.draws}</span>/<span className="text-red-400">{p.losses}</span></td><td className="p-4 text-lg">{p.gf}:{p.ga}</td></tr>))}</tbody>
            </table>
        </div>
    );
    
    const MatchForm = ({ onMatchSubmit, players, title }) => {
        const [match, setMatch] = useState({ p1Id:'', p2Id:'', p1Score:'', p2Score:'' });
        const playerOptions = players.map(p => ({value: p.id, label: p.name}));
        const handleSubmit = e => { e.preventDefault(); onMatchSubmit(match.p1Id, match.p2Id, match.p1Score, match.p2Score); setMatch({ p1Id:'', p2Id:'', p1Score:'', p2Score:'' }); };

        return (
            <form onSubmit={handleSubmit} className="bg-black/40 p-8 rounded-lg border border-white/10 space-y-4">
                <h2 className="text-2xl font-bold text-orange-500">{title}</h2>
                <div className="flex gap-4"> <Select options={playerOptions} styles={customSelectStyles} placeholder="Spieler 1" className="w-2/3" onChange={opt => setMatch(m => ({...m, p1Id: opt.value}))} value={playerOptions.find(p => p.value === match.p1Id)}/> <input type="number" placeholder="Pkt." required className="w-1/3 px-4 py-3 bg-black/20 border border-white/20 rounded-lg" value={match.p1Score} onChange={e => setMatch(m => ({...m, p1Score: e.target.value}))}/> </div>
                <div className="flex gap-4"> <Select options={playerOptions} styles={customSelectStyles} placeholder="Spieler 2" className="w-2/3" onChange={opt => setMatch(m => ({...m, p2Id: opt.value}))} value={playerOptions.find(p => p.value === match.p2Id)}/> <input type="number" placeholder="Pkt." required className="w-1/3 px-4 py-3 bg-black/20 border border-white/20 rounded-lg" value={match.p2Score} onChange={e => setMatch(m => ({...m, p2Score: e.target.value}))}/> </div>
                <button type="submit" className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold transition hover:opacity-90 flex items-center justify-center gap-2"><Swords/><span>Match speichern</span></button>
            </form>
        );
    };

    // --- SEITEN-KOMPONENTEN ---
    const GlobalDashboard = () => <><Header title="Globales Dashboard" subtitle="Die wichtigsten Statistiken der gesamten Arena."/><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"><StatCard title="Top Spieler" value={globalLeaderboard[0]?.name || 'N/A'} icon={Crown}/><StatCard title="Meiste Punkte" value={globalLeaderboard[0]?.points || 0} icon={Flame}/><StatCard title="Anzahl Spieler" value={players.length} icon={Users}/></div></>;
    const GlobalLeaderboard = () => <><Header title="Globale Rangliste" subtitle="Basierend auf allen täglichen Spielen."/><LeaderboardTable leaderboard={globalLeaderboard}/></>;
    const Actions = () => {
        const [pName, setPName] = useState('');
        const handlePlayerSubmit = (e) => { e.preventDefault(); addPlayer(pName); setPName(''); };
        return <><Header title="Aktionen" subtitle="Globale Spieler und tägliche Spiele verwalten."/><div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-8"><form onSubmit={handlePlayerSubmit} className="bg-black/40 p-8 rounded-lg border border-white/10"><h2 className="text-2xl font-bold mb-6 text-orange-500">Spieler registrieren</h2><div className="flex gap-4"><input type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder="Spielername" required className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-lg"/><button type="submit" className="px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold transition hover:opacity-90"><UserPlus/></button></div></form><MatchForm onMatchSubmit={addGlobalMatch} players={players} title="Spiel protokollieren"/></div></>;
    };
    const TournamentList = () => <><Header title="Turnier-Center" subtitle="Alle Wettkämpfe auf einen Blick." /><div className="mt-8"><button onClick={() => setView('tournament-create')} className="px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold transition hover:opacity-90 flex items-center justify-center space-x-2"> <PlusCircle /> <span>Neues Turnier erstellen</span> </button><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">{tournaments.map(t => (<div key={t.id} onClick={() => selectTournament(t)} className="bg-black/40 p-6 rounded-lg border border-white/10 backdrop-blur-sm cursor-pointer hover:border-orange-500 transition-all"><h3 className="font-bold text-2xl text-orange-400 truncate">{t.name}</h3><p className={`mt-2 font-semibold ${t.status === 'finished' ? 'text-green-400' : 'text-yellow-400'}`}>{t.status === 'finished' ? `Beendet` : "Laufend"}</p>{t.winner && <p className="text-gray-300">Sieger: {t.winner.name}</p>}<p className="text-gray-400 text-sm mt-2">{new Date(t.createdAt).toLocaleDateString()}</p></div>))}</div></div></>;
    const CreateTournament = () => {
        const [name, setName] = useState(''); const [pIds, setPIds] = useState([]);
        const handleSubmit = (e) => { e.preventDefault(); createTournament(name, pIds.map(p=>p.value)); };
        return <><Header title="Neues Turnier erstellen" /><form onSubmit={handleSubmit} className="bg-black/40 p-8 rounded-lg border border-white/10 mt-8 space-y-6 max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-orange-500">Turnierdetails</h2><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Turniername" required className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-lg"/> <Select options={players.map(p=>({value: p.id, label:p.name}))} isMulti styles={customSelectStyles} onChange={setPIds} placeholder="Spieler auswählen..." closeMenuOnSelect={false} components={animatedComponents}/> <button type="submit" className="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold">Turnier erstellen</button></form></>;
    };
    const TournamentDashboard = () => <><Header title={selectedTournament.name} subtitle={selectedTournament.status === 'finished' ? `Sieger: ${selectedTournament.winner?.name || 'N/A'}`:`Laufend`}/><div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"><StatCard title="Teilnehmer" value={tournamentData?.players.length || 0} icon={Users}/><StatCard title="Gespielte Matches" value={tournamentData?.matches.length || 0} icon={Swords}/><StatCard title="Führender Spieler" value={tournamentData?.leaderboard[0]?.name || 'N/A'} icon={Crown}/></div>{selectedTournament.status === 'ongoing' && <div className="mt-8"><button onClick={endTournament} className="px-6 py-3 rounded-lg bg-red-600 text-white font-semibold flex items-center gap-2"><Lock/>Turnier beenden</button></div>}</>;
    const TournamentLeaderboard = () => <><Header title={`Rangliste: ${selectedTournament.name}`}/><LeaderboardTable leaderboard={tournamentData?.leaderboard || []}/></>;
    const AddTournamentMatch = () => <><Header title="Turnier-Spiel hinzufügen"/><div className="max-w-2xl mx-auto mt-8"><MatchForm onMatchSubmit={addTournamentMatch} players={tournamentData?.players || []} title="Neues Turnierspiel"/></div></>;

    const renderContent = () => {
        if (mode === 'global') switch(view) {
            case 'dashboard': return <GlobalDashboard />;
            case 'leaderboard': return <GlobalLeaderboard />;
            case 'actions': return <Actions />;
            default: return <GlobalDashboard />;
        }
        if (mode === 'tournament') switch(view) {
            case 'tournament-list': return <TournamentList />;
            case 'tournament-create': return <CreateTournament />;
            case 'tournament-dashboard': return <TournamentDashboard />;
            case 'tournament-leaderboard': return <TournamentLeaderboard />;
            case 'tournament-add-match': return <AddTournamentMatch />;
            default: return <TournamentList />;
        }
    };

    return (
        <div className="flex text-white min-h-screen">
            <Sidebar />
            <main className="flex-1 p-8 md:p-12 ml-72">
                {renderContent()}
            </main>
        </div>
    );
}

export default App;
