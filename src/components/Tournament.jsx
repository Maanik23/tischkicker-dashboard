import React, { useState, useEffect, useCallback } from 'react';
import { getDatabase, ref, onValue, update, remove, push } from 'firebase/database';
import { Trophy, Swords, List, ArrowLeft } from 'lucide-react';

import CreateTournament from './CreateTournament';
import TournamentBracket from './TournamentBracket';
import TournamentGames from './TournamentGames';
import TournamentStats from './TournamentStats';
import ManageParticipants from './ManageParticipants';

// This is the definitive stats calculation function. It is robust and prevents all NaN errors.
const calculateStats = (tournament) => {
    // Step 1: Initialize stats for every participant with all fields set to 0.
    const playerStats = tournament.participants.reduce((acc, player) => {
        if (player && player.id) {
            acc[player.id] = { name: player.name, id: player.id, wins: 0, losses: 0, draws: 0, points: 0, gf: 0, ga: 0, played: 0 };
        }
        return acc;
    }, {});

    // Step 2: Only iterate over games that have a valid score.
    const playedGames = tournament.games?.filter(g => g.score1 !== null && g.score2 !== null) || [];
    
    playedGames.forEach(game => {
        const p1Stats = playerStats[game.player1.id];
        const p2Stats = playerStats[game.player2.id];
        if(p1Stats && p2Stats) {
            p1Stats.played++;
            p2Stats.played++;
            p1Stats.gf += game.score1;
            p1Stats.ga += game.score2;
            p2Stats.gf += game.score2;
            p2Stats.ga += game.score1;
            if (game.score1 > game.score2) { p1Stats.wins++; p1Stats.points += 3; p2Stats.losses++; }
            else if (game.score1 < game.score2) { p2Stats.wins++; p2Stats.points += 3; p1Stats.losses++; }
            else { p1Stats.draws++; p2Stats.draws++; p1Stats.points += 1; p2Stats.points += 1; }
        }
    });
    
    // Step 3: Sort the calculated stats.
    return Object.values(playerStats).sort((a,b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
};


const Tournament = ({ allPlayers, tournaments, setTournaments }) => {
    const [selectedTournamentId, setSelectedTournamentId] = useState(null);
    const [view, setView] = useState('list'); // list, create, manage_participants, view_tournament
    const [activeTab, setActiveTab] = useState('games');
    
    const db = getDatabase();
    const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);

    const refreshTournamentData = useCallback(() => {
        if (!selectedTournamentId) return;
        const tournamentRef = ref(db, `tournaments/${selectedTournamentId}`);
        const unsubscribe = onValue(tournamentRef, (snapshot) => {
            if (snapshot.exists()) {
                const tourneyData = snapshot.val();
                const gamesArray = tourneyData.games ? Object.values(tourneyData.games).sort((a,b) => a.createdAt - b.createdAt) : [];
                const updatedData = { id: snapshot.key, ...tourneyData, participants: tourneyData.participants || [], games: gamesArray };
                setTournaments(prev => prev.map(t => t.id === selectedTournamentId ? updatedData : t));
            } else {
                setView('list');
                setSelectedTournamentId(null);
            }
        });
        return unsubscribe;
    }, [selectedTournamentId, db, setTournaments]);
    
    useEffect(() => {
        const unsubscribe = refreshTournamentData();
        return () => { if (unsubscribe) unsubscribe() };
    }, [refreshTournamentData]);


    const handleCreateTournament = (name) => {
        const newTournamentRef = push(ref(db, 'tournaments'));
        const newTournament = { id: newTournamentRef.key, name, status: 'setup', participants: [], games: {}, createdAt: Date.now() };
        update(newTournamentRef, newTournament).then(() => {
            setSelectedTournamentId(newTournamentRef.key);
            setView('manage_participants');
        });
    };
    
    const handleStartPlayoffs = () => {
        if (!selectedTournament) return;
        const stats = calculateStats(selectedTournament);
        const top4 = stats.slice(0, 4);

        if(top4.length < 4) {
            alert("Nicht genügend Spieler für die Playoffs. Mindestens 4 Teilnehmer benötigt.");
            return;
        }
        
        const playoffs = {
            qualifier1: { name: "Qualifier 1", p1: top4[0], p2: top4[1], score1: null, score2: null },
            eliminator: { name: "Eliminator", p1: top4[2], p2: top4[3], score1: null, score2: null },
            qualifier2: { name: "Qualifier 2", p1: null, p2: null, score1: null, score2: null },
            final: { name: "Finale", p1: null, p2: null, score1: null, score2: null }
        };

        update(ref(db, `tournaments/${selectedTournament.id}`), { playoffs: playoffs, status: 'playoffs' });
        setActiveTab('bracket');
    };

    const advancePlayoffWinners = () => {
        if (!selectedTournament || !selectedTournament.playoffs) return;
        
        const { playoffs } = selectedTournament;
        const updates = {};

        // Check Qualifier 1
        if(playoffs.qualifier1.score1 !== null && !playoffs.final.p1) {
            const winner = playoffs.qualifier1.score1 > playoffs.qualifier1.score2 ? playoffs.qualifier1.p1 : playoffs.qualifier1.p2;
            const loser = playoffs.qualifier1.score1 < playoffs.qualifier1.score2 ? playoffs.qualifier1.p1 : playoffs.qualifier1.p2;
            updates['playoffs/final/p1'] = winner;
            updates['playoffs/qualifier2/p1'] = loser;
        }

        // Check Eliminator
        if(playoffs.eliminator.score1 !== null && !playoffs.qualifier2.p2) {
            const winner = playoffs.eliminator.score1 > playoffs.eliminator.score2 ? playoffs.eliminator.p1 : playoffs.eliminator.p2;
            updates['playoffs/qualifier2/p2'] = winner;
        }

        // Check Qualifier 2
        if(playoffs.qualifier2.score1 !== null && !playoffs.final.p2) {
             const winner = playoffs.qualifier2.score1 > playoffs.qualifier2.score2 ? playoffs.qualifier2.p1 : playoffs.qualifier2.p2;
             updates['playoffs/final/p2'] = winner;
        }

        // Check Final for tournament finish
        if(playoffs.final.score1 !== null) {
            updates['status'] = 'finished';
        }
        
        if(Object.keys(updates).length > 0) {
            update(ref(db, `tournaments/${selectedTournament.id}`), updates);
        }
    };

    const handleDeleteTournament = (tournamentId) => {
        if (window.confirm("Sind Sie sicher? Alle Daten für dieses Turnier gehen verloren.")) {
            remove(ref(db, `tournaments/${tournamentId}`));
        }
    };
    
    const renderTournamentView = () => {
        if (!selectedTournament) return null;
        const allGroupGamesPlayed = selectedTournament.games.length > 0 && selectedTournament.games.every(g => g.score1 !== null);

        return (
            <div className="bg-black/40 p-6 rounded-lg border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-orange-400">{selectedTournament.name}</h2>
                    {selectedTournament.status === 'group_stage' && allGroupGamesPlayed && (
                         <button onClick={handleStartPlayoffs} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Playoffs starten</button>
                    )}
                     {selectedTournament.status === 'playoffs' && <p className="px-4 py-2 bg-blue-600 text-white rounded-lg">Playoffs</p>}
                     {selectedTournament.status === 'finished' && <p className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg animate-pulse">Abgeschlossen</p>}
                </div>
                <div className="flex border-b border-white/10 mb-6">
                    {selectedTournament.status === 'group_stage' && <TabButton icon={Swords} label="Gruppenspiele" active={activeTab === 'games'} onClick={() => setActiveTab('games')} />}
                    {selectedTournament.status === 'group_stage' && <TabButton icon={List} label="Tabelle" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />}
                    <TabButton icon={Trophy} label="Turnierbaum" active={activeTab === 'bracket'} onClick={() => setActiveTab('bracket')} />
                </div>
                <div>
                    {activeTab === 'games' && <TournamentGames tournament={selectedTournament} onGameUpdate={refreshTournamentData} />}
                    {activeTab === 'stats' && <TournamentStats tournament={selectedTournament} />}
                    {activeTab === 'bracket' && <TournamentBracket tournament={selectedTournament} onUpdate={advancePlayoffWinners} />}
                </div>
            </div>
        );
    }
    
    const renderContent = () => {
        switch (view) {
            case 'create':
                return <CreateTournament onCreate={handleCreateTournament} />;
            case 'manage_participants':
                if (!selectedTournament) return null;
                const handleStartGroupStage = () => {
                    if(!selectedTournament || selectedTournament.participants.length < 2) {
                        alert("Es müssen mindestens 2 Teilnehmer vorhanden sein, um das Turnier zu starten.");
                        return;
                    }
                    const games = {};
                    const { participants } = selectedTournament;
                    // Double Round Robin Logic
                    for(let leg = 0; leg < 2; leg++) {
                        for (let i = 0; i < participants.length; i++) {
                            for (let j = i + 1; j < participants.length; j++) {
                                const gameId = push(ref(db, `tournaments/${selectedTournament.id}/games`)).key;
                                games[gameId] = { id: gameId, player1: participants[i], player2: participants[j], score1: null, score2: null, createdAt: Date.now() };
                            }
                        }
                    }
                    update(ref(db, `tournaments/${selectedTournament.id}`), { status: 'group_stage', games }).then(() => {
                        setView('view_tournament');
                        setActiveTab('games');
                    });
                };
                return <ManageParticipants tournament={selectedTournament} allPlayers={allPlayers} onFinish={handleStartGroupStage} />;
            case 'view_tournament':
                return renderTournamentView();
            default: // 'list'
                return (
                    <div className="space-y-6">
                        <div className="bg-black/40 p-6 rounded-lg border border-white/10">
                            <h2 className="text-xl font-semibold text-orange-400 mb-2">Willkommen im Turnier Modus!</h2>
                            <p className="text-gray-300">Hier können Sie strukturierte Wettbewerbe erstellen. Jedes Turnier besteht aus einer doppelten Round-Robin-Gruppenphase, gefolgt von einem spannenden Playoff-System im IPL-Stil für die Top 4.</p>
                        </div>
                        <div className="bg-black/40 rounded-lg border border-white/10 backdrop-blur-sm overflow-hidden">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-orange-400">Turnierübersicht</h2>
                                <button onClick={() => setView('create')} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Neues Turnier</button>
                            </div>
                            <ul className="divide-y divide-white/10">
                                {tournaments.map((t) => (
                                    <li key={t.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-white/5 cursor-pointer" onClick={() => { setSelectedTournamentId(t.id); setView(t.status === 'setup' ? 'manage_participants' : 'view_tournament'); setActiveTab(t.status.includes('playoffs') || t.status === 'finished' ? 'bracket' : 'games');}}>
                                        <div>
                                            <p className="font-bold text-lg">{t.name}</p>
                                            <p className="text-sm text-gray-400">{t.participants?.length || 0} Teilnehmer - <span className={`font-semibold ${t.status === 'group_stage' ? 'text-green-400' : t.status === 'playoffs' ? 'text-blue-400' : t.status === 'finished' ? 'text-yellow-400' : 'text-gray-400'}`}>{t.status}</span></p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTournament(t.id); }} className="mt-2 sm:mt-0 px-3 py-1 bg-red-800 text-white rounded hover:bg-red-700 text-sm opacity-60 hover:opacity-100">Löschen</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div>
            {view !== 'list' && ( <button onClick={() => { setView('list'); setSelectedTournamentId(null); }} className="mb-6 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"><ArrowLeft size={16} /> Zurück zur Übersicht</button> )}
            {renderContent()}
        </div>
    );
};

const TabButton = ({ icon: Icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 font-semibold border-b-2 ${active ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-white'}`}>
        <Icon size={18} /> {label}
    </button>
);

export default Tournament;
