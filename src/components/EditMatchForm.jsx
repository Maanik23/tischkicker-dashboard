import React, { useState } from 'react';
import { Save } from 'lucide-react';

const EditMatchForm = ({ match, onSave, onCancel, players }) => {
    const [scores, setScores] = useState({
        player1Score: match.player1Score || 0,
        player2Score: match.player2Score || 0,
        team1Score: match.team1Score || 0,
        team2Score: match.team2Score || 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (match.matchType === 'doubles') {
            // Validate doubles scores
            if (scores.team1Score > 10 || scores.team2Score > 10) {
                alert('Kein Team kann mehr als 10 Punkte haben.');
                return;
            }
            
            setIsSubmitting(true);
            try {
                await onSave({
                    ...match,
                    team1Score: Number(scores.team1Score),
                    team2Score: Number(scores.team2Score),
                    player1Score: Number(scores.team1Score), // For compatibility
                    player2Score: Number(scores.team2Score)
                });
            } catch (error) {
                console.error('Error updating match:', error);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // Validate singles scores
            if (scores.player1Score > 10 || scores.player2Score > 10) {
                alert('Kein Spieler kann mehr als 10 Punkte haben.');
                return;
            }
            
            setIsSubmitting(true);
            try {
                await onSave({
                    ...match,
                    player1Score: Number(scores.player1Score),
                    player2Score: Number(scores.player2Score)
                });
            } catch (error) {
                console.error('Error updating match:', error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const getPlayerName = (playerId) => {
        const player = players.find(p => p.id === playerId);
        return player ? player.name : 'Unbekannt';
    };

    if (match.matchType === 'doubles') {
        return (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div>
                        <label className="block text-xs sm:text-sm text-gray-300 mb-1">
                            Team 1 ({getPlayerName(match.team1Player1Id)} & {getPlayerName(match.team1Player2Id)}) Punkte
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={scores.team1Score}
                            onChange={(e) => setScores({...scores, team1Score: e.target.value})}
                            className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded text-xs sm:text-sm text-white focus:border-red-500 focus:outline-none"
                            required
                            disabled={isSubmitting}
                        />
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm text-gray-300 mb-1">
                            Team 2 ({getPlayerName(match.team2Player1Id)} & {getPlayerName(match.team2Player2Id)}) Punkte
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={scores.team2Score}
                            onChange={(e) => setScores({...scores, team2Score: e.target.value})}
                            className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded text-xs sm:text-sm text-white focus:border-red-500 focus:outline-none"
                            required
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
                <div className="flex gap-2 sm:gap-3">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white text-xs sm:text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                                Speichere...
                            </>
                        ) : (
                            <>
                                <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                                Speichern
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-3 sm:px-4 py-2 bg-gray-600 text-white text-xs sm:text-sm rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Abbrechen
                    </button>
                </div>
            </form>
        );
    }

    // Singles match form
    return (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-gray-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                    <label className="block text-xs sm:text-sm text-gray-300 mb-1">
                        {getPlayerName(match.player1Id)} Punkte
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="10"
                        value={scores.player1Score}
                        onChange={(e) => setScores({...scores, player1Score: e.target.value})}
                        className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded text-xs sm:text-sm text-white focus:border-red-500 focus:outline-none"
                        required
                        disabled={isSubmitting}
                    />
                </div>
                <div>
                    <label className="block text-xs sm:text-sm text-gray-300 mb-1">
                        {getPlayerName(match.player2Id)} Punkte
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="10"
                        value={scores.player2Score}
                        onChange={(e) => setScores({...scores, player2Score: e.target.value})}
                        className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded text-xs sm:text-sm text-white focus:border-red-500 focus:outline-none"
                        required
                        disabled={isSubmitting}
                    />
                </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white text-xs sm:text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                            Speichere...
                        </>
                    ) : (
                        <>
                            <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                            Speichern
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-3 sm:px-4 py-2 bg-gray-600 text-white text-xs sm:text-sm rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Abbrechen
                </button>
            </div>
        </form>
    );
};

export default EditMatchForm;



