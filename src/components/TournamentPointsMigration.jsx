import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { Trophy, AlertTriangle, CheckCircle } from 'lucide-react';

const TournamentPointsMigration = () => {
    const [tournaments, setTournaments] = useState([]);
    const [players, setPlayers] = useState([]);
    const [migrationStatus, setMigrationStatus] = useState('idle'); // idle, running, completed, error
    const [migrationLog, setMigrationLog] = useState([]);
    
    const db = getDatabase();

    useEffect(() => {
        // Load tournaments and players
        const tournamentsRef = ref(db, 'tournaments');
        const playersRef = ref(db, 'players');

        const unsubscribeTournaments = onValue(tournamentsRef, (snapshot) => {
            if (snapshot.exists()) {
                const tournamentsData = Object.entries(snapshot.val()).map(([id, tournament]) => ({
                    id,
                    ...tournament
                }));
                setTournaments(tournamentsData);
            }
        });

        const unsubscribePlayers = onValue(playersRef, (snapshot) => {
            if (snapshot.exists()) {
                const playersData = Object.entries(snapshot.val()).map(([id, player]) => ({
                    id,
                    ...player
                }));
                setPlayers(playersData);
            }
        });

        return () => {
            unsubscribeTournaments();
            unsubscribePlayers();
        };
    }, [db]);

    const addLogEntry = (message, type = 'info') => {
        setMigrationLog(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
    };

    const migrateTournamentPoints = async () => {
        setMigrationStatus('running');
        setMigrationLog([]);
        
        addLogEntry('Starting tournament points migration...', 'info');
        
        try {
            // Find tournaments with participants that haven't been processed for points
            const tournamentsToProcess = tournaments.filter(t => 
                t.participants && 
                t.participants.length > 0 &&
                !t.pointsAwarded
            );

            // Also check for tournaments that might have winners but aren't marked as finished
            const tournamentsWithWinners = tournaments.filter(t => 
                t.participants && 
                t.participants.length > 0 &&
                t.winner && 
                !t.pointsAwarded
            );

            const finishedTournaments = [...tournamentsToProcess, ...tournamentsWithWinners];

            if (finishedTournaments.length === 0) {
                addLogEntry('No finished tournaments found to process.', 'warning');
                setMigrationStatus('completed');
                return;
            }

            addLogEntry(`Found ${finishedTournaments.length} finished tournament(s) to process.`, 'info');

            for (const tournament of finishedTournaments) {
                addLogEntry(`Processing tournament: ${tournament.name}`, 'info');
                
                // Check if tournament already has points awarded
                if (tournament.pointsAwarded) {
                    addLogEntry(`Tournament ${tournament.name} already has points awarded, skipping.`, 'warning');
                    continue;
                }

                // Award points to all participants
                for (const participant of tournament.participants) {
                    const player = players.find(p => p.id === participant.id);
                    if (!player) {
                        addLogEntry(`Player ${participant.name} not found in players list.`, 'error');
                        continue;
                    }

                    // Calculate points for this participant
                    let pointsToAdd = 5; // Base participation points
                    let reason = `Tournament Participation: ${tournament.name}`;

                    // Check if tournament has winners and award placement points
                    if (tournament.winner && tournament.winner.id === participant.id) {
                        pointsToAdd += 20; // 1st place
                        reason = `Tournament 1st Place: ${tournament.name}`;
                    } else if (tournament.runnerUp && tournament.runnerUp.id === participant.id) {
                        pointsToAdd += 15; // 2nd place
                        reason = `Tournament 2nd Place: ${tournament.name}`;
                    } else if (tournament.thirdPlace && tournament.thirdPlace.id === participant.id) {
                        pointsToAdd += 10; // 3rd place
                        reason = `Tournament 3rd Place: ${tournament.name}`;
                    }

                    // If tournament is finished but no specific placement, award participation points only
                    if (tournament.status === 'finished' && !tournament.winner) {
                        reason = `Tournament Participation (Completed): ${tournament.name}`;
                    }

                    // Update player's tournament points
                    const playerRef = ref(db, `players/${participant.id}`);
                    const currentTournamentPoints = player.tournamentPoints || 0;
                    
                    await update(playerRef, {
                        tournamentPoints: currentTournamentPoints + pointsToAdd
                    });

                    addLogEntry(`Awarded ${pointsToAdd} points to ${participant.name}: ${reason}`, 'success');
                }

                                        // Mark tournament as processed and finished if it has a winner
                        const tournamentRef = ref(db, `tournaments/${tournament.id}`);
                        const updates = {
                            pointsAwarded: true,
                            pointsAwardedAt: Date.now()
                        };
                        
                        // If tournament has a winner but isn't marked as finished, mark it as finished
                        if (tournament.winner && tournament.status !== 'finished') {
                            updates.status = 'finished';
                            updates.finishedAt = Date.now();
                        }
                        
                        await update(tournamentRef, updates);

                addLogEntry(`Tournament ${tournament.name} marked as processed.`, 'success');
            }

            addLogEntry('Tournament points migration completed successfully!', 'success');
            setMigrationStatus('completed');

        } catch (error) {
            addLogEntry(`Error during migration: ${error.message}`, 'error');
            setMigrationStatus('error');
        }
    };

    const resetMigration = () => {
        setMigrationStatus('idle');
        setMigrationLog([]);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'running': return 'text-yellow-400';
            case 'completed': return 'text-green-400';
            case 'error': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'running': return <AlertTriangle size={20} className="text-yellow-400" />;
            case 'completed': return <CheckCircle size={20} className="text-green-400" />;
            case 'error': return <AlertTriangle size={20} className="text-red-400" />;
            default: return <Trophy size={20} className="text-gray-400" />;
        }
    };

    return (
        <div className="gradient-card p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
                <Trophy size={24} className="text-yellow-400" />
                <h2 className="text-2xl font-bold text-red-400">Tournament Points Migration</h2>
            </div>

            <div className="mb-6">
                <p className="text-gray-300 mb-4">
                    This utility will process all finished tournaments and award points to participants according to the new tournament points system:
                </p>
                <ul className="text-gray-300 text-sm space-y-1 ml-4">
                    <li>• <strong>5 points</strong> for tournament participation</li>
                    <li>• <strong>10 points</strong> for 3rd place</li>
                    <li>• <strong>15 points</strong> for 2nd place</li>
                    <li>• <strong>20 points</strong> for 1st place</li>
                </ul>
            </div>

            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    {getStatusIcon(migrationStatus)}
                    <span className={`font-semibold ${getStatusColor(migrationStatus)}`}>
                        Status: {migrationStatus === 'idle' ? 'Ready' : migrationStatus === 'running' ? 'Running...' : migrationStatus === 'completed' ? 'Completed' : 'Error'}
                    </span>
                </div>

                {migrationStatus === 'idle' && (
                    <button
                        onClick={migrateTournamentPoints}
                        className="btn-primary px-6 py-3 text-white rounded-lg font-semibold hover:transform hover:scale-105 transition-all duration-300"
                    >
                        Start Migration
                    </button>
                )}

                {migrationStatus === 'completed' && (
                    <button
                        onClick={resetMigration}
                        className="btn-secondary px-6 py-3 text-white rounded-lg font-semibold hover:transform hover:scale-105 transition-all duration-300"
                    >
                        Reset & Run Again
                    </button>
                )}

                {migrationStatus === 'error' && (
                    <button
                        onClick={resetMigration}
                        className="btn-secondary px-6 py-3 text-white rounded-lg font-semibold hover:transform hover:scale-105 transition-all duration-300"
                    >
                        Try Again
                    </button>
                )}
            </div>

            {/* Migration Log */}
            {migrationLog.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">Migration Log</h3>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {migrationLog.map((entry, index) => (
                            <div key={index} className={`text-sm p-2 rounded ${
                                entry.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                entry.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                entry.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                                <span className="text-xs opacity-70">
                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                </span>
                                <span className="ml-2">{entry.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tournament Summary */}
            <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Tournament Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-800/50 border border-gray-600 rounded-lg">
                        <div className="text-2xl font-bold text-white">{tournaments.length}</div>
                        <div className="text-sm text-gray-400">Total Tournaments</div>
                    </div>
                    <div className="text-center p-3 bg-gray-800/50 border border-gray-600 rounded-lg">
                        <div className="text-2xl font-bold text-white">
                            {tournaments.filter(t => t.status === 'finished').length}
                        </div>
                        <div className="text-sm text-gray-400">Finished Tournaments</div>
                    </div>
                    <div className="text-center p-3 bg-gray-800/50 border border-gray-600 rounded-lg">
                        <div className="text-2xl font-bold text-white">
                            {tournaments.filter(t => t.pointsAwarded).length}
                        </div>
                        <div className="text-sm text-gray-400">Processed for Points</div>
                    </div>
                    <div className="text-center p-3 bg-gray-800/50 border border-gray-600 rounded-lg">
                        <div className="text-2xl font-bold text-white">{players.length}</div>
                        <div className="text-sm text-gray-400">Total Players</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TournamentPointsMigration;
