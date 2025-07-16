import React, { useState } from 'react';

const CreateTournament = ({ onCreate }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onCreate(name.trim());
        } else {
            alert("Bitte geben Sie einen Turnamenamen an.");
        }
        setName('');
    };

    return (
        <form onSubmit={handleSubmit} className="bg-black/40 p-8 rounded-lg border border-white/10 space-y-6 max-w-2xl mx-auto">
             <h2 className="text-2xl font-bold text-orange-400 mb-6">Neues Turnier erstellen</h2>
            <div>
                <label className="block mb-2 text-gray-300" htmlFor="tournamentName">
                    Turniername
                </label>
                <input
                    type="text"
                    id="tournamentName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-[48px] px-4 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                />
            </div>
            <button
                type="submit"
                className="w-full py-3 bg-orange-600 text-white rounded-lg text-lg font-semibold hover:bg-orange-700"
            >
                Turnier erstellen & Teilnehmer verwalten
            </button>
        </form>
    );
};

export default CreateTournament;
