'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MySecurityLogs() {
  const [loading, setLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const [accessLogs, setAccessLogs] = useState([]);
  const [abuseLogs, setAbuseLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. 프로필에서 마지막 접속 시간 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_seen_at')
        .eq('id', user.id)
        .single();

      if (profile) {
        setLastSeenAt(profile.last_seen_at || user.last_sign_in_at);
      }

      // 2. 접속 로그 가져오기 (최근 10건)
      const { data: logs } = await supabase
        .from('access_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setAccessLogs(logs || []);

      // 3. 징계/제재 내역 가져오기
      const { data: abuses } = await supabase
        .from('abuse_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setAbuseLogs(abuses || []);
    } catch (err) {
      console.error('로그 조회 중 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString) => {
    if (!dateString) return '기록 없음';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-gray-400 font-medium">
        보안 및 접속 기록을 불러오는 중...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans text-xs">
      {/* 📌 1. 마지막 접속 정보 카드 */}
      <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-3xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-blue-900 text-sm">🌐 계정 마지막 접속 일시</span>
          <span className="px-2.5 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold">
            정상 접속 중
          </span>
        </div>
        <p className="text-base font-black text-gray-900">
          {formatDate(lastSeenAt)}
        </p>
        <p className="text-[11px] text-gray-500">
          • 로그인 시 자동으로 동기화되며, 3개월이 지난 접속 기록은 서버에서 자동 파기됩니다.
        </p>
      </div>

      {/* 📌 2. 징계 및 제재 내역 카드 (보관기간 1년) */}
      <div className="p-5 bg-white border border-gray-100 rounded-3xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <h3 className="font-black text-gray-900 text-xs flex items-center gap-1.5">
            <span>🛡️</span> 징계 및 이용제한 내역
          </h3>
          <span className="text-[10px] text-gray-400 font-medium">1년 후 자동 파기</span>
        </div>

        {abuseLogs.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-[11px] bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            ✅ 제재 또는 징계 기록이 존재하지 않습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {abuseLogs.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-rose-50/60 border border-rose-100 rounded-2xl space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-700 text-[11px]">
                    제재 항목: {item.reason || '커뮤니티 가이드라인 위반'}
                  </span>
                  <span className="text-[10px] text-rose-400 font-semibold">
                    {formatDate(item.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📌 3. 최근 접속 로그 (보관기간 3개월) */}
      <div className="p-5 bg-white border border-gray-100 rounded-3xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <h3 className="font-black text-gray-900 text-xs flex items-center gap-1.5">
            <span>📱</span> 최근 접속 로그 (최근 10건)
          </h3>
          <span className="text-[10px] text-gray-400 font-medium">3개월 후 자동 파기</span>
        </div>

        {accessLogs.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-[11px] bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            기록된 접속 로그가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {accessLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-[11px]">
                <div className="space-y-0.5">
                  <p className="font-bold text-gray-800">
                    IP: {log.ip_address || '127.0.0.1 (보안IP)'}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate max-w-xs">
                    {log.user_agent || '웹 브라우저 접속'}
                  </p>
                </div>
                <span className="text-gray-500 font-medium text-[10px] shrink-0">
                  {formatDate(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
