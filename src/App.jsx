import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, Users, Plus, Trophy, Swords } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Main App Component ---
export default function App() {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [players, setPlayers] = useState([
        { id: '1', name: 'Max Mustermann', createdAt: new Date() },
        { id: '2', name: 'Anna Schmidt', createdAt: new Date() },
        { id: '3', name: 'Tom Weber', createdAt: new Date() }
    ]);
    const [matches, setMatches] = useState([
        { id: '1', player1Id: '1', player2Id: '2', player1Score: 2, player2Score: 1, winnerId: '1', loserId: '2', createdAt: new Date() },
        { id: '2', player1Id: '2', player2Id: '3', player1Score: 1, player2Score: 2, winnerId: '3', loserId: '2', createdAt: new Date() }
    ]);
    const [loading, setLoading] = useState(false);

    // --- Data Calculation (Memoized for performance) ---
    const leaderboardData = useMemo(() => {
        if (players.length === 0) return [];
        
        const playerStats = players.map(player => ({
            id: player.id,
            name: player.name,
            points: 0,
            wins: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            matchesPlayed: 0,
        }));

        const statsMap = new Map(playerStats.map(p => [p.id, p]));

        matches.forEach(match => {
            const winnerStat = statsMap.get(match.winnerId);
            const loserStat = statsMap.get(match.loserId);
            const isP1Winner = match.winnerId === match.player1Id;
            const p1Score = match.player1Score;
            const p2Score = match.player2Score;

            if (winnerStat) {
                winnerStat.points += 3;
                winnerStat.wins += 1;
                winnerStat.matchesPlayed += 1;
                winnerStat.goalsFor += isP1Winner ? p1Score : p2Score;
                winnerStat.goalsAgainst += isP1Winner ? p2Score : p1Score;
            }
            if (loserStat) {
                loserStat.points += 1; // Participation point
                loserStat.losses += 1;
                loserStat.matchesPlayed += 1;
                loserStat.goalsFor += isP1Winner ? p2Score : p1Score;
                loserStat.goalsAgainst += isP1Winner ? p1Score : p2Score;
            }
        });
        
        const finalStats = Array.from(statsMap.values());
        finalStats.forEach(p => p.goalDifference = p.goalsFor - p.goalsAgainst);
        
        return finalStats.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
    }, [players, matches]);

    const chartData = useMemo(() => {
        if (players.length === 0 || matches.length === 0) return [];

        const pointsHistory = {};
        players.forEach(p => {
            pointsHistory[p.id] = 0;
        });

        return matches.map((match, index) => {
            const winnerStat = pointsHistory[match.winnerId];
            if (winnerStat !== undefined) pointsHistory[match.winnerId] += 3;

            const loserStat = pointsHistory[match.loserId];
            if (loserStat !== undefined) pointsHistory[match.loserId] += 1;
            
            const dataPoint = { name: `Spiel ${index + 1}` };
            players.forEach(p => {
                dataPoint[p.name] = pointsHistory[p.id];
            });
            return dataPoint;
        });
    }, [players, matches]);

    // --- Handlers for adding data ---
    const handleAddPlayer = async (playerName) => {
        if (!playerName.trim()) return;
        const newPlayer = {
            id: Date.now().toString(),
            name: playerName.trim(),
            createdAt: new Date(),
        };
        setPlayers(prev => [...prev, newPlayer]);
    };

    const handleAddMatch = async (matchData) => {
        const { player1Id, player2Id, player1Score, player2Score } = matchData;
        if (!player1Id || !player2Id || player1Id === player2Id) {
            alert("Bitte zwei unterschiedliche Spieler auswählen.");
            return;
        }
        if (player1Score < 0 || player2Score < 0 || (player1Score + player2Score > 3)) {
             alert("Ungültige Punktzahl. Es ist ein 'Best of 3'.");
             return;
        }

        const winnerId = player1Score > player2Score ? player1Id : player2Id;
        const loserId = player1Score < player2Score ? player1Id : player2Id;

        const newMatch = {
            id: Date.now().toString(),
            ...matchData,
            winnerId,
            loserId,
            createdAt: new Date(),
        };
        setMatches(prev => [...prev, newMatch]);
    };

    // --- Render Logic ---
    const renderPage = () => {
        if (loading) {
            return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-sky-500"></div></div>;
        }
        switch (currentPage) {
            case 'rangliste':
                return <Rangliste data={leaderboardData} />;
            case 'spieler':
                return <Spieler players={players} onAddPlayer={handleAddPlayer} />;
            case 'neuesSpiel':
                return <NeuesSpiel players={players} onAddMatch={handleAddMatch} />;
            case 'dashboard':
            default:
                return <Dashboard stats={{
                    totalPlayers: players.length,
                    totalMatches: matches.length,
                    topPlayer: leaderboardData.length > 0 ? leaderboardData[0] : null
                }} chartData={chartData} players={players} />;
        }
    };

    return (
        <div className="bg-gray-900 text-white font-sans flex min-h-screen">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <Header title={getPageTitle(currentPage)} />
                <div className="mt-6">
                    {renderPage()}
                </div>
                <footer className="text-center text-xs text-gray-500 mt-8 py-4">
                    <p>Demo Mode - Firebase nicht konfiguriert</p>
                </footer>
            </main>
        </div>
    );
}

// --- Helper to get Page Title ---
function getPageTitle(page) {
    switch (page) {
        case 'dashboard': return 'Dashboard';
        case 'rangliste': return 'Rangliste';
        case 'spieler': return 'Spieler verwalten';
        case 'neuesSpiel': return 'Neues Spiel eintragen';
        default: return 'Kicker Dashboard';
    }
}

