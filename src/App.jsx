import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, Users, Plus, Trophy, Swords, LayoutDashboard, List, PlusCircle, Flame, Crown, History, Edit3, Trash2, Menu, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from 'recharts';
import { db } from './firebaseConfig';
import { ref, onValue, push, set, remove, update } from "firebase/database";
import Select from 'react-select';
import Tournament from './components/Tournament';
import EditMatchForm from './components/EditMatchForm';
import { customSelectStyles } from './styles/selectStyles';

// --- KONFIGURATION & HELFER ---
const RANKS = [
    { name: "Bronze", minPoints: 0, icon: "🥉", color: "text-amber-600" }, 
    { name: "Silber", minPoints: 50, icon: "🥈", color: "text-gray-300" },
    { name: "Gold", minPoints: 120, icon: "🥇", color: "text-yellow-400" }, 
    { name: "Platin", minPoints: 200, icon: "💠", color: "text-cyan-400" },
    { name: "Diamant", minPoints: 320, icon: "💎", color: "text-blue-400" },
    { name: "Meister", minPoints: 420, icon: "👑", color: "text-purple-400" },
    { name: "Eroberer", minPoints: 500, icon: "⚔️", color: "text-yellow-300" },
];

const SEASONS = [
    { name: "Frühling", english: "Spring", startMonth: 3, endMonth: 5, icon: "🌸", color: "text-pink-400", bgColor: "bg-pink-500/20", months: "März-Mai" },
    { name: "Sommer", english: "Summer", startMonth: 6, endMonth: 8, icon: "☀️", color: "text-yellow-400", bgColor: "bg-yellow-500/20", months: "Juni-August" },
    { name: "Herbst", english: "Autumn", startMonth: 9, endMonth: 11, icon: "🍂", color: "text-orange-400", bgColor: "bg-orange-500/20", months: "September-November" },
    { name: "Winter", english: "Winter", startMonth: 12, endMonth: 2, icon: "❄️", color: "text-blue-400", bgColor: "bg-blue-500/20", months: "Dezember-Februar" }
];

const getCurrentSeason = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    
    return SEASONS.find(season => {
        if (season.startMonth <= season.endMonth) {
            return currentMonth >= season.startMonth && currentMonth <= season.endMonth;
        } else {
            // Handle winter season that spans December to February
            return currentMonth >= season.startMonth || currentMonth <= season.endMonth;
        }
    }) || SEASONS[0];
};

const getSeasonFromDate = (timestamp) => {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    
    return SEASONS.find(season => {
        if (season.startMonth <= season.endMonth) {
            return month >= season.startMonth && month <= season.endMonth;
        } else {
            return month >= season.startMonth || month <= season.endMonth;
        }
    }) || SEASONS[0];
};

const getSeasonProgress = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / total) * 100);
};

const getDaysRemainingInSeason = (currentSeason) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    
    if (currentSeason.startMonth <= currentSeason.endMonth) {
        if (currentMonth >= currentSeason.startMonth && currentMonth <= currentSeason.endMonth) {
            if (currentMonth === currentSeason.endMonth) {
                const lastDayOfMonth = new Date(now.getFullYear(), currentSeason.endMonth, 0).getDate();
                return Math.max(0, lastDayOfMonth - currentDay);
            } else {
                // Calculate days until end of season
                let daysRemaining = 0;
                for (let month = currentMonth; month <= currentSeason.endMonth; month++) {
                    if (month === currentMonth) {
                        const lastDayOfMonth = new Date(now.getFullYear(), month, 0).getDate();
                        daysRemaining += lastDayOfMonth - currentDay;
                    } else if (month === currentSeason.endMonth) {
                        const lastDayOfMonth = new Date(now.getFullYear(), month, 0).getDate();
                        daysRemaining += lastDayOfMonth;
                    } else {
                        const lastDayOfMonth = new Date(now.getFullYear(), month, 0).getDate();
                        daysRemaining += lastDayOfMonth;
                    }
                }
                return daysRemaining;
            }
        }
    } else {
        // Winter season (December-February)
        if (currentMonth >= currentSeason.startMonth) {
            // December or January
            if (currentMonth === 12) {
                const daysInDecember = 31;
                return daysInDecember - currentDay + 31 + 28; // December + January + February
            } else if (currentMonth === 1) {
                return 31 + 28 - currentDay; // January + February
            }
        } else if (currentMonth <= currentSeason.endMonth) {
            // February
            const lastDayOfMonth = new Date(now.getFullYear(), 2, 0).getDate();
            return Math.max(0, lastDayOfMonth - currentDay);
        }
    }
    
    return 0;
};

const getRankFromPoints = (points) => RANKS.slice().reverse().find(r => points >= r.minPoints) || RANKS[0];

