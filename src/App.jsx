import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Camera, Users, Trophy, Eye, EyeOff, Copy, LogOut, RefreshCw, Sparkles } from 'lucide-react';

const SUPABASE_URL = 'https://ngvsqgjuinpwncpxzjth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_d53jWPWx1rU20L9QBNMQRQ_ZGedNEbA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const STORAGE_KEY = 'photo_challenge_session';

const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b267', '#7b61ff', '#f4845f'];

const challengesList = [
  { title: '📸 Foto robada', desc: 'Pilla a alguien sin que pose' },
  { title: '😂 Momento pillado', desc: 'Una reacción real y graciosa' },
  { title: '🍷 Paparazzi de mesa', desc: 'La cena como si hubiera prensa' },
  { title: '🕵️ Cámara espía', desc: 'Un encuadre raro o sospechoso' },
  { title: '✨ Caos elegante', desc: 'Algo absurdo pero con estilo' },
];

const pageBg = 'linear-gradient(180deg, #fff7ed 0%, #fffaf5 45%, #fff 100%)';
const heroBg = 'linear-gradient(135deg, #7c3aed 0%, #ec4899 45%, #f59e0b 100%)';

const cardStyle = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.6)',
  borderRadius: '20px',
  boxShadow: '0 14px 38px rgba(124, 58, 237, 0.10)',
};

const buttonPrimary = {
  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(124,58,237,0.22)',
};

