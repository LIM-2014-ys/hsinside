'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import ChatModal from '@/components/ChatModal';

export default function MyPage() {
  const params = useParams();
  const targetUserId = params.id;

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [followings, setFollowings] = useState([]);
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [listModalType, setListModalType] = useState(null); // 'followers' | 'followings' | null
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

  // DM 모달 상태
  const [chatModal, setChatModal] = useState({
    isOpen: false,
    roomId: null,
    roomTitle: '',
  });

  // 데이터 로드
  const fetchProfileAndFollows = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 프로필 조회
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      setProfile(profileData || { display_name: '사용자' });

      // 팔로워 목록 조회
      const { data: followerData } = await supabase
        .from('follows')
        .select('*, profiles:follower_id(*)')
        .eq('following_id', targetUserId);

      // 팔로잉 목록 조회
      const { data: followingData } = await supabase
        .from('follows')
        .select('*, profiles:following_id(*)')
        .eq('follower_id', targetUserId);

      setFollowers(followerData || []);
      setFollowings(followingData || []);

      // 현재 유저가 팔로우 중인지 확인
      if (user) {
        const isFollowed = (followerData || []).some((f) => f.follower_id === user.id);
        setIsFollowing(isFollowed);
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (targetUserId) fetchProfileAndFollows();
  }, [targetUserId, fetchProfileAndFollows]);

  // 팔로우/언팔로우 토글
  const handleFollowToggle = async () => {
    if (!currentUser) return alert('로그인이 필요합니다.');

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId);
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
      }
      fetchProfileAndFollows();
    } catch (err) {
      console.error('팔로우 처리 실패:', err);
    }
  };

  // 1:1 DM 생성 및 시작
  const startDirectMessage = async (partnerId, partnerName) => {
    if (!currentUser) return alert('로그인이 필요합니다.');

    try {
      // 이미 존재하는 1:1 방이 있는지 확인
      const { data: myRooms } = await supabase
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', currentUser.id);

      const myRoomIds = (myRooms || []).map((r) => r.room_id);

      if (myRoomIds.length > 0) {
        const { data: sharedRooms } = await supabase
          .from('chat_room_members')
          .select('room_id, chat_rooms!inner(is_group)')
          .eq('user_id', partnerId)
          .in('room_id', myRoomIds)
          .eq('chat_rooms.is_group', false);

        if (sharedRooms && sharedRooms.length > 0) {
          setChatModal({
            isOpen: true,
            roomId: sharedRooms[0].room_id,
            roomTitle: `${partnerName}님과의 DM`,
          });
          setListModalType(null);
          return;
        }
      }

      // 새 1:1 방 생성
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert([{ is_group: false }])
        .select()
        .single();

      await supabase.from('chat_room_members').insert([
        { room_id: newRoom.id, user_id: currentUser.id },
        { room_id: newRoom.id, user_id: partnerId },
      ]);

      setChatModal({
        isOpen: true,
        roomId: newRoom.id,
        roomTitle: `${partnerName}님과의 DM`,
      });
      setListModalType(null);
    } catch (err) {
      console.error('DM 시작 오류:', err);
    }
  };

  // 단체 DM 생성 및 시작
  const startGroupMessage = async () => {
    if (!currentUser) return alert('로그인이 필요합니다.');
    if (selectedGroupUsers.length < 1) return alert('최소 1명 이상 선택해 주세요.');

    try {
      const targetUserIds = [...new Set([...selectedGroupUsers, currentUser.id])];
      const roomName = `단체 DM (${targetUserIds.length}명)`;

      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert([{ name: roomName, is_group: true }])
        .select()
        .single();

      const memberInserts = targetUserIds.map((uId) => ({
        room_id: newRoom.id,
        user_id: uId,
      }));

      await supabase.from('chat_room_members').insert(memberInserts);

      setChatModal({
        isOpen: true,
        roomId: newRoom.id,
        roomTitle: roomName,
      });

      setSelectedGroupUsers([]);
      setListModalType(null);
    } catch (err) {
      console.error('단체 DM 생성 실패:', err);
    }
  };

  const toggleGroupSelect = (uId) => {
    setSelectedGroupUsers((prev) =>
      prev.includes(uId) ? prev.filter((id) => id !== uId) : [...prev, uId]
    );
  };

  if (loading) {
    return <div className="text-center my-12 text-gray-400 font-bold text-xs">프로필 로딩 중...</div>;
  }

  const isMe = currentUser?.id === targetUserId;
  const currentList = listModalType === 'followers' ? followers : followings;

  return (
    <div className="max-w-xl mx-auto my-6 px-4 font-sans text-xs space-y-6">
      {/* 프로필 상단 카드 */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs space-y-4 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto flex items-center justify-center font-black text-2xl text-emerald-700">
          {(profile?.display_name || profile?.nickname || 'U')[0]}
        </div>

        <div>
          <h1 className="text-lg font-black text-gray-900">{profile?.display_name || profile?.nickname || '익명'}</h1>
          <p className="text-gray-400 text-[11px] mt-0.5">{profile?.email || ''}</p>
        </div>

        {/* 팔로워 / 팔로잉 수 카운트 */}
        <div className="flex items-center justify-center gap-8 py-3 border-y border-gray-100">
          <button
            onClick={() => setListModalType('followers')}
            className="text-center hover:opacity-75 transition"
          >
            <div className="font-black text-sm text-gray-900">{followers.length}</div>
            <div className="text-[11px] text-gray-400 font-bold">팔로워</div>
          </button>
          <div className="w-px h-6 bg-gray-100" />
          <button
            onClick={() => setListModalType('followings')}
            className="text-center hover:opacity-75 transition"
          >
            <div className="font-black text-sm text-gray-900">{followings.length}</div>
            <div className="text-[11px] text-gray-400 font-bold">팔로잉</div>
          </button>
        </div>

        {/* 버튼 액션 */}
        {!isMe ? (
          <div className="flex gap-2 justify-center pt-1">
            <button
              onClick={handleFollowToggle}
              className={`px-6 py-2.5 rounded-xl font-bold transition shadow-xs ${
                isFollowing
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isFollowing ? '팔로잉 중' : '+ 팔로우'}
            </button>
            <button
              onClick={() => startDirectMessage(targetUserId, profile?.display_name || profile?.nickname || '사용자')}
              className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition shadow-xs"
            >
              💬 1:1 DM
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-emerald-600 font-bold">내 프로필 페이지입니다.</p>
        )}
      </div>

      {/* 팔로워 / 팔로잉 리스트 모달 */}
      {listModalType && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-sm text-gray-900">
                {listModalType === 'followers' ? '팔로워' : '팔로잉'} 목록
              </h3>
              <button onClick={() => setListModalType(null)} className="font-bold text-gray-400 text-xs">
                ✕
              </button>
            </div>

            {/* 단체 DM 다중 선택 헤더 */}
            {selectedGroupUsers.length > 0 && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-emerald-800 text-[11px]">
                  {selectedGroupUsers.length}명 선택됨
                </span>
                <button
                  onClick={startGroupMessage}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                >
                  🚀 단체 DM 시작
                </button>
              </div>
            )}

            {/* 목록 */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {currentList.length === 0 ? (
                <div className="py-8 text-center text-gray-400 font-medium">목록이 비어 있습니다.</div>
              ) : (
                currentList.map((item) => {
                  const targetObj = listModalType === 'followers' ? item.profiles : item.profiles;
                  if (!targetObj) return null;

                  const isSelected = selectedGroupUsers.includes(targetObj.id);

                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isMe && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleGroupSelect(targetObj.id)}
                            className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                          />
                        )}
                        <Link
                          href={`/mypage/${targetObj.id}`}
                          onClick={() => setListModalType(null)}
                          className="font-bold text-gray-800 hover:text-emerald-600 truncate"
                        >
                          {targetObj.display_name || targetObj.nickname || '익명'}
                        </Link>
                      </div>

                      {currentUser?.id !== targetObj.id && (
                        <button
                          onClick={() =>
                            startDirectMessage(
                              targetObj.id,
                              targetObj.display_name || targetObj.nickname || '사용자'
                            )
                          }
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[10.5px] shrink-0"
                        >
                          💬 DM
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* DM 모달 컴포넌트 */}
      <ChatModal
        isOpen={chatModal.isOpen}
        roomId={chatModal.roomId}
        roomTitle={chatModal.roomTitle}
        currentUser={currentUser}
        onClose={() => setChatModal({ ...chatModal, isOpen: false })}
      />
    </div>
  );
}
