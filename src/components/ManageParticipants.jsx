import React, { useState } from 'react';
import { getDatabase, ref, update } from 'firebase/database';
import Select from 'react-select';
import { customSelectStyles } from '../styles/selectStyles';

const ManageParticipants = ({ tournament, allPlayers, onFinish }) => {
    const [participants, setParticipants] = useState(tournament.participants || []);
    const db = getDatabase();

    const availablePlayers = allPlayers
        .filter(p => !participants.some(participant => participant.id === p.id))
        .map(p => ({ value: p.id, label: p.name }));

    const handleAddPlayer = (selectedOption) => {
        if (selectedOption) {
            const newParticipant = { id: selectedOption.value, name: selectedOption.label };
            const updatedParticipants = [...participants, newParticipant];
            setParticipants(updatedParticipants);
            // Also update in Firebase immediately
            const tournamentRef = ref(db, `tournaments/${tournament.id}`);
            update(tournamentRef, { participants: updatedParticipants });
        }
    };

    const handleRemovePlayer = (playerIdToRemove) => {
        const updatedParticipants = participants.filter(p => p.id !== playerIdToRemove);
        setParticipants(updatedParticipants);
        // Also update in Firebase immediately
        const tournamentRef = ref(db, `tournaments/${tournament.id}`);
        update(tournamentRef, { participants: updatedParticipants });
    };

    return (
        <div className="bg-black/40 p-8 rounded-lg border border-white/10 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-orange-400 mb-2">Teilnehmer für "{tournament.name}"</h2>
            <p className="text-gray-400 mb-6">Fügen Sie Spieler zum Turnier hinzu. Sie können das Turnier starten, sobald mindestens zwei Spieler hinzugefügt wurden.</p>

            <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Spieler hinzufügen</h3>
                <Select
                    options={availablePlayers}
                    onChange={handleAddPlayer}
                    styles={customSelectStyles}
                    placeholder="Spieler aus der globalen Liste auswählen..."
                    value={null} // Reset select after choosing
                />
            </div>
            
            <div className="border-t border-white/10 pt-6 mb-8">
                <h3 className="text-xl font-semibold mb-3">Aktuelle Teilnehmer ({participants.length})</h3>
                <ul className="space-y-2">
                    {participants.map(p => (
                        <li key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                            <span>{p.name}</span>
                            <button onClick={() => handleRemovePlayer(p.id)} className="text-red-500 hover:text-red-400">Entfernen</button>
                        </li>
                    ))}
                    {participants.length === 0 && <p className="text-gray-400">Noch keine Teilnehmer.</p>}
                </ul>
            </div>
            
            <button
                onClick={onFinish}
                disabled={participants.length < 2}
                className="w-full py-3 bg-green-600 text-white rounded-lg text-lg font-semibold hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                Turnier starten
            </button>
        </div>
    );
};

export default ManageParticipants;
