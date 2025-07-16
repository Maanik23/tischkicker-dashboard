import React, { useState } from 'react';
import { getDatabase, ref, update } from 'firebase/database';
import Select from 'react-select';
import { customSelectStyles } from '../styles/selectStyles';

const ManageParticipants = ({ tournament, allPlayers, onBack }) => {
    const [playersToAdd, setPlayersToAdd] = useState([]);
    const db = getDatabase();

    const currentParticipantIds = tournament.participants?.map(p => p.id) || [];
    const availablePlayers = allPlayers
        .filter(p => !currentParticipantIds.includes(p.id))
        .map(p => ({ value: p.id, label: p.name }));
    
    const isLocked = tournament.status !== 'setup';

    const handleAddPlayers = () => {
        if (playersToAdd.length === 0) return;
        const newParticipants = playersToAdd.map(p => ({ id: p.value, name: p.label }));
        const updatedParticipants = [...(tournament.participants || []), ...newParticipants];

        const tournamentRef = ref(db, `tournaments/${tournament.id}`);
        update(tournamentRef, { participants: updatedParticipants });
        setPlayersToAdd([]);
    };

    const handleRemovePlayer = (playerIdToRemove) => {
        const updatedParticipants = tournament.participants.filter(p => p.id !== playerIdToRemove);
        const tournamentRef = ref(db, `tournaments/${tournament.id}`);
        update(tournamentRef, { participants: updatedParticipants });
    };

    return (
        <div className="bg-black/40 p-8 rounded-lg border border-white/10 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-orange-400 mb-6">Teilnehmer für "{tournament.name}" verwalten</h2>

            {isLocked && (
                <div className="p-4 mb-4 text-sm text-yellow-300 bg-yellow-800/50 rounded-lg" role="alert">
                    Das Turnier hat bereits begonnen. Es können keine Teilnehmer mehr hinzugefügt oder entfernt werden.
                </div>
            )}

            <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Aktuelle Teilnehmer</h3>
                <ul className="space-y-2">
                    {tournament.participants?.map(p => (
                        <li key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                            <span>{p.name}</span>
                            {!isLocked && (
                                <button
                                    onClick={() => handleRemovePlayer(p.id)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    Entfernen
                                </button>
                            )}
                        </li>
                    ))}
                     {tournament.participants?.length === 0 && (
                        <p className="text-gray-400">Noch keine Teilnehmer hinzugefügt.</p>
                    )}
                </ul>
            </div>
            
            {!isLocked && (
                <div className="border-t border-white/10 pt-6">
                    <h3 className="text-xl font-semibold mb-3">Teilnehmer hinzufügen</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-grow">
                            <Select
                                isMulti
                                options={availablePlayers}
                                value={playersToAdd}
                                onChange={setPlayersToAdd}
                                styles={customSelectStyles}
                                placeholder="Spieler hinzufügen..."
                            />
                        </div>
                        <button
                            onClick={handleAddPlayers}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Hinzufügen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageParticipants;