// --- Sidebar Component ---
function Sidebar({ currentPage, setCurrentPage }) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
        { id: 'rangliste', label: 'Rangliste', icon: Trophy },
        { id: 'spieler', label: 'Spieler', icon: Users },
        { id: 'neuesSpiel', label: 'Neues Spiel', icon: Swords },
    ];

    return (
        <aside className="w-64 bg-gray-800 p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-sky-400">Kicker Dashboard</h1>
            </div>
            <nav>
                <ul className="space-y-2">
                    {menuItems.map(({ id, label, icon: Icon }) => (
                        <li key={id}>
                            <button
                                onClick={() => setCurrentPage(id)}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                    currentPage === id
                                        ? 'bg-sky-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <Icon size={20} />
                                <span>{label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}

// --- Header Component ---
function Header({ title }) {
    return (
        <header className="border-b border-gray-700 pb-4">
            <h1 className="text-3xl font-bold">{title}</h1>
        </header>
    );
}

// --- Dashboard Component ---
function Dashboard({ stats, chartData, players }) {
    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Gesamte Spieler"
                    value={stats.totalPlayers}
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title="Gespielte Matches"
                    value={stats.totalMatches}
                    icon={Swords}
                    color="green"
                />
                <StatCard
                    title="Führender Spieler"
                    value={stats.topPlayer ? stats.topPlayer.name : 'Keine Daten'}
                    icon={Trophy}
                    color="yellow"
                />
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Punkteverlauf</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                    }}
                                />
                                {players.map((player, index) => (
                                    <Line
                                        key={player.id}
                                        type="monotone"
                                        dataKey={player.name}
                                        stroke={`hsl(${index * 137.5 % 360}, 70%, 60%)`}
                                        strokeWidth={2}
                                        dot={{ fill: `hsl(${index * 137.5 % 360}, 70%, 60%)` }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- StatCard Component ---
function StatCard({ title, value, icon: Icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        yellow: 'bg-yellow-600',
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-sm">{title}</p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
}

// --- Rangliste Component ---
function Rangliste({ data }) {
    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold">Aktuelle Rangliste</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rang</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Spieler</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Punkte</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Siege</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Niederlagen</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tore</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tordifferenz</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {data.map((player, index) => (
                            <tr key={player.id} className="hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{player.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{player.points}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">{player.wins}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">{player.losses}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{player.goalsFor}:{player.goalsAgainst}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={player.goalDifference >= 0 ? 'text-green-400' : 'text-red-400'}>
                                        {player.goalDifference > 0 ? '+' : ''}{player.goalDifference}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Spieler Component ---
function Spieler({ players, onAddPlayer }) {
    const [newPlayerName, setNewPlayerName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onAddPlayer(newPlayerName);
        setNewPlayerName('');
    };

    return (
        <div className="space-y-6">
            {/* Add Player Form */}
            <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Neuen Spieler hinzufügen</h2>
                <form onSubmit={handleSubmit} className="flex gap-4">
                    <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        placeholder="Spielername eingeben..."
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                        type="submit"
                        className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Hinzufügen
                    </button>
                </form>
            </div>

            {/* Players List */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-semibold">Alle Spieler ({players.length})</h2>
                </div>
                <div className="divide-y divide-gray-700">
                    {players.map((player) => (
                        <div key={player.id} className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium">{player.name}</h3>
                                <p className="text-sm text-gray-400">
                                    Erstellt am {player.createdAt?.toLocaleDateString('de-DE') || 'Unbekannt'}
                                </p>
                            </div>
                        </div>
                    ))}
                    {players.length === 0 && (
                        <div className="p-6 text-center text-gray-400">
                            Noch keine Spieler vorhanden. Füge den ersten Spieler hinzu!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- NeuesSpiel Component ---
function NeuesSpiel({ players, onAddMatch }) {
    const [formData, setFormData] = useState({
        player1Id: '',
        player2Id: '',
        player1Score: '',
        player2Score: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onAddMatch({
            ...formData,
            player1Score: parseInt(formData.player1Score),
            player2Score: parseInt(formData.player2Score)
        });
        setFormData({
            player1Id: '',
            player2Id: '',
            player1Score: '',
            player2Score: ''
        });
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Neues Spiel eintragen</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Player 1 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Spieler 1</label>
                        <select
                            value={formData.player1Id}
                            onChange={(e) => setFormData({...formData, player1Id: e.target.value})}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                            required
                        >
                            <option value="">Spieler auswählen...</option>
                            {players.map((player) => (
                                <option key={player.id} value={player.id}>{player.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Player 2 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Spieler 2</label>
                        <select
                            value={formData.player2Id}
                            onChange={(e) => setFormData({...formData, player2Id: e.target.value})}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                            required
                        >
                            <option value="">Spieler auswählen...</option>
                            {players.map((player) => (
                                <option key={player.id} value={player.id}>{player.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Score 1 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Punkte Spieler 1</label>
                        <input
                            type="number"
                            min="0"
                            max="3"
                            value={formData.player1Score}
                            onChange={(e) => setFormData({...formData, player1Score: e.target.value})}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                            required
                        />
                    </div>

                    {/* Score 2 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Punkte Spieler 2</label>
                        <input
                            type="number"
                            min="0"
                            max="3"
                            value={formData.player2Score}
                            onChange={(e) => setFormData({...formData, player2Score: e.target.value})}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Swords size={20} />
                    Spiel eintragen
                </button>
            </form>
        </div>
    );
} 