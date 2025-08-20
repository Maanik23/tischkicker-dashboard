import React, { useState, useEffect, useCallback } from 'react';
import { getDatabase, ref, onValue, update, remove, push } from 'firebase/database';
import { Trophy, Swords, List, ArrowLeft } from 'lucide-react';

import CreateTournament from './CreateTournament';
import TournamentBracket from './TournamentBracket';
import TournamentGames from './TournamentGames';
import TournamentStats from './TournamentStats';
import ManageParticipants from './ManageParticipants';
import UniversalStopwatch from './UniversalStopwatch';
import TournamentPointsMigration from './TournamentPointsMigration';

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
    const [view, setView] = useState('list'); // list, create, manage_participants, view_tournament, migration
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
                
                // Ensure playoffs structure is properly initialized
                let playoffs = tourneyData.playoffs;
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
                
                const updatedData = { 
                    id: snapshot.key, 
                    ...tourneyData, 
                    participants: tourneyData.participants || [], 
                    games: gamesArray,
                    playoffs: playoffs
                };
                
                console.log('Refreshed tournament data:', updatedData);
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
            qualifier1: { 
                name: "Qualifier 1", 
                p1: top4[0], 
                p2: top4[1], 
                games: [
                    { score1: null, score2: null },
                    { score1: null, score2: null },
                    { score1: null, score2: null }
                ],
                winner: null,
                completed: false
            },
            eliminator: { 
                name: "Eliminator", 
                p1: top4[2], 
                p2: top4[3], 
                games: [
                    { score1: null, score2: null },
                    { score1: null, score2: null },
                    { score1: null, score2: null }
                ],
                winner: null,
                completed: false
            },
            qualifier2: { 
                name: "Qualifier 2", 
                p1: null, 
                p2: null, 
                games: [
                    { score1: null, score2: null },
                    { score1: null, score2: null },
                    { score1: null, score2: null }
                ],
                winner: null,
                completed: false
            },
            final: { 
                name: "Finale", 
                p1: null, 
                p2: null, 
                games: [
                    { score1: null, score2: null },
                    { score1: null, score2: null },
                    { score1: null, score2: null }
                ],
                winner: null,
                completed: false
            }
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

    // Helper function to determine best-of-three winner
    const determineBestOfThreeWinner = (games) => {
        if (!games || !Array.isArray(games) || games.length === 0) {
            return null;
        }
        
        let p1Wins = 0;
        let p2Wins = 0;
        
        games.forEach(game => {
            if (game && game.score1 !== null && game.score2 !== null) {
                if (game.score1 > game.score2) {
                    p1Wins++;
                } else if (game.score2 > game.score1) {
                    p2Wins++;
                }
            }
        });
        
        if (p1Wins > p2Wins) return 'p1';
        if (p2Wins > p1Wins) return 'p2';
        return null; // No winner yet or tie
    };

    // Helper function to check if all games in a match are completed
    const isMatchCompleted = (games) => {
        if (!games || !Array.isArray(games) || games.length === 0) {
            return false;
        }
        return games.every(game => game && game.score1 !== null && game.score2 !== null);
    };

    const advancePlayoffWinners = () => {
        if (!selectedTournament || !selectedTournament.playoffs) {
            console.error('No tournament or playoffs data available');
            return;
        }
        
        const { playoffs } = selectedTournament;
        const updates = {};

        // Ensure playoff structure exists
        if (!playoffs.qualifier1 || !playoffs.eliminator || !playoffs.qualifier2 || !playoffs.final) {
            console.error('Playoff structure is incomplete', playoffs);
            return;
        }

        console.log('Advancing playoff winners...', {
            qualifier1: playoffs.qualifier1,
            eliminator: playoffs.eliminator,
            qualifier2: playoffs.qualifier2,
            final: playoffs.final
        });

        // Check Qualifier 1 - winner goes to final, loser goes to qualifier 2
        console.log('Checking Qualifier 1:', {
            games: playoffs.qualifier1.games,
            isCompleted: isMatchCompleted(playoffs.qualifier1.games),
            alreadyCompleted: playoffs.qualifier1.completed
        });
        
        if (isMatchCompleted(playoffs.qualifier1.games) && !playoffs.qualifier1.completed) {
            const winner = determineBestOfThreeWinner(playoffs.qualifier1.games);
            console.log('Qualifier 1 winner:', winner);
            if (winner) {
                const winnerPlayer = winner === 'p1' ? playoffs.qualifier1.p1 : playoffs.qualifier1.p2;
                const loserPlayer = winner === 'p1' ? playoffs.qualifier1.p2 : playoffs.qualifier1.p1;
                
                console.log('Qualifier 1 advancing:', { winnerPlayer, loserPlayer });
                
                updates['playoffs/qualifier1/winner'] = winnerPlayer;
                updates['playoffs/qualifier1/completed'] = true;
                updates['playoffs/final/p1'] = winnerPlayer;
                updates['playoffs/qualifier2/p1'] = loserPlayer;
            }
        }

        // Check Eliminator - winner goes to qualifier 2, loser is eliminated
        if (isMatchCompleted(playoffs.eliminator.games) && !playoffs.eliminator.completed) {
            const winner = determineBestOfThreeWinner(playoffs.eliminator.games);
            if (winner) {
                const winnerPlayer = winner === 'p1' ? playoffs.eliminator.p1 : playoffs.eliminator.p2;
                
                updates['playoffs/eliminator/winner'] = winnerPlayer;
                updates['playoffs/eliminator/completed'] = true;
                updates['playoffs/qualifier2/p2'] = winnerPlayer;
            }
        }

        // Check Qualifier 2 - winner goes to final
        if (isMatchCompleted(playoffs.qualifier2.games) && !playoffs.qualifier2.completed && 
            playoffs.qualifier2.p1 && playoffs.qualifier2.p2) {
            const winner = determineBestOfThreeWinner(playoffs.qualifier2.games);
            if (winner) {
                const winnerPlayer = winner === 'p1' ? playoffs.qualifier2.p1 : playoffs.qualifier2.p2;
                
                updates['playoffs/qualifier2/winner'] = winnerPlayer;
                updates['playoffs/qualifier2/completed'] = true;
                updates['playoffs/final/p2'] = winnerPlayer;
            }
        }

        // Check Final for tournament finish
        if (isMatchCompleted(playoffs.final.games) && !playoffs.final.completed && 
            playoffs.final.p1 && playoffs.final.p2) {
            const winner = determineBestOfThreeWinner(playoffs.final.games);
            if (winner) {
                const winnerPlayer = winner === 'p1' ? playoffs.final.p1 : playoffs.final.p2;
                const runnerUp = winner === 'p1' ? playoffs.final.p2 : playoffs.final.p1;
                
                // Determine 3rd place (loser of qualifier 2)
                let thirdPlace = null;
                if (playoffs.qualifier2.p1 && playoffs.qualifier2.p2) {
                    const qualifier2Winner = determineBestOfThreeWinner(playoffs.qualifier2.games);
                    if (qualifier2Winner) {
                        thirdPlace = qualifier2Winner === 'p1' ? playoffs.qualifier2.p1 : playoffs.qualifier2.p2;
                    }
                }
                
                updates['playoffs/final/winner'] = winnerPlayer;
                updates['playoffs/final/completed'] = true;
                updates['status'] = 'finished';
                updates['winner'] = winnerPlayer;
                updates['runnerUp'] = runnerUp;
                updates['thirdPlace'] = thirdPlace;
                updates['finishedAt'] = Date.now();
            }
        }
        
        console.log('Updates to be applied:', updates);
        
        if(Object.keys(updates).length > 0) {
            console.log('Applying updates to Firebase...');
            update(ref(db, `tournaments/${selectedTournament.id}`), updates)
                .then(() => {
                    console.log('Updates applied successfully');
                    // Check if tournament is finished and show trophy popup
                    if (updates['status'] === 'finished') {
                        // Get the updated tournament data to ensure we have the correct final scores
                        const tournamentRef = ref(db, `tournaments/${selectedTournament.id}`);
                        onValue(tournamentRef, (snapshot) => {
                            if (snapshot.exists()) {
                                const updatedTournament = snapshot.val();
                                const finalMatch = updatedTournament.playoffs.final;
                                if (finalMatch && finalMatch.winner) {
                                    showTrophyPopup(finalMatch.winner, updatedTournament);
                                }
                            }
                        }, { onlyOnce: true });
                    }
                })
                .catch((error) => {
                    console.error('Error advancing playoff winners:', error);
                    alert('Fehler beim Aktualisieren der Playoffs. Bitte versuchen Sie es erneut.');
                });
        } else {
            console.log('No updates to apply');
        }
    };

    const showTrophyPopup = (winner, tournament) => {
        // Update player's tournament wins count
        const playerRef = ref(db, `players/${winner.id}`);
        update(playerRef, {
            tournamentWins: (winner.tournamentWins || 0) + 1
        }).catch(error => {
            console.error('Error updating player tournament wins:', error);
        });

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
        
        // Award tournament points to all participants
        awardTournamentPoints(tournament);
    };
    
    // Function to complete tournament and award points
    const completeTournament = (tournament) => {
        if (!tournament.playoffs?.final?.winner) {
            alert('Das Turnier kann nicht abgeschlossen werden, da der Gewinner noch nicht feststeht.');
            return;
        }

        // Determine final standings before awarding points
        let tournamentStandings = [];
        
        if (tournament.playoffs && tournament.playoffs.final && tournament.playoffs.final.completed) {
            // Use playoff results to determine standings
            if (tournament.playoffs.final.winner) {
                // 1st place (winner of final)
                const winnerId = tournament.playoffs.final.winner;
                const winner = tournament.participants.find(p => p.id === winnerId);
                tournamentStandings.push({ id: winnerId, name: winner?.name || 'Unknown', place: 1, points: 20 });
                
                // 2nd place (loser of final - the player who reached the final but lost)
                let runnerUpId = null;
                if (tournament.playoffs.final.p1 && tournament.playoffs.final.p2) {
                    const finalist1Id = tournament.playoffs.final.p1;
                    const finalist2Id = tournament.playoffs.final.p2;
                    runnerUpId = (finalist1Id === winnerId) ? finalist2Id : finalist1Id;
                    if (runnerUpId && runnerUpId !== winnerId) {
                        const finalist = tournament.participants.find(p => p.id === runnerUpId);
                        tournamentStandings.push({ id: runnerUpId, name: finalist?.name || 'Unknown', place: 2, points: 15 });
                    }
                }
                
                // 3rd place (loser of qualifier2 - the player who lost in the 2nd round)
                if (tournament.playoffs.qualifier2 && tournament.playoffs.qualifier2.p1 && tournament.playoffs.qualifier2.p2) {
                    const q2p1Id = tournament.playoffs.qualifier2.p1;
                    const q2p2Id = tournament.playoffs.qualifier2.p2;
                    const q2WinnerId = tournament.playoffs.qualifier2.winner;
                    const thirdPlaceId = (q2p1Id && q2p2Id && q2WinnerId) ? (q2WinnerId === q2p1Id ? q2p2Id : q2p1Id) : null;
                    
                    if (thirdPlaceId && thirdPlaceId !== winnerId && thirdPlaceId !== runnerUpId && !tournamentStandings.find(s => s.id === thirdPlaceId)) {
                        const thirdPlace = tournament.participants.find(p => p.id === thirdPlaceId);
                        tournamentStandings.push({ id: thirdPlaceId, name: thirdPlace?.name || 'Unknown', place: 3, points: 10 });
                    }
                }
            }
        }

        // Show final standings confirmation
        let standingsMessage = '🏆 Turnier Finale - Endstand:\n\n';
        tournamentStandings.forEach(standing => {
            const placeText = standing.place === 1 ? '🥇 1. Platz' : standing.place === 2 ? '🥈 2. Platz' : '🥉 3. Platz';
            standingsMessage += `${placeText}: ${standing.name} (+${standing.points} Punkte)\n`;
        });
        standingsMessage += '\nAlle anderen Teilnehmer erhalten 5 Teilnahme-Punkte.\n\nMöchten Sie die Punkte jetzt vergeben?';

        if (window.confirm(standingsMessage)) {
            // Mark tournament as finished
            const tournamentRef = ref(db, `tournaments/${tournament.id}`);
            update(tournamentRef, {
                status: 'finished',
                finishedAt: Date.now()
            }).then(() => {
                // Award points to all participants
                awardTournamentPoints(tournament);
                
                // Show trophy popup
                const winner = tournament.playoffs.final.winner;
                showTrophyPopup(winner, { ...tournament, status: 'finished' });
                
                alert('Turnier erfolgreich abgeschlossen! Alle Punkte wurden vergeben.');
            }).catch(error => {
                console.error('Error completing tournament:', error);
                alert('Fehler beim Abschließen des Turniers. Bitte versuchen Sie es erneut.');
            });
        }
    };

    // Function to award tournament points to participants
    const awardTournamentPoints = (tournament) => {
        if (!tournament.participants || tournament.participants.length === 0) return;
        
        // First, determine the actual standings based on tournament results
        let tournamentStandings = [];
        
        if (tournament.playoffs && tournament.playoffs.final && tournament.playoffs.final.completed) {
            // Use playoff results to determine standings
            if (tournament.playoffs.final.winner) {
                // 1st place (winner of final)
                const winnerId = tournament.playoffs.final.winner;
                tournamentStandings.push({ id: winnerId, place: 1, points: 20 });
                
                // 2nd place (loser of final - the player who reached the final but lost)
                let runnerUpId = null;
                if (tournament.playoffs.final.p1 && tournament.playoffs.final.p2) {
                    const finalist1Id = tournament.playoffs.final.p1;
                    const finalist2Id = tournament.playoffs.final.p2;
                    runnerUpId = (finalist1Id === winnerId) ? finalist2Id : finalist1Id;
                    if (runnerUpId && runnerUpId !== winnerId) {
                        tournamentStandings.push({ id: runnerUpId, place: 2, points: 15 });
                    }
                }
                
                // 3rd place (loser of qualifier2 - the player who lost in the 2nd round)
                if (tournament.playoffs.qualifier2 && tournament.playoffs.qualifier2.p1 && tournament.playoffs.qualifier2.p2) {
                    const q2p1Id = tournament.playoffs.qualifier2.p1;
                    const q2p2Id = tournament.playoffs.qualifier2.p2;
                    const q2WinnerId = tournament.playoffs.qualifier2.winner;
                    const thirdPlaceId = (q2p1Id && q2p2Id && q2WinnerId) ? (q2WinnerId === q2p1Id ? q2p2Id : q2p1Id) : null;
                    
                    if (thirdPlaceId && thirdPlaceId !== winnerId && thirdPlaceId !== runnerUpId && !tournamentStandings.find(s => s.id === thirdPlaceId)) {
                        tournamentStandings.push({ id: thirdPlaceId, place: 3, points: 10 });
                    }
                }
                
                // If we still don't have 3rd place, it's the player who lost in qualifier1
                if (tournamentStandings.length < 3 && tournament.playoffs.qualifier1) {
                    const q1p1Id = tournament.playoffs.qualifier1.p1;
                    const q1p2Id = tournament.playoffs.qualifier1.p2;
                    const q1WinnerId = tournament.playoffs.qualifier1.winner;
                    const qualifier1LoserId = (q1p1Id && q1p2Id && q1WinnerId) ? (q1WinnerId === q1p1Id ? q1p2Id : q1p1Id) : null;
                    
                    if (qualifier1LoserId && !tournamentStandings.find(s => s.id === qualifier1LoserId)) {
                        tournamentStandings.push({ id: qualifier1LoserId, place: 3, points: 10 });
                    }
                }
            }
        }
        
        console.log('Tournament standings determined:', tournamentStandings);
        
        // Award points to all participants
        tournament.participants.forEach(participant => {
            const playerRef = ref(db, `players/${participant.id}`);
            
            // Get current player data
            onValue(playerRef, (snapshot) => {
                if (snapshot.exists()) {
                    const playerData = snapshot.val();
                    const currentTournamentPoints = playerData.tournamentPoints || 0;
                    
                    // Calculate points for this participant
                    let pointsToAdd = 0;
                    
                    // Check if this player has a placement
                    const standing = tournamentStandings.find(s => s.id === participant.id);
                    if (standing) {
                        // Top 3 get only placement points (no participation points)
                        pointsToAdd = standing.points;
                        console.log(`Player ${playerData.name} gets ${standing.points} points for ${standing.place}${standing.place === 1 ? 'st' : standing.place === 2 ? 'nd' : 'rd'} place`);
                    } else {
                        // Others get only participation points
                        pointsToAdd = 5;
                        console.log(`Player ${playerData.name} gets 5 participation points only`);
                    }
                    
                    // Update player's tournament points
                    update(playerRef, {
                        tournamentPoints: currentTournamentPoints + pointsToAdd
                    }).catch(error => {
                        console.error('Error updating player tournament points:', error);
                    });
                }
            }, { onlyOnce: true });
        });
    };

    const completeExistingTournament = (tournament) => {
        if (window.confirm(`Möchten Sie das Turnier "${tournament.name}" als abgeschlossen markieren? Dies wird Punkte an alle Teilnehmer vergeben.`)) {
            const tournamentRef = ref(db, `tournaments/${tournament.id}`);
            update(tournamentRef, {
                status: 'finished',
                finishedAt: Date.now()
            }).then(() => {
                // Award points to all participants
                awardTournamentPoints(tournament);
                alert(`Turnier "${tournament.name}" wurde erfolgreich abgeschlossen und Punkte wurden vergeben!`);
            }).catch(error => {
                console.error('Error completing tournament:', error);
                alert('Fehler beim Abschließen des Turniers. Bitte versuchen Sie es erneut.');
            });
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
            <div className="gradient-card p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-red-400 red-glow-hover">{selectedTournament.name}</h2>
                    {selectedTournament.status === 'group_stage' && allGroupGamesPlayed && (
                         <button onClick={handleStartPlayoffs} className="btn-primary px-4 py-2 text-white rounded-lg">Playoffs starten</button>
                    )}
                     {selectedTournament.status === 'playoffs' && <p className="px-4 py-2 bg-blue-600 text-white rounded-lg">Playoffs</p>}
                     {selectedTournament.status === 'finished' && <p className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg animate-pulse">Abgeschlossen</p>}
                    {selectedTournament.status === 'playoffs' && selectedTournament.playoffs?.final?.completed && (
                        <button 
                            onClick={() => completeTournament(selectedTournament)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            🏆 Turnier abschließen
                        </button>
                    )}
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
            case 'migration':
                return <TournamentPointsMigration />;
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
                                <div className="flex gap-3">
                                    <button onClick={() => setView('migration')} className="btn-secondary px-4 py-2 text-white rounded-lg">Punkte Migration</button>
                                    <button onClick={() => setView('create')} className="btn-primary px-6 py-2 text-white rounded-lg">Neues Turnier</button>
                                </div>
                            </div>
                            <ul className="divide-y divide-white/10">
                                {tournaments.map((t) => (
                                    <li key={t.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => { setSelectedTournamentId(t.id); setView(t.status === 'setup' ? 'manage_participants' : 'view_tournament'); setActiveTab(t.status.includes('playoffs') || t.status === 'finished' ? 'bracket' : 'games');}}>
                                        <div>
                                            <p className="font-bold text-lg">{t.name}</p>
                                            <p className="text-sm text-gray-400">{t.participants?.length || 0} Teilnehmer - <span className={`font-semibold ${t.status === 'group_stage' ? 'text-green-400' : t.status === 'playoffs' ? 'text-blue-400' : t.status === 'finished' ? 'text-yellow-400' : 'text-gray-400'}`}>{t.status}</span></p>
                                        </div>
                                                                                 <div className="flex gap-2 mt-2 sm:mt-0">
                                             {t.winner && t.status !== 'finished' && (
                                                 <button 
                                                     onClick={(e) => { 
                                                         e.stopPropagation(); 
                                                         completeExistingTournament(t); 
                                                     }} 
                                                     className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 text-sm transition-all"
                                                     title="Turnier als abgeschlossen markieren"
                                                 >
                                                     ✅ Abschließen
                                                 </button>
                                             )}
                                             <button onClick={(e) => { e.stopPropagation(); handleDeleteTournament(t.id); }} className="px-3 py-1 bg-red-800 text-white rounded hover:bg-red-700 text-sm opacity-60 hover:opacity-100 transition-all">Löschen</button>
                                         </div>
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
            {/* Universal Stopwatch - Always visible in tournament mode */}
            <UniversalStopwatch />
            
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