const buttonSoft = {
  background: '#fff',
  color: '#4b5563',
  border: '1px solid #ece7f5',
  borderRadius: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const inputStyle = {
  width: '100%',
  padding: '0.95rem 1rem',
  marginBottom: '1rem',
  border: '1px solid #e7dff5',
  borderRadius: '14px',
  fontSize: '1rem',
  boxSizing: 'border-box',
  background: '#fff',
  outline: 'none',
};

export default function PhotoChallenge() {
  const [gameState, setGameState] = useState('home');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [inputNick, setInputNick] = useState('');
  const [participants, setParticipants] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [revealedAuthors, setRevealedAuthors] = useState({});

  const participantsById = useMemo(() => {
    const map = {};
    participants.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [participants]);

  const saveSession = (room, user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ room, user }));
  };

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const loadRoomData = async (roomId) => {
    try {
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (challengeError) throw challengeError;
      setChallenges(challengeData || []);

      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });

      if (participantError) throw participantError;
      setParticipants(participantData || []);

      const challengeIds = (challengeData || []).map((c) => c.id);
      if (!challengeIds.length) {
        setSubmissions({});
        return;
      }

      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .select('*')
        .in('challenge_id', challengeIds);

      if (submissionError) throw submissionError;

      const grouped = {};
      (submissionData || []).forEach((sub) => {
        if (!grouped[sub.challenge_id]) grouped[sub.challenge_id] = [];
        grouped[sub.challenge_id].push(sub);
      });

      setSubmissions(grouped);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error cargando la sala');
    }
  };

  const restoreSession = async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed?.room?.id || !parsed?.user?.id) return;

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', parsed.room.id)
        .single();

      if (roomError || !roomData) {
        clearSession();
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', parsed.user.id)
        .eq('room_id', parsed.room.id)
        .single();

      if (userError || !userData) {
        clearSession();
        return;
      }

      const room = { id: roomData.id, code: roomData.code };
      const user = {
        id: userData.id,
        nick: userData.nickname,
        color: userData.avatar_color,
      };

      setCurrentRoom(room);
      setCurrentUser(user);
      setGameState('play');
      await loadRoomData(room.id);
    } catch (err) {
      console.error(err);
      clearSession();
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (gameState !== 'play' || !currentRoom?.id) return;

    loadRoomData(currentRoom.id);

    const interval = setInterval(() => {
      loadRoomData(currentRoom.id);
    }, 3000);

    const onFocus = () => loadRoomData(currentRoom.id);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadRoomData(currentRoom.id);
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [gameState, currentRoom?.id]);

  const createRoom = async () => {
    if (!inputNick.trim()) return;
    setLoading(true);
    setError('');

    try {
      const cleanNick = inputNick.trim();
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert([{ code, name: cleanNick, created_by: cleanNick }])
        .select()
        .single();

      if (roomError) throw roomError;

      const userColor = colors[0];

      const { data: userData, error: userError } = await supabase
        .from('participants')
        .insert([{ room_id: roomData.id, nickname: cleanNick, avatar_color: userColor }])
        .select()
        .single();

      if (userError) throw userError;

      const challengesToInsert = challengesList.map((challenge) => ({
        room_id: roomData.id,
        title: challenge.title,
        description: challenge.desc,
      }));

      const { error: challengesError } = await supabase
        .from('challenges')
        .insert(challengesToInsert);

      if (challengesError) throw challengesError;

      const room = { id: roomData.id, code: roomData.code };
      const user = { id: userData.id, nick: cleanNick, color: userColor };

      setCurrentRoom(room);
      setCurrentUser(user);
      saveSession(room, user);
      setGameState('play');
      await loadRoomData(room.id);
    } catch (err) {
      setError(err.message || 'Error creando la sala');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!inputCode.trim() || !inputNick.trim()) return;
    setLoading(true);
    setError('');

    try {
      const cleanCode = inputCode.trim().toUpperCase();
      const cleanNick = inputNick.trim();

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', cleanCode)
        .single();

      if (roomError || !roomData) throw new Error('Sala no encontrada');

      const { data: existingParticipants, error: existingError } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomData.id)
        .ilike('nickname', cleanNick)
        .limit(1);

      if (existingError) throw existingError;

      let finalUser = null;

      if (existingParticipants && existingParticipants.length > 0) {
        finalUser = existingParticipants[0];
      } else {
        const userColor = colors[Math.floor(Math.random() * colors.length)];

        const { data: newUser, error: userError } = await supabase
          .from('participants')
          .insert([{ room_id: roomData.id, nickname: cleanNick, avatar_color: userColor }])
          .select()
          .single();

        if (userError) {
          if (userError.code === '23505') {
            const { data: retryUser, error: retryError } = await supabase
              .from('participants')
              .select('*')
              .eq('room_id', roomData.id)
              .ilike('nickname', cleanNick)
              .limit(1);

            if (retryError || !retryUser?.length) throw userError;
            finalUser = retryUser[0];
          } else {
            throw userError;
          }
        } else {
          finalUser = newUser;
        }
      }

      const room = { id: roomData.id, code: roomData.code };
      const user = {
        id: finalUser.id,
        nick: finalUser.nickname,
        color: finalUser.avatar_color,
      };

      setCurrentRoom(room);
      setCurrentUser(user);
      saveSession(room, user);
      setGameState('play');
      await loadRoomData(room.id);
    } catch (err) {
      setError(err.message || 'Error al entrar en la sala');
    } finally {
      setLoading(false);
    }
  };

  const refreshRoom = async () => {
    if (!currentRoom?.id) return;
    setLoading(true);
    setError('');
    try {
      await loadRoomData(currentRoom.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const leaveRoom = () => {
    clearSession();
    setGameState('home');
    setCurrentRoom(null);
    setCurrentUser(null);
    setParticipants([]);
    setChallenges([]);
    setSubmissions({});
    setSelectedImage(null);
    setRevealedAuthors({});
    setError('');
    setInputCode('');
    setInputNick('');
  };

  const toggleReveal = (submissionId) => {
    setRevealedAuthors((prev) => ({
      ...prev,
      [submissionId]: !prev[submissionId],
    }));
  };

  const submitChallenge = async (challengeId) => {
    if (!currentUser || !currentRoom) return;
    setError('');

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setLoading(true);

      try {
        const alreadySubmitted = (submissions[challengeId] || []).some(
          (sub) => sub.participant_id === currentUser.id
        );

        if (alreadySubmitted) {
          throw new Error('Ya has enviado una foto para este reto');
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${currentRoom.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        const imageUrl = publicUrlData.publicUrl;

        const { error: insertError } = await supabase
          .from('submissions')
          .insert([
            {
              challenge_id: challengeId,
              participant_id: currentUser.id,
              image_url: imageUrl,
            },
          ]);

        if (insertError) throw insertError;

        await loadRoomData(currentRoom.id);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error subiendo la foto');
      } finally {
        setLoading(false);
      }
    };

    input.click();
  };

  const getRanking = () => {
    const stats = {};

    participants.forEach((p) => {
      if (!stats[p.id]) {
        stats[p.id] = { nick: p.nickname, color: p.avatar_color, count: 0 };
      }
    });

    Object.values(submissions).forEach((subs) => {
      subs.forEach((sub) => {
        if (stats[sub.participant_id]) stats[sub.participant_id].count++;
      });
    });

    return Object.values(stats).sort((a, b) => b.count - a.count).slice(0, 5);
  };

  if (gameState === 'home') {
    return (
      <div style={{ minHeight: '100vh', background: heroBg, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...cardStyle, maxWidth: '460px', width: '100%', padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '74px', height: '74px', borderRadius: '22px', margin: '0 auto 1rem', background: 'linear-gradient(135deg, #7c3aed, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(124,58,237,0.22)' }}>
            <Sparkles color="white" size={34} />
          </div>
          <h1 style={{ margin: 0, fontSize: '2.2rem', color: '#1f2937' }}>Cena Photo Game</h1>
          <p style={{ margin: '0.8rem 0 2rem', color: '#6b7280', fontSize: '1rem' }}>
            Fotos robadas, momentos pillados y caos elegante en solo 5 retos.
          </p>
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <button onClick={() => setGameState('create')} style={{ ...buttonPrimary, padding: '1rem 1.2rem', fontSize: '1rem' }}>
              + Crear sala
            </button>
            <button onClick={() => setGameState('join')} style={{ ...buttonSoft, padding: '1rem 1.2rem', fontSize: '1rem' }}>
              Unirse a una sala
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'create') {
    return (
      <div style={{ minHeight: '100vh', background: pageBg, padding: '1.5rem' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>
          <button onClick={() => setGameState('home')} style={{ ...buttonSoft, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            ← Atrás
          </button>
          <div style={{ ...cardStyle, padding: '1.5rem' }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>Crear sala</h2>
            <p style={{ color: '#6b7280', marginTop: 0 }}>Empieza la partida y comparte el código con la mesa.</p>
            {error && <p style={{ color: '#b91c1c', background: '#fee2e2', padding: '0.85rem', borderRadius: '12px' }}>{error}</p>}
            <input value={inputNick} onChange={(e) => setInputNick(e.target.value)} placeholder="Tu nombre" style={inputStyle} />
            <button onClick={createRoom} disabled={!inputNick || loading} style={{ ...buttonPrimary, width: '100%', padding: '1rem', opacity: !inputNick || loading ? 0.6 : 1 }}>
              {loading ? 'Creando...' : 'Crear sala'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'join') {
    return (
      <div style={{ minHeight: '100vh', background: pageBg, padding: '1.5rem' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>
          <button onClick={() => setGameState('home')} style={{ ...buttonSoft, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            ← Atrás
          </button>
          <div style={{ ...cardStyle, padding: '1.5rem' }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>Unirse a una sala</h2>
            <p style={{ color: '#6b7280', marginTop: 0 }}>Pon el código y entra con tu nombre.</p>
            {error && <p style={{ color: '#b91c1c', background: '#fee2e2', padding: '0.85rem', borderRadius: '12px' }}>{error}</p>}
            <input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Código"
              maxLength="6"
              style={{ ...inputStyle, textAlign: 'center', fontWeight: 800, letterSpacing: '0.18em', fontSize: '1.2rem' }}
            />
            <input value={inputNick} onChange={(e) => setInputNick(e.target.value)} placeholder="Tu nombre" style={inputStyle} />
            <button onClick={joinRoom} disabled={!inputCode || !inputNick || loading} style={{ ...buttonPrimary, width: '100%', padding: '1rem', opacity: !inputCode || !inputNick || loading ? 0.6 : 1 }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'play' && currentRoom && currentUser) {
    const ranking = getRanking();

    return (
      <div style={{ minHeight: '100vh', background: pageBg, paddingBottom: '2rem' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '1rem' }}>
          <div style={{ ...cardStyle, maxWidth: '1100px', margin: '0 auto', padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#a855f7', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.12em' }}>SALA</div>
              <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', color: '#1f2937' }}>{currentRoom.code}</h1>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button onClick={refreshRoom} disabled={loading} style={{ ...buttonSoft, padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <RefreshCw size={16} /> Recargar
              </button>
              <button onClick={() => navigator.clipboard.writeText(currentRoom.code)} style={{ ...buttonSoft, padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Copy size={16} /> Copiar código
              </button>
              <button onClick={leaveRoom} style={{ ...buttonSoft, padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <LogOut size={16} /> Salir
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1rem' }}>
          {error && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '16px', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: '1rem' }}>
            <div style={{ ...cardStyle, padding: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', color: '#7c3aed', fontWeight: 700 }}>
                <Users size={18} /> Participantes
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1f2937', marginBottom: '0.75rem' }}>{participants.length}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {participants.map((p) => (
                  <span key={p.id} style={{ background: p.avatar_color || '#ddd', color: 'white', padding: '0.45rem 0.7rem', borderRadius: '999px', fontSize: '0.84rem', fontWeight: 700 }}>
                    {p.nickname}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', color: '#ec4899', fontWeight: 700 }}>
                <Trophy size={18} /> Ranking rápido
              </div>
              {ranking.length === 0 ? (
                <p style={{ color: '#6b7280', margin: 0 }}>Todavía no hay fotos subidas.</p>
              ) : (
                ranking.map((r, i) => (
                  <div key={`${r.nick}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.45rem 0' }}>
                    <div style={{ width: '24px', textAlign: 'center', fontWeight: 800, color: '#9ca3af' }}>{i + 1}</div>
                    <div style={{ width: '26px', height: '26px', borderRadius: '999px', background: r.color }} />
                    <div style={{ flex: 1, color: '#374151', fontWeight: 600 }}>{r.nick}</div>
                    <div style={{ fontWeight: 800, color: '#7c3aed' }}>{r.count}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: '1.2rem', marginBottom: '1rem' }}>
            <div style={{ color: '#7c3aed', fontWeight: 800, marginBottom: '0.35rem' }}>Tu misión esta noche</div>
            <div style={{ color: '#4b5563' }}>
              Sube una foto por reto. Luego podéis revelar el autor de cada una para debatir quién fue el paparazzi de la mesa.
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {challenges.map((ch) => {
              const subs = submissions[ch.id] || [];
              const userSubmitted = subs.some((s) => s.participant_id === currentUser.id);

              return (
                <div key={ch.id} style={{ ...cardStyle, overflow: 'hidden' }}>
                  <div style={{ padding: '1.2rem', background: userSubmitted ? 'linear-gradient(180deg, rgba(236,72,153,0.06), rgba(124,58,237,0.03))' : 'transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.15rem' }}>{ch.title}</h3>
                        <p style={{ margin: '0.35rem 0 0', color: '#6b7280' }}>{ch.description}</p>
                      </div>
                      <div style={{ background: '#faf5ff', color: '#7c3aed', border: '1px solid #eadcff', padding: '0.55rem 0.8rem', borderRadius: '999px', fontWeight: 800, fontSize: '0.88rem' }}>
                        {subs.length} foto{subs.length === 1 ? '' : 's'}
                      </div>
                    </div>

                    <button
                      onClick={() => submitChallenge(ch.id)}
                      disabled={loading || userSubmitted}
                      style={{
                        ...buttonPrimary,
                        marginTop: '1rem',
                        width: '100%',
                        padding: '0.95rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.55rem',
                        opacity: loading ? 0.65 : 1,
                        background: userSubmitted ? 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' : buttonPrimary.background,
                      }}
                    >
                      <Camera size={18} />
                      {userSubmitted ? 'Foto subida' : 'Subir foto'}
                    </button>
                  </div>

                  {subs.length > 0 && (
                    <div style={{ padding: '0 1.2rem 1.2rem' }}>
                      <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
                        {subs.map((sub) => {
                          const author = participantsById[sub.participant_id];
                          const revealed = !!revealedAuthors[sub.id];

                          return (
                            <div key={sub.id} style={{ background: '#fff', border: '1px solid #f0e7fb', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 8px 22px rgba(17,24,39,0.05)' }}>
                              <div onClick={() => setSelectedImage(sub.image_url)} style={{ cursor: 'pointer', background: '#f3f4f6' }}>
                                <img
                                  src={sub.image_url}
                                  alt="submission"
                                  style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
                                />
                              </div>
                              <div style={{ padding: '0.85rem' }}>
                                <div style={{ fontSize: '0.84rem', color: '#6b7280', marginBottom: '0.7rem' }}>
                                  {revealed ? `Foto de ${author?.nickname || 'desconocido'}` : 'Autor oculto'}
                                </div>
                                <button
                                  onClick={() => toggleReveal(sub.id)}
                                  style={{
                                    ...buttonSoft,
                                    width: '100%',
                                    padding: '0.75rem 0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.45rem',
                                  }}
                                >
                                  {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                                  {revealed ? 'Ocultar autor' : 'Revelar autor'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selectedImage && (
          <div
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17,24,39,0.88)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
          >
            <img
              src={selectedImage}
              alt="preview"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: '20px',
                objectFit: 'contain',
                boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}
