
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Camera, Users, Trophy } from 'lucide-react';

const SUPABASE_URL = 'https://ngvsqgjuinpwncpxzjth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_d53jWPWx1rU20L9QBNMQRQ_ZGedNEbA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PhotoChallenge = () => {
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

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

  const challengesList = [
    { title: '🤪 Selfie Extremo', desc: 'Cara más ridícula posible' },
    { title: '✈️ Defying Gravity', desc: 'Saltando bien alto' },
    { title: '🎭 Todos Iguales', desc: 'Grupo con la MISMA pose' },
    { title: '🪞 Espejo del Alma', desc: 'Tu reflejo en algo' },
    { title: '🏛️ Monumento Nuestro', desc: 'Vosotros en algo icónico' },
  ];

  const createRoom = async () => {
    if (!inputNick) return;
    setLoading(true);
    setError('');

    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert([{ code, name: inputNick, created_by: inputNick }])
        .select();

      if (roomError) throw roomError;

      const roomId = roomData[0].id;
      const userColor = colors[0];

      const { data: userData, error: userError } = await supabase
        .from('participants')
        .insert([{ room_id: roomId, nickname: inputNick, avatar_color: userColor }])
        .select();

      if (userError) throw userError;

      for (let i = 0; i < challengesList.length; i++) {
        const { error: challengeError } = await supabase
          .from('challenges')
          .insert([{
            room_id: roomId,
            title: challengesList[i].title,
            description: challengesList[i].desc,
          }]);

        if (challengeError) throw challengeError;
      }

      setCurrentRoom({ id: roomId, code });
      setCurrentUser({ id: userData[0].id, nick: inputNick, color: userColor });
      setGameState('play');
      await loadRoomData(roomId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!inputCode || !inputNick) return;
    setLoading(true);
    setError('');

    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select()
        .eq('code', inputCode)
        .single();

      if (roomError) throw new Error('Sala no encontrada');

      const userColor = colors[Math.floor(Math.random() * colors.length)];

      const { data: userData, error: userError } = await supabase
        .from('participants')
        .insert([{ room_id: roomData.id, nickname: inputNick, avatar_color: userColor }])
        .select();

      if (userError) throw userError;

      setCurrentRoom(roomData);
      setCurrentUser({ id: userData[0].id, nick: inputNick, color: userColor });
      setGameState('play');
      await loadRoomData(roomData.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRoomData = async (roomId) => {
    try {
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select()
        .eq('room_id', roomId);

      if (challengeError) throw challengeError;

      setChallenges(challengeData || []);

      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select()
        .eq('room_id', roomId);

      if (participantError) throw participantError;

      setParticipants(participantData || []);

      const challengeIds = (challengeData || []).map(c => c.id);

      if (challengeIds.length === 0) {
        setSubmissions({});
        return;
      }

      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .select()
        .in('challenge_id', challengeIds);

      if (submissionError) throw submissionError;

      const submissionsByChallenge = {};
      (submissionData || []).forEach(sub => {
        if (!submissionsByChallenge[sub.challenge_id]) {
          submissionsByChallenge[sub.challenge_id] = [];
        }
        submissionsByChallenge[sub.challenge_id].push(sub);
      });

      setSubmissions(submissionsByChallenge);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!currentRoom?.id) return;

    const channel = supabase
      .channel(`room-${currentRoom.id}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
        },
        async () => {
          await loadRoomData(currentRoom.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
        },
        async () => {
          await loadRoomData(currentRoom.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom?.id]);

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
          sub => sub.participant_id === currentUser.id
        );

        if (alreadySubmitted) {
          throw new Error('Ya has enviado una foto para este reto');
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${currentRoom.id}/${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const { error: uploadError } = await supabase
          .storage
          .from('photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase
          .storage
          .from('photos')
          .getPublicUrl(fileName);

        const imageUrl = publicUrlData.publicUrl;

        const { error: insertError } = await supabase
          .from('submissions')
          .insert([{
            challenge_id: challengeId,
            participant_id: currentUser.id,
            image_url: imageUrl,
          }]);

        if (insertError) throw insertError;

        await loadRoomData(currentRoom.id);
      } catch (err) {
        console.error('Error subiendo foto:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    input.click();
  };

  const getRanking = () => {
    const stats = {};

    participants.forEach(p => {
      stats[p.id] = { nick: p.nickname, color: p.avatar_color, count: 0 };
    });

    Object.values(submissions).forEach(subs => {
      subs.forEach(sub => {
        if (stats[sub.participant_id]) stats[sub.participant_id].count++;
      });
    });

    return Object.values(stats).sort((a, b) => b.count - a.count).slice(0, 5);
  };

  if (gameState === 'home') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', textAlign: 'center', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📸</div>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontWeight: '700' }}>Photo Challenge</h1>
        <p style={{ fontSize: '1rem', marginBottom: '2.5rem', opacity: 0.9 }}>Retos épicos con amigos</p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', maxWidth: '320px' }}>
          <button onClick={() => setGameState('create')} style={{ padding: '1rem 2rem', fontSize: '1rem', background: 'white', color: '#667eea', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, minWidth: '140px' }}>+ Crear sala</button>
          <button onClick={() => setGameState('join')} style={{ padding: '1rem 2rem', fontSize: '1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid white', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, minWidth: '140px' }}>Unirse</button>
        </div>
      </div>
    );
  }

  if (gameState === 'create') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '1.5rem' }}>
        <button onClick={() => setGameState('home')} style={{ padding: '0.6rem 1.2rem', marginBottom: '2rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>← Atrás</button>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '400px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700' }}>Crear quedada</h2>
          {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
          <input value={inputNick} onChange={(e) => setInputNick(e.target.value)} placeholder="Tu nombre" style={{ width: '100%', padding: '0.9rem', marginBottom: '1.5rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }} />
          <button onClick={createRoom} disabled={!inputNick || loading} style={{ width: '100%', padding: '1rem', background: inputNick && !loading ? '#667eea' : '#ccc', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '1rem' }}>
            {loading ? 'Creando...' : 'Crear sala'}
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'join') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '1.5rem' }}>
        <button onClick={() => setGameState('home')} style={{ padding: '0.6rem 1.2rem', marginBottom: '2rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>← Atrás</button>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '400px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700' }}>Unirse a quedada</h2>
          {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
          <input value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} placeholder="Código" maxLength="6" style={{ width: '100%', padding: '0.9rem', marginBottom: '1rem', border: '2px solid #ddd', borderRadius: '6px', fontSize: '1.2rem', textAlign: 'center', fontWeight: '700', letterSpacing: '2px', boxSizing: 'border-box' }} />
          <input value={inputNick} onChange={(e) => setInputNick(e.target.value)} placeholder="Tu nombre" style={{ width: '100%', padding: '0.9rem', marginBottom: '1.5rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }} />
          <button onClick={joinRoom} disabled={!inputCode || !inputNick || loading} style={{ width: '100%', padding: '1rem', background: (inputCode && inputNick && !loading) ? '#667eea' : '#ccc', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '1rem' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'play' && currentRoom && currentUser) {
    const ranking = getRanking();

    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', paddingBottom: '2rem' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e0e0e0', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ margin: '0 0 0.3rem 0', fontSize: '1.3rem', fontWeight: '700' }}>Quedada</h1>
            <div style={{ fontSize: '0.75rem', color: '#999', letterSpacing: '1.5px', fontWeight: '700' }}>{currentRoom.code}</div>
          </div>
          <button
            onClick={() => {
              setGameState('home');
              setCurrentRoom(null);
              setCurrentUser(null);
              setParticipants([]);
              setChallenges([]);
              setSubmissions({});
              setSelectedImage(null);
              setError('');
            }}
            style={{ padding: '0.6rem 1.2rem', background: '#f5f5f5', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#333', fontSize: '0.9rem', fontWeight: '500' }}
          >
            Salir
          </button>
        </div>

        {error && (
          <div style={{ margin: '1rem 1rem 0', background: '#ffe8e8', color: '#b00020', padding: '1rem', borderRadius: '8px', border: '1px solid #ffcaca' }}>
            {error}
          </div>
        )}

        <div style={{ background: 'white', margin: '1rem', padding: '1.2rem', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #667eea' }}>
          <p style={{ fontSize: '0.85rem', color: '#999', margin: '0 0 0.7rem 0', fontWeight: '500' }}>Código de sala</p>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#667eea', letterSpacing: '3px', marginBottom: '1rem', fontFamily: 'monospace' }}>{currentRoom.code}</div>
          <button onClick={() => navigator.clipboard.writeText(currentRoom.code)} style={{ padding: '0.6rem 1.2rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }}>📋 Copiar</button>
        </div>

        <div style={{ background: 'white', margin: '0 1rem 1rem', padding: '1.2rem', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Users size={18} /> {participants.length} participantes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '0.8rem' }}>
            {participants.map(p => (
              <div key={p.id} style={{ padding: '0.8rem', background: p.avatar_color, color: 'white', borderRadius: '6px', textAlign: 'center', fontSize: '0.8rem', fontWeight: '600' }}>{p.nickname}</div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', margin: '0 1rem 1rem', padding: '1.2rem', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Trophy size={18} /> Top ranking</h3>
          {ranking.map((r, i) => (
            <div key={r.nick} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 0', borderBottom: i < ranking.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#999', minWidth: '28px' }}>{i + 1}</div>
              <div style={{ width: '32px', height: '32px', background: r.color, borderRadius: '50%' }} />
              <div style={{ flex: 1, fontSize: '0.95rem', color: '#333', fontWeight: '500' }}>{r.nick}</div>
              <div style={{ fontWeight: '700', color: '#667eea', fontSize: '1.1rem' }}>{r.count}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.2rem', color: '#333' }}>Retos</h2>
          {challenges.map(ch => {
            const subs = submissions[ch.id] || [];
            const userSubmitted = subs.some(s => s.participant_id === currentUser.id);

            return (
              <div key={ch.id} style={{ background: 'white', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', border: userSubmitted ? '2px solid #4ECDC4' : '1px solid #e0e0e0' }}>
                <div style={{ padding: '1.2rem', background: userSubmitted ? 'rgba(78, 205, 196, 0.08)' : 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.8rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem', fontWeight: '700', color: '#333' }}>{ch.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#999' }}>{ch.description}</p>
                    </div>
                    <div style={{ background: '#f0f0f0', padding: '0.4rem 0.9rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '700', color: '#666', whiteSpace: 'nowrap', marginLeft: '0.8rem' }}>{subs.length}</div>
                  </div>

                  <button onClick={() => submitChallenge(ch.id)} disabled={loading || userSubmitted} style={{ width: '100%', padding: '0.9rem', background: userSubmitted ? '#4ECDC4' : '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: userSubmitted ? 'default' : 'pointer', fontSize: '1rem', marginTop: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', opacity: loading ? 0.6 : 1 }}>
                    <Camera size={18} />
                    {userSubmitted ? '✓ Completado' : 'Enviar foto'}
                  </button>
                </div>

                {subs.length > 0 && (
                  <div style={{ padding: '1.2rem', background: '#f9f9f9', borderTop: '1px solid #e0e0e0' }}>
                    <p style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 0.8rem 0', fontWeight: '600' }}>Enviadas ({subs.length})</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
                      {subs.map(sub => (
                        <div
                          key={sub.id}
                          onClick={() => setSelectedImage(sub.image_url)}
                          style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', background: '#eee', cursor: 'pointer' }}
                        >
                          <img src={sub.image_url} alt="submission" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedImage && (
          <div
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.92)',
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
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default PhotoChallenge;
