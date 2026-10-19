'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, nickname, avatar_url, bio')
        .or(`display_name.ilike.%${trimmed}%,nickname.ilike.%${trimmed}%`)
        .limit(10);

      if (!error && data) {
        setResults(data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('유저 검색 오류:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-gray-100 rounded-3xl p-4 shadow-xs space-y-3 font-sans text-xs">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) {
              setResults([]);
              setHasSearched(false);
            }
          }}
          placeholder="찾고 싶은 유저 닉네임 검색..."
          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl transition disabled:opacity-50 shrink-0"
        >
          {loading ? '검색 중...' : '🔍 검색'}
        </button>
      </form>

      {/* 검색 결과 리스트 */}
      {hasSearched && (
        <div className="border-t border-gray-100 pt-3 space-y-2 max-h-60 overflow-y-auto">
          {results.length === 0 ? (
            <div className="py-4 text-center text-gray-400 font-medium">
              검색 결과가 없습니다.
            </div>
          ) : (
            results.map((user) => {
              const name = user.display_name || user.nickname || '익명';

              return (
                <Link
                  key={user.id}
                  href={`/mypage/${user.id}`}
                  className="flex items-center justify-between p-2.5 hover:bg-emerald-50/50 active:bg-emerald-100/60 rounded-2xl transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-xs shrink-0 overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        name[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 group-hover:text-emerald-600 transition truncate">
                        {name}
                      </div>
                      {user.bio && (
                        <div className="text-[10px] text-gray-400 truncate">
                          {user.bio}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl shrink-0">
                    프로필 →
                  </span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
