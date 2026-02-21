
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ValueTheme, UserRank, GameState, PlayerVote, GameMode } from './types';
import { VALUE_THEMES } from './constants';

import { 
  Trophy, 
  RotateCcw, 
  Sparkles, 
  PlayCircle,
  MessageCircle,
  Users,
  User,
  Plus,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Edit3,
  Search,
  EyeOff,
  Eye,
  Lock,
  Heart,
  Copy,
  Check,
  Home,
  Timer,
  Play,
  Pause,
  Clock,
  List
} from 'lucide-react';

// Rubyが含まれるテキストを安全に描画するためのコンポーネント
const RubyDisplay: React.FC<{ text: string | null | undefined }> = ({ text }) => {
  if (!text) return null;
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
};

const ThemeSelectorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  themes: ValueTheme[];
  onSelectTheme: (theme: ValueTheme) => void;
}> = ({ isOpen, onClose, themes, onSelectTheme }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <header className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-black text-xl text-gray-800">お題を選択</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
            &times;
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3">
            {themes.map(theme => (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme)}
                className="p-4 rounded-xl text-left font-bold text-gray-700 bg-gray-50 hover:bg-orange-100 hover:text-orange-600 transition-all border-2 border-transparent focus:border-orange-300"
              >
                <RubyDisplay text={theme.title} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentTheme: null,
    mode: 'view',
    votes: [],
    currentPlayerIndex: 0,
    targetPlayerIndex: 0,
    isCompleted: false,
    aiInsight: null,
    playerNames: [],
  });

  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [allPlayerRanks, setAllPlayerRanks] = useState<UserRank[]>([]);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  
  // For Guessing Mode: Step tracking (0: Target Input, 1: Group Guess)
  const [guessStep, setGuessStep] = useState<0 | 1>(0);
  const [groupGuess, setGroupGuess] = useState<UserRank>({ rank1: null, rank2: null, rank3: null });
  const [timerMinutes, setTimerMinutes] = useState(1);
  const [timer, setTimer] = useState(timerMinutes * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const getAlphabet = (index: number) => String.fromCharCode(65 + index);

  const stripHtml = (html: string) => {
    // まず <rt>ふりがな</rt> の部分を中身ごと削除する
    const noRtContent = html.replace(/<rt>.*?<\/rt>/g, '');
    // その後、残った <ruby> などのタグ自体を削除する
    return noRtContent.replace(/<[^>]*>?/gm, '');
  };

  const copyThemeToClipboard = useCallback(() => {
    if (!gameState.currentTheme) return;
    
    const cleanTitle = stripHtml(gameState.currentTheme.title);
    const cleanItems = gameState.currentTheme.items.map((item, i) => `${getAlphabet(i)}. ${stripHtml(item)}`).join('\n');
    const textToCopy = `【お題】${cleanTitle}\n\n【選択肢】\n${cleanItems}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
    });
  }, [gameState.currentTheme]);

  const startNewGame = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * VALUE_THEMES.length);
    const initialTheme = VALUE_THEMES[randomIndex];
    
    setGameState(prev => ({
      ...prev,
      currentTheme: initialTheme,
      votes: [],
      currentPlayerIndex: 0,
      isCompleted: false,
      aiInsight: null,
    }));
    
    setAllPlayerRanks(gameState.playerNames.map(() => ({ rank1: null, rank2: null, rank3: null })));
    setGroupGuess({ rank1: null, rank2: null, rank3: null });
    setGuessStep(0);
    setIsSetupMode(true);
    setEditingPlayerIndex(null);
  }, [gameState.playerNames]);

  const goToNextTheme = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * VALUE_THEMES.length);
    const newTheme = VALUE_THEMES[randomIndex];
    setGameState(prev => ({
      ...prev,
      currentTheme: newTheme,
      votes: [],
      isCompleted: false,
      aiInsight: null,
    }));
    setAllPlayerRanks(gameState.playerNames.map(() => ({ rank1: null, rank2: null, rank3: null })));
    setEditingPlayerIndex(null);
  }, [gameState.playerNames]);

  const changeTheme = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * VALUE_THEMES.length);
    const newTheme = VALUE_THEMES[randomIndex];
    setGameState(prev => ({ ...prev, currentTheme: newTheme }));
  }, []);

  const selectTheme = (theme: ValueTheme) => {
    setGameState(prev => ({ ...prev, currentTheme: theme }));
    setIsThemeModalOpen(false);
  };

  useEffect(() => {
    setAllPlayerRanks(gameState.playerNames.map(() => ({ rank1: null, rank2: null, rank3: null })));
  }, [gameState.playerNames]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * VALUE_THEMES.length);
    setGameState(prev => ({ ...prev, currentTheme: VALUE_THEMES[randomIndex] }));
  }, []);

  useEffect(() => {
    if (gameState.mode === 'guess' && guessStep === 1 && isTimerRunning) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState.mode, guessStep, isTimerRunning]);

  useEffect(() => {
    setIsTimerRunning(false);
    setTimer(timerMinutes * 60);
  }, [guessStep]);

  const toggleSelection = (playerIdx: number, item: string) => {
    const newRanks = [...allPlayerRanks];
    const current = newRanks[playerIdx];

    if (current.rank1 === item) newRanks[playerIdx] = { ...current, rank1: null };
    else if (current.rank2 === item) newRanks[playerIdx] = { ...current, rank2: null };
    else if (current.rank3 === item) newRanks[playerIdx] = { ...current, rank3: null };
    else if (!current.rank1) newRanks[playerIdx] = { ...current, rank1: item };
    else if (!current.rank2) newRanks[playerIdx] = { ...current, rank2: item };
    else if (!current.rank3) newRanks[playerIdx] = { ...current, rank3: item };
    
    setAllPlayerRanks(newRanks);
  };

  const toggleGuessSelection = (item: string) => {
    const current = { ...groupGuess };
    if (current.rank1 === item) setGroupGuess({ ...current, rank1: null });
    else if (current.rank2 === item) setGroupGuess({ ...current, rank2: null });
    else if (current.rank3 === item) setGroupGuess({ ...current, rank3: null });
    else if (!current.rank1) setGroupGuess({ ...current, rank1: item });
    else if (!current.rank2) setGroupGuess({ ...current, rank2: item });
    else if (!current.rank3) setGroupGuess({ ...current, rank3: item });
  };

  const handleFinalSubmit = async () => {
    
    if (gameState.mode === 'guess') {
      const targetName = gameState.playerNames[gameState.targetPlayerIndex || 0];
      const targetRanks = allPlayerRanks[gameState.targetPlayerIndex || 0];
      
      setGameState(prev => ({ 
        ...prev, 
        votes: [{ playerName: targetName, ranks: targetRanks }], 
        isCompleted: true 
      }));

    } else {
      const finalVotes: PlayerVote[] = gameState.playerNames.map((name, idx) => ({
        playerName: name,
        ranks: allPlayerRanks[idx]
      }));

      setGameState(prev => ({ ...prev, votes: finalVotes, isCompleted: true }));
      
    }
    
  };

  const aggregateResults = useMemo(() => {
    if (!gameState.currentTheme || gameState.votes.length === 0 || gameState.mode === 'guess') return [];
    const scores: Record<string, number> = {};
    gameState.currentTheme.items.forEach(item => scores[item] = 0);
    gameState.votes.forEach(vote => {
      if (vote.ranks.rank1) scores[vote.ranks.rank1] += 3;
      if (vote.ranks.rank2) scores[vote.ranks.rank2] += 2;
      if (vote.ranks.rank3) scores[vote.ranks.rank3] += 1;
    });
    return Object.entries(scores)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score);
  }, [gameState.votes, gameState.currentTheme, gameState.mode]);

  const isPlayerComplete = (idx: number) => {
    const r = allPlayerRanks[idx];
    return !!(r && r.rank1 && r.rank2 && r.rank3);
  };

  const isGuessComplete = !!(groupGuess.rank1 && groupGuess.rank2 && groupGuess.rank3);
  const isAllComplete = allPlayerRanks.every((_, idx) => isPlayerComplete(idx));

  if (isSetupMode) {
    return (
      <>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <header className="text-center mb-10">
            <div className="inline-block p-4 bg-orange-100 rounded-full mb-4">
              <Sparkles size={40} className="text-orange-500" />
            </div>
            <h1 className="text-4xl font-black text-gray-800 mb-2">ゆるっと<ruby>価値観<rt>かちかん</rt></ruby>トーク</h1>
            <p className="text-gray-500 font-medium italic">みんなで<ruby>回<rt>まわ</rt></ruby>して、<ruby>価値観<rt>かちかん</rt></ruby>をシェア</p>
          </header>

          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-white/50 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => setGameState(prev => ({ ...prev, mode: 'group', playerNames: ['プレイヤー1', 'プレイヤー2'] }))}
                className={`p-6 rounded-3xl border-4 transition-all flex flex-col items-center gap-3 ${gameState.mode === 'group' ? 'border-orange-400 bg-orange-50' : 'border-gray-50 bg-gray-50/30'}`}
              >
                <Users size={28} className={gameState.mode === 'group' ? 'text-orange-500' : 'text-gray-300'} />
                <span className="font-black text-sm text-gray-700">みんなでトーク</span>
              </button>
              <button 
                onClick={() => setGameState(prev => ({ ...prev, mode: 'view' }))}
                className={`p-6 rounded-3xl border-4 transition-all flex flex-col items-center gap-3 ${gameState.mode === 'view' ? 'border-sky-400 bg-sky-50' : 'border-gray-50 bg-gray-50/30'}`}
              >
                <Eye size={28} className={gameState.mode === 'view' ? 'text-sky-500' : 'text-gray-300'} />
                <span className="font-black text-sm text-gray-700">ながめる</span>
              </button>
              <button 
                onClick={() => setGameState(prev => ({ ...prev, mode: 'guess', playerNames: ['プレイヤー1', 'プレイヤー2'], targetPlayerIndex: 0 }))}
                className={`p-6 rounded-3xl border-4 transition-all flex flex-col items-center gap-3 ${gameState.mode === 'guess' ? 'border-purple-400 bg-purple-50' : 'border-gray-50 bg-gray-50/30'}`}
              >
                <Search size={28} className={gameState.mode === 'guess' ? 'text-purple-500' : 'text-gray-300'} />
                <span className="font-black text-sm text-gray-700"><ruby>価値観<rt>かちかん</rt></ruby><ruby>当<rt>あ</rt></ruby>て</span>
              </button>
            </div>

            {gameState.mode !== 'view' && (
              <div className="space-y-4">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest block ml-2">メンバー<ruby>登録<rt>とうろく</rt></ruby></label>
                <div className="space-y-3">
                  {gameState.playerNames.map((name, idx) => (
                    <div key={idx} className="flex gap-2 group">
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => {
                            const newNames = [...gameState.playerNames];
                            newNames[idx] = e.target.value;
                            setGameState(p => ({ ...p, playerNames: newNames }));
                          }}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-300 focus:bg-white transition-all outline-none font-bold text-gray-700"
                          placeholder={`なまえをにゅうりょく...`}
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
                          {gameState.mode === 'guess' && gameState.targetPlayerIndex === idx ? (
                            <Trophy size={20} className="text-purple-500" />
                          ) : (
                            <UserCheck className="text-gray-300" size={20} />
                          )}
                        </div>
                        {gameState.mode === 'guess' && (
                          <button 
                            onClick={() => setGameState(p => ({ ...p, targetPlayerIndex: idx }))}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black px-2 py-1 rounded-md ${gameState.targetPlayerIndex === idx ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                          >
                            {gameState.targetPlayerIndex === idx ? 'あてられるひと' : 'こうたい'}
                          </button>
                        )}
                      </div>
                      {gameState.playerNames.length > 2 && (
                        <button 
                          onClick={() => setGameState(p => ({ ...p, playerNames: p.playerNames.filter((_, i) => i !== idx), targetPlayerIndex: 0 }))} 
                          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-300 hover:bg-red-500 hover:text-white transition-all"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setGameState(p => ({ ...p, playerNames: [...p.playerNames, `プレイヤー${p.playerNames.length + 1}`] }))} className="w-full py-4 border-4 border-dashed border-gray-100 rounded-3xl text-gray-400 font-bold hover:bg-gray-50 flex items-center justify-center gap-2 transition-all">
                  <Plus size={20} /> プレイヤーを<ruby>追加<rt>ついか</rt></ruby>
                </button>
              </div>
            )}

            <button 
              onClick={() => {
                setIsSetupMode(false);
                setAllPlayerRanks(gameState.playerNames.map(() => ({ rank1: null, rank2: null, rank3: null })));
              }}
              className={`w-full py-6 text-white rounded-[2rem] font-black text-2xl shadow-xl transition-all flex items-center justify-center gap-3 ${
                gameState.mode === 'view' ? 'bg-sky-500 shadow-sky-100 hover:bg-sky-600' :
                gameState.mode === 'guess' ? 'bg-purple-600 shadow-purple-100 hover:bg-purple-700' : 
                'bg-orange-500 shadow-orange-100 hover:bg-orange-600'
              }`}
            >
              {gameState.mode === 'view' ? 'お題をながめる' : 'スタート！'}
              <PlayCircle size={28} />
            </button>
          </div>
        </div>
        <ThemeSelectorModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
          themes={VALUE_THEMES}
          onSelectTheme={selectTheme}
        />
      </>
    );
  }

  // --- GUESS MODE RENDER ---
  if (gameState.mode === 'guess' && !gameState.isCompleted) {
    const targetName = gameState.playerNames[gameState.targetPlayerIndex || 0];
    
    return (
      <>
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          <header className="bg-white rounded-[2rem] p-8 shadow-lg border border-white/50 relative overflow-hidden mb-6">
            <button onClick={startNewGame} className="absolute top-4 left-4 p-3 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-all z-20">
              <Home size={20} />
            </button>
            <div className="absolute top-0 right-0 p-10 opacity-5 -mr-10 -mt-10">
              <Search size={160} className="text-purple-500" />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="inline-block px-4 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-black uppercase tracking-widest mb-3">Guessing Game</span>
                <h2 className="text-3xl font-black text-gray-800 leading-tight">
                  <RubyDisplay text={gameState.currentTheme?.title} />
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsThemeModalOpen(true)}
                  className="p-3 rounded-2xl transition-all border-2 bg-white border-gray-100 text-gray-400 hover:border-purple-200 hover:text-purple-500 shadow-sm"
                >
                  <List size={20} />
                </button>
                <button 
                  onClick={changeTheme}
                  className="p-3 rounded-2xl transition-all border-2 bg-white border-gray-100 text-gray-400 hover:border-purple-200 hover:text-purple-500 shadow-sm"
                >
                  <RotateCcw size={20} />
                </button>
                <button 
                  onClick={copyThemeToClipboard}
                  className={`p-3 rounded-2xl transition-all border-2 ${showCopyFeedback ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100' : 'bg-white border-gray-100 text-gray-400 hover:border-purple-200 hover:text-purple-500 shadow-sm'}`}
                >
                  {showCopyFeedback ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          </header>

          {guessStep === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border-4 border-purple-100 text-center space-y-8 animate-in zoom-in duration-500">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-purple-100/50">
                  <EyeOff size={48} className="text-purple-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">{targetName}さん入力タイム</h3>
                <p className="text-gray-500 font-bold leading-relaxed">
                  {targetName}さんは<ruby>自分<rt>じぶん</rt></ruby>の<ruby>価値観<rt>かちかん</rt></ruby>TOP3を教えてください。
                </p>
              </div>

              <div className="bg-purple-50/50 p-6 rounded-3xl border-2 border-dashed border-purple-200">
                <div className="space-y-3">
                  {gameState.currentTheme?.items.map((item, i) => {
                    const rank = [allPlayerRanks[gameState.targetPlayerIndex || 0].rank1, allPlayerRanks[gameState.targetPlayerIndex || 0].rank2, allPlayerRanks[gameState.targetPlayerIndex || 0].rank3].indexOf(item) + 1;
                    const isSelected = rank > 0;
                    return (
                      <button 
                        key={i}
                        onClick={() => toggleSelection(gameState.targetPlayerIndex || 0, item)}
                        className={`w-full p-4 rounded-2xl text-left font-bold border-2 transition-all flex items-center justify-between ${isSelected ? 'border-purple-400 bg-purple-500 text-white shadow-lg' : 'border-white bg-white/50 text-gray-400'}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`text-xs font-mono opacity-50 ${isSelected ? 'text-white' : ''}`}>{getAlphabet(i)}</span>
                          <RubyDisplay text={item} />
                        </span>
                        {isSelected && <span className="w-6 h-6 bg-white text-purple-500 rounded-lg flex items-center justify-center text-xs font-black">{rank}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                disabled={!isPlayerComplete(gameState.targetPlayerIndex || 0)}
                onClick={() => setGuessStep(1)}
                className={`w-full py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 transition-all ${isPlayerComplete(gameState.targetPlayerIndex || 0) ? 'bg-gray-900 text-white shadow-xl hover:scale-105' : 'bg-gray-100 text-gray-300'}`}
              >
                <ruby>入力完了<rt>にゅうりょくかんりょう</rt></ruby>！みんなに<ruby>渡<rt>わた</rt></ruby>す
                <ArrowRight size={24} />
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border-4 border-purple-100 text-center space-y-8 animate-in slide-in-from-right duration-500">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-purple-100/50">
                  <Users size={48} className="text-purple-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">みんなで<ruby>予想<rt>よそう</rt></ruby>タイム！</h3>
                <p className="text-gray-500 font-bold leading-relaxed">
                  {targetName}さんは<ruby>何<rt>なに</rt></ruby>を<ruby>選<rt>えら</rt></ruby>んだでしょうか？
                </p>
              </div>

              <h4 className="text-xl font-black text-gray-800 mb-4"><RubyDisplay text={gameState.currentTheme?.title} /></h4>

              <div className="bg-gray-100 rounded-3xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label htmlFor="timer-minutes" className="text-sm font-bold text-gray-500">時間（分）:</label>
                  <input 
                    id="timer-minutes"
                    type="number" 
                    min="1"
                    value={timerMinutes} 
                    onChange={(e) => {
                      const newMinutes = parseInt(e.target.value, 10);
                      if (newMinutes > 0) {
                        setTimerMinutes(newMinutes);
                        setTimer(newMinutes * 60);
                        setIsTimerRunning(false);
                      }
                    }} 
                    className="w-16 p-2 font-bold text-center rounded-lg border-2 bg-white/50"
                    disabled={isTimerRunning}
                  />
                </div>
                <div className={`text-3xl font-mono font-black ${timer > 10 || timer === 0 ? 'text-gray-700' : 'text-red-500 animate-pulse'}`}>
                  {`${Math.floor(timer / 60).toString().padStart(2, '0')}:${(timer % 60).toString().padStart(2, '0')}`}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsTimerRunning(!isTimerRunning)} 
                    className="p-3 rounded-xl bg-white shadow-md text-gray-700"
                    disabled={timer === 0}
                  >
                    {isTimerRunning ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button 
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimer(timerMinutes * 60);
                    }}
                    className="p-3 rounded-xl bg-white shadow-md text-gray-700"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl space-y-3">
                {gameState.currentTheme?.items.map((item, i) => {
                  const rank = [groupGuess.rank1, groupGuess.rank2, groupGuess.rank3].indexOf(item) + 1;
                  const isSelected = rank > 0;
                  return (
                    <button 
                      key={i}
                      onClick={() => toggleGuessSelection(item)}
                      disabled={timer === 0}
                      className={`w-full p-4 rounded-2xl text-left font-bold border-2 transition-all flex items-center justify-between ${
                        timer === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                        isSelected ? 'border-purple-400 bg-purple-100 text-purple-900' : 'border-white bg-white text-gray-400'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-xs font-mono opacity-30">{getAlphabet(i)}</span>
                        <RubyDisplay text={item} />
                      </span>
                      {isSelected && <span className="w-6 h-6 bg-purple-500 text-white rounded-lg flex items-center justify-center text-xs font-black">{rank}</span>}
                    </button>
                  );
                })}
              </div>

              <button 
                disabled={!isGuessComplete}
                onClick={handleFinalSubmit}
                className={`w-full py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 transition-all ${isGuessComplete ? 'bg-purple-600 text-white shadow-xl hover:scale-105' : 'bg-gray-100 text-gray-300'}`}
              >
                <ruby>予想<rt>よそう</rt></ruby>を<ruby>確定<rt>かくてい</rt></ruby>して<ruby>正解<rt>せいかい</rt></ruby>を<ruby>見<rt>み</rt></ruby>る
                <Trophy size={24} />
              </button>
            </div>
          )}
        </div>
        <ThemeSelectorModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
          themes={VALUE_THEMES}
          onSelectTheme={selectTheme}
        />
      </>
    );
  }

  // --- VIEW MODE RENDER ---
  if (gameState.mode === 'view') {
    return (
      <>
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          <div className="space-y-6">
            <header className="bg-white rounded-[2rem] p-8 shadow-lg border border-white/50 relative overflow-hidden">
              <button onClick={startNewGame} className="absolute top-4 left-4 p-3 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-all z-20">
                <Home size={20} />
              </button>
              <div className="absolute top-0 right-0 p-10 opacity-5 -mr-10 -mt-10">
                <Eye size={160} className="text-sky-500" />
              </div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <span className="inline-block px-4 py-1 bg-sky-100 text-sky-600 rounded-full text-xs font-black uppercase tracking-widest mb-3">View Mode</span>
                  <h2 className="text-3xl font-black text-gray-800 leading-tight">
                    <RubyDisplay text={gameState.currentTheme?.title} />
                  </h2>
                  <p className="text-gray-500 font-medium mt-2">自分のTOP3はどれ？　回答例：BDA</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsThemeModalOpen(true)}
                    className="p-3 rounded-2xl transition-all border-2 bg-white border-gray-100 text-gray-400 hover:border-sky-200 hover:text-sky-500 shadow-sm"
                  >
                    <List size={20} />
                  </button>
                  <button 
                    onClick={changeTheme}
                    className="p-3 rounded-2xl transition-all border-2 bg-white border-gray-100 text-gray-400 hover:border-sky-200 hover:text-sky-500 shadow-sm"
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button 
                    onClick={copyThemeToClipboard}
                    className={`p-3 rounded-2xl transition-all border-2 ${showCopyFeedback ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100' : 'bg-white border-gray-100 text-gray-400 hover:border-sky-200 hover:text-sky-500 shadow-sm'}`}
                  >
                    {showCopyFeedback ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            </header>
            
            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border-4 border-sky-100/50 space-y-3">
                {gameState.currentTheme?.items.map((item, i) => (
                    <div key={i} className="w-full p-4 rounded-2xl text-left font-bold border-2 bg-gray-50/60 text-gray-700 flex items-center gap-3">
                        <span className="text-xs font-mono opacity-30">{getAlphabet(i)}</span>
                        <RubyDisplay text={item} />
                    </div>
                ))}
            </div>

            <div className="pt-8 flex justify-center">
              <button 
                onClick={changeTheme} 
                className="w-full py-7 bg-white text-gray-900 rounded-[2.5rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 hover:bg-gray-50 transition-all border-b-8 border-gray-200 active:border-b-0 active:translate-y-1"
              >
                <ruby>別<rt>べつ</rt></ruby>のテーマで<ruby>遊<rt>あそ</rt></ruby>ぶ
                <RotateCcw size={28} />
              </button>
            </div>
          </div>
          <footer className="mt-16 text-center">
              <p className="text-gray-300 text-[10px] font-black uppercase tracking-[0.5em]">
                &copy; 2024 YURUTTO KACHIKAN TALK • Gemini Powered
              </p>
          </footer>
        </div>
        <ThemeSelectorModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
          themes={VALUE_THEMES}
          onSelectTheme={selectTheme}
        />
      </>
    );
  }

  // --- STANDARD GAME RENDER (SINGLE/GROUP) ---
  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {!gameState.isCompleted ? (
          <div className="space-y-6">
            <header className="bg-white rounded-[2rem] p-8 shadow-lg border border-white/50 relative overflow-hidden">
              <button onClick={startNewGame} className="absolute top-4 left-4 p-3 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-all z-20">
                <Home size={20} />
              </button>
              <div className="absolute top-0 right-0 p-10 opacity-5 -mr-10 -mt-10">
                <Sparkles size={160} />
              </div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <span className="inline-block px-4 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-black uppercase tracking-widest mb-3">Today's Theme</span>
                  <h2 className="text-3xl font-black text-gray-800 leading-tight">
                    <RubyDisplay text={gameState.currentTheme?.title} />
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsThemeModalOpen(true)}
                    className="p-3 rounded-2xl transition-all border-2 bg-white border-gray-100 text-gray-400 hover:border-orange-200 hover:text-orange-500 shadow-sm"
                  >
                    <List size={20} />
                  </button>
                  <button 
                    onClick={changeTheme}
                    className="p-3 rounded-2xl transition-all border-2 bg-white border-gray-100 text-gray-400 hover:border-orange-200 hover:text-orange-500 shadow-sm"
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button 
                    onClick={copyThemeToClipboard}
                    className={`p-3 rounded-2xl transition-all border-2 ${showCopyFeedback ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100' : 'bg-white border-gray-100 text-gray-400 hover:border-orange-200 hover:text-orange-500 shadow-sm'}`}
                  >
                    {showCopyFeedback ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gameState.playerNames.map((name, idx) => (
                <div 
                  key={idx} 
                  className={`bg-white rounded-[2rem] p-6 shadow-md transition-all border-4 flex flex-col h-full ${editingPlayerIndex === idx ? 'border-orange-400 ring-8 ring-orange-50' : 'border-transparent hover:shadow-lg'}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPlayerComplete(idx) ? 'bg-green-100 text-green-500' : 'bg-gray-100 text-gray-400'}`}>
                        {isPlayerComplete(idx) ? <CheckCircle2 size={24} /> : <User size={24} />}
                      </div>
                      <div>
                        <p className="font-black text-lg text-gray-800 leading-none mb-1">{name}</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">
                          {isPlayerComplete(idx) ? 'RANKING READY' : 'WAITING FOR INPUT'}
                        </p>
                      </div>
                    </div>
                    {editingPlayerIndex !== idx && (
                      <button 
                        onClick={() => setEditingPlayerIndex(idx)}
                        className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}
                  </div>

                  {editingPlayerIndex === idx ? (
                    <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                      <p className="text-xs font-black text-orange-500 mb-2">3つ<ruby>選<rt>えら</rt></ruby>んでください：</p>
                      <div className="grid grid-cols-1 gap-2">
                        {gameState.currentTheme?.items.map((item, i) => {
                          const rank = [allPlayerRanks[idx].rank1, allPlayerRanks[idx].rank2, allPlayerRanks[idx].rank3].indexOf(item) + 1;
                          const isSelected = rank > 0;
                          return (
                            <button 
                              key={i}
                              onClick={() => toggleSelection(idx, item)}
                              className={`p-4 rounded-xl text-left font-bold text-sm border-2 transition-all flex items-center justify-between ${isSelected ? 'border-orange-400 bg-orange-50 text-orange-900 shadow-sm' : 'border-gray-50 bg-gray-50/50 text-gray-500'}`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] opacity-30 font-mono">{getAlphabet(i)}</span>
                                <RubyDisplay text={item} />
                              </span>
                              {isSelected && (
                                <div className="w-6 h-6 bg-orange-500 text-white rounded-lg flex items-center justify-center text-xs font-black">
                                  {rank}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <button 
                        onClick={() => setEditingPlayerIndex(null)}
                        disabled={!isPlayerComplete(idx)}
                        className={`w-full py-4 mt-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${isPlayerComplete(idx) ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-300'}`}
                      >
                        <ruby>保存<rt>ほぞん</rt></ruby>して<ruby>一覧<rt>いちらん</rt></ruby>へ<ruby>戻<rt>もど</rt></ruby>る
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto pt-4 border-t border-gray-50 space-y-2">
                      {isPlayerComplete(idx) ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-5 h-5 bg-amber-400 text-white rounded-md flex items-center justify-center text-[10px] font-black">1</span>
                            <span className="font-bold text-gray-700 truncate"><RubyDisplay text={allPlayerRanks[idx].rank1} /></span>
                          </div>
                          <div className="flex items-center gap-2 text-sm opacity-70">
                            <span className="w-5 h-5 bg-gray-300 text-white rounded-md flex items-center justify-center text-[10px] font-black">2</span>
                            <span className="font-bold text-gray-700 truncate"><RubyDisplay text={allPlayerRanks[idx].rank2} /></span>
                          </div>
                          <div className="flex items-center gap-2 text-sm opacity-50">
                            <span className="w-5 h-5 bg-orange-200 text-white rounded-md flex items-center justify-center text-[10px] font-black">3</span>
                            <span className="font-bold text-gray-700 truncate"><RubyDisplay text={allPlayerRanks[idx].rank3} /></span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-20 border-2 border-dashed border-gray-50 rounded-2xl flex flex-col items-center justify-center gap-2 group cursor-pointer" onClick={() => setEditingPlayerIndex(idx)}>
                          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                            <Plus size={16} />
                          </div>
                          <span className="text-[10px] font-black text-gray-300 tracking-widest uppercase">Tap to input</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-8 pb-12 flex justify-center">
              <button 
                disabled={!isAllComplete || editingPlayerIndex !== null}
                onClick={handleFinalSubmit}
                className={`px-12 py-6 rounded-full font-black text-xl flex items-center gap-4 transition-all ${isAllComplete && editingPlayerIndex === null ? 'bg-gray-900 text-white shadow-2xl hover:scale-105 active:scale-95' : 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50'}`}
              >
                <ruby>分析結果<rt>ぶんせきけっか</rt></ruby>を<ruby>見<rt>み</rt></ruby>る
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 border border-white/50 relative overflow-hidden">
              <button onClick={startNewGame} className="absolute top-4 left-4 p-3 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-all z-20">
                <Home size={20} />
              </button>
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400"></div>
              
              <div className="flex flex-col items-center mb-12">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${gameState.mode === 'guess' ? 'bg-purple-100 text-purple-500' : 'bg-orange-100 text-orange-500'}`}>
                  <Trophy size={48} />
                </div>
                <h2 className="text-4xl font-black text-gray-800">{gameState.mode === 'guess' ? <ruby>正解発表<rt>せいかいはっぴょう</rt></ruby> : <ruby>結果発表<rt>けっかはっぴょう</rt></ruby>}</h2>
                <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest"><RubyDisplay text={gameState.currentTheme?.title} /></p>
              </div>

              {gameState.mode === 'guess' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  <div className="space-y-6">
                    <h3 className="text-center text-xs font-black text-purple-400 uppercase tracking-widest bg-purple-50 py-2 rounded-full"><ruby>本人<rt>ほんにん</rt></ruby>（{gameState.playerNames[gameState.targetPlayerIndex || 0]}）の<ruby>選択<rt>せんたく</rt></ruby></h3>
                    <div className="space-y-3">
                      {[allPlayerRanks[gameState.targetPlayerIndex || 0].rank1, allPlayerRanks[gameState.targetPlayerIndex || 0].rank2, allPlayerRanks[gameState.targetPlayerIndex || 0].rank3].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 bg-gray-50 p-6 rounded-3xl border-2 border-transparent">
                          <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : 'bg-orange-300'}`}>
                            {i + 1}
                          </span>
                          <span className="font-black text-lg text-gray-800"><RubyDisplay text={item} /></span>
                          {item === (i === 0 ? groupGuess.rank1 : i === 1 ? groupGuess.rank2 : groupGuess.rank3) && (
                            <CheckCircle2 className="ml-auto text-green-500" size={24} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-center text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-100 py-2 rounded-full">みんなの<ruby>予想<rt>よそう</rt></ruby></h3>
                    <div className="space-y-3">
                      {[groupGuess.rank1, groupGuess.rank2, groupGuess.rank3].map((item, i) => {
                        const isCorrect = item === (i === 0 ? allPlayerRanks[gameState.targetPlayerIndex || 0].rank1 : i === 1 ? allPlayerRanks[gameState.targetPlayerIndex || 0].rank2 : allPlayerRanks[gameState.targetPlayerIndex || 0].rank3);
                        return (
                          <div key={i} className={`flex items-center gap-4 p-6 rounded-3xl border-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200 opacity-60'}`}>
                            <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : 'bg-orange-300'}`}>
                              {i + 1}
                            </span>
                            <span className="font-black text-lg text-gray-800"><RubyDisplay text={item} /></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {gameState.mode === 'group' && (
                    <div className="mb-12">
                      <h3 className="text-center text-xs font-black text-gray-300 uppercase tracking-[0.3em] mb-8">Overall Ranking</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {aggregateResults.slice(0, 3).map((res, i) => (
                          <div key={res.name} className={`relative p-6 rounded-[2rem] flex flex-col items-center text-center border-4 ${i === 0 ? 'bg-orange-50 border-orange-200 scale-110 z-10' : 'bg-gray-50 border-transparent opacity-80'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white mb-4 ${i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-300'}`}>
                              {i + 1}
                            </div>
                            <div className="font-black text-lg text-gray-900 leading-snug h-12 flex items-center justify-center"><RubyDisplay text={res.name} /></div>
                            <div className="text-xs font-black text-orange-400 mt-2">{res.score} pt</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] mb-6 ml-2">Indivisual Choices</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {gameState.votes.map((vote, idx) => (
                        <div key={idx} className="p-5 bg-gray-50/50 rounded-3xl border border-gray-100">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                            <span className="font-black text-gray-800 text-sm">{vote.playerName}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-gray-600">1<ruby>位<rt>い</rt></ruby>: <RubyDisplay text={vote.ranks.rank1} /></div>
                            <div className="text-[10px] font-medium text-gray-400">2<ruby>位<rt>い</rt></ruby>: <RubyDisplay text={vote.ranks.rank2} /> / 3<ruby>位<rt>い</rt></ruby>: <RubyDisplay text={vote.ranks.rank3} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>



            {gameState.mode === 'group' ? (
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  onClick={startNewGame}
                  className="flex-1 py-6 bg-gray-100 text-gray-700 rounded-[2rem] font-black text-xl shadow-md flex items-center justify-center gap-3 hover:bg-gray-200 transition-all"
                >
                  ホームに<ruby>戻<rt>もど</rt></ruby>る
                  <Home size={24} />
                </button>
                <button
                  onClick={goToNextTheme}
                  className="flex-[2] py-6 bg-orange-500 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-orange-100 flex items-center justify-center gap-3 hover:bg-orange-600 transition-all"
                >
                  <ruby>次<rt>つぎ</rt></ruby>のお<ruby>題<rt>だい</rt></ruby>へ
                  <ArrowRight size={24} />
                </button>
              </div>
            ) : (
              <button
                onClick={startNewGame}
                className="w-full py-7 bg-white text-gray-900 rounded-[2.5rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 hover:bg-gray-50 transition-all border-b-8 border-gray-200 active:border-b-0 active:translate-y-1"
              >
                <ruby>別<rt>べつ</rt></ruby>のテーマで<ruby>遊<rt>あそ</rt></ruby>ぶ
                <RotateCcw size={28} />
              </button>
            )}
          </div>
        )}

        <footer className="mt-16 text-center">
          <p className="text-gray-300 text-[10px] font-black uppercase tracking-[0.5em]">
            &copy; 2024 YURUTTO KACHIKAN TALK • Gemini Powered
          </p>
        </footer>
      </div>
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        themes={VALUE_THEMES}
        onSelectTheme={selectTheme}
      />
    </>
  );
};

export default App;
