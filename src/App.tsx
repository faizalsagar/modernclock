import React, { useState, useEffect } from 'react';
import { Clock, Timer, WatchIcon as StopwatchIcon, Moon, Sun, Settings2, Thermometer, Globe, Coffee, Volume2, VolumeX, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import useSound from 'use-sound';

type Mode = 'clock' | 'countdown' | 'stopwatch' | 'pomodoro';
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';
type Theme = 'light' | 'dark' | 'auto';

const POMODORO_SETTINGS = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  longBreakInterval: 4
};

const TIMEZONES = [
  { label: 'Local Time', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { label: 'UTC', value: 'UTC' },
  { label: 'New York', value: 'America/New_York' },
  { label: 'London', value: 'Europe/London' },
  { label: 'Tokyo', value: 'Asia/Tokyo' }
];

function ProgressRing({ progress, size = 200, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg className="progress-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" width={size} height={size}>
      <circle
        className="opacity-20"
        stroke="currentColor"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="progress-ring-circle"
        stroke="currentColor"
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset }}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
    </svg>
  );
}

function App() {
  const [mode, setMode] = useState<Mode>('clock');
  const [isDark, setIsDark] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [time, setTime] = useState(new Date());
  const [selectedTimezone, setSelectedTimezone] = useState(TIMEZONES[0].value);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [stopwatch, setStopwatch] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const [temperature, setTemperature] = useState(23);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState<Theme>('light');
  
  // Pomodoro states
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [pomodoroTime, setPomodoroTime] = useState(POMODORO_SETTINGS.work);
  
  // Sound effects
  const [playTick] = useSound('/tick.mp3', { volume: 0.5, soundEnabled });
  const [playAlarm] = useSound('/alarm.mp3', { volume: 0.8, soundEnabled });

  // Theme Effect
  useEffect(() => {
    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'auto') {
        setIsDark(e.matches);
      }
    };

    if (theme === 'auto') {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDark(darkModeQuery.matches);
      darkModeQuery.addEventListener('change', handleThemeChange);
      return () => darkModeQuery.removeEventListener('change', handleThemeChange);
    } else {
      setIsDark(theme === 'dark');
    }
  }, [theme]);

  // Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Temperature Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTemperature(20 + Math.floor(Math.random() * 6));
    }, 300000);
    return () => clearInterval(timer);
  }, []);

  // Pomodoro Effect
  useEffect(() => {
    let interval: number;
    if (isRunning && mode === 'pomodoro') {
      interval = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            playAlarm();
            handlePomodoroPhaseComplete();
            return 0;
          }
          if (prev % 60 === 0 && soundEnabled) {
            playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, pomodoroPhase, soundEnabled]);

  // Countdown Effect
  useEffect(() => {
    let interval: number;
    if (isRunning && mode === 'countdown') {
      interval = setInterval(() => {
        setCountdown(prev => {
          const totalSeconds = prev.hours * 3600 + prev.minutes * 60 + prev.seconds - 1;
          if (totalSeconds <= 0) {
            playAlarm();
            setIsRunning(false);
            return { hours: 0, minutes: 0, seconds: 0 };
          }
          if (totalSeconds % 60 === 0 && soundEnabled) {
            playTick();
          }
          return {
            hours: Math.floor(totalSeconds / 3600),
            minutes: Math.floor((totalSeconds % 3600) / 60),
            seconds: totalSeconds % 60
          };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, soundEnabled]);

  // Stopwatch Effect
  useEffect(() => {
    let interval: number;
    if (isRunning && mode === 'stopwatch') {
      interval = setInterval(() => {
        setStopwatch(prev => {
          if (soundEnabled && prev % 1000 === 0) {
            playTick();
          }
          return prev + 10;
        });
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, soundEnabled]);

  const handlePomodoroPhaseComplete = () => {
    setIsRunning(false);
    if (pomodoroPhase === 'work') {
      setPomodoroCount(prev => prev + 1);
      if (pomodoroCount + 1 >= POMODORO_SETTINGS.longBreakInterval) {
        setPomodoroPhase('longBreak');
        setPomodoroTime(POMODORO_SETTINGS.longBreak);
        setPomodoroCount(0);
      } else {
        setPomodoroPhase('shortBreak');
        setPomodoroTime(POMODORO_SETTINGS.shortBreak);
      }
    } else {
      setPomodoroPhase('work');
      setPomodoroTime(POMODORO_SETTINGS.work);
    }
  };

  const formatTime = (date: Date) => {
    return formatInTimeZone(date, selectedTimezone, 'h:mm:ss a');
  };

  const formatDate = (date: Date) => {
    return formatInTimeZone(date, selectedTimezone, 'EEEE, MMMM d, yyyy');
  };

  const formatPomodoroTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatStopwatch = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const calculateProgress = () => {
    if (mode === 'pomodoro') {
      const total = pomodoroPhase === 'work' ? POMODORO_SETTINGS.work :
        pomodoroPhase === 'shortBreak' ? POMODORO_SETTINGS.shortBreak :
        POMODORO_SETTINGS.longBreak;
      return ((total - pomodoroTime) / total) * 100;
    } else if (mode === 'countdown') {
      const total = countdown.hours * 3600 + countdown.minutes * 60 + countdown.seconds;
      const initial = countdown.hours * 3600 + countdown.minutes * 60 + countdown.seconds;
      return ((initial - total) / initial) * 100;
    }
    return 0;
  };

  const handlePresetClick = (minutes: number) => {
    setCountdown({
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60,
      seconds: 0
    });
  };

  const handleLap = () => {
    setLaps(prev => [...prev, stopwatch]);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === 'stopwatch') {
      setStopwatch(0);
      setLaps([]);
    } else if (mode === 'countdown') {
      setCountdown({ hours: 0, minutes: 0, seconds: 0 });
    } else if (mode === 'pomodoro') {
      setPomodoroPhase('work');
      setPomodoroTime(POMODORO_SETTINGS.work);
      setPomodoroCount(0);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-500 to-teal-400'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-lg">
          {/* Top Controls */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-2">
              <button
                onClick={() => setMode('clock')}
                className={`p-2 rounded-lg transition-colors duration-300 ${mode === 'clock' ? 'bg-white/20' : 'hover:bg-white/10'}`}
              >
                <Clock className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => setMode('countdown')}
                className={`p-2 rounded-lg transition-colors duration-300 ${mode === 'countdown' ? 'bg-white/20' : 'hover:bg-white/10'}`}
              >
                <Timer className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => setMode('stopwatch')}
                className={`p-2 rounded-lg transition-colors duration-300 ${mode === 'stopwatch' ? 'bg-white/20' : 'hover:bg-white/10'}`}
              >
                <StopwatchIcon className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => setMode('pomodoro')}
                className={`p-2 rounded-lg transition-colors duration-300 ${mode === 'pomodoro' ? 'bg-white/20' : 'hover:bg-white/10'}`}
              >
                <Coffee className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10">
                <Thermometer className="w-5 h-5 text-white" />
                <span className="text-white">{temperature}°C</span>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors duration-300"
              >
                {soundEnabled ? (
                  <Volume2 className="w-6 h-6 text-white" />
                ) : (
                  <VolumeX className="w-6 h-6 text-white" />
                )}
              </button>
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors duration-300"
              >
                {theme === 'auto' ? (
                  <Settings2 className="w-6 h-6 text-white" />
                ) : isDark ? (
                  <Moon className="w-6 h-6 text-white" />
                ) : (
                  <Sun className="w-6 h-6 text-white" />
                )}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg hover:bg-white/10 transition-colors duration-300`}
              >
                <Settings2 className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mb-8 p-4 bg-white/5 rounded-lg settings-panel-enter">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                  <Globe className="w-5 h-5" />
                  <select
                    value={selectedTimezone}
                    onChange={(e) => setSelectedTimezone(e.target.value)}
                    className="w-full bg-white/10 rounded p-2 text-white transition-colors duration-300 [&>option]:bg-gray-800 [&>option]:text-white"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Bell className="w-5 h-5" />
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Sound Effects:</label>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`px-3 py-1 rounded ${soundEnabled ? 'bg-white/20' : 'bg-white/10'} transition-colors duration-300`}
                    >
                      {soundEnabled ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Display */}
          <div className="text-center mode-transition">
            {mode === 'clock' && (
              <div>
                <div className="text-xl font-medium text-white/80 mb-2">
                  {formatDate(time)}
                </div>
                <div className="text-6xl font-mono text-white mb-4 relative">
                  {formatTime(time)}
                </div>
              </div>
            )}

            {mode === 'countdown' && (
              <div>
                <div className="text-6xl font-mono text-white mb-4 relative">
                  {`${countdown.hours.toString().padStart(2, '0')}:${countdown.minutes.toString().padStart(2, '0')}:${countdown.seconds.toString().padStart(2, '0')}`}
                  {isRunning && <ProgressRing progress={calculateProgress()} />}
                </div>
                <div className="flex gap-2 justify-center mb-4">
                  <button
                    onClick={() => handlePresetClick(5)}
                    className="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 transition-colors duration-300"
                  >
                    5m
                  </button>
                  <button
                    onClick={() => handlePresetClick(15)}
                    className="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 transition-colors duration-300"
                  >
                    15m
                  </button>
                  <button
                    onClick={() => handlePresetClick(25)}
                    className="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 transition-colors duration-300"
                  >
                    25m
                  </button>
                </div>
              </div>
            )}

            {mode === 'stopwatch' && (
              <div>
                <div className="text-6xl font-mono text-white mb-4 relative">
                  {formatStopwatch(stopwatch)}
                </div>
                <div className="max-h-40 overflow-auto mb-4 space-y-2">
                  {laps.map((lap, index) => (
                    <div key={index} className="text-white/80 font-mono bg-white/5 rounded p-2 transition-all duration-300 hover:bg-white/10">
                      Lap {index + 1}: {formatStopwatch(lap)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === 'pomodoro' && (
              <div>
                <div className="text-xl font-medium text-white/80 mb-2">
                  {pomodoroPhase === 'work' ? 'Focus Time' : pomodoroPhase === 'shortBreak' ? 'Short Break' : 'Long Break'}
                </div>
                <div className="text-6xl font-mono text-white mb-4 relative">
                  {formatPomodoroTime(pomodoroTime)}
                  {isRunning && <ProgressRing progress={calculateProgress()} />}
                </div>
                <div className="text-sm text-white/80 mb-4">
                  Pomodoro #{pomodoroCount + 1} of {POMODORO_SETTINGS.longBreakInterval}
                </div>
              </div>
            )}

            {/* Controls */}
            {mode !== 'clock' && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-6 py-2 rounded-lg ${isRunning ? 'bg-white/30' : 'bg-white/20'} text-white hover:bg-white/30 transition-colors duration-300`}
                >
                  {isRunning ? 'Pause' : 'Start'}
                </button>
                {mode === 'stopwatch' && (
                  <button
                    onClick={handleLap}
                    disabled={!isRunning}
                    className="px-6 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                  >
                    Lap
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="px-6 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors duration-300"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;