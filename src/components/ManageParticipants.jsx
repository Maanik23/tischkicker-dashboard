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
            update(tournamentRef, { participants: updatedParticipants })
                .catch((error) => {
                    console.error('Error adding player:', error);
                    alert('Fehler beim Hinzufügen des Spielers. Bitte versuchen Sie es erneut.');
                    // Revert local state on error
                    setParticipants(participants);
                });
        }
    };

    const handleRemovePlayer = (playerIdToRemove) => {
        const updatedParticipants = participants.filter(p => p.id !== playerIdToRemove);
        setParticipants(updatedParticipants);
        // Also update in Firebase immediately
        const tournamentRef = ref(db, `tournaments/${tournament.id}`);
        update(tournamentRef, { participants: updatedParticipants })
            .catch((error) => {
                console.error('Error removing player:', error);
                alert('Fehler beim Entfernen des Spielers. Bitte versuchen Sie es erneut.');
                // Revert local state on error
                setParticipants(participants);
            });
    };

    return (
        <div className="gradient-card p-8 rounded-lg max-w-3xl mx-auto hover:gradient-card-hover transition-all duration-300">
                            <h2 className="text-2xl font-bold text-red-400 mb-2 red-glow-hover">Teilnehmer für "{tournament.name}"</h2>
            <p className="text-gray-400 mb-6">Fügen Sie Spieler zum Turnier hinzu. Sie können das Turnier starten, sobald mindestens zwei Spieler hinzugefügt wurden.</p>

            <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3 text-gray-300">Spieler hinzufügen</h3>
                <Select
                    options={availablePlayers}
                    onChange={handleAddPlayer}
                    styles={customSelectStyles}
                    placeholder="Spieler aus der globalen Liste auswählen..."
                    value={null} // Reset select after choosing
                />
            </div>
            
            <div className="border-t border-white/10 pt-6 mb-8">
                <h3 className="text-xl font-semibold mb-3 text-gray-300">Aktuelle Teilnehmer ({participants.length})</h3>
                <ul className="space-y-2">
                    {participants.map(p => (
                                                        <li key={p.id} className="flex justify-between items-center bg-gray-800/50 border border-gray-600 p-3 rounded-lg hover:bg-gray-700/50 transition-colors">
                            <span className="text-white">{p.name}</span>
                            <button onClick={() => handleRemovePlayer(p.id)} className="text-red-500 hover:text-red-400 transition-colors">Entfernen</button>
                        </li>
                    ))}
                    {participants.length === 0 && <p className="text-gray-400">Noch keine Teilnehmer.</p>}
                </ul>
            </div>
            
            <button
                onClick={onFinish}
                disabled={participants.length < 2}
                className={`w-full py-3 text-white rounded-lg text-lg font-semibold transition-all duration-300 ${
                    participants.length >= 2 
                        ? 'btn-primary' 
                        : 'bg-gray-600 cursor-not-allowed'
                }`}
            >
                Turnier starten
            </button>
        </div>
    );
};

export default ManageParticipants;
