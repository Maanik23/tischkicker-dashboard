import React, { useState } from 'react';
import { getDatabase, ref, update } from 'firebase/database';
import { Trophy } from 'lucide-react';

const PlayoffMatch = ({ match, matchId, tournamentId, onUpdate, disabled }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [s1, setS1] = useState(match.score1 !== null ? match.score1 : '');
    const [s2, setS2] = useState(match.score2 !== null ? match.score2 : '');

    const handleSave = () => {
        if (s1 === '' || s2 === '') return;
        const db = getDatabase();
        update(ref(db, `tournaments/${tournamentId}/playoffs/${matchId}`), {
            score1: parseInt(s1),
            score2: parseInt(s2)
        }).then(() => {
            setIsEditing(false);
            onUpdate();
        });
    };
    
    // Determine winner only if scores are not null
    const winner = match.score1 !== null && match.score2 !== null 
        ? (match.score1 > match.score2 ? match.p1 : match.p2) 
        : null;

    return (
        <div className="w-64">
            <h4 className="font-bold text-center text-orange-400 mb-2">{match.name}</h4>
            <div className="bg-gray-800/80 rounded-lg p-1 space-y-1 border border-white/10">
                <div className={`flex items-center justify-between p-2 rounded ${winner && winner.id === match.p1?.id ? 'bg-green-700/50' : ''}`}>
                    <span className="font-semibold">{match.p1?.name || 'TBD'}</span>
                    {isEditing ? <input type="number" value={s1} onChange={e => setS1(e.target.value)} className="w-12 text-center bg-gray-900 rounded" /> : <span className="font-bold text-lg">{match.score1}</span>}
                </div>
                <div className={`flex items-center justify-between p-2 rounded ${winner && winner.id === match.p2?.id ? 'bg-green-700/50' : ''}`}>
                    <span className="font-semibold">{match.p2?.name || 'TBD'}</span>
                    {isEditing ? <input type="number" value={s2} onChange={e => setS2(e.target.value)} className="w-12 text-center bg-gray-900 rounded" /> : <span className="font-bold text-lg">{match.score2}</span>}
                </div>
            </div>
            {!disabled && match.p1 && match.p2 && (
                <div className="text-center mt-2">
                    {isEditing ? (
                        <div className="flex gap-2 justify-center">
                            <button onClick={handleSave} className="text-xs bg-green-600 px-2 py-1 rounded">Speichern</button>
                            <button onClick={() => setIsEditing(false)} className="text-xs bg-gray-600 px-2 py-1 rounded">Abbrechen</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="text-xs bg-blue-600 px-2 py-1 rounded">
                           {match.score1 !== null ? 'Bearbeiten' : 'Ergebnis eintragen'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};


const TournamentBracket = ({ tournament, onUpdate }) => {
    const { playoffs, status } = tournament;

    if (!playoffs) {
        return <p className="text-center text-gray-400 py-8">Die Gruppenphase muss erst abgeschlossen werden, um den Turnierbaum anzuzeigen.</p>;
    }

    const finalWinner = status === 'finished' && playoffs.final.score1 !== null
        ? (playoffs.final.score1 > playoffs.final.score2 ? playoffs.final.p1 : playoffs.final.p2)
        : null;

    return (
        <div className="p-4 flex flex-col items-center gap-10">
            {/* Top Bracket (Qualifier 1 and Final) */}
            <div className="flex items-center justify-around w-full">
                <PlayoffMatch match={playoffs.qualifier1} matchId="qualifier1" tournamentId={tournament.id} onUpdate={onUpdate} disabled={status === 'finished'} />
                <div className="w-24 h-px bg-gray-600"></div>
                 <div className="flex flex-col items-center">
                    <Trophy className={`w-32 h-32 mb-4 ${finalWinner ? 'text-yellow-400 animate-pulse' : 'text-gray-600'}`} />
                    {finalWinner && <p className="text-xl font-bold text-yellow-400">{finalWinner.name} ist der Sieger!</p>}
                </div>
                <div className="w-24 h-px bg-gray-600"></div>
                <PlayoffMatch match={playoffs.final} matchId="final" tournamentId={tournament.id} onUpdate={onUpdate} disabled={status === 'finished'} />
            </div>

             {/* Connecting Lines */}
            <div className="flex justify-around w-full h-16">
                <div className="w-1/2 border-r border-b border-gray-600 rounded-br-lg"></div>
                <div className="w-1/2 border-l border-b border-gray-600 rounded-bl-lg"></div>
            </div>
            
            {/* Bottom Bracket (Eliminator and Qualifier 2) */}
            <div className="flex items-center justify-around w-full">
                <PlayoffMatch match={playoffs.eliminator} matchId="eliminator" tournamentId={tournament.id} onUpdate={onUpdate} disabled={status === 'finished'} />
                 <div className="w-24 h-px bg-gray-600"></div>
                <PlayoffMatch match={playoffs.qualifier2} matchId="qualifier2" tournamentId={tournament.id} onUpdate={onUpdate} disabled={status === 'finished'} />
            </div>
        </div>
    );
};


export default TournamentBracket;
