import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// This is now a "dumb" component. It only receives stats and renders them.
// All calculation logic has been moved to the parent Tournament.jsx to ensure a single source of truth.
const TournamentStats = ({ stats }) => {

    const chartData = {
        labels: stats.map(s => s.name),
        datasets: [ { label: 'Punkte', data: stats.map(s => s.points), backgroundColor: 'rgba(234, 88, 12, 0.6)', borderColor: 'rgba(234, 88, 12, 1)', borderWidth: 1, } ],
    };
    
    const chartOptions = {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: 'Punkteverteilung', color: '#fff' } },
        scales: { y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.1)' } } }
    };

    return (
        <div className="space-y-8">
            <div className="bg-black/40 p-6 rounded-lg border border-white/10">
                <h2 className="text-xl font-semibold mb-4 text-orange-400">Rangliste</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/20">
                                <th className="p-3 text-left text-sm font-semibold uppercase">Rang</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase">Spieler</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase">Punkte</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase">Spiele</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase">S/U/N</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase">Tore</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase">Tordiff.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((p, i) => (
                                <tr key={p.id} className="hover:bg-white/10 border-b border-white/5 last:border-0">
                                    <td className="p-3 font-bold">{i + 1}</td>
                                    <td className="p-3 font-semibold">{p.name}</td>
                                    <td className="p-3 font-bold text-orange-400">{p.points}</td>
                                    <td className="p-3">{p.played}</td>
                                    <td className="p-3"><span className="text-green-400">{p.wins}</span>/<span className="text-yellow-400">{p.draws}</span>/<span className="text-red-400">{p.losses}</span></td>
                                    <td className="p-3">{p.gf}:{p.ga}</td>
                                    <td className="p-3 font-semibold">{p.gf - p.ga > 0 ? `+${p.gf - p.ga}` : p.gf - p.ga}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="bg-black/40 p-6 rounded-lg border border-white/10">
                 <h2 className="text-xl font-semibold mb-4 text-orange-400">Punkte-Chart</h2>
                <Bar options={chartOptions} data={chartData} />
            </div>
        </div>
    );
};

export default TournamentStats;
