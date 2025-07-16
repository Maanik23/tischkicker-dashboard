import React, { useState } from 'react';
import { getDatabase, ref, update } from 'firebase/database';

const TournamentGames = ({ tournament, onGameUpdate }) => {
    const [editingGameId, setEditingGameId] = useState(null);
    // This state will only hold the scores for the *one* game being edited.
    const [currentScores, setCurrentScores] = useState({ score1: '', score2: '' });

    const handleEdit = (game) => {
        setEditingGameId(game.id);
        setCurrentScores({
            score1: game.score1 !== null ? game.score1 : '',
            score2: game.score2 !== null ? game.score2 : '',
        });
    };

    const handleCancel = () => {
        setEditingGameId(null);
        setCurrentScores({ score1: '', score2: '' });
    };

    const handleScoreChange = (player, value) => {
        // Only update the scores for the game currently being edited.
        setCurrentScores(prev => ({
            ...prev,
            [player]: value
        }));
    };

    const handleUpdateScore = () => {
        if (currentScores.score1 === '' || currentScores.score2 === '') return;
        
        const db = getDatabase();
        // Use editingGameId to ensure we're updating the correct game.
        const gameRef = ref(db, `tournaments/${tournament.id}/games/${editingGameId}`);
        
        update(gameRef, {
            score1: parseInt(currentScores.score1, 10),
            score2: parseInt(currentScores.score2, 10),
        }).then(() => {
            onGameUpdate(); // Notify parent to refresh data
            handleCancel(); // Reset local state
        });
    };
    
    const handleResetScore = (game) => {
        const db = getDatabase();
        const gameRef = ref(db, `tournaments/${tournament.id}/games/${game.id}`);
        update(gameRef, { score1: null, score2: null }).then(() => onGameUpdate());
    };

    const isTournamentFinished = tournament.status === 'finished';
    const isPlayed = (game) => game.score1 !== null && game.score2 !== null;

    return (
        <div className="space-y-4">
            {tournament.games?.map((game) => (
                <div key={game.id} className={`p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 ${isPlayed(game) ? 'bg-green-800/20 border-l-4 border-green-500' : 'bg-white/5'}`}>
                    <div className="font-semibold text-lg text-center md:text-left flex-1">
                        <span>{game.player1.name}</span>
                        <span className="text-gray-400 mx-2">vs</span>
                        <span>{game.player2.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {editingGameId === game.id ? (
                            <>
                                <input type="number" min="0" value={currentScores.score1} onChange={(e) => handleScoreChange('score1', e.target.value)} className="w-20 h-10 px-2 bg-gray-700 rounded-md border border-gray-600 text-center" />
                                <span className="font-bold">-</span>
                                <input type="number" min="0" value={currentScores.score2} onChange={(e) => handleScoreChange('score2', e.target.value)} className="w-20 h-10 px-2 bg-gray-700 rounded-md border border-gray-600 text-center" />
                                <button onClick={handleUpdateScore} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Speichern</button>
                                <button onClick={handleCancel} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">Abbrechen</button>
                            </>
                        ) : (
                            <>
                                {isPlayed(game) ? (
                                    <p className="text-2xl font-bold text-green-400 w-24 text-center">{game.score1} - {game.score2}</p>
                                ) : (
                                    <p className="text-gray-400 w-24 text-center">-- : --</p>
                                )}
                                {!isTournamentFinished && (
                                     <>
                                        <button onClick={() => handleEdit(game)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                                            {isPlayed(game) ? 'Bearbeiten' : 'Ergebnis eintragen'}
                                        </button>
                                        {isPlayed(game) && <button onClick={() => handleResetScore(game)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Zurücksetzen</button>}
                                     </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TournamentGames;
