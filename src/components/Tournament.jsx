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

    // Step 2: Only iterate over games that have a valid score (not null, not undefined, and are numbers).
    const playedGames = tournament.games?.filter(g => {
        // Ensure the game object exists and has the required properties
        if (!g || !g.player1 || !g.player2) return false;
        
        // Check if scores are valid numbers (not null, undefined, or NaN)
        const score1 = Number(g.score1);
        const score2 = Number(g.score2);
        
        return !isNaN(score1) && !isNaN(score2) && 
               g.score1 !== null && g.score2 !== null && 
               g.score1 !== undefined && g.score2 !== undefined;
    }) || [];
    
    playedGames.forEach(game => {
        const p1Stats = playerStats[game.player1.id];
        const p2Stats = playerStats[game.player2.id];
        if(p1Stats && p2Stats) {
            p1Stats.played++;
            p2Stats.played++;
            p1Stats.gf += Number(game.score1);
            p1Stats.ga += Number(game.score2);
            p2Stats.gf += Number(game.score2);
            p2Stats.ga += Number(game.score1);
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
        }).catch((error) => {
            console.error('Error creating tournament:', error);
            alert('Fehler beim Erstellen des Turniers. Bitte versuchen Sie es erneut.');
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

        update(ref(db, `tournaments/${selectedTournament.id}`), { playoffs: playoffs, status: 'playoffs' })
            .then(() => {
                setActiveTab('bracket');
            })
            .catch((error) => {
                console.error('Error starting playoffs:', error);
                alert('Fehler beim Starten der Playoffs. Bitte versuchen Sie es erneut.');
            });
    };

    const advancePlayoffWinners = () => {
        if (!selectedTournament || !selectedTournament.playoffs) return;
        
        const { playoffs } = selectedTournament;
        const updates = {};

        // Ensure playoff structure exists
        if (!playoffs.qualifier1 || !playoffs.eliminator || !playoffs.qualifier2 || !playoffs.final) {
            console.error('Playoff structure is incomplete');
            return;
        }

        // Check Qualifier 1 - only advance if both players exist and scores are valid
        if (playoffs.qualifier1.score1 !== null && playoffs.qualifier1.score2 !== null && 
            playoffs.qualifier1.p1 && playoffs.qualifier1.p2 && !playoffs.final.p1) {
            const winner = playoffs.qualifier1.score1 > playoffs.qualifier1.score2 ? playoffs.qualifier1.p1 : playoffs.qualifier1.p2;
            const loser = playoffs.qualifier1.score1 > playoffs.qualifier1.score2 ? playoffs.qualifier1.p2 : playoffs.qualifier1.p1;
            
            // Only update if both winner and loser are valid
            if (winner && loser) {
                updates['playoffs/final/p1'] = winner;
                updates['playoffs/qualifier2/p1'] = loser;
            }
        }

        // Check Eliminator - only advance if both players exist and scores are valid
        if (playoffs.eliminator.score1 !== null && playoffs.eliminator.score2 !== null && 
            playoffs.eliminator.p1 && playoffs.eliminator.p2 && !playoffs.qualifier2.p2) {
            const winner = playoffs.eliminator.score1 > playoffs.eliminator.score2 ? playoffs.eliminator.p1 : playoffs.eliminator.p2;
            
            // Only update if winner is valid
            if (winner) {
                updates['playoffs/qualifier2/p2'] = winner;
            }
        }

        // Check Qualifier 2 - only advance if both players exist and scores are valid
        if (playoffs.qualifier2.score1 !== null && playoffs.qualifier2.score2 !== null && 
            playoffs.qualifier2.p1 && playoffs.qualifier2.p2 && !playoffs.final.p2) {
            const winner = playoffs.qualifier2.score1 > playoffs.qualifier2.score2 ? playoffs.qualifier2.p1 : playoffs.qualifier2.p2;
            
            // Only update if winner is valid
            if (winner) {
                updates['playoffs/final/p2'] = winner;
            }
        }

        // Check Final for tournament finish - only if both players exist and scores are valid
        if (playoffs.final.score1 !== null && playoffs.final.score2 !== null && 
            playoffs.final.p1 && playoffs.final.p2) {
            updates['status'] = 'finished';
        }
        
        if(Object.keys(updates).length > 0) {
            update(ref(db, `tournaments/${selectedTournament.id}`), updates)
                .then(() => {
                    // Check if tournament is finished and show trophy popup
                    if (updates['status'] === 'finished') {
                        // Get the updated tournament data to ensure we have the correct final scores
                        const tournamentRef = ref(db, `tournaments/${selectedTournament.id}`);
                        onValue(tournamentRef, (snapshot) => {
                            if (snapshot.exists()) {
                                const updatedTournament = snapshot.val();
                                const finalMatch = updatedTournament.playoffs.final;
                                if (finalMatch && finalMatch.score1 !== null && finalMatch.score2 !== null) {
                                    const finalWinner = finalMatch.score1 > finalMatch.score2 ? finalMatch.p1 : finalMatch.p2;
                                    if (finalWinner) {
                                        showTrophyPopup(finalWinner);
                                    }
                                }
                            }
                        }, { onlyOnce: true });
                    }
                })
                .catch((error) => {
                    console.error('Error advancing playoff winners:', error);
                    alert('Fehler beim Aktualisieren der Playoffs. Bitte versuchen Sie es erneut.');
                });
        }
    };

    const showTrophyPopup = (winner) => {
        // Create confetti effect
        const createConfetti = () => {
            const colors = ['#ff0000', '#ff6b6b', '#ffd93d', '#6bcf7f', '#4d9de0', '#e15554'];
            const confettiCount = 150;
            
            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.style.position = 'fixed';
                confetti.style.width = Math.random() * 10 + 5 + 'px';
                confetti.style.height = Math.random() * 10 + 5 + 'px';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.left = Math.random() * window.innerWidth + 'px';
                confetti.style.top = -20 + 'px';
                confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                confetti.style.pointerEvents = 'none';
                confetti.style.zIndex = '9998';
                confetti.style.animation = `confetti-fall ${Math.random() * 3 + 2}s linear forwards`;
                document.body.appendChild(confetti);
                
                // Remove confetti after animation
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.remove();
                    }
                }, 5000);
            }
        };

        // Add confetti animation CSS
        if (!document.getElementById('confetti-styles')) {
            const style = document.createElement('style');
            style.id = 'confetti-styles';
            style.textContent = `
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(-20px) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                @keyframes trophy-bounce {
                    0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0) scale(1);
                    }
                    40% {
                        transform: translateY(-30px) scale(1.1);
                    }
                    60% {
                        transform: translateY(-15px) scale(1.05);
                    }
                }
                @keyframes glow-pulse {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
                    }
                    50% {
                        box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.3);
                    }
                }
                @keyframes slide-in {
                    0% {
                        transform: translateY(-100px) scale(0.8);
                        opacity: 0;
                    }
                    100% {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Start confetti
        createConfetti();
        
        const popup = document.createElement('div');
        popup.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50';
        popup.style.animation = 'fade-in 0.5s ease-out';
        
        popup.innerHTML = `
            <div class="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 rounded-3xl border-4 border-yellow-500/60 shadow-2xl max-w-2xl mx-4 animate-slide-in" style="animation: slide-in 0.6s ease-out;">
                <!-- Background glow effect -->
                <div class="absolute inset-0 bg-gradient-to-br from-yellow-500/15 to-red-500/15 rounded-3xl animate-glow-pulse"></div>
                
                <!-- Trophy section -->
                <div class="relative z-10 text-center mb-10">
                    <div class="inline-block animate-trophy-bounce mb-6">
                        <div class="text-9xl mb-4">🏆</div>
                        <div class="text-6xl mb-4">👑</div>
                    </div>
                    <h2 class="text-5xl font-bold text-yellow-400 mb-4 drop-shadow-lg">Herzlichen Glückwunsch!</h2>
                    <div class="w-32 h-2 bg-gradient-to-r from-yellow-500 to-red-500 mx-auto mb-6 rounded-full"></div>
                </div>
                
                <!-- Winner announcement -->
                <div class="relative z-10 text-center mb-10">
                    <div class="bg-gradient-to-r from-yellow-500/25 to-red-500/25 p-8 rounded-2xl border-2 border-yellow-500/40">
                        <p class="text-4xl font-bold text-white mb-3">${winner.name}</p>
                        <p class="text-2xl text-gray-300">ist der Sieger des Turniers!</p>
                    </div>
                </div>
                
                <!-- Action buttons -->
                <div class="relative z-10 flex justify-center gap-6">
                    <button onclick="this.closest('.fixed').remove()" class="px-12 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-xl rounded-xl hover:from-yellow-400 hover:to-yellow-500 transform hover:scale-105 transition-all duration-200 shadow-lg">
                        🎉 Feiern
                    </button>
                    <button onclick="this.closest('.fixed').remove()" class="px-12 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold text-xl rounded-xl hover:from-gray-500 hover:to-gray-600 transform hover:scale-105 transition-all duration-200 shadow-lg">
                        Schließen
                    </button>
                </div>
                
                <!-- Decorative elements -->
                <div class="absolute top-6 right-6 text-4xl">🎊</div>
                <div class="absolute bottom-6 left-6 text-4xl">🎊</div>
                <div class="absolute top-6 left-6 text-4xl">🎉</div>
                <div class="absolute bottom-6 right-6 text-4xl">🎉</div>
                <div class="absolute top-1/2 left-4 text-3xl transform -translate-y-1/2">✨</div>
                <div class="absolute top-1/2 right-4 text-3xl transform -translate-y-1/2">✨</div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 15000);
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
            <div className="gradient-card p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-red-400 red-glow-hover">{selectedTournament.name}</h2>
                    {selectedTournament.status === 'group_stage' && allGroupGamesPlayed && (
                         <button onClick={handleStartPlayoffs} className="btn-primary px-4 py-2 text-white rounded-lg">Playoffs starten</button>
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
                    {activeTab === 'stats' && <TournamentStats stats={calculateStats(selectedTournament)} />}
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
                    }).catch((error) => {
                        console.error('Error starting group stage:', error);
                        alert('Fehler beim Starten der Gruppenphase. Bitte versuchen Sie es erneut.');
                    });
                };
                return <ManageParticipants tournament={selectedTournament} allPlayers={allPlayers} onFinish={handleStartGroupStage} />;
            case 'view_tournament':
                return renderTournamentView();
            default: // 'list'
                return (
                    <div className="space-y-6">
                        <div className="gradient-card p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                            <h2 className="text-xl font-semibold text-red-400 mb-2">Willkommen im Turnier Modus!</h2>
                            <p className="text-gray-300">Hier können Sie strukturierte Wettbewerbe erstellen. Jedes Turnier besteht aus einer doppelten Round-Robin-Gruppenphase, gefolgt von einem spannenden Playoff-System im IPL-Stil für die Top 4.</p>
                        </div>
                        <div className="gradient-card rounded-lg overflow-hidden hover:gradient-card-hover transition-all duration-300">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-red-400">Turnierübersicht</h2>
                                <button onClick={() => setView('create')} className="btn-primary px-6 py-2 text-white rounded-lg">Neues Turnier</button>
                            </div>
                            <ul className="divide-y divide-white/10">
                                {tournaments.map((t) => (
                                    <li key={t.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-white/5 cursor-pointer transition-colors" onClick={() => { setSelectedTournamentId(t.id); setView(t.status === 'setup' ? 'manage_participants' : 'view_tournament'); setActiveTab(t.status.includes('playoffs') || t.status === 'finished' ? 'bracket' : 'games');}}>
                                        <div>
                                            <p className="font-bold text-lg">{t.name}</p>
                                            <p className="text-sm text-gray-400">{t.participants?.length || 0} Teilnehmer - <span className={`font-semibold ${t.status === 'group_stage' ? 'text-green-400' : t.status === 'playoffs' ? 'text-blue-400' : t.status === 'finished' ? 'text-yellow-400' : 'text-gray-400'}`}>{t.status}</span></p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTournament(t.id); }} className="mt-2 sm:mt-0 px-3 py-1 bg-red-800 text-white rounded hover:bg-red-700 text-sm opacity-60 hover:opacity-100 transition-all">Löschen</button>
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
            {view !== 'list' && ( 
                <button onClick={() => { setView('list'); setSelectedTournamentId(null); }} className="mb-6 btn-secondary px-4 py-2 text-white rounded-lg flex items-center gap-2 hover:red-glow-hover transition-all duration-300">
                    <ArrowLeft size={16} /> Zurück zur Übersicht
                </button> 
            )}
            {renderContent()}
        </div>
    );
};

const TabButton = ({ icon: Icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 font-semibold transition-all duration-300 ${
        active ? 'btn-primary text-white red-glow' : 'btn-secondary hover:red-glow-hover'
    }`}>
        <Icon size={18} /> {label}
    </button>
);

export default Tournament;
