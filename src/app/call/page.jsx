'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function StandaloneGroupCallPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 통화방 상태 ('lobby' | 'in-call')
  const [viewMode, setViewMode] = useState('lobby');
  const [callId, setCallId] = useState('');
  const [callTitle, setCallTitle] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // 유저 검색 및 초대 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedInvitees, setSelectedInvitees] = useState([]);
  const [searching, setSearching] = useState(false);

  // 실시간 통화 참여자 및 오디오 상태
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [hasMic, setHasMic] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [toast, setToast] = useState({ type: '', text: '' });

  // WebRTC & Realtime Refs
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const remoteAudiosRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());
  const channelRef = useRef(null);

  const showToast = (text, type = 'success') => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: '', text: '' }), 3500);
  };

  // 1. 로그인 확인 및 URL 쿼리(?room=...) 자동 감지
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (!user) {
        router.push('/');
        return;
      }
      setCurrentUser(user);

      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setJoinCodeInput(roomParam);
      }
      setLoading(false);
    };
    init();
  }, [router]);

  // 통화 시간 타이머
  useEffect(() => {
    if (viewMode !== 'in-call' || participants.length < 2) {
      setCallDuration(0);
      return;
    }
    const timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [viewMode, participants.length]);

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // 개별 PeerConnection 정리
  const closePeer = useCallback((targetUserId) => {
    const pc = peersRef.current.get(targetUserId);
    if (pc) {
      pc.close();
      peersRef.current.delete(targetUserId);
    }
    const audioEl = remoteAudiosRef.current.get(targetUserId);
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.remove();
      remoteAudiosRef.current.delete(targetUserId);
    }
    pendingCandidatesRef.current.delete(targetUserId);
  }, []);

  // 통화 종료 및 자원 해제
  const leaveCall = useCallback(() => {
    peersRef.current.forEach((_, uid) => closePeer(uid));
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.untrack();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setParticipants([]);
    setIsMuted(false);
    setHasMic(true);
    setViewMode('lobby');
    window.history.replaceState({}, '', '/call');
    showToast('통화가 종료되었습니다.', 'error');
  }, [closePeer]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      peersRef.current.forEach((_, uid) => closePeer(uid));
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [closePeer]);

  // RTCPeerConnection 생성 (마이크 없어도 수신 전용 트랜시버로 상대 목소리 청취 가능)
  const getOrCreatePeer = useCallback(
    (targetUserId, myUserId) => {
      if (peersRef.current.has(targetUserId)) {
        return peersRef.current.get(targetUserId);
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      } else {
        // 마이크가 없는 환경에서도 상대방 오디오는 받을 수 있도록 설정
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'ICE_CANDIDATE',
            payload: {
              from: myUserId,
              to: targetUserId,
              candidate: event.candidate,
            },
          });
        }
      };

      pc.ontrack = (event) => {
        if (!event.streams[0]) return;
        let audioEl = remoteAudiosRef.current.get(targetUserId);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          document.body.appendChild(audioEl);
          remoteAudiosRef.current.set(targetUserId, audioEl);
        }
        audioEl.srcObject = event.streams[0];
      };

      pc.onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          closePeer(targetUserId);
        }
      };

      peersRef.current.set(targetUserId, pc);
      return pc;
    },
    [closePeer]
  );

  // 2. /api/push 로 통화 초대 알림 일괄 발송
  const sendCallPushNotifications = async (targetRoomId, roomTitleText, targets) => {
    if (!targets || targets.length === 0 || !currentUser) return;

    const myName =
      currentUser.user_metadata?.display_name ||
      currentUser.user_metadata?.nickname ||
      '누군가';

    const callUrl = `/call?room=${targetRoomId}`;

    await Promise.allSettled(
      targets
        .filter((u) => u.email && u.id !== currentUser.id)
        .map((u) =>
          fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetEmail: u.email,
              title: `📞 ${myName}님의 그룹 음성 통화 초대`,
              body: `"${roomTitleText}" 통화방에 초대되었습니다. 눌러서 바로 참여하세요!`,
              tag: `call-${targetRoomId}`,
              renotify: true,
              url: callUrl,
            }),
          })
        )
    );
  };

  // 3. 통화방 입장 및 WebRTC Mesh 연결 시작
  const enterCallRoom = async (targetRoomId, roomTitleText, inviteesToNotify = []) => {
    if (!currentUser || !targetRoomId.trim()) return;

    let micAvailable = false;

    // HTTPS / 보안 컨텍스트 확인
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('보안 연결(HTTPS 또는 localhost)이 아니어서 듣기 전용으로 입장합니다.', 'error');
    } else {
      try {
        // 1차 시도: 에코/노이즈 제거 옵션 포함
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        localStreamRef.current = stream;
        micAvailable = true;
      } catch (firstErr) {
        console.warn('1차 마이크 요청 실패, 기본 설정으로 재시도:', firstErr);
        try {
          // 2차 시도: 기기 호환성을 위해 단순 기본 오디오로 재요청
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          localStreamRef.current = fallbackStream;
          micAvailable = true;
        } catch (err) {
          console.error('마이크 최종 오류:', err.name, err.message);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            showToast('마이크 권한이 차단되어 듣기 전용으로 입장합니다.', 'error');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            showToast('연결된 마이크가 없어 듣기 전용으로 입장합니다.', 'error');
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            showToast('다른 앱이 마이크를 사용 중이어서 듣기 전용으로 입장합니다.', 'error');
          } else {
            showToast(`마이크 연결 실패(${err.name}) - 듣기 전용으로 입장합니다.`, 'error');
          }
        }
      }
    }

    setHasMic(micAvailable);
    setIsMuted(!micAvailable);

    const cleanRoomId = targetRoomId.trim();
    const finalTitle = roomTitleText.trim() || `통화방 #${cleanRoomId}`;
    setCallId(cleanRoomId);
    setCallTitle(finalTitle);
    setViewMode('in-call');
    window.history.replaceState({}, '', `/call?room=${cleanRoomId}`);

    const myName =
      currentUser.user_metadata?.display_name ||
      currentUser.user_metadata?.nickname ||
      currentUser.email?.split('@')[0] ||
      '참여자';

    const channel = supabase.channel(`standalone-voice-${cleanRoomId}`, {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const list = Object.entries(state).map(([uid, presences]) => {
          const latest = presences[presences.length - 1] || {};
          return {
            userId: uid,
            name: latest.name || '참여자',
            isMuted: !!latest.isMuted,
          };
        });
        setParticipants(list);
      })
      .on('presence', { event: 'join' }, async ({ key: joinedUserId }) => {
        if (joinedUserId === currentUser.id) return;
        try {
          const pc = getOrCreatePeer(joinedUserId, currentUser.id);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          channel.send({
            type: 'broadcast',
            event: 'WEBRTC_OFFER',
            payload: {
              from: currentUser.id,
              to: joinedUserId,
              offer,
            },
          });
        } catch (err) {
          console.error('Offer 오류:', err);
        }
      })
      .on('presence', { event: 'leave' }, ({ key: leftUserId }) => {
        if (leftUserId !== currentUser.id) {
          closePeer(leftUserId);
        }
      })
      .on('broadcast', { event: 'WEBRTC_OFFER' }, async ({ payload }) => {
        if (payload.to !== currentUser.id) return;
        try {
          const pc = getOrCreatePeer(payload.from, currentUser.id);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

          const queued = pendingCandidatesRef.current.get(payload.from) || [];
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          pendingCandidatesRef.current.delete(payload.from);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: 'broadcast',
            event: 'WEBRTC_ANSWER',
            payload: {
              from: currentUser.id,
              to: payload.from,
              answer,
            },
          });
        } catch (err) {
          console.error('Answer 생성 오류:', err);
        }
      })
      .on('broadcast', { event: 'WEBRTC_ANSWER' }, async ({ payload }) => {
        if (payload.to !== currentUser.id) return;
        try {
          const pc = peersRef.current.get(payload.from);
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));

          const queued = pendingCandidatesRef.current.get(payload.from) || [];
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          pendingCandidatesRef.current.delete(payload.from);
        } catch (err) {
          console.error('Answer 적용 오류:', err);
        }
      })
      .on('broadcast', { event: 'ICE_CANDIDATE' }, async ({ payload }) => {
        if (payload.to !== currentUser.id) return;
        try {
          const pc = peersRef.current.get(payload.from);
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            const prev = pendingCandidatesRef.current.get(payload.from) || [];
            pendingCandidatesRef.current.set(payload.from, [...prev, payload.candidate]);
          }
        } catch (err) {
          console.error('ICE 오류:', err);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            name: myName,
            isMuted: !micAvailable,
          });

          if (inviteesToNotify.length > 0) {
            await sendCallPushNotifications(cleanRoomId, finalTitle, inviteesToNotify);
            showToast(`${inviteesToNotify.length}명에게 통화 초대 알림을 보냈습니다!`);
          }
        }
      });
  };

  // 새 통화방 개설
  const handleCreateCallRoom = async (e) => {
    e.preventDefault();
    const generatedId = Math.random().toString(36).substring(2, 8).toUpperCase();
    await enterCallRoom(generatedId, callTitle, selectedInvitees);
  };

  // 기존 코드로 참여
  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) {
      showToast('통화방 코드를 입력해 주세요.', 'error');
      return;
    }
    await enterCallRoom(joinCodeInput.trim().toUpperCase(), `통화방 #${joinCodeInput.trim().toUpperCase()}`);
  };

  // 유저 검색
  const handleSearchUsers = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !currentUser) return;

    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, nickname, email, avatar_url')
        .neq('id', currentUser.id)
        .or(`display_name.ilike.%${searchQuery.trim()}%,nickname.ilike.%${searchQuery.trim()}%`)
        .limit(10);

      setSearchResults(data || []);
    } catch (err) {
      console.error('유저 검색 오류:', err);
    } finally {
      setSearching(false);
    }
  };

  // 초대 목록 토글
  const toggleInvitee = (userObj) => {
    setSelectedInvitees((prev) => {
      const exists = prev.some((u) => u.id === userObj.id);
      if (exists) return prev.filter((u) => u.id !== userObj.id);
      return [...prev, userObj];
    });
  };

  // 통화 중 추가 초대 알림 발송
  const handleInviteMoreInCall = async (userObj) => {
    await sendCallPushNotifications(callId, callTitle, [userObj]);
    const name = userObj.display_name || userObj.nickname || '유저';
    showToast(`${name}님에게 통화 알림을 보냈습니다!`);
  };

  // 초대 링크 복사
  const copyInviteLink = () => {
    const shareUrl = `${window.location.origin}/call?room=${callId}`;
    navigator.clipboard.writeText(shareUrl);
    showToast('통화방 초대 링크가 복사되었습니다!');
  };

  // 음소거 토글
  const handleToggleMute = async () => {
    if (!hasMic || !localStreamRef.current || !currentUser) {
      showToast('사용 가능한 마이크가 연결되어 있지 않습니다.', 'error');
      return;
    }
    const track = localStreamRef.current.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    const nextMuted = !track.enabled;
    setIsMuted(nextMuted);

    const myName =
      currentUser.user_metadata?.display_name ||
      currentUser.user_metadata?.nickname ||
      currentUser.email?.split('@')[0] ||
      '참여자';

    await channelRef.current?.track({
      user_id: currentUser.id,
      name: myName,
      isMuted: nextMuted,
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-950 text-gray-400 flex items-center justify-center text-xs font-bold">
        🎙️ 통화 시스템 준비 중...
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 text-white flex flex-col font-sans text-xs overflow-hidden select-none">
      {/* 토스트 알림 */}
      {toast.text && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl text-xs font-bold shadow-xl ${
            toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* 상단 네비게이션 */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-gray-900/60">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎙️</span>
          <div>
            <h1 className="font-black text-sm text-white">그룹 음성 통화</h1>
            <p className="text-[10px] text-gray-400">
              {viewMode === 'in-call' ? `방 코드: ${callId}` : 'DM과 별개로 동작하는 실시간 음성 채널'}
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-200 rounded-xl font-bold text-[11px] transition"
        >
          홈으로
        </Link>
      </div>

      {/* ================= 1. 로비 화면 (방 개설 / 코드 참여) ================= */}
      {viewMode === 'lobby' && (
        <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center">
          <div className="w-full max-w-md space-y-5">
            {/* 새 통화방 만들기 카드 */}
            <form
              onSubmit={handleCreateCallRoom}
              className="bg-gray-900 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-black text-sm text-emerald-400">📞 새 그룹 통화 시작하기</h2>
                <span className="text-[10px] text-gray-400">알림 자동 발송</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">통화방 제목 (선택)</label>
                <input
                  type="text"
                  placeholder="예: 밤샘 작업 수다방"
                  value={callTitle}
                  onChange={(e) => setCallTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 알림 보낼 유저 검색 */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400">
                  푸시 알림으로 초대할 친구 검색 ({selectedInvitees.length}명 선택됨)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="닉네임으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchUsers(e);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSearchUsers}
                    disabled={searching}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-xs transition"
                  >
                    {searching ? '...' : '검색'}
                  </button>
                </div>

                {/* 선택된 초대자 뱃지 */}
                {selectedInvitees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedInvitees.map((u) => {
                      const name = u.display_name || u.nickname || '익명';
                      return (
                        <span
                          key={u.id}
                          onClick={() => toggleInvitee(u)}
                          className="px-2.5 py-1 bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-full text-[10px] font-bold cursor-pointer hover:bg-rose-600/30 hover:border-rose-500/40 hover:text-rose-200 transition"
                        >
                          @{name} ✕
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* 검색 결과 목록 */}
                {searchResults.length > 0 && (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 bg-gray-950/60 p-2 rounded-2xl border border-white/5">
                    {searchResults.map((u) => {
                      const name = u.display_name || u.nickname || '익명';
                      const isSelected = selectedInvitees.some((item) => item.id === u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleInvitee(u)}
                          className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition ${
                            isSelected ? 'bg-emerald-600/25 border border-emerald-500/40' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-emerald-700 flex items-center justify-center font-black text-[10px] shrink-0">
                              {name[0]}
                            </div>
                            <span className="font-bold text-xs truncate">{name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400">
                            {isSelected ? '✓ 선택됨' : '+ 초대'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs transition shadow-lg shadow-emerald-950/50"
              >
                🎙️ 통화방 열고 알림 보내기
              </button>
            </form>

            {/* 코드로 기존 통화방 합류 카드 */}
            <form
              onSubmit={handleJoinByCode}
              className="bg-gray-900/70 border border-white/10 rounded-3xl p-5 space-y-3"
            >
              <h2 className="font-black text-xs text-gray-300">🔑 초대 코드로 바로 합류하기</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="6자리 방 코드 입력 (예: A1B2C3)"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3.5 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-xs text-white uppercase tracking-wider focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-xl text-xs transition shrink-0"
                >
                  참여
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 2. 실시간 그룹 통화방 화면 ================= */}
      {viewMode === 'in-call' && (
        <div className="flex-1 flex flex-col justify-between p-5 overflow-hidden">
          {/* 상단 방 상태 바 */}
          <div className="flex items-center justify-between bg-gray-900 border border-white/10 rounded-2xl px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h2 className="font-black text-sm text-white">{callTitle}</h2>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                초대 코드: <strong className="text-emerald-400">{callId}</strong> · 참여 {participants.length}명
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-emerald-400 mr-1">
                {participants.length >= 2 ? formatTime(callDuration) : '대기 중'}
              </span>
              <button
                onClick={copyInviteLink}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-[10.5px] transition"
              >
                🔗 링크 복사
              </button>
            </div>
          </div>

          {/* 참여자 음성 카드 그리드 */}
          <div className="flex-1 overflow-y-auto py-6 flex items-center justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-xl">
              {participants.map((p) => {
                const isMe = p.userId === currentUser?.id;
                return (
                  <div
                    key={p.userId}
                    className={`p-5 rounded-3xl border flex flex-col items-center justify-center space-y-3 transition ${
                      p.isMuted
                        ? 'bg-gray-900/60 border-white/10 opacity-70'
                        : 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-xl font-black">
                        {p.name[0]}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow ${
                          p.isMuted ? 'bg-rose-600' : 'bg-emerald-500'
                        }`}
                      >
                        {p.isMuted ? '🔇' : '🎙️'}
                      </span>
                    </div>

                    <div className="text-center">
                      <div className="font-bold text-xs truncate max-w-[120px]">
                        {p.name} {isMe && <span className="text-emerald-400">(나)</span>}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {p.isMuted ? (isMe && !hasMic ? '듣기 전용' : '음소거됨') : '음성 연결됨'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 통화 중 추가 유저 푸시 알림 초대 바 */}
          <div className="max-w-xl w-full mx-auto mb-4 bg-gray-900/90 border border-white/10 rounded-2xl p-3 space-y-2">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="통화 중 추가 초대할 닉네임 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchUsers(e);
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-gray-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSearchUsers}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-[11px]"
              >
                검색
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {searchResults.map((u) => {
                  const name = u.display_name || u.nickname || '익명';
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleInviteMoreInCall(u)}
                      className="px-2.5 py-1 bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/30 rounded-full text-[10.5px] font-bold text-emerald-300 shrink-0 transition"
                    >
                      🔔 {name} 알림 초대
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 하단 마이크 / 종료 버튼 */}
          <div className="flex items-center justify-center gap-4 pt-3 border-t border-white/10 shrink-0">
            <button
              onClick={handleToggleMute}
              disabled={!hasMic}
              className={`px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition disabled:opacity-40 ${
                isMuted
                  ? 'bg-amber-400 text-gray-900'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              <span>{isMuted ? '🔇' : '🎙️'}</span>
              <span>{!hasMic ? '마이크 없음' : isMuted ? '음소거 해제' : '마이크 끄기'}</span>
            </button>

            <button
              onClick={leaveCall}
              className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-xs flex items-center gap-2 transition shadow-lg"
            >
              <span>📵</span>
              <span>통화 나가기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
