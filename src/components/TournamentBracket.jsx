import React from 'react';

const TournamentBracket = ({ tournament }) => {
    const { participants, games } = tournament;

    // This is a simplified bracket, assuming a single elimination format for visualization
    // It will show the initial matchups. For a full dynamic bracket, a more complex state management is needed.
    const renderMatches = () => {
        if (!participants || participants.length === 0) {
            return <p className="text-center text-gray-400">Noch keine Teilnehmer für den Turnierbaum.</p>;
        }

        const matches = [];
        const players = [...participants];
        
        // Handle odd number of players by giving one a "bye"
        if (players.length % 2 !== 0) {
            players.push({ id: 'bye', name: 'FREILOS' });
        }

        for (let i = 0; i < players.length; i += 2) {
            matches.push(
                <div key={i} className="relative flex justify-center items-center my-4">
                    <div className="w-48 text-right pr-4">
                         <div className="bg-gray-800 p-2 rounded-lg border border-gray-700">{players[i].name}</div>
                    </div>
                    <div className="relative w-12 h-full flex items-center justify-center">
                        <div className="absolute w-full h-px bg-gray-600"></div>
                        <div className="relative z-10 bg-gray-900 px-2 font-bold text-orange-400">VS</div>
                    </div>
                    <div className="w-48 text-left pl-4">
                        <div className="bg-gray-800 p-2 rounded-lg border border-gray-700">{players[i+1] ? players[i+1].name : 'FREILOS'}</div>
                    </div>
                </div>
            );
        }
        return matches;
    };

    return (
        <div className="bg-black/40 p-8 rounded-lg border border-white/10">
            <h2 className="text-3xl font-bold text-center text-orange-400 mb-8 tracking-wider uppercase">
                {tournament.name} - Turnierbaum
            </h2>
            <div className="flex flex-col items-center">
                <div className="w-full max-w-lg">
                    {/* This would be one round of the bracket */}
                    <div className="round">
                         <h3 className="text-xl font-semibold text-center text-gray-300 mb-4">Erste Runde</h3>
                         {renderMatches()}
                    </div>
                    {/* In a real scenario, you'd generate more rounds here based on winners */}
                </div>
            </div>
        </div>
    );
};

export default TournamentBracket;
