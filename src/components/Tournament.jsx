import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, set, update, push, remove } from 'firebase/database';
import CreateTournament from './CreateTournament';
import TournamentBracket from './TournamentBracket';
import TournamentGames from './TournamentGames';
import TournamentStats from './TournamentStats';
import ManageParticipants from './ManageParticipants';

const Tournament = ({ allPlayers, tournaments, setTournaments }) => {
    const [selectedTournament, setSelectedTournament] = useState(null);
    const [view, setView] = useState('list'); // list, create, bracket, games, stats, manage_participants

    const db = getDatabase();

    const handleCreateTournament = (name) => {
        const newTournamentRef = push(ref(db, 'tournaments'));
        const newTournament = {
            id: newTournamentRef.key,
            name,
            status: 'setup', // setup, ongoing, finished
            participants: [],
            games: [],
            createdAt: Date.now(),
        };
        set(newTournamentRef, newTournament);
        setSelectedTournament(newTournament);
        setView('manage_participants');
    };

    const handleDeleteTournament = (tournamentId) => {
        const tournamentRef = ref(db, `tournaments/${tournamentId}`);
        remove(tournamentRef);
        if (selectedTournament?.id === tournamentId) {
            setSelectedTournament(null);
            setView('list');
        }
    };

    const handleStartTournament = (tournament) => {
        if(tournament.participants.length < 2) {
            alert("Es müssen mindestens 2 Teilnehmer vorhanden sein, um das Turnier zu starten.");
            return;
        }

        const games = [];
        const { participants } = tournament;
        for (let i = 0; i < participants.length; i++) {
            for (let j = i + 1; j < participants.length; j++) {
                const gameRef = push(ref(db, `tournaments/${tournament.id}/games`));
                games.push({
                    id: gameRef.key,
                    player1: participants[i],
                    player2: participants[j],
                    score1: null,
                    score2: null,
                });
            }
        }

        const tournamentRef = ref(db, `tournaments/${tournament.id}`);
        update(tournamentRef, { status: 'ongoing', games });

        // Refresh selected tournament data
        setSelectedTournament({...tournament, status: 'ongoing', games});
    };


    const renderContent = () => {
        switch (view) {
            case 'create':
                return <CreateTournament onCreate={handleCreateTournament} />;
            case 'manage_participants':
                return <ManageParticipants tournament={selectedTournament} allPlayers={allPlayers} />;
            case 'bracket':
                return <TournamentBracket tournament={selectedTournament} />;
            case 'games':
                return <TournamentGames tournament={selectedTournament} />;
            case 'stats':
                return <TournamentStats tournament={selectedTournament} />;
            default:
                return (
                    <div className="bg-black/40 rounded-lg border border-white/10 backdrop-blur-sm overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-orange-400">Turniere</h2>
                            <button
                                onClick={() => setView('create')}
                                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                            >
                                Turnier erstellen
                            </button>
                        </div>
                        <ul className="divide-y divide-white/10">
                            {tournaments.map((tournament) => (
                                <li key={tournament.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-white/5">
                                    <div className="mb-2 sm:mb-0">
                                        <p className="font-bold text-lg">{tournament.name}</p>
                                        <p className="text-sm text-gray-400">
                                            {tournament.participants?.length || 0} Teilnehmer - Status: <span className={`font-semibold ${tournament.status === 'ongoing' ? 'text-green-400' : 'text-yellow-400'}`}>{tournament.status}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {tournament.status === 'setup' && (
                                           <>
                                             <button onClick={() => { setSelectedTournament(tournament); setView('manage_participants'); }} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Teilnehmer</button>
                                             <button onClick={() => handleStartTournament(tournament)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Starten</button>
                                           </>
                                        )}
                                        {tournament.status !== 'setup' && (
                                            <>
                                                <button onClick={() => { setSelectedTournament(tournament); setView('bracket'); }} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">Turnierbaum</button>
                                                <button onClick={() => { setSelectedTournament(tournament); setView('games'); }} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">Spiele</button>
                                                <button onClick={() => { setSelectedTournament(tournament); setView('stats'); }} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">Statistiken</button>
                                            </>
                                        )}
                                        <button onClick={() => handleDeleteTournament(tournament.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Löschen</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
        }
    };

    return (
        <div>
            {selectedTournament && view !== 'list' && (
                 <button
                 onClick={() => {setSelectedTournament(null); setView('list')}}
                 className="mb-6 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
             >
                 ← Zurück zur Turnierübersicht
             </button>
            )}
            {renderContent()}
        </div>
    );
};

export default Tournament;
