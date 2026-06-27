import React, { useState, useEffect } from 'react';
import { Plus, Share2, LogOut, Home, Clock, Users, Trophy, Camera } from 'lucide-react';

const PhotoChallenge = () => {
  const [gameState, setGameState] = useState('home');
  const [rooms, setRooms] = useState(() => {
    const saved = localStorage.getItem('rooms');
    return saved ? JSON.parse(saved) : {};
  });
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [inputNick, setInputNick] = useState('');

  const challenges = [
  { id: 1, title: 'Selfie extremo', desc: '🤪 Selfie con la cara más ridícula posible' },
  { id: 2, title: 'Grupo loco', desc: '🎭 Todos haciendo la misma pose absurda' },
  { id: 3, title: 'Defying gravity', desc: '✈️ Foto saltando (borrosa = más puntos)' },
  { id: 4, title: 'Espejo del alma', desc: '🪞 Tu reflejo en algo (agua, vidrio, pantalla)' },
  { id: 5, title: 'Monumento selfie', desc: '🏛️ Vosotros en algo icónico del lugar' },
];

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRoom = {
      id: code,
      name: inputNick || 'Quedada sin nombre',
      code,
      participants: [{ id: 'creator', nick: inputNick || 'Admin', color: colors[0] }],
      submissions: {},
      createdAt: Date.now(),
      createdBy: inputNick,
    };
    challenges.forEach(ch => {
      newRoom.submissions[ch.id] = [];
    });

    const updated = { ...rooms, [code]: newRoom };
    localStorage.setItem('rooms', JSON.stringify(updated));
    setRooms(updated);
    setCurrentRoom(newRoom);
    setCurrentUser({ id: 'creator', nick: inputNick || 'Admin', color: colors[0] });
    setGameState('play');
  };

  const joinRoom = () => {
    const room = rooms[inputCode];
    if (!room) {
      alert('Sala no encontrada');
      return;
    }
    const userColor = colors[Math.floor(Math.random() * colors.length)];
    const user = {
      id: `user_${Date.now()}`,
      nick: inputNick || 'Anónimo',
      color: userColor,
    };
    const updated = {
      ...rooms,
      [inputCode]: {
        ...room,
        participants: [...room.participants, user],
      },
    };
    localStorage.setItem('rooms', JSON.stringify(updated));
    setRooms(updated);
    setCurrentRoom(updated[inputCode]);
    setCurrentUser(user);
    setGameState('play');
  };

  const submitChallenge = (challengeId) => {
    const sim = Math.random().toString(36).substring(2, 10);
    const updated = {
      ...rooms,
      [currentRoom.code]: {
        ...currentRoom,
        submissions: {
          ...currentRoom.submissions,
          [challengeId]: [
            ...currentRoom.submissions[challengeId],
            {
              id: sim,
              userId: currentUser.id,
              userNick: currentUser.nick,
              userColor: currentUser.color,
              timestamp: Date.now(),
              photo: `linear-gradient(135deg, ${currentUser.color} 0%, ${colors[(colors.indexOf(currentUser.color) + 1) % colors.length]} 100%)`,
            },
          ],
        },
      },
    };
    localStorage.setItem('rooms', JSON.stringify(updated));
    setRooms(updated);
    setCurrentRoom(updated[currentRoom.code]);
  };

  const getRanking = () => {
    const stats = {};
    currentRoom.participants.forEach(p => {
      stats[p.id] = { nick: p.nick, color: p.color, count: 0 };
    });
    Object.values(currentRoom.submissions).forEach(subs => {
      subs.forEach(sub => {
        if (stats[sub.userId]) stats[sub.userId].count++;
      });
    });
    return Object.values(stats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  if (gameState === 'home') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', textAlign: 'center', color: 'white', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📸</div>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontWeight: '700' }}>Photo Challenge</h1>
        <p style={{ fontSize: '1rem', marginBottom: '2.5rem', opacity: 0.9 }}>Retos fotográficos con amigos en tiempo real</p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '320px', width: '100%' }}>
          <button
            onClick={() => setGameState('create')}
            style={{
              padding: '1rem 2rem',
              fontSize: '1rem',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              flex: 1,
              minWidth: '140px',
              transition: 'all 0.2s',
            }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          >
            + Crear sala
          </button>
          <button
            onClick={() => setGameState('join')}
            style={{
              padding: '1rem 2rem',
              fontSize: '1rem',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              flex: 1,
              minWidth: '140px',
              transition: 'all 0.2s',
            }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          >
            Unirse
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'create') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '1.5rem', fontFamily: 'sans-serif' }}>
        <button
          onClick={() => setGameState('home')}
          style={{ padding: '0.6rem 1.2rem', marginBottom: '2rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }}
        >
          ← Atrás
        </button>
        
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', marginBottom: '1rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700', color: '#333' }}>Crear quedada</h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.7rem', fontSize: '1rem', color: '#555', fontWeight: '500' }}>Tu nombre</label>
            <input
              value={inputNick}
              onChange={(e) => setInputNick(e.target.value)}
              placeholder="Ej: Alex"
              style={{
                width: '100%',
                padding: '0.9rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            onClick={createRoom}
            disabled={!inputNick}
            style={{
              width: '100%',
              padding: '1rem',
              background: inputNick ? '#667eea' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: inputNick ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              transition: 'all 0.2s',
            }}
            onMouseDown={(e) => inputNick && (e.target.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => inputNick && (e.target.style.transform = 'scale(1)')}
          >
            Crear sala
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'join') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '1.5rem', fontFamily: 'sans-serif' }}>
        <button
          onClick={() => setGameState('home')}
          style={{ padding: '0.6rem 1.2rem', marginBottom: '2rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }}
        >
          ← Atrás
        </button>
        
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700', color: '#333' }}>Unirse a quedada</h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.7rem', fontSize: '1rem', color: '#555', fontWeight: '500' }}>Código de sala</label>
            <input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Ej: ABC123"
              maxLength="6"
              style={{
                width: '100%',
                padding: '0.9rem',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '1.5rem',
                textAlign: 'center',
                fontWeight: '700',
                boxSizing: 'border-box',
                letterSpacing: '4px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.7rem', fontSize: '1rem', color: '#555', fontWeight: '500' }}>Tu nombre</label>
            <input
              value={inputNick}
              onChange={(e) => setInputNick(e.target.value)}
              placeholder="Ej: María"
              style={{
                width: '100%',
                padding: '0.9rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            onClick={joinRoom}
            disabled={!inputCode || !inputNick}
            style={{
              width: '100%',
              padding: '1rem',
              background: (inputCode && inputNick) ? '#667eea' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: (inputCode && inputNick) ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              transition: 'all 0.2s',
            }}
            onMouseDown={(e) => (inputCode && inputNick) && (e.target.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (inputCode && inputNick) && (e.target.style.transform = 'scale(1)')}
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'play' && currentRoom) {
    const ranking = getRanking();

    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'sans-serif', paddingBottom: '2rem' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e0e0e0', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 style={{ margin: '0 0 0.3rem 0', fontSize: '1.3rem', fontWeight: '700', color: '#333' }}>Quedada</h1>
            <div style={{ fontSize: '0.75rem', color: '#999', letterSpacing: '1.5px', fontWeight: '700' }}>{currentRoom.code}</div>
          </div>
          <button
            onClick={() => {
              setGameState('home');
              setCurrentRoom(null);
              setCurrentUser(null);
              setInputNick('');
              setInputCode('');
            }}
            style={{
              padding: '0.6rem 1.2rem',
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#333',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            Salir
          </button>
        </div>

        <div style={{ background: 'white', margin: '1rem', padding: '1.2rem', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #667eea' }}>
          <p style={{ fontSize: '0.85rem', color: '#999', margin: '0 0 0.7rem 0', fontWeight: '500' }}>Código de sala</p>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#667eea', letterSpacing: '3px', marginBottom: '1rem', fontFamily: 'monospace' }}>{currentRoom.code}</div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(currentRoom.code);
              alert('Código copiado!');
            }}
            style={{
              padding: '0.6rem 1.2rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          >
            📋 Copiar
          </button>
        </div>

        <div style={{ background: 'white', margin: '0 1rem 1rem', padding: '1.2rem', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700', color: '#333', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={18} /> {currentRoom.participants.length} participantes
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '0.8rem' }}>
            {currentRoom.participants.map(p => (
              <div
                key={p.id}
                style={{
                  padding: '0.8rem',
                  background: p.color,
                  color: 'white',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {p.nick}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', margin: '0 1rem 1rem', padding: '1.2rem', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700', color: '#333', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Trophy size={18} /> Top ranking
          </h3>
          {ranking.length > 0 ? (
            ranking.map((r, i) => (
              <div
                key={r.nick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  padding: '0.8rem 0',
                  borderBottom: i < ranking.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#999', minWidth: '28px' }}>{i + 1}</div>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    background: r.color,
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, fontSize: '0.95rem', color: '#333', fontWeight: '500' }}>{r.nick}</div>
                <div style={{ fontWeight: '700', color: '#667eea', fontSize: '1.1rem' }}>{r.count}</div>
              </div>
            ))
          ) : (
            <p style={{ color: '#999', fontSize: '0.9rem' }}>Sin envíos aún</p>
          )}
        </div>

        <div style={{ padding: '0 1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.2rem', color: '#333' }}>Retos</h2>
          {challenges.map(ch => {
            const subs = currentRoom.submissions[ch.id] || [];
            const userSubmitted = subs.some(s => s.userId === currentUser.id);

            return (
              <div
                key={ch.id}
                style={{
                  background: 'white',
                  marginBottom: '1rem',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: userSubmitted ? '2px solid #4ECDC4' : '1px solid #e0e0e0',
                }}
              >
                <div style={{ padding: '1.2rem', background: userSubmitted ? 'rgba(78, 205, 196, 0.08)' : 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.8rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem', fontWeight: '700', color: '#333' }}>{ch.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#999' }}>{ch.desc}</p>
                    </div>
                    <div style={{ background: '#f0f0f0', padding: '0.4rem 0.9rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '700', color: '#666', whiteSpace: 'nowrap', marginLeft: '0.8rem' }}>
                      {subs.length}
                    </div>
                  </div>

                  <button
                    onClick={() => submitChallenge(ch.id)}
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      background: userSubmitted ? '#4ECDC4' : '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      marginTop: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                    onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    <Camera size={18} />
                    {userSubmitted ? '✓ Completado' : 'Enviar foto'}
                  </button>
                </div>

                {subs.length > 0 && (
                  <div style={{ padding: '1.2rem', background: '#f9f9f9', borderTop: '1px solid #e0e0e0' }}>
                    <p style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 0.8rem 0', fontWeight: '600' }}>Enviadas ({subs.length})</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
                      {subs.map(sub => (
                        <div key={sub.id} style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd', position: 'relative' }}>
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              background: sub.photo,
                              display: 'flex',
                              alignItems: 'flex-end',
                              justifyContent: 'center',
                              padding: '0.5rem',
                              fontSize: '0.7rem',
                              color: 'white',
                              textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                              fontWeight: '700',
                              textAlign: 'center',
                            }}
                          >
                            {sub.userNick}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

export default PhotoChallenge;
