import React, { useState } from 'react';
import { getDatabase, ref, update } from 'firebase/database';
import { Trophy, Swords, Crown } from 'lucide-react';

const PlayoffMatch = ({ match, matchId, tournamentId, onUpdate, disabled }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [gameScores, setGameScores] = useState(
        match.games ? match.games.map(game => ({
            score1: game.score1 !== null ? game.score1 : '',
            score2: game.score2 !== null ? game.score2 : ''
        })) : [
            { score1: '', score2: '' },
            { score1: '', score2: '' },
            { score1: '', score2: '' }
        ]
    );
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = () => {
        // Validate that all games have scores
        const hasIncompleteScores = gameScores.some(game => game.score1 === '' || game.score2 === '');
        if (hasIncompleteScores) {
            alert('Bitte füllen Sie alle Spiele aus.');
            return;
        }
        
        // Validate each game
        for (let i = 0; i < gameScores.length; i++) {
            const score1 = parseInt(gameScores[i].score1);
            const score2 = parseInt(gameScores[i].score2);
            
            // Validate that one player has reached 10 points
            if (score1 < 10 && score2 < 10) {
                alert(`Spiel ${i + 1}: Ein Spieler muss mindestens 10 Punkte erreichen, um das Spiel zu gewinnen.`);
                return;
            }
            
            // Validate that the winner has exactly 10 points
            if (score1 > 10 && score2 > 10) {
                alert(`Spiel ${i + 1}: Nur ein Spieler kann 10 Punkte erreichen. Das Spiel endet, wenn ein Spieler 10 Punkte erreicht.`);
                return;
            }
        }
        
        setIsLoading(true);
        const db = getDatabase();
        const matchRef = ref(db, `tournaments/${tournamentId}/playoffs/${matchId}`);
        
        // Convert scores to numbers
        const games = gameScores.map(game => ({
            score1: parseInt(game.score1),
            score2: parseInt(game.score2)
        }));
        
        update(matchRef, {
            ...match,
            games: games
        }).then(() => {
            setIsEditing(false);
            setIsLoading(false);
            // Add a small delay to ensure Firebase update is complete
            setTimeout(() => {
                onUpdate();
            }, 500);
        }).catch((error) => {
            console.error('Error saving playoff score:', error, { matchId, match, tournamentId });
            alert('Fehler beim Speichern des Ergebnisses. Bitte versuchen Sie es erneut.\n' + error.message);
            setIsLoading(false);
        });
    };

    // Determine winner based on best-of-three
    const determineWinner = () => {
        if (!match.games || !Array.isArray(match.games) || match.games.length === 0) return null;
        
        let p1Wins = 0;
        let p2Wins = 0;
        
        match.games.forEach(game => {
            if (game && game.score1 !== null && game.score2 !== null) {
                if (game.score1 > game.score2) {
                    p1Wins++;
                } else if (game.score2 > game.score1) {
                    p2Wins++;
                }
            }
        });
        
        if (p1Wins > p2Wins) return match.p1;
        if (p2Wins > p1Wins) return match.p2;
        return null; // No winner yet or tie
    };

    const winner = determineWinner();
    const isReady = match.p1 && match.p2;
    const isCompleted = match.games && Array.isArray(match.games) && match.games.every(game => game && game.score1 !== null && game.score2 !== null);
    const gamesPlayed = match.games && Array.isArray(match.games) ? match.games.filter(game => game && game.score1 !== null && game.score2 !== null).length : 0;

    return (
        <div className="relative">
            {/* Match Card */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700/50 hover:border-red-500/50 transition-all duration-300 min-w-[320px]">
                {/* Match Header */}
                <div className="flex items-center justify-center mb-3">
                    <Swords className="w-6 h-6 text-red-400 mr-2" />
                    <h4 className="font-bold text-red-400 text-lg uppercase tracking-wider">{match.name}</h4>
                </div>
                
                {/* Players */}
                <div className="space-y-2 mb-4">
                    <div className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                        winner && winner.id === match.p1?.id 
                            ? 'bg-gradient-to-r from-green-600/20 to-green-800/20 border border-green-500' 
                            : 'bg-gray-700/50 border border-gray-600'
                    }`}>
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-bold">1</span>
                            </div>
                            <span className="font-semibold text-white">{match.p1?.name || 'TBD'}</span>
                        </div>
                        {winner && winner.id === match.p1?.id && (
                            <Crown className="w-5 h-5 text-yellow-400" />
                        )}
                    </div>
                    
                    <div className="text-center text-gray-400 text-xs font-bold">VS</div>
                    
                    <div className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                        winner && winner.id === match.p2?.id 
                            ? 'bg-gradient-to-r from-green-600/20 to-green-800/20 border border-green-500' 
                            : 'bg-gray-700/50 border border-gray-600'
                    }`}>
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-bold">2</span>
                            </div>
                            <span className="font-semibold text-white">{match.p2?.name || 'TBD'}</span>
                        </div>
                        {winner && winner.id === match.p2?.id && (
                            <Crown className="w-5 h-5 text-yellow-400" />
                        )}
                    </div>
                </div>

                {/* Best of Three Games */}
                <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-300 mb-2 text-center">Best of Three</h5>
                    <div className="space-y-2">
                        {[0, 1, 2].map((gameIndex) => (
                            <div key={gameIndex} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                                <span className="text-xs text-gray-400">Spiel {gameIndex + 1}</span>
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={gameScores[gameIndex].score1} 
                                            onChange={e => {
                                                const newScores = [...gameScores];
                                                newScores[gameIndex].score1 = e.target.value;
                                                setGameScores(newScores);
                                            }} 
                                            className="w-12 h-8 text-sm text-center bg-gray-700 rounded border border-gray-600 text-white font-bold"
                                            min="0"
                                            max="10"
                                            placeholder="0-10"
                                        />
                                        <span className="text-xs text-gray-400">-</span>
                                        <input 
                                            type="number" 
                                            value={gameScores[gameIndex].score2} 
                                            onChange={e => {
                                                const newScores = [...gameScores];
                                                newScores[gameIndex].score2 = e.target.value;
                                                setGameScores(newScores);
                                            }} 
                                            className="w-12 h-8 text-sm text-center bg-gray-700 rounded border border-gray-600 text-white font-bold"
                                            min="0"
                                            max="10"
                                            placeholder="0-10"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white">
                                            {match.games && match.games[gameIndex] && match.games[gameIndex].score1 !== null 
                                                ? match.games[gameIndex].score1 : '--'}
                                        </span>
                                        <span className="text-xs text-gray-400">-</span>
                                        <span className="text-sm font-bold text-white">
                                            {match.games && match.games[gameIndex] && match.games[gameIndex].score2 !== null 
                                                ? match.games[gameIndex].score2 : '--'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {/* Progress indicator */}
                    <div className="mt-2 text-center">
                        <span className="text-xs text-gray-400">
                            {gamesPlayed}/3 Spiele gespielt
                        </span>
                    </div>
                </div>
                
                {/* Action Buttons */}
                {!disabled && isReady && (
                    <div className="mt-4 flex justify-center">
                        {isEditing ? (
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleSave} 
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                                >
                                    {isLoading ? 'Speichern...' : 'Speichern'}
                                </button>
                                <button 
                                    onClick={() => setIsEditing(false)} 
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)} 
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                            >
                                {isCompleted ? 'Bearbeiten' : 'Ergebnisse eintragen'}
                            </button>
                        )}
                    </div>
                )}
                
                {!isReady && (
                    <div className="mt-4 text-center">
                        <span className="text-xs text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
                            ⏳ Wartet auf vorherige Ergebnisse
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};


const TournamentBracket = ({ tournament, onUpdate }) => {
    const { playoffs, status } = tournament;

    if (!playoffs) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">Die Gruppenphase muss erst abgeschlossen werden, um den Turnierbaum anzuzeigen.</p>
                </div>
            </div>
        );
    }

    const finalWinner = status === 'finished' && playoffs.final.winner ? playoffs.final.winner : null;

    // Show tournament status
    const getStatusMessage = () => {
        if (status === 'finished') {
            return (
                <div className="text-center mb-8">
                    <div className="inline-flex items-center bg-yellow-500/20 border border-yellow-500 rounded-full px-6 py-3">
                        <Crown className="w-5 h-5 text-yellow-400 mr-2" />
                        <span className="text-yellow-400 font-bold">🏆 Turnier abgeschlossen! 🏆</span>
                    </div>
                </div>
            );
        } else if (status === 'playoffs') {
            return (
                <div className="text-center mb-8">
                    <div className="inline-flex items-center bg-blue-500/20 border border-blue-500 rounded-full px-6 py-3">
                        <Swords className="w-5 h-5 text-blue-400 mr-2" />
                        <span className="text-blue-400 font-bold">⚽ Playoff-Phase läuft ⚽</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            {getStatusMessage()}
            
            {/* Playoff Process Explanation */}
            <div className="mb-8 p-6 gradient-card rounded-xl hover:gradient-card-hover transition-all duration-300">
                <h3 className="text-lg font-bold text-red-400 mb-3">📋 Playoff-Ablauf erklärt:</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>
                        <p className="mb-2"><strong className="text-red-400">1. Qualifier 1:</strong> Top 2 Spieler kämpfen um den direkten Finaleinzug</p>
                        <p className="mb-2"><strong className="text-red-400">2. Eliminator:</strong> Platz 3 & 4 spielen um den letzten Hoffnungsschuss</p>
                        <p className="mb-2"><strong className="text-blue-400">Best of Three:</strong> Alle Matches werden im Best-of-Three Format gespielt</p>
                    </div>
                    <div>
                        <p className="mb-2"><strong className="text-green-400">3. Qualifier 2:</strong> Verlierer Qualifier 1 vs Sieger Eliminator</p>
                        <p className="mb-2"><strong className="text-yellow-400">4. Finale:</strong> Sieger Qualifier 1 vs Sieger Qualifier 2</p>
                        <p className="mb-2"><strong className="text-purple-400">Gewinner:</strong> Der Finalist wird Turniersieger und erhält einen Turniersieg</p>
                    </div>
                </div>
            </div>
            
            {/* Professional Tournament Bracket */}
            <div className="relative">
                {/* Round Headers */}
                <div className="grid grid-cols-3 gap-8 mb-6">
                    <div className="text-center">
                        <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                            <h3 className="text-lg font-bold text-white">1. Runde</h3>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                            <h3 className="text-lg font-bold text-white">2. Runde</h3>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                            <h3 className="text-lg font-bold text-white">Finale</h3>
                        </div>
                    </div>
                </div>

                {/* Bracket Structure */}
                <div className="grid grid-cols-3 gap-8 items-start">
                    {/* Round 1 - Left Column */}
                    <div className="flex flex-col items-center space-y-8">
                        <PlayoffMatch 
                            match={playoffs.qualifier1} 
                            matchId="qualifier1" 
                            tournamentId={tournament.id} 
                            onUpdate={onUpdate} 
                            disabled={status === 'finished'} 
                        />
                        <PlayoffMatch 
                            match={playoffs.eliminator} 
                            matchId="eliminator" 
                            tournamentId={tournament.id} 
                            onUpdate={onUpdate} 
                            disabled={status === 'finished'} 
                        />
                    </div>

                    {/* Round 2 - Middle Column */}
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <PlayoffMatch 
                            match={playoffs.qualifier2} 
                            matchId="qualifier2" 
                            tournamentId={tournament.id} 
                            onUpdate={onUpdate} 
                            disabled={status === 'finished'} 
                        />
                    </div>

                    {/* Final - Right Column */}
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        {/* Trophy */}
                        <div className="mb-6 text-center">
                            <div className={`relative inline-block ${finalWinner ? 'animate-pulse' : ''}`}>
                                <Trophy className={`w-20 h-20 ${finalWinner ? 'text-yellow-400' : 'text-gray-600'}`} />
                                {finalWinner && (
                                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                                        <Crown className="w-5 h-5 text-yellow-400" />
                                    </div>
                                )}
                            </div>
                            {finalWinner && (
                                <p className="text-center text-yellow-400 font-bold mt-2 text-sm">
                                    {finalWinner.name} ist der Sieger!
                                </p>
                            )}
                        </div>
                        
                        {/* Final Match */}
                        <PlayoffMatch 
                            match={playoffs.final} 
                            matchId="final" 
                            tournamentId={tournament.id} 
                            onUpdate={onUpdate} 
                            disabled={status === 'finished'} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TournamentBracket;
