import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// This is now a "dumb" component. It only receives stats and renders them.
// All calculation logic has been moved to the parent Tournament.jsx to ensure a single source of truth.
const TournamentStats = ({ stats }) => {

    const chartData = {
        labels: stats.map(s => s.name),
        datasets: [ { label: 'Punkte', data: stats.map(s => s.points || 0), backgroundColor: 'rgba(234, 88, 12, 0.6)', borderColor: 'rgba(234, 88, 12, 1)', borderWidth: 1, } ],
    };
    
    const chartOptions = {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: 'Punkteverteilung', color: '#fff' } },
        scales: { y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.1)' } } }
    };

    return (
        <div className="space-y-8">
            <div className="gradient-card p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                <h2 className="text-xl font-semibold mb-4 text-orange-400">Rangliste</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/20">
                                <th className="p-3 text-left text-sm font-semibold uppercase text-orange-400">Rang</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase text-orange-400">Spieler</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase text-orange-400">Punkte</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase text-orange-400">Spiele</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase text-orange-400">S/U/N</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase text-orange-400">Tore</th>
                                <th className="p-3 text-left text-sm font-semibold uppercase text-orange-400">Tordiff.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((p, i) => (
                                <tr key={p.id} className="hover:bg-gray-700/50 border-b border-white/5 last:border-0 transition-colors">
                                    <td className="p-3 font-bold">{i + 1}</td>
                                    <td className="p-3 font-semibold">{p.name}</td>
                                    <td className="p-3 font-bold text-orange-400">{p.points || 0}</td>
                                    <td className="p-3">{p.played || 0}</td>
                                    <td className="p-3"><span className="text-green-400">{p.wins || 0}</span>/<span className="text-yellow-400">{p.draws || 0}</span>/<span className="text-red-400">{p.losses || 0}</span></td>
                                    <td className="p-3">{p.gf || 0}:{p.ga || 0}</td>
                                    <td className="p-3 font-semibold">{(p.gf || 0) - (p.ga || 0) > 0 ? `+${(p.gf || 0) - (p.ga || 0)}` : (p.gf || 0) - (p.ga || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="gradient-card p-6 rounded-lg hover:gradient-card-hover transition-all duration-300">
                 <h2 className="text-xl font-semibold mb-4 text-orange-400">Punkte-Chart</h2>
                <Bar options={chartOptions} data={chartData} />
            </div>
        </div>
    );
};

export default TournamentStats;