// --- HAUPTKOMPONENTE ---
export default function App() {
    const [mode, setMode] = useState('global');
    const [view, setView] = useState('dashboard');
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState('current'); // 'current', 'all', or specific season
    const [showSeasonEndNotification, setShowSeasonEndNotification] = useState(false);

    // Get current season
    const currentSeason = getCurrentSeason();
    
    // Check if season is ending soon (within 3 days)
    const isSeasonEndingSoon = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        
        if (currentSeason.startMonth <= currentSeason.endMonth) {
            if (currentMonth === currentSeason.endMonth) {
                const lastDayOfMonth = new Date(now.getFullYear(), currentSeason.endMonth, 0).getDate();
                const daysUntilEnd = lastDayOfMonth - currentDay;
                return daysUntilEnd <= 3;
            }
        } else {
            // Winter season (December-February)
            if (currentMonth === 12) {
                const daysUntilEnd = 31 - currentDay;
                return daysUntilEnd <= 3;
            } else if (currentMonth === 2) {
                const lastDayOfMonth = new Date(now.getFullYear(), 2, 0).getDate();
                const daysUntilEnd = lastDayOfMonth - currentDay;
                return daysUntilEnd <= 3;
            }
        }
        return false;
    }, [currentSeason]);
    
    // Get next season info
    const nextSeason = useMemo(() => {
        const currentIndex = SEASONS.findIndex(s => s.name === currentSeason.name);
        const nextIndex = (currentIndex + 1) % SEASONS.length;
        return SEASONS[nextIndex];
    }, [currentSeason]);
    
    // Show season end notification when component mounts if season is ending soon
    useEffect(() => {
        if (isSeasonEndingSoon) {
            setShowSeasonEndNotification(true);
        }
    }, [isSeasonEndingSoon]);

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarOpen && !event.target.closest('.sidebar') && !event.target.closest('.mobile-menu-button')) {
                setSidebarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [sidebarOpen]);

    // Close sidebar when view changes on mobile
    useEffect(() => {
        setSidebarOpen(false);
    }, [view, mode]);

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
        const stats = new Map(players.map(p => [p.id, { 
            ...p, 
            points: 0, 
            wins: 0, 
            losses: 0, 
            draws: 0, 
            gf: 0, 
            ga: 0, 
            played: 0, 
            tournamentWins: p.tournamentWins || 0,
            tournamentPoints: 0, // Track tournament points separately
            seasonalPoints: 0,
            seasonalWins: 0,
            seasonalLosses: 0,
            seasonalDraws: 0
        }]));
        
        // Find the first doubles match to determine which matches should be treated as singles
        const firstDoublesIndex = matches.findIndex(m => m.matchType === 'doubles');
        const effectiveMatchType = (match, index) => {
            // If no doubles matches exist, or this match is before the first doubles match, treat as singles
            if (firstDoublesIndex === -1 || index < firstDoublesIndex) {
                return 'singles';
            }
            // Otherwise use the actual match type
            return match.matchType || 'singles';
        };
        
        // Filter matches based on selected season
        const filteredMatches = selectedSeason === 'current' 
            ? matches.filter(m => getSeasonFromDate(m.createdAt).name === currentSeason.name)
            : selectedSeason === 'all' 
                ? matches 
                : matches.filter(m => getSeasonFromDate(m.createdAt).name === selectedSeason);
        
        filteredMatches.forEach((m, index) => {
            const matchType = effectiveMatchType(m, index);
            
            if (matchType === 'doubles') {
                // Handle doubles matches - each player in the team gets points
                const team1Players = [m.team1Player1Id, m.team1Player2Id].filter(Boolean);
                const team2Players = [m.team2Player1Id, m.team2Player2Id].filter(Boolean);
                
                // Update stats for team 1 players
                team1Players.forEach(playerId => {
                    const player = stats.get(playerId);
                    if (player) {
                        player.played++;
                        player.gf += m.team1Score;
                        player.ga += m.team2Score;
                        
                        if (m.team1Score > m.team2Score) {
                            player.points += 3;
                            player.wins++;
                            if (selectedSeason === 'current' || getSeasonFromDate(m.createdAt).name === currentSeason.name) {
                                player.seasonalPoints += 3;
                                player.seasonalWins++;
                            }
                        } else if (m.team1Score < m.team2Score) {
                            player.losses++;
                            if (selectedSeason === 'current' || getSeasonFromDate(m.createdAt).name === currentSeason.name) {
                                player.seasonalLosses++;
                            }
                        } else {
                            player.points += 1;
                            player.draws++;
                            if (selectedSeason === 'current' || getSeasonFromDate(m.createdAt).name === currentSeason.name) {
                                player.seasonalPoints += 1;
                                player.seasonalDraws++;
                            }
                        }
                    }
                });
                
                // Update stats for team 2 players
                team2Players.forEach(playerId => {
                    const player = stats.get(playerId);
                    if (player) {
                        player.played++;
                        player.gf += m.team2Score;
                        player.ga += m.team1Score;
                        
                        if (m.team2Score > m.team1Score) {
                            player.points += 3;
                            player.wins++;
                            if (selectedSeason === 'current' || getSeasonFromDate(m.createdAt).name === currentSeason.name) {
                                player.seasonalPoints += 3;
                                player.seasonalWins++;
                            }
                        } else if (m.team2Score < m.team1Score) {
                            player.losses++;
                            if (selectedSeason === 'current' || getSeasonFromDate(m.createdAt).name === currentSeason.name) {
                                player.seasonalLosses++;
                            }
                        } else {
                            player.points += 1;
                            player.draws++;
                            if (selectedSeason === 'current' || getSeasonFromDate(m.createdAt).name === currentSeason.name) {
                                player.seasonalPoints += 1;
                                player.seasonalDraws++;
                            }
                        }
                    }
                });
            } else {
                // Handle singles matches (including legacy matches before doubles were introduced)
                const p1 = stats.get(m.player1Id); 
                const p2 = stats.get(m.player2Id); 
                if (!p1 || !p2) return;
                
                p1.played++; 
                p2.played++; 
                p1.gf += m.player1Score; 
                p1.ga += m.player2Score; 
                p2.gf += m.player2Score; 
                p2.ga += m.player1Score;
                
                if (m.player1Score > m.player2Score) { 
                    p1.points += 3; 
                    p1.wins++; 
                    p2.losses++; 
                    if (selectedSeason === 'current' || getSeasonFromDate(m.createdAt).name === currentSeason.name) {
                        p1.seasonalPoints += 3;
                        p1.seasonalWins++;
                        p2.seasonalLosses++;
                    }
                } else if (m.player2Score > m.player1Score) { 
                    p2.points += 3; 
                    p2.wins++; 
                    p1.losses++; 
                    if (selectedSeason === 'current' || getSeasonFromDate(m.createdAt).name === currentSeason.name) {
                        p2.seasonalPoints += 3;
                        p2.seasonalWins++;
                        p1.seasonalLosses++;
                    }
                } else { 
                    p1.points++; 
                    p2.points++; 
                    p1.draws++; 
                    p2.draws++; 
                    if (selectedSeason === 'current' || getSeasonFromDate(m.createdAt).name === currentSeason.name) {
                        p1.seasonalPoints += 1;
                        p2.seasonalPoints += 1;
                        p1.seasonalDraws++;
                        p2.seasonalDraws++;
                    }
                }
            }
        });
        
        // Calculate and add tournament points to the same 'points' field
        console.log('Processing tournaments for points:', tournaments);
        tournaments.forEach(tournament => {
            console.log('Tournament:', tournament.name, 'Status:', tournament.status, 'Participants:', tournament.participants);
            if (tournament.status === 'finished' && tournament.participants) {
                // Get tournament season
                const tournamentSeason = getSeasonFromDate(tournament.createdAt);
                
                // Only add points if tournament is in the selected season or if showing all seasons
                if (selectedSeason === 'all' || 
                    selectedSeason === 'current' || 
                    tournamentSeason.name === selectedSeason) {
                    
                    // First, determine the actual standings based on tournament results
                    let tournamentStandings = [];

                    const getId = (p) => (typeof p === 'string' ? p : (p && p.id) ? p.id : null);
                    
                    if (tournament.playoffs && tournament.playoffs.final && tournament.playoffs.final.completed) {
                        if (tournament.playoffs.final.winner) {
                            // 1st place (winner of final)
                            const winnerId = getId(tournament.playoffs.final.winner);
                            if (winnerId) tournamentStandings.push({ id: winnerId, place: 1, points: 20 });
                            
                            // 2nd place (loser of final - the player who reached the final but lost)
                            let runnerUpId = null;
                            if (tournament.playoffs.final.p1 && tournament.playoffs.final.p2) {
                                const finalist1Id = getId(tournament.playoffs.final.p1);
                                const finalist2Id = getId(tournament.playoffs.final.p2);
                                runnerUpId = (finalist1Id === winnerId) ? finalist2Id : finalist1Id;
                                if (runnerUpId && runnerUpId !== winnerId) {
                                    tournamentStandings.push({ id: runnerUpId, place: 2, points: 15 });
                                }
                            }
                            
                            // 3rd place (loser of qualifier2 - the player who lost in the 2nd round)
                            if (tournament.playoffs.qualifier2 && tournament.playoffs.qualifier2.p1 && tournament.playoffs.qualifier2.p2) {
                                const q2p1Id = getId(tournament.playoffs.qualifier2.p1);
                                const q2p2Id = getId(tournament.playoffs.qualifier2.p2);
                                const q2WinnerId = getId(tournament.playoffs.qualifier2.winner);
                                const thirdPlaceId = (q2p1Id && q2p2Id && q2WinnerId) ? (q2WinnerId === q2p1Id ? q2p2Id : q2p1Id) : null;
                                
                                if (thirdPlaceId && thirdPlaceId !== winnerId && thirdPlaceId !== runnerUpId && !tournamentStandings.find(s => s.id === thirdPlaceId)) {
                                    tournamentStandings.push({ id: thirdPlaceId, place: 3, points: 10 });
                                }
                            }
                        }
                    }

                    console.log(`Tournament ${tournament.name} standings:`, tournamentStandings);

                    // Award points: top 3 placement only; others participation only
                    tournament.participants.forEach(participant => {
                        const player = stats.get(participant.id);
                        if (player) {
                            const standing = tournamentStandings.find(s => s.id === participant.id);
                            if (standing) {
                                player.points += standing.points;
                                player.tournamentPoints += standing.points;
                            } else {
                                player.points += 5;
                                player.tournamentPoints += 5;
                            }
                        }
                    });
                }
            }
        });
        
        return [...stats.values()].sort((a,b) => b.points - a.points || b.tournamentWins - a.tournamentWins || (b.gf - b.ga) - (a.gf - a.ga));
    }, [players, matches, tournaments, selectedSeason, currentSeason]);
    
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
            .then(() => {
                // Force refresh of matches data
                const matchesRef = ref(db, 'globalMatches');
                onValue(matchesRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setMatches(Object.values(snapshot.val()).sort((a,b) => a.createdAt - b.createdAt));
                    }
                }, { onlyOnce: true });
            })
            .catch((error) => {
                console.error('Error adding match:', error);
                alert('Fehler beim Hinzufügen des Spiels. Bitte versuchen Sie es erneut.');
            });
    };

    const handleEditMatch = (matchId, newData) => {
        update(ref(db, `globalMatches/${matchId}`), { ...newData, updatedAt: Date.now() })
            .then(() => {
                setEditingMatch(null);
                // Force refresh
                const matchesRef = ref(db, 'globalMatches');
                onValue(matchesRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setMatches(Object.values(snapshot.val()).sort((a,b) => a.createdAt - b.createdAt));
                    }
                }, { onlyOnce: true });
            })
            .catch((error) => {
                console.error('Error updating match:', error);
                alert('Fehler beim Aktualisieren des Spiels. Bitte versuchen Sie es erneut.');
            });
    };

    const handleDeleteMatch = (matchId) => {
        if (window.confirm('Sind Sie sicher, dass Sie dieses Spiel löschen möchten?')) {
            remove(ref(db, `globalMatches/${matchId}`))
                .then(() => {
                    // Force refresh
                    const matchesRef = ref(db, 'globalMatches');
                    onValue(matchesRef, (snapshot) => {
                        if (snapshot.exists()) {
                            setMatches(Object.values(snapshot.val()).sort((a,b) => a.createdAt - b.createdAt));
                        } else {
                            setMatches([]);
                        }
                    }, { onlyOnce: true });
                })
                .catch((error) => {
                    console.error('Error deleting match:', error);
                    alert('Fehler beim Löschen des Spiels. Bitte versuchen Sie es erneut.');
                });
        }
    };

    // Fix current tournament points based on bracket results
    const fixCurrentTournamentPoints = () => {
        const daniel = players.find(p => p.name === 'Daniel');
        const valeri = players.find(p => p.name === 'Valeri');
        const maanik = players.find(p => p.name === 'Maanik');
        const erwin = players.find(p => p.name === 'Erwin');
        const johannes = players.find(p => p.name === 'Johannes');
        
        if (daniel && valeri && maanik && erwin && johannes) {
            const updates = {};
            // Daniel: 1st place - 20 points
            updates[`players/${daniel.id}/tournamentPoints`] = 20;
            // Valeri: 2nd place - 15 points  
            updates[`players/${valeri.id}/tournamentPoints`] = 15;
            // Maanik: 3rd place - 10 points
            updates[`players/${maanik.id}/tournamentPoints`] = 10;
            // Erwin: Participation - 5 points
            updates[`players/${erwin.id}/tournamentPoints`] = 5;
            // Johannes: Participation - 5 points  
            updates[`players/${johannes.id}/tournamentPoints`] = 5;
            
            update(ref(db), updates).then(() => {
                console.log('Tournament points fixed successfully');
                // Force refresh of players data
                const playersRef = ref(db, 'players');
                onValue(playersRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setPlayers(Object.values(snapshot.val()));
                    }
                }, { onlyOnce: true });
            }).catch((error) => {
                console.error('Error fixing tournament points:', error);
            });
        }
    };

    // Call the fix automatically when component loads (only for current issue)
    React.useEffect(() => {
        // Only run if Daniel has 5 tournament points (indicating the bug exists)
        const daniel = players.find(p => p.name === 'Daniel');
        if (daniel && daniel.tournamentPoints === 5) {
            fixCurrentTournamentPoints();
        }
    }, [players]);


    
    const renderGlobalView = () => {
        if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div></div>;
        switch (view) {
            case 'rangliste': return <Rangliste data={leaderboardData} selectedSeason={selectedSeason} currentSeason={currentSeason} />;
            case 'spieler': return <Spieler players={players} onAddPlayer={handleAddPlayer} />;
            case 'neuesSpiel': return <NeuesSpiel players={players} onAddMatch={handleAddMatch} />;
            case 'dashboard': default: return <Dashboard stats={{totalPlayers: players.length, totalMatches: matches.length, topPlayer: leaderboardData[0]}} leaderboardData={leaderboardData} matches={matches} players={players} tournaments={tournaments} selectedSeason={selectedSeason} setSelectedSeason={setSelectedSeason} currentSeason={currentSeason}/>;
        }
    };
    
    const renderTournamentView = () => <Tournament allPlayers={players} tournaments={tournaments} setTournaments={setTournaments} />;
    
    return (
        <div className="min-h-screen">
            <div className="font-sans text-white flex min-h-screen">
                {/* Mobile Menu Button */}
                <button 
                    className="mobile-menu-button fixed top-4 left-4 z-50 lg:hidden bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg shadow-lg transition-all duration-300"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Sidebar */}
                <Sidebar 
                    mode={mode} 
                    setMode={setMode} 
                    view={view} 
                    setView={setView} 
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
                
                {/* Main Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
                    <Header title={getPageTitle(view, mode)} />
                    <div className="mt-6">
                        {mode === 'global' ? renderGlobalView() : renderTournamentView()}
                    </div>
                </main>
                
                {/* History Sidebar */}
                {showHistory && (
                    <HistorySidebar 
                        matches={matches} 
                        players={players} 
                        leaderboardData={leaderboardData}
                        onEdit={handleEditMatch}
                        onDelete={handleDeleteMatch}
                        editingMatch={editingMatch}
                        setEditingMatch={setEditingMatch}
                        onClose={() => setShowHistory(false)}
                    />
                )}
            </div>
            
            {/* History Toggle Button */}
            <button 
                onClick={() => setShowHistory(!showHistory)}
                className="fixed bottom-6 right-6 bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-40"
                title="Spielverlauf anzeigen"
            >
                <History size={24} />
            </button>
            
            {/* Season End Notification Popup */}
            {showSeasonEndNotification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-4">⚠️</div>
                            <h2 className="text-xl font-bold text-red-400 mb-2">Saison endet bald!</h2>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                Die <strong>{currentSeason.name}</strong> Saison endet in wenigen Tagen. 
                                Bereiten Sie sich auf die neue Saison vor!
                            </p>
                        </div>
                        
                        <div className="bg-gray-700/50 rounded-lg p-4 mb-6 border border-gray-600">
                            <p className="text-gray-200 text-sm mb-2">
                                <strong>Nächste Saison:</strong> {nextSeason.name} ({nextSeason.english})
                            </p>
                            <p className="text-gray-200 text-sm">
                                <strong>Startet:</strong> {
                                    nextSeason.startMonth === 1 ? '1. Januar' : 
                                    nextSeason.startMonth === 3 ? '1. März' : 
                                    nextSeason.startMonth === 6 ? '1. Juni' : 
                                    nextSeason.startMonth === 9 ? '1. September' : 
                                    nextSeason.startMonth === 12 ? '1. Dezember' : '1.'
                                }
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => setShowSeasonEndNotification(false)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-lg transition-colors font-medium"
                        >
                            Verstanden
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- HELPER & UI KOMPONENTEN ---
const getPageTitle = (page, mode) => {
    if (mode === 'tournament') return "Turnier Modus";
    const titles = { dashboard: 'Dashboard', rangliste: 'Globale Rangliste', spieler: 'Spieler verwalten', neuesSpiel: 'Neues Spiel eintragen' };
    return titles[page] || 'Kicker Arena';
};

const Sidebar = ({ mode, setMode, view, setView, isOpen, onClose }) => {
    const menuItems = {
        global: [ { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'rangliste', label: 'Rangliste', icon: Trophy }, { id: 'spieler', label: 'Spieler', icon: Users }, { id: 'neuesSpiel', label: 'Neues Spiel', icon: PlusCircle } ],
        tournament: [] // Navigation handled within Tournament component
    };
    return (
        <aside className={`sidebar-gradient w-64 fixed lg:static top-0 left-0 h-full z-40 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            <div className="p-6">
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
            </div>
            {isOpen && (
                <button 
                    onClick={onClose}
                                            className="absolute top-4 right-4 lg:hidden text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
                >
                    ✕
                </button>
            )}
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
    <header className="border-b border-white/10 pb-3 sm:pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white red-glow-hover">{title}</h1>
    </header>
);

const StatCard = ({ title, value, icon: Icon }) => (
    <div className="gradient-card p-4 sm:p-6 rounded-lg shadow-lg hover:gradient-card-hover transition-all duration-300 red-glow-hover">
        <div className="flex justify-between items-center">
            <p className="text-base sm:text-xl font-semibold text-gray-300">{title}</p>
            <Icon size={24} className="sm:w-7 sm:h-7 text-red-400"/>
        </div>
        <p className="text-2xl sm:text-4xl font-bold mt-2 text-white">{value}</p>
    </div>
);
const CHART_COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28"];

const Dashboard = ({ stats, leaderboardData, matches, players, tournaments, selectedSeason, setSelectedSeason, currentSeason }) => {
    const top5Players = leaderboardData.slice(0, 5);
    
    // Filter matches by selected season for recent matches
    const recentMatches = useMemo(() => {
        let filteredMatches = matches;
        if (selectedSeason === 'current') {
            filteredMatches = matches.filter(m => getSeasonFromDate(m.createdAt).name === currentSeason.name);
        } else if (selectedSeason !== 'all') {
            filteredMatches = matches.filter(m => getSeasonFromDate(m.createdAt).name === selectedSeason);
        }
        return filteredMatches.slice(-5).reverse();
    }, [matches, selectedSeason, currentSeason]);
    
    const playerMap = new Map(players.map(p => [p.id, p.name]));

    // Separate matches by type - ensure real-time updates and handle legacy matches
    const effectiveMatchType = useMemo(() => {
        const firstDoublesIndex = matches.findIndex(m => m.matchType === 'doubles');
        return (match, index) => {
            // If no doubles matches exist, or this match is before the first doubles match, treat as singles
            if (firstDoublesIndex === -1 || index < firstDoublesIndex) {
                return 'singles';
            }
            // Otherwise use the actual match type
            return match.matchType || 'singles';
        };
    }, [matches]);

    const singlesMatches = useMemo(() => {
        return matches.filter((m, index) => effectiveMatchType(m, index) === 'singles');
    }, [matches, effectiveMatchType]);
    
    const doublesMatches = useMemo(() => {
        return matches.filter((m, index) => effectiveMatchType(m, index) === 'doubles');
    }, [matches, effectiveMatchType]);

    // Filter matches by selected season for statistics
    const seasonalMatches = useMemo(() => {
        if (selectedSeason === 'current') {
            return matches.filter(m => getSeasonFromDate(m.createdAt).name === currentSeason.name);
        } else if (selectedSeason === 'all') {
            return matches;
        } else {
            return matches.filter(m => getSeasonFromDate(m.createdAt).name === selectedSeason);
        }
    }, [matches, selectedSeason, currentSeason]);

    const seasonalSinglesMatches = useMemo(() => {
        return seasonalMatches.filter((m, index) => effectiveMatchType(m, index) === 'singles');
    }, [seasonalMatches, effectiveMatchType]);
    
    const seasonalDoublesMatches = useMemo(() => {
        return seasonalMatches.filter((m, index) => effectiveMatchType(m, index) === 'doubles');
    }, [seasonalMatches, effectiveMatchType]);

    const pointsHistory = useMemo(() => {
        const timeline = [];
        const playerPoints = new Map(players.map(p => [p.id, 0]));
        
        // Filter matches by selected season for the timeline
        let filteredMatchesForTimeline = matches;
        if (selectedSeason === 'current') {
            filteredMatchesForTimeline = matches.filter(m => getSeasonFromDate(m.createdAt).name === currentSeason.name);
        } else if (selectedSeason !== 'all') {
            filteredMatchesForTimeline = matches.filter(m => getSeasonFromDate(m.createdAt).name === selectedSeason);
        }
        
        // Initialize timeline with starting points (0) for all players
        if (filteredMatchesForTimeline.length > 0) {
            timeline.push({
                name: 'Start',
                ...Object.fromEntries(top5Players.map(p => [p.name, 0]))
            });
        }
        
        // Add each match to the timeline
        filteredMatchesForTimeline.forEach((match, index) => {
            const entry = { name: `Spiel ${index + 1}` };
            const matchType = effectiveMatchType(match, index);
            
            if (matchType === 'doubles') {
                // Handle doubles matches
                const team1Players = [match.team1Player1Id, match.team1Player2Id].filter(Boolean);
                const team2Players = [match.team2Player1Id, match.team2Player2Id].filter(Boolean);
                
                // Update points for team 1 players
                team1Players.forEach(playerId => {
                    const player = players.find(p => p.id === playerId);
                    if (player && top5Players.some(p => p.id === playerId)) {
                        const currentPoints = playerPoints.get(playerId) || 0;
                        if (match.team1Score > match.team2Score) {
                            playerPoints.set(playerId, currentPoints + 3);
                        } else if (match.team1Score === match.team2Score) {
                            playerPoints.set(playerId, currentPoints + 1);
                        }
                    }
                });
                
                // Update points for team 2 players
                team2Players.forEach(playerId => {
                    const player = players.find(p => p.id === playerId);
                    if (player && top5Players.some(p => p.id === playerId)) {
                        const currentPoints = playerPoints.get(playerId) || 0;
                        if (match.team2Score > match.team1Score) {
                            playerPoints.set(playerId, currentPoints + 3);
                        } else if (match.team2Score === match.team1Score) {
                            playerPoints.set(playerId, currentPoints + 1);
                        }
                    }
                });
            } else {
                // Handle singles matches
                const p1 = players.find(p => p.id === match.player1Id);
                const p2 = players.find(p => p.id === match.player2Id);
                
                if (p1 && top5Players.some(p => p.id === match.player1Id)) {
                    const currentPoints = playerPoints.get(match.player1Id) || 0;
                    if (match.player1Score > match.player2Score) {
                        playerPoints.set(match.player1Id, currentPoints + 3);
                    } else if (match.player1Score === match.player2Score) {
                        playerPoints.set(match.player1Id, currentPoints + 1);
                    }
                }
                
                if (p2 && top5Players.some(p => p.id === match.player2Id)) {
                    const currentPoints = playerPoints.get(match.player2Id) || 0;
                    if (match.player2Score > match.player1Score) {
                        playerPoints.set(match.player2Id, currentPoints + 3);
                    } else if (match.player2Score === match.player1Score) {
                        playerPoints.set(match.player2Id, currentPoints + 1);
                    }
                }
            }
            
            // Add current points for all top 5 players to this timeline entry
            top5Players.forEach(player => {
                entry[player.name] = playerPoints.get(player.id) || 0;
            });
            
            timeline.push(entry);
        });
        
        return timeline;
    }, [matches, players, top5Players, selectedSeason, currentSeason, effectiveMatchType]);
    
    const winLossData = useMemo(() => {
        const data = [];
        const playerStats = new Map();
        
        // Filter matches by selected season for win/loss data
        let filteredMatchesForWinLoss = matches;
        if (selectedSeason === 'current') {
            filteredMatchesForWinLoss = matches.filter(m => getSeasonFromDate(m.createdAt).name === currentSeason.name);
        } else if (selectedSeason !== 'all') {
            filteredMatchesForWinLoss = matches.filter(m => getSeasonFromDate(m.createdAt).name === selectedSeason);
        }
        
        // Initialize player stats
        players.forEach(player => {
            playerStats.set(player.id, { wins: 0, losses: 0 });
        });
        
        // Calculate wins and losses
        filteredMatchesForWinLoss.forEach(match => {
            const matchType = effectiveMatchType(match, 0); // Use 0 as index since we're not in the original loop
            
            if (matchType === 'doubles') {
                const team1Players = [match.team1Player1Id, match.team1Player2Id].filter(Boolean);
                const team2Players = [match.team2Player1Id, match.team2Player2Id].filter(Boolean);
                
                if (match.team1Score > match.team2Score) {
                    team1Players.forEach(id => {
                        const stats = playerStats.get(id);
                        if (stats) stats.wins++;
                    });
                    team2Players.forEach(id => {
                        const stats = playerStats.get(id);
                        if (stats) stats.losses++;
                    });
                } else if (match.team2Score > match.team1Score) {
                    team2Players.forEach(id => {
                        const stats = playerStats.get(id);
                        if (stats) stats.wins++;
                    });
                    team1Players.forEach(id => {
                        const stats = playerStats.get(id);
                        if (stats) stats.losses++;
                    });
                }
            } else {
                if (match.player1Score > match.player2Score) {
                    const p1Stats = playerStats.get(match.player1Id);
                    const p2Stats = playerStats.get(match.player2Id);
                    if (p1Stats) p1Stats.wins++;
                    if (p2Stats) p2Stats.losses++;
                } else if (match.player2Score > match.player1Score) {
                    const p1Stats = playerStats.get(match.player1Id);
                    const p2Stats = playerStats.get(match.player2Id);
                    if (p2Stats) p2Stats.wins++;
                    if (p1Stats) p1Stats.losses++;
                }
            }
        });
        
        // Convert to chart data format
        players.forEach(player => {
            const stats = playerStats.get(player.id);
            if (stats && (stats.wins > 0 || stats.losses > 0)) {
                data.push({
                    name: player.name,
                    Siege: stats.wins,
                    Niederlagen: stats.losses
                });
            }
        });
        
        return data;
    }, [matches, players, selectedSeason, currentSeason, effectiveMatchType]);

    const tournamentData = useMemo(() => {
        // Show tournament data for all tournaments with participants
        const tournamentsWithParticipants = tournaments.filter(t => t.participants && t.participants.length > 0);
        const tournamentWinners = {};
        
        // Count tournament wins and participation
        tournamentsWithParticipants.forEach(tournament => {
            if (tournament.winner) {
            const winnerName = tournament.winner.name;
            tournamentWinners[winnerName] = (tournamentWinners[winnerName] || 0) + 1;
            }
        });
        
        // If no winners yet, show tournament participation info
        if (Object.keys(tournamentWinners).length === 0 && tournamentsWithParticipants.length > 0) {
            return [
                { name: 'Turniere', Turniersiege: tournamentsWithParticipants.length },
                { name: 'Teilnehmer', Turniersiege: tournamentsWithParticipants.reduce((total, t) => total + (t.participants?.length || 0), 0) }
            ];
        }
        
        return Object.entries(tournamentWinners)
            .map(([name, wins]) => ({ name, Turniersiege: wins }))
            .sort((a, b) => b.Turniersiege - a.Turniersiege)
            .slice(0, 8); // Top 8 tournament winners
    }, [tournaments]);

    const matchTypeData = useMemo(() => {
        // Filter matches by selected season for match type distribution
        let filteredMatchesForType = matches;
        if (selectedSeason === 'current') {
            filteredMatchesForType = matches.filter(m => getSeasonFromDate(m.createdAt).name === currentSeason.name);
        } else if (selectedSeason !== 'all') {
            filteredMatchesForType = matches.filter(m => getSeasonFromDate(m.createdAt).name === selectedSeason);
        }
        
        const singlesCount = filteredMatchesForType.filter((m, index) => effectiveMatchType(m, index) === 'singles').length;
        const doublesCount = filteredMatchesForType.filter((m, index) => effectiveMatchType(m, index) === 'doubles').length;
        
        return [
            { name: 'Einzelspiele', value: singlesCount, fill: '#3b82f6' },
            { name: 'Doppelspiele', value: doublesCount, fill: '#f59e0b' }
        ];
    }, [matches, selectedSeason, currentSeason, effectiveMatchType]);

    return (
        <div className="space-y-6">
            {/* Seasonal Header */}
            <div className="gradient-card p-4 sm:p-6 rounded-lg mb-6 sm:mb-8 hover:gradient-card-hover transition-all duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-red-400 mb-2">Willkommen in der WAMOCON Kicker Arena!</h2>
                        <p className="text-base sm:text-lg text-gray-300">Dies ist die zentrale Anlaufstelle für alle Tischkicker-Aktivitäten. Verfolgen Sie die globale Rangliste, oder wechseln Sie in den Turniermodus, um Wettbewerbe zu organisieren.</p>
            </div>
                    <div className="flex flex-col items-end gap-3">
                        {/* Current Season Display */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentSeason.bgColor} border border-current ${currentSeason.color}`}>
                            <span className="text-2xl">{currentSeason.icon}</span>
                            <div className="text-center">
                                <div className="font-bold text-sm">{currentSeason.name}</div>
                                <div className="text-xs opacity-80">{currentSeason.english}</div>
                            </div>
                        </div>
                        
                        {/* Days Remaining Countdown */}
                        <div className="text-center">
                            <div className="text-xs text-gray-400 font-medium mb-1">Verbleibende Tage</div>
                            <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2">
                                <div className="text-green-400 font-bold text-lg text-center">
                                    {getDaysRemainingInSeason(currentSeason)}
                                </div>
                                <div className="text-green-300 text-xs text-center">Tage</div>
                            </div>
                        </div>
                        
                        {/* Season Selector */}
                        <div className="flex flex-col items-end gap-2">
                            <label className="text-xs text-gray-400 font-medium">Saison auswählen:</label>
                            <select 
                                value={selectedSeason} 
                                onChange={(e) => setSelectedSeason(e.target.value)}
                                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-red-500 focus:outline-none transition-colors"
                            >
                                <option value="current">Aktuelle Saison ({currentSeason.name})</option>
                                <option value="all">Alle Saisons</option>
                                {SEASONS.map(season => (
                                    <option key={season.name} value={season.name}>
                                        {season.name} ({season.months})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Central Season Information */}
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    {SEASONS.map(season => (
                        <div key={season.name} className={`p-3 rounded-lg transition-all duration-300 ${
                            (selectedSeason === 'current' && season.name === currentSeason.name) || 
                            (selectedSeason === season.name) 
                                ? `${season.bgColor} border-2 border-current ${season.color}` 
                                : 'bg-gray-800/50 hover:bg-gray-700/50'
                        }`}>
                            <div className="text-2xl mb-2">{season.icon}</div>
                            <div className="font-bold text-sm">{season.name}</div>
                            <div className="text-xs opacity-80">{season.english}</div>
                            <div className="text-xs opacity-60">{season.months}</div>
                            {season.name === currentSeason.name && (
                                <div className="mt-2 text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-full">
                                    Aktuell
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <StatCard title="Top Spieler" value={stats.topPlayer?.name || 'N/A'} icon={Crown}/>
                <StatCard title="Gesamt Punkte" value={leaderboardData.reduce((sum, player) => sum + player.points, 0)} icon={Flame}/>
                <StatCard title="Aktive Spieler" value={stats.totalPlayers} icon={Users}/>
            </div>
            
            {/* Additional Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatCard title="Gesamt Spiele" value={matches.length} icon={BarChart2}/>
                <StatCard title="Einzelspiele" value={singlesMatches.length} icon={Users}/>
                <StatCard title="Doppelspiele" value={doublesMatches.length} icon={Users}/>
                <StatCard title="Top Punkte" value={leaderboardData[0]?.points || 0} icon={Trophy}/>
            </div>
            
            {/* Seasonal Statistics */}
            <div className="gradient-card p-4 sm:p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-red-400">Saison Statistiken</h2>
                </div>
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{currentSeason.icon}</span>
                    <h2 className="text-xl sm:text-2xl font-bold text-red-400">
                        {selectedSeason === 'current' ? `${currentSeason.name} Saison` : selectedSeason === 'all' ? 'Alle Saisons' : `${selectedSeason} Saison`} Statistiken
                    </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="text-center p-4 bg-gray-800/50 border border-gray-600 rounded-lg">
                        <div className="text-2xl font-bold text-white">{seasonalMatches.length}</div>
                        <div className="text-sm text-gray-400">Spiele</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 border border-gray-600 rounded-lg">
                        <div className="text-2xl font-bold text-white">{seasonalSinglesMatches.length}</div>
                        <div className="text-sm text-gray-400">Einzelspiele</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 border border-gray-600 rounded-lg">
                        <div className="text-2xl font-bold text-white">{seasonalDoublesMatches.length}</div>
                        <div className="text-sm text-gray-400">Doppelspiele</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 border border-gray-600 rounded-lg">
                        <div className="text-2xl font-bold text-white">
                            {leaderboardData.reduce((sum, player) => sum + player.seasonalPoints, 0)}
                        </div>
                        <div className="text-sm text-gray-400">Saison Punkte</div>
                    </div>
                </div>
                
                {/* Season Progress Bar */}
                {selectedSeason === 'current' && (
                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-400">Saison Fortschritt</span>
                            <span className="text-sm text-gray-400">
                                {(() => {
                                    try {
                                        const now = new Date();
                                        const currentMonth = now.getMonth() + 1;
                                        const currentDay = now.getDate();
                                        const startMonth = currentSeason.startMonth;
                                        const endMonth = currentSeason.endMonth;
                                        
                                        let progress = 0;
                                        if (startMonth <= endMonth) {
                                            if (currentMonth >= startMonth && currentMonth <= endMonth) {
                                                // Calculate days-based progress for more accuracy
                                                const startDate = new Date(now.getFullYear(), startMonth - 1, 1);
                                                const endDate = new Date(now.getFullYear(), endMonth, 0); // Last day of end month
                                                const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                                const elapsedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
                                                progress = Math.round((elapsedDays / totalDays) * 100);
                                            }
                                        } else {
                                            // Winter season (December-February)
                                            if (currentMonth >= startMonth || currentMonth <= endMonth) {
                                                const startDate = new Date(now.getFullYear(), startMonth - 1, 1);
                                                let endDate;
                                                if (currentMonth >= startMonth) {
                                                    // December or January
                                                    endDate = new Date(now.getFullYear() + 1, endMonth, 0);
                                                } else {
                                                    // February
                                                    endDate = new Date(now.getFullYear(), endMonth, 0);
                                                }
                                                const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                                const elapsedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
                                                progress = Math.round((elapsedDays / totalDays) * 100);
                                            }
                                        }
                                        return Math.min(100, Math.max(0, progress));
                                    } catch (error) {
                                        console.error('Error calculating season progress:', error);
                                        return 0;
                                    }
                                })()}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                                className={`h-2 rounded-full transition-all duration-500 ${currentSeason.bgColor.replace('bg-', 'bg-').replace('/20', '')}`}
                                style={{ 
                                    width: `${(() => {
                                        try {
                                            const now = new Date();
                                            const currentMonth = now.getMonth() + 1;
                                            const currentDay = now.getDate();
                                            const startMonth = currentSeason.startMonth;
                                            const endMonth = currentSeason.endMonth;
                                            
                                            let progress = 0;
                                            if (startMonth <= endMonth) {
                                                if (currentMonth >= startMonth && currentMonth <= endMonth) {
                                                    // Calculate days-based progress for more accuracy
                                                    const startDate = new Date(now.getFullYear(), startMonth - 1, 1);
                                                    const endDate = new Date(now.getFullYear(), endMonth, 0); // Last day of end month
                                                    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                                    const elapsedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
                                                    progress = Math.round((elapsedDays / totalDays) * 100);
                                                }
                                            } else {
                                                // Winter season (December-February)
                                                if (currentMonth >= startMonth || currentMonth <= endMonth) {
                                                    const startDate = new Date(now.getFullYear(), startMonth - 1, 1);
                                                    let endDate;
                                                    if (currentMonth >= startMonth) {
                                                        // December or January
                                                        endDate = new Date(now.getFullYear() + 1, endMonth, 0);
                                                    } else {
                                                        // February
                                                        endDate = new Date(now.getFullYear(), endMonth, 0);
                                                    }
                                                    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                                    const elapsedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
                                                    progress = Math.round((elapsedDays / totalDays) * 100);
                                                }
                                            }
                                            return Math.min(100, Math.max(0, progress));
                                        } catch (error) {
                                            console.error('Error calculating season progress:', error);
                                            return 0;
                                        }
                                    })()}%`
                                }}
                            ></div>
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-xs text-gray-400">
                                {(() => {
                                    const daysRemaining = getDaysRemainingInSeason(currentSeason);
                                    return `${daysRemaining} Tage verbleibend`;
                                })()}
                            </span>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Points Progression Chart - Moved to top */}
            <div className="gradient-card p-4 sm:p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-red-400">Punkteverlauf der Top 5</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Saison:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${currentSeason.bgColor} ${currentSeason.color}`}>
                            {selectedSeason === 'current' ? currentSeason.name : selectedSeason === 'all' ? 'Alle' : selectedSeason}
                        </span>
                    </div>
                </div>
                <div className="w-full h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pointsHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12}/>
                            <YAxis stroke="#9CA3AF" fontSize={12}/>
                        <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151'}} wrapperClassName="rounded-lg"/>
                        <Legend />
                        {top5Players.map((player, i) => (
                                <Line 
                                    key={player.id} 
                                    type="monotone" 
                                    dataKey={player.name} 
                                    stroke={CHART_COLORS[i % CHART_COLORS.length]} 
                                    strokeWidth={2}
                                    connectNulls={true}
                                    dot={{ fill: CHART_COLORS[i % CHART_COLORS.length], strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: CHART_COLORS[i % CHART_COLORS.length], strokeWidth: 2 }}
                                />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
            </div>
            
            {/* Recent Matches - Full width */}
            <div className="gradient-card p-4 sm:p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-400">Letzte Spiele</h2>
                <div className="space-y-3 sm:space-y-4">
                    {recentMatches.map(m => {
                        const matchType = effectiveMatchType(m, matches.indexOf(m));
                        return (
                            <div key={m.id} className="bg-gray-800/50 border border-gray-600 p-3 rounded-lg text-sm hover:bg-gray-700/50 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div className="text-center flex-1">
                                        <div className="font-bold text-xs sm:text-sm truncate">
                                            {matchType === 'doubles' ? (
                                                <>
                                                    {playerMap.get(m.team1Player1Id) || '?'} & {playerMap.get(m.team1Player2Id) || '?'}
                                                </>
                                            ) : (
                                                playerMap.get(m.player1Id) || '?'
                                            )}
                                        </div>
                                        <div className={`text-xl sm:text-2xl font-black ${matchType === 'doubles' ? (m.team1Score > m.team2Score ? 'text-green-400' : '') : (m.player1Score > m.player2Score ? 'text-green-400' : '')}`}>
                                            {matchType === 'doubles' ? m.team1Score : m.player1Score}
                                        </div>
                                    </div>
                                    <div className="text-center mx-2 sm:mx-4 text-gray-400 font-semibold text-xs sm:text-sm">vs.</div>
                                    <div className="text-center flex-1">
                                        <div className="font-bold text-xs sm:text-sm truncate">
                                            {matchType === 'doubles' ? (
                                                <>
                                                    {playerMap.get(m.team2Player1Id) || '?'} & {playerMap.get(m.team2Player2Id) || '?'}
                                                </>
                                            ) : (
                                                playerMap.get(m.player2Id) || '?'
                                            )}
                                        </div>
                                        <div className={`text-xl sm:text-2xl font-black ${matchType === 'doubles' ? (m.team2Score > m.team1Score ? 'text-green-400' : '') : (m.player2Score > m.player1Score ? 'text-green-400' : '')}`}>
                                            {matchType === 'doubles' ? m.team2Score : m.player2Score}
                                        </div>
                                    </div>
                                </div>
                                {matchType === 'doubles' && (
                                    <div className="text-center mt-2">
                                        <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                                            Doppelspiel
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Win/Loss Ratio and Goal Difference Charts - Second last */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="gradient-card p-4 sm:p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-400">Sieg/Niederlage-Verhältnis</h2>
                    <div className="w-full h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={winLossData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12}/>
                                <YAxis stroke="#9CA3AF" fontSize={12}/>
                            <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151'}} wrapperClassName="rounded-lg"/>
                            <Legend />
                            <Bar dataKey="Siege" fill="#22c55e" />
                            <Bar dataKey="Niederlagen" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                                    </div>
                
                <div className="gradient-card p-4 sm:p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-400">Tordifferenz Übersicht</h2>
                    <div className="w-full h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={leaderboardData.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12}/>
                                <YAxis stroke="#9CA3AF" fontSize={12}/>
                                <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151'}} wrapperClassName="rounded-lg"/>
                                <Legend />
                                <Bar dataKey="gf" fill="#22c55e" name="Tore für" />
                                <Bar dataKey="ga" fill="#ef4444" name="Tore gegen" />
                            </BarChart>
                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
            
            {/* Match Type Distribution and Tournament Results - Last */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="gradient-card p-4 sm:p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-400">Spieltyp Verteilung</h2>
                    <div className="w-full h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={matchTypeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12}/>
                                <YAxis stroke="#9CA3AF" fontSize={12}/>
                                <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151'}} wrapperClassName="rounded-lg"/>
                                <Legend />
                                <Bar dataKey="value" fill="#22c55e" />
                            </BarChart>
                        </ResponsiveContainer>
                </div>
            </div>
            
                {/* Tournament Results Visualization - Side by side with match type distribution */}
                <div className="gradient-card p-4 sm:p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-400">🏆 Turniersiege</h2>
                {tournamentData.length > 0 ? (
                        <div className="w-full h-64 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tournamentData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12}/>
                                    <YAxis stroke="#9CA3AF" fontSize={12}/>
                            <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151'}} wrapperClassName="rounded-lg"/>
                            <Legend />
                            <Bar dataKey="Turniersiege" fill="#fbbf24" />
                        </BarChart>
                    </ResponsiveContainer>
                        </div>
                ) : (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center text-gray-400">
                                <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-600" />
                                <p className="text-sm sm:text-base">Noch keine Turniere abgeschlossen</p>
                                <p className="text-xs sm:text-sm">Wechseln Sie in den Turniermodus, um ein Turnier zu erstellen</p>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

const Rangliste = ({ data, selectedSeason, currentSeason }) => ( 
    <div className="space-y-6">
        {/* Seasonal Header for Rangliste */}
        {selectedSeason !== 'all' && (
            <div className="gradient-card p-4 sm:p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">
                        {selectedSeason === 'current' ? currentSeason.icon : SEASONS.find(s => s.name === selectedSeason)?.icon || '📊'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-red-400">
                        {selectedSeason === 'current' ? `${currentSeason.name} Saison` : selectedSeason} Rangliste
                    </h2>
                </div>
                <p className="text-gray-300 mt-2">
                    {selectedSeason === 'current' 
                        ? `Aktuelle Saison: ${currentSeason.name} (${currentSeason.english})`
                        : `Saison: ${selectedSeason}`
                    }
                </p>
            </div>
        )}
        
    <div className="gradient-card rounded-lg overflow-hidden hover:gradient-card-hover transition-all duration-300"> 
            <div className="overflow-x-auto">
                <table className="w-full min-w-full"> 
            <thead>
                <tr className="border-b border-white/20 bg-gray-800/50">
                            <th className="p-2 sm:p-4 text-left text-sm sm:text-lg font-bold text-red-400 uppercase">Rang</th>
                            <th className="p-2 sm:p-4 text-left text-sm sm:text-lg font-bold text-red-400 uppercase">Spieler</th>
                            <th className="p-2 sm:p-4 text-left text-sm sm:text-lg font-bold text-red-400 uppercase">Punkte</th>
                            <th className="hidden sm:table-cell p-2 sm:p-4 text-left text-sm sm:text-lg font-bold text-red-400 uppercase">Turniere</th>
                            <th className="p-2 sm:p-4 text-left text-sm sm:text-lg font-bold text-red-400 uppercase">Spiele</th>
                            <th className="hidden sm:table-cell p-2 sm:p-4 text-left text-sm sm:text-lg font-bold text-red-400 uppercase">S/U/N</th>
                            <th className="p-2 sm:p-4 text-left text-sm sm:text-lg font-bold text-red-400 uppercase">Tordifferenz</th>
                </tr>
            </thead> 
            <tbody>
                {data.map((p, i) => {
                    const rank = getRankFromPoints(p.points);
                            const goalDiff = p.gf - p.ga;
                    return (
                        <tr key={p.id} className="hover:bg-gray-700/50 border-b border-white/5 last:border-0 transition-colors">
                                    <td className="p-2 sm:p-4 font-bold text-lg sm:text-xl">{i + 1}</td>
                                    <td className="p-2 sm:p-4 font-semibold text-sm sm:text-lg flex items-center gap-2 sm:gap-3">
                                        <span className={`text-xl sm:text-2xl ${rank.color}`}>{rank.icon}</span>
                                <span className="flex flex-col">
                                            <span className="text-xs sm:text-base">{p.name}</span>
                                    <span className={`text-xs ${rank.color} font-medium`}>{rank.name}</span>
                                </span>
                            </td>
                                    <td className="p-2 sm:p-4 font-bold text-red-400 text-base sm:text-lg">
                                        {p.points}
                                        {p.tournamentPoints > 0 && (
                                            <span className="text-xs text-yellow-400 ml-2 block">
                                                (+{p.tournamentPoints} T)
                                            </span>
                                        )}
                                    </td>
                                    <td className="hidden sm:table-cell p-2 sm:p-4 text-base sm:text-lg">
                                <span className="flex items-center gap-1">
                                    <span className="text-yellow-400">🏆</span>
                                    <span className="font-bold">{p.tournamentWins || 0}</span>
                                </span>
                            </td>
                                    <td className="p-2 sm:p-4 text-base sm:text-lg">{p.played}</td>
                                    <td className="hidden sm:table-cell p-2 sm:p-4 text-base sm:text-lg">
                                <span className="text-green-400">{p.wins}</span>/<span className="text-yellow-400">{p.draws}</span>/<span className="text-red-400">{p.losses}</span>
                            </td>
                                    <td className={`p-2 sm:p-4 text-base sm:text-lg font-bold ${goalDiff > 0 ? 'text-green-400' : goalDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                        {goalDiff > 0 ? '+' : ''}{goalDiff}
                                    </td>

                        </tr>
                    );
                })}
            </tbody> 
        </table> 
            </div>
        </div>
    </div> 
);

const Spieler = ({ players, onAddPlayer }) => { 
    const [name, setName] = useState(''); 
    const handleSubmit = e => { e.preventDefault(); onAddPlayer(name); setName(''); }; 
    return (
        <>
            <form onSubmit={handleSubmit} className="gradient-card p-4 sm:p-6 rounded-lg flex flex-col sm:flex-row gap-3 sm:gap-4 hover:gradient-card-hover transition-all duration-300">
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Spielername" required className="flex-1 px-3 sm:px-4 py-2 form-input-enhanced rounded-lg focus:border-red-500 focus:outline-none transition-all duration-300 text-sm sm:text-base"/>
                <button type="submit" className="btn-primary px-4 sm:px-6 py-2 text-base sm:text-lg font-bold text-white rounded-lg flex items-center justify-center gap-2 hover:transform hover:scale-105 transition-all duration-300">
                    <Plus/>Hinzufügen
                </button>
            </form>
            <div className="gradient-card rounded-lg mt-4 sm:mt-6 hover:gradient-card-hover transition-all duration-300">
                {players.map(p => <div key={p.id} className="p-3 sm:p-4 border-b border-white/10 last:border-0 hover:bg-gray-700/50 transition-colors text-sm sm:text-base">{p.name}</div>)}
            </div>
        </>
    ); 
};
const NeuesSpiel = ({ players, onAddMatch }) => {
    const [data, setData] = useState({ player1Id: '', player2Id: '', player1Score: '', player2Score: '' });
    const [matchType, setMatchType] = useState('singles'); // 'singles' or 'doubles'
    const [doublesData, setDoublesData] = useState({ 
        team1Player1Id: '', team1Player2Id: '', 
        team2Player1Id: '', team2Player2Id: '', 
        team1Score: '', team2Score: '' 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Function to reset all form data
    const resetForm = () => {
        setData({ player1Id: '', player2Id: '', player1Score: '', player2Score: '' });
        setDoublesData({ 
            team1Player1Id: '', team1Player2Id: '', 
            team2Player1Id: '', team2Player2Id: '', 
            team1Score: '', team2Score: '' 
        });
    };
    
    const handleSubmit = async e => { 
        e.preventDefault(); 
        setIsSubmitting(true);
        setShowSuccess(false);
        
        try {
            if (matchType === 'singles') {
        const score1 = Number(data.player1Score);
        const score2 = Number(data.player2Score);
        
        // Validate that no player can have more than 10 points
        if (score1 > 10 || score2 > 10) {
            alert('Kein Spieler kann mehr als 10 Punkte haben.');
            return;
        }
        
                // Validate that different players are selected
                if (data.player1Id === data.player2Id) {
                    alert('Bitte wählen Sie verschiedene Spieler aus.');
                    return;
                }
                
                await onAddMatch({ ...data, player1Score: score1, player2Score: score2, matchType: 'singles' }); 
                resetForm(); // Reset all fields after successful submission
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000); // Hide success message after 3 seconds
            } else {
                const score1 = Number(doublesData.team1Score);
                const score2 = Number(doublesData.team2Score);
                
                // Validate that no team can have more than 10 points
                if (score1 > 10 || score2 > 10) {
                    alert('Kein Team kann mehr als 10 Punkte haben.');
                    return;
                }
                
                // Validate that all players are selected
                if (!doublesData.team1Player1Id || !doublesData.team1Player2Id || !doublesData.team2Player1Id || !doublesData.team2Player2Id) {
                    alert('Bitte wählen Sie alle 4 Spieler aus.');
                    return;
                }
                
                // Validate that no player is selected twice
                const allPlayers = [
                    doublesData.team1Player1Id, 
                    doublesData.team1Player2Id, 
                    doublesData.team2Player1Id, 
                    doublesData.team2Player2Id
                ];
                const uniquePlayers = new Set(allPlayers);
                if (uniquePlayers.size !== 4) {
                    alert('Jeder Spieler kann nur einmal ausgewählt werden.');
                    return;
                }
                
                await onAddMatch({ 
                    ...doublesData, 
                    team1Score: score1, 
                    team2Score: score2, 
                    matchType: 'doubles',
                    player1Id: doublesData.team1Player1Id, // For compatibility
                    player2Id: doublesData.team2Player1Id,
                    player1Score: score1,
                    player2Score: score2
                }); 
                resetForm(); // Reset all fields after successful submission
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000); // Hide success message after 3 seconds
            }
        } catch (error) {
            console.error('Error submitting match:', error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const playerOptions = players.map(p => ({value: p.id, label: p.name}));
    
    return ( 
        <div className="space-y-4 sm:space-y-6">
            {/* Success Message */}
            {showSuccess && (
                <div className="gradient-card p-4 sm:p-6 rounded-lg border border-green-500/30 bg-green-500/10 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
            </div>
                        <div>
                            <h3 className="text-green-400 font-semibold">Spiel erfolgreich gespeichert!</h3>
                            <p className="text-green-300 text-sm">Alle Felder wurden zurückgesetzt. Sie können jetzt ein neues Spiel eintragen.</p>
            </div> 
            </div> 
                </div>
            )}
            
            {/* Match Type Selection */}
            <div className="gradient-card p-4 sm:p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-400">Spieltyp auswählen</h2>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            setMatchType('singles');
                            resetForm(); // Reset form when switching match types
                            setShowSuccess(false); // Hide success message when switching
                        }}
                        disabled={isSubmitting}
                        className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                            matchType === 'singles' 
                                ? 'bg-red-500 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Einzelspiel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMatchType('doubles');
                            resetForm(); // Reset form when switching match types
                            setShowSuccess(false); // Hide success message when switching
                        }}
                        disabled={isSubmitting}
                        className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                            matchType === 'doubles' 
                                ? 'bg-red-500 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Doppelspiel
                    </button>
                </div>
            </div>

            {matchType === 'singles' ? (
                <form onSubmit={handleSubmit} className="gradient-card p-4 sm:p-8 rounded-lg space-y-4 sm:space-y-6 max-w-2xl mx-auto hover:gradient-card-hover transition-all duration-300"> 
                    <div className="mb-4 p-3 sm:p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
                        <p className="text-blue-300 text-xs sm:text-sm">📋 <strong>Spielregeln:</strong> Spieler können zwischen 0 und 10 Punkte erreichen. Kein Spieler kann mehr als 10 Punkte haben.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"> 
                        <div><label className="block mb-2 text-gray-300 text-sm sm:text-base">Spieler 1</label><Select styles={customSelectStyles} options={playerOptions} onChange={opt => setData({...data, player1Id: opt.value})} value={playerOptions.find(opt => opt.value === data.player1Id) || null} required isDisabled={isSubmitting}/></div> 
                        <div><label className="block mb-2 text-gray-300 text-sm sm:text-base">Punkte Spieler 1</label><input type="number" min="0" max="10" placeholder="0-10" value={data.player1Score} onChange={e=>setData({...data, player1Score: e.target.value})} required className="w-full h-12 sm:h-[48px] px-3 sm:px-4 form-input-enhanced rounded-lg focus:border-orange-500 focus:outline-none transition-all duration-300" disabled={isSubmitting}/></div> 
                    </div> 
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"> 
                        <div><label className="block mb-2 text-gray-300 text-sm sm:text-base">Spieler 2</label><Select styles={customSelectStyles} options={playerOptions} onChange={opt => setData({...data, player2Id: opt.value})} value={playerOptions.find(opt => opt.value === data.player2Id) || null} required isDisabled={isSubmitting}/></div> 
                        <div><label className="block mb-2 text-gray-300 text-sm sm:text-base">Punkte Spieler 2</label><input type="number" min="0" max="10" placeholder="0-10" value={data.player2Score} onChange={e=>setData({...data, player2Score: e.target.value})} required className="w-full h-12 sm:h-[48px] px-3 sm:px-4 form-input-enhanced rounded-lg focus:border-orange-500 focus:outline-none transition-all duration-300" disabled={isSubmitting}/></div> 
                    </div> 
                    <button type="submit" disabled={isSubmitting} className={`w-full py-3 btn-primary text-base sm:text-lg font-bold text-white rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:transform hover:scale-105'}`}>
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                Speichere...
                            </>
                        ) : (
                            <>
                                <Swords/>Spiel speichern
                            </>
                        )}
                    </button> 
        </form> 
            ) : (
                <form onSubmit={handleSubmit} className="gradient-card p-4 sm:p-8 rounded-lg space-y-4 sm:space-y-6 max-w-4xl mx-auto hover:gradient-card-hover transition-all duration-300"> 
                    <div className="mb-4 p-3 sm:p-4 bg-green-500/20 border border-green-500 rounded-lg">
                        <p className="text-green-300 text-xs sm:text-sm">📋 <strong>Doppelspiel-Regeln:</strong> Teams können zwischen 0 und 10 Punkte erreichen. Gewinner bekommen je 3 Punkte, Unentschieden je 1 Punkt, Verlierer 0 Punkte.</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8"> 
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-lg sm:text-xl font-bold text-green-400">Team 1</h3>
                            <div><label className="block mb-2 text-gray-300 text-sm sm:text-base">Spieler 1</label><Select styles={customSelectStyles} options={playerOptions} onChange={opt => setDoublesData({...doublesData, team1Player1Id: opt.value})} value={playerOptions.find(opt => opt.value === doublesData.team1Player1Id) || null} required isDisabled={isSubmitting}/></div> 
                            <div><label className="block mb-2 text-gray-300 text-sm sm:text-base">Spieler 2</label><Select styles={customSelectStyles} options={playerOptions} onChange={opt => setDoublesData({...doublesData, team1Player2Id: opt.value})} value={playerOptions.find(opt => opt.value === doublesData.team1Player2Id) || null} required isDisabled={isSubmitting}/></div> 
                            <div><label className="block mb-2 text-gray-300 text-sm sm:text-base">Team Punkte</label><input type="number" min="0" max="10" placeholder="0-10" value={doublesData.team1Score} onChange={e=>setDoublesData({...doublesData, team1Score: e.target.value})} required className="w-full h-12 sm:h-[48px] px-3 sm:px-4 form-input-enhanced rounded-lg focus:border-orange-500 focus:outline-none transition-all duration-300" disabled={isSubmitting}/></div> 
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-lg sm:text-xl font-bold text-red-400">Team 2</h3>
                            <div><label className="block mb-2 text-gray-300 text-sm sm:text-base">Spieler 1</label><Select styles={customSelectStyles} options={playerOptions} onChange={opt => setDoublesData({...doublesData, team2Player1Id: opt.value})} value={playerOptions.find(opt => opt.value === doublesData.team2Player1Id) || null} required isDisabled={isSubmitting}/></div> 
                            <div><label className="block mb-2 text-gray-300 text-sm sm:text-base">Spieler 2</label><Select styles={customSelectStyles} options={playerOptions} onChange={opt => setDoublesData({...doublesData, team2Player2Id: opt.value})} value={playerOptions.find(opt => opt.value === doublesData.team2Player2Id) || null} required isDisabled={isSubmitting}/></div> 
                            <div><label className="block mb-2 text-gray-300 text-sm sm:text-base">Team Punkte</label><input type="number" min="0" max="10" placeholder="0-10" value={doublesData.team2Score} onChange={e=>setDoublesData({...doublesData, team2Score: e.target.value})} required className="w-full h-12 sm:h-[48px] px-3 sm:px-4 form-input-enhanced rounded-lg focus:border-orange-500 focus:outline-none transition-all duration-300" disabled={isSubmitting}/></div> 
                        </div>
                    </div> 
                    <button type="submit" disabled={isSubmitting} className={`w-full py-3 btn-primary text-base sm:text-lg font-bold text-white rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:transform hover:scale-105'}`}>
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                Speichere...
                            </>
                        ) : (
                            <>
                                <Swords/>Doppelspiel speichern
                            </>
                        )}
                    </button> 
                </form>
            )}
        </div>
    );
};

// History Sidebar Component
const HistorySidebar = ({ matches, players, leaderboardData, onEdit, onDelete, editingMatch, setEditingMatch, onClose }) => {
    const [sortBy, setSortBy] = useState('date');
    const [filterBy, setFilterBy] = useState('all');
    
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    
    // Use the same effective match type logic
    const effectiveMatchType = useMemo(() => {
        const firstDoublesIndex = matches.findIndex(m => m.matchType === 'doubles');
        return (match, index) => {
            if (firstDoublesIndex === -1 || index < firstDoublesIndex) {
                return 'singles';
            }
            return match.matchType || 'singles';
        };
    }, [matches]);
    
    const sortedMatches = useMemo(() => {
        let sorted = [...matches];
        switch (sortBy) {
            case 'date':
                sorted.sort((a, b) => b.createdAt - a.createdAt);
                break;
            case 'player':
                sorted.sort((a, b) => {
                    const aType = effectiveMatchType(a, matches.indexOf(a));
                    const bType = effectiveMatchType(b, matches.indexOf(b));
                    if (aType === 'doubles') {
                        const team1Name = `${playerMap.get(a.team1Player1Id) || ''} & ${playerMap.get(a.team1Player2Id) || ''}`;
                        const team2Name = `${playerMap.get(a.team2Player1Id) || ''} & ${playerMap.get(a.team2Player2Id) || ''}`;
                        return team1Name.localeCompare(team2Name);
                    } else {
                        const p1Name = playerMap.get(a.player1Id) || '';
                        const p2Name = playerMap.get(a.player2Id) || '';
                        return p1Name.localeCompare(p2Name);
                    }
                });
                break;
            case 'score':
                sorted.sort((a, b) => {
                    const aType = effectiveMatchType(a, matches.indexOf(a));
                    const bType = effectiveMatchType(b, matches.indexOf(b));
                    if (aType === 'doubles') {
                        return (b.team1Score + b.team2Score) - (a.team1Score + a.player2Score);
                    } else {
                        return (b.player1Score + b.player2Score) - (a.player1Score + a.player2Score);
                    }
                });
                break;
            case 'tournament_points':
                // Sort by tournament points (highest first)
                sorted.sort((a, b) => {
                    const aPlayer = players.find(p => p.id === a.player1Id || p.id === a.team1Player1Id);
                    const bPlayer = players.find(p => p.id === b.player1Id || p.id === b.team1Player1Id);
                    const aPoints = aPlayer?.tournamentPoints || 0;
                    const bPoints = bPlayer?.tournamentPoints || 0;
                    return bPoints - aPoints;
                });
                break;
            default:
                break;
        }
        return sorted;
    }, [matches, sortBy, playerMap, effectiveMatchType, players]);
    
    const filteredMatches = useMemo(() => {
        if (filterBy === 'all') return sortedMatches;
        if (filterBy === 'tournament') {
            // Show players with tournament points from computed leaderboard
            const playersWithTournamentPoints = (leaderboardData || []).filter(p => (p.tournamentPoints || 0) > 0);
            return playersWithTournamentPoints.map(player => ({
                id: `tournament_${player.id}`,
                type: 'tournament_points',
                player: player,
                createdAt: Date.now() // Use current time for sorting
            }));
        }
        return sortedMatches.filter(match => {
            const matchType = effectiveMatchType(match, matches.indexOf(match));
            return matchType === filterBy;
        });
    }, [sortedMatches, filterBy, leaderboardData, effectiveMatchType, matches]);
    
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    return (
                        <div className="fixed right-0 top-0 h-full w-full sm:w-96 history-sidebar border-l border-white/20 shadow-2xl z-40 overflow-y-auto animate-slide-in-right bg-gray-900">
            <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-red-400">Spielverlauf</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Sort and Filter Controls */}
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Sortieren nach:</label>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-2 sm:px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-red-500 focus:outline-none text-sm"
                        >
                            <option value="date">Datum (Neueste zuerst)</option>
                            <option value="player">Spieler (Alphabetisch)</option>
                            <option value="score">Punktzahl (Höchste zuerst)</option>
                            <option value="tournament_points">Turnier Punkte (Höchste zuerst)</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Filter:</label>
                        <select 
                            value={filterBy} 
                            onChange={(e) => setFilterBy(e.target.value)}
                            className="w-full px-2 sm:px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-red-500 focus:outline-none text-sm"
                        >
                            <option value="all">Alle Spiele</option>
                            <option value="singles">Einzelspiele</option>
                            <option value="doubles">Doppelspiele</option>
                            <option value="tournament">Turnier Punkte</option>
                        </select>
                    </div>
                </div>
                
                {/* Matches List */}
                <div className="space-y-2 sm:space-y-3">
                    {filteredMatches.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                            <p className="text-sm sm:text-base">Keine Spiele gefunden</p>
                        </div>
                    ) : (
                        filteredMatches.map((item) => {
                            // Handle tournament point entries
                            if (item.type === 'tournament_points') {
                                return (
                                    <div key={item.id} className="bg-yellow-500/20 border border-yellow-500/40 p-3 sm:p-4 rounded-lg hover:bg-yellow-500/30 transition-all duration-300">
                                        <div className="flex justify-between items-start mb-2 sm:mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="text-xs sm:text-sm text-gray-400">
                                                    Turnier Ergebnis
                                                </div>
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                                    Turnier
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="text-center">
                                            <div className="text-yellow-400 font-semibold text-lg mb-2">
                                                {item.player.name}
                                            </div>
                                            <div className="text-2xl font-bold text-yellow-400">
                                                +{item.player.tournamentPoints} Punkte
                                            </div>
                                            <div className="text-sm text-gray-300 mt-2">
                                                Gesamtpunkte: {item.player.points}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            
                            // Handle regular matches
                            const matchType = effectiveMatchType(item, matches.indexOf(item));
                            return (
                                <div key={item.id} className={`bg-gray-800/50 border border-gray-600 p-3 sm:p-4 rounded-lg hover:bg-gray-700/50 transition-all duration-300 ${
                                    matchType === 'doubles' ? 'match-type-doubles' : 'match-type-singles'
                                }`}>
                                    {editingMatch?.id === item.id ? (
                                        <EditMatchForm 
                                            match={item} 
                                            players={players}
                                            onSave={(newData) => onEdit(item.id, newData)}
                                            onCancel={() => setEditingMatch(null)}
                                        />
                                    ) : (
                                        <div>
                                            <div className="flex justify-between items-start mb-2 sm:mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs sm:text-sm text-gray-400">
                                                        {formatDate(item.createdAt)}
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        matchType === 'doubles' 
                                                            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                    }`}>
                                                        {matchType === 'doubles' ? 'Doppel' : 'Einzel'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1 sm:gap-2">
                                                    <button
                                                        onClick={() => setEditingMatch(item)}
                                                        className="text-blue-400 hover:text-blue-300 transition-colors p-1 hover:bg-blue-500/20 rounded"
                                                        title="Bearbeiten"
                                                    >
                                                        <Edit3 size={14} className="sm:w-4 sm:h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(item.id)}
                                                        className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-500/20 rounded"
                                                        title="Löschen"
                                                    >
                                                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="text-center">
                                                <div className="flex justify-between items-center">
                                                    <div className="text-center flex-1">
                                                        <div className="font-bold text-xs sm:text-sm mb-1">
                                                            {matchType === 'doubles' ? (
                                                                <>
                                                                    {playerMap.get(item.team1Player1Id)} & {playerMap.get(item.team1Player2Id)}
                                                                </>
                                                            ) : (
                                                                playerMap.get(item.player1Id)
                                                            )}
                                                        </div>
                                                        <div className={`text-2xl sm:text-3xl font-black ${matchType === 'doubles' ? (item.team1Score > item.team2Score ? 'text-green-400' : '') : (item.player1Score > item.player2Score ? 'text-green-400' : '')}`}>
                                                            {matchType === 'doubles' ? item.team1Score : item.player1Score}
                                                        </div>
                                                    </div>
                                                    <div className="text-center mx-2 sm:mx-4 text-gray-400 font-semibold text-sm sm:text-lg">
                                                        vs
                                                    </div>
                                                    <div className="text-center flex-1">
                                                        <div className="font-bold text-xs sm:text-sm mb-1">
                                                            {matchType === 'doubles' ? (
                                                                <>
                                                                    {playerMap.get(item.team2Player1Id)} & {playerMap.get(item.team2Player2Id)}
                                                                </>
                                                            ) : (
                                                                playerMap.get(item.player2Id)
                                                            )}
                                                        </div>
                                                        <div className={`text-2xl sm:text-3xl font-black ${matchType === 'doubles' ? (item.team2Score > item.team1Score ? 'text-green-400' : '') : (item.player2Score > item.player1Score ? 'text-green-400' : '')}`}>
                                                            {matchType === 'doubles' ? item.team2Score : item.player2Score}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};


