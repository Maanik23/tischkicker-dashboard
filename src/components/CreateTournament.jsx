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
        <form onSubmit={handleSubmit} className="gradient-card p-8 rounded-lg space-y-6 max-w-2xl mx-auto hover:gradient-card-hover transition-all duration-300">
                             <h2 className="text-2xl font-bold text-red-400 mb-6 red-glow-hover">Neues Turnier erstellen</h2>
            <div>
                <label className="block mb-2 text-gray-300" htmlFor="tournamentName">
                    Turniername
                </label>
                <input
                    type="text"
                    id="tournamentName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-[48px] px-4 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    required
                />
            </div>
            <button
                type="submit"
                className="w-full py-3 btn-primary text-white rounded-lg text-lg font-semibold"
            >
                Turnier erstellen & Teilnehmer verwalten
            </button>
        </form>
    );
};

export default CreateTournament;
