import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Zap, Loader2 } from 'lucide-react';

const ACTIVE_MODE_KEY = 'beastrealm.activeMode';
const ACTIVE_ROOM_KEY = 'beastrealm.activeRoom';
const ACTIVE_PLAYER_KEY = 'beastrealm.activePlayer';

export default function PlayMenu() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const startMode = (mode) => {
    localStorage.removeItem(ACTIVE_ROOM_KEY);
    localStorage.removeItem(ACTIVE_PLAYER_KEY);
    localStorage.setItem(ACTIVE_MODE_KEY, mode);
    navigate('/game');
  };

  const joinRoom = () => {
    if (!roomCode.trim()) return;
    localStorage.setItem(ACTIVE_MODE_KEY, 'pvp');
    localStorage.setItem(ACTIVE_ROOM_KEY, roomCode.trim().toUpperCase());
    localStorage.setItem(ACTIVE_PLAYER_KEY, 'player2');
    navigate('/game');
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans overflow-hidden relative">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-black animate-pulse" />

      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl text-center relative z-10">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500 mb-2 filter drop-shadow-lg">
          CARD BATTLE
        </h1>
        <p className="text-slate-400 mb-8 text-sm uppercase tracking-widest">Turn-Based Strategy Game</p>

        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
          <button
            onClick={() => startMode('pvp')}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl font-bold hover:from-emerald-500 hover:to-teal-500 flex justify-center items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Create PvP Room</>}
          </button>

          <button
            onClick={() => startMode('vs-ai')}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold hover:from-blue-500 hover:to-indigo-500 flex justify-center items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20} /> Play vs AI</>}
          </button>

          <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">or join</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter 6-digit room code"
              className="flex-1 bg-slate-800 rounded-xl px-4 text-center border border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder:normal-case"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={6}
            />
            <button
              onClick={joinRoom}
              disabled={loading}
              className="bg-slate-700 px-6 rounded-xl font-bold hover:bg-slate-600 border border-slate-600 hover:border-slate-500 transition-all disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
