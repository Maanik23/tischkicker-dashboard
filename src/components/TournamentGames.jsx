import React, { useState, useEffect } from 'react';
import { getDatabase, ref, update } from 'firebase/database';
import { customSelectStyles } from '../styles/selectStyles';


const TournamentGames = ({ tournament }) => {
    const [games, setGames] = useState(tournament.games || []);
    const [scores, setScores] = useState({});
    
    useEffect(() => {
        setGames(tournament.games || []);
    }, [tournament.games]);

    const handleScoreChange = (gameId, player, value) => {
        setScores(prev => ({
            ...prev,
            [gameId]: {
                ...prev[gameId],
                [player]: value
            }
        }));
    };

    const handleUpdateScore = (gameId) => {
        const db = getDatabase();
        const scoreToUpdate = scores[gameId];
        if (scoreToUpdate && scoreToUpdate.score1 !== undefined && scoreToUpdate.score2 !== undefined) {
            const gameIndex = games.findIndex(g => g.id === gameId);
            const gameRef = ref(db, `tournaments/${tournament.id}/games/${gameIndex}`);
            
            update(gameRef, {
                score1: parseInt(scoreToUpdate.score1),
                score2: parseInt(scoreToUpdate.score2),
            });
        }
    };

    if (tournament.status === 'setup') {
        return (
            <div className="bg-black/40 p-8 rounded-lg border border-white/10 text-center">
                <p className="text-xl text-orange-400">Das Turnier hat noch nicht begonnen.</p>
                <p className="text-gray-300 mt-2">Fügen Sie Teilnehmer hinzu und klicken Sie auf "Starten", um die Spiele zu generieren.</p>
            </div>
        )
    }

    return (
        <div className="bg-black/40 p-8 rounded-lg border border-white/10">
            <h2 className="text-2xl font-bold text-orange-400 mb-6">{tournament.name} - Spiele</h2>
            <div className="space-y-4">
                {games.map((game) => (
                    <div key={game.id} className="bg-white/5 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="font-semibold text-lg text-center md:text-left">
                            <span>{game.player1.name}</span>
                            <span className="text-gray-400 mx-2">vs</span>
                            <span>{game.player2.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {game.score1 !== null && game.score2 !== null ? (
                                <p className="text-2xl font-bold text-green-400">{game.score1} - {game.score2}</p>
                            ) : (
                                <>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="P1"
                                        className="w-20 h-10 px-2 bg-gray-700 rounded-md border border-gray-600 text-center"
                                        onChange={(e) => handleScoreChange(game.id, 'score1', e.target.value)}
                                    />
                                    <span className="font-bold">-</span>
                                     <input
                                        type="number"
                                        min="0"
                                        placeholder="P2"
                                        className="w-20 h-10 px-2 bg-gray-700 rounded-md border border-gray-600 text-center"
                                        onChange={(e) => handleScoreChange(game.id, 'score2', e.target.value)}
                                    />
                                    <button 
                                        onClick={() => handleUpdateScore(game.id)} 
                                        className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Speichern
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TournamentGames;
