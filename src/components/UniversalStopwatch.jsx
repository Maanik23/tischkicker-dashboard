import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

const UniversalStopwatch = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [time, setTime] = useState(0);
    const [laps, setLaps] = useState([]);
    const intervalRef = useRef(null);
    const startTimeRef = useRef(0);

    // Load stopwatch state from localStorage on mount
    useEffect(() => {
        const savedState = localStorage.getItem('tournamentStopwatch');
        if (savedState) {
            const { time: savedTime, isRunning: savedIsRunning, startTime } = JSON.parse(savedState);
            setTime(savedTime);
            setIsRunning(savedIsRunning);
            startTimeRef.current = startTime || 0;
            
            // If it was running, calculate elapsed time and continue
            if (savedIsRunning && startTime) {
                const elapsed = Date.now() - startTime;
                setTime(savedTime + elapsed);
                startInterval();
            }
        }
    }, []);

    // Save stopwatch state to localStorage
    useEffect(() => {
        const stateToSave = {
            time,
            isRunning,
            startTime: startTimeRef.current
        };
        localStorage.setItem('tournamentStopwatch', JSON.stringify(stateToSave));
    }, [time, isRunning]);

    const startInterval = () => {
        intervalRef.current = setInterval(() => {
            setTime(prevTime => prevTime + 10);
        }, 10);
    };

    const startStopwatch = () => {
        if (!isRunning) {
            startTimeRef.current = Date.now() - time;
            setIsRunning(true);
            startInterval();
        }
    };

    const pauseStopwatch = () => {
        if (isRunning) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
        }
    };

    const resetStopwatch = () => {
        clearInterval(intervalRef.current);
        setIsRunning(false);
        setTime(0);
        setLaps([]);
        startTimeRef.current = 0;
    };

    const addLap = () => {
        if (isRunning) {
            setLaps(prevLaps => [...prevLaps, time]);
        }
    };

    const formatTime = (timeInMs) => {
        const hours = Math.floor(timeInMs / 3600000);
        const minutes = Math.floor((timeInMs % 3600000) / 60000);
        const seconds = Math.floor((timeInMs % 60000) / 1000);
        const centiseconds = Math.floor((timeInMs % 1000) / 10);

        return {
            hours: hours.toString().padStart(2, '0'),
            minutes: minutes.toString().padStart(2, '0'),
            seconds: seconds.toString().padStart(2, '0'),
            centiseconds: centiseconds.toString().padStart(2, '0')
        };
    };

    const { hours, minutes, seconds, centiseconds } = formatTime(time);

    return (
        <div className="fixed top-4 right-4 z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-600 rounded-lg p-3 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-red-400" />
                <span className="text-xs font-semibold text-gray-300">Match Timer</span>
            </div>

            {/* Time Display */}
            <div className="text-center mb-3">
                <div className="text-2xl font-mono font-bold text-white">
                    {hours}:{minutes}:{seconds}
                </div>
                <div className="text-xs text-gray-400 font-mono">
                    .{centiseconds}
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2 mb-3">
                {!isRunning ? (
                    <button
                        onClick={startStopwatch}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white p-2 rounded transition-colors"
                        title="Start"
                    >
                        <Play size={14} />
                    </button>
                ) : (
                    <button
                        onClick={pauseStopwatch}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded transition-colors"
                        title="Pause"
                    >
                        <Pause size={14} />
                    </button>
                )}
                
                <button
                    onClick={addLap}
                    disabled={!isRunning}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded transition-colors"
                    title="Lap"
                >
                    <Clock size={14} />
                </button>
                
                <button
                    onClick={resetStopwatch}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                    title="Reset"
                >
                    <RotateCcw size={14} />
                </button>
            </div>

            {/* Laps Display */}
            {laps.length > 0 && (
                <div className="max-h-24 overflow-y-auto">
                    <div className="text-xs text-gray-400 mb-1">Laps:</div>
                    {laps.slice(-3).map((lap, index) => {
                        const { minutes: lapMin, seconds: lapSec, centiseconds: lapCent } = formatTime(lap);
                        return (
                            <div key={index} className="text-xs text-gray-300 font-mono">
                                Lap {laps.length - 2 + index}: {lapMin}:{lapSec}.{lapCent}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default UniversalStopwatch;
