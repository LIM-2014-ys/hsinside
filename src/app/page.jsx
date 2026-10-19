'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* 🌌 메인 포커스 배경 모션 & 그래디언트 블러 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative max-w-md mx-auto px-5 py-8 space-y-10">
        {/* 🚀 상단 네비게이션 헤더 */}
        <header className="flex items-center justify-between py-2 backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl px-4 shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-black tracking-tight text-sm bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              NEXT COMMUNITY
            </span>
          </div>

          <Link
            href="/dm"
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl text-xs transition active:scale-95 flex items-center gap-1.5"
          >
            💬 DM 대화함
          </Link>
        </header>

        {/* ⚡ 히어로 섹션 */}
        <section className="text-center space-y-5 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-400">
            <span className="text-emerald-400">NEW</span> 차세대 커뮤니티 플랫폼
          </div>

          <h1 className="text-3xl font-black tracking-tight leading-tight text-slate-100">
            소통하고, 공유하고,
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              함께 성장하는 공간
            </span>
          </h1>

          <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto font-medium">
            실시간 1:1 메시지부터 그룹 채팅, 자유로운 게시글 공유까지 모든 소통을 한곳에서 경험해 보세요.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/gallery/free"
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center gap-1.5"
            >
              🔥 갤러리 둘러보기
            </Link>

            <Link
              href="/mypage/me"
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-2xl text-xs active:scale-95 transition"
            >
              👤 마이페이지
            </Link>
          </div>
        </section>

        {/* 📊 서브 통계 바 */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md text-center">
          <div>
            <div className="text-sm font-black text-emerald-400">24/7</div>
            <div className="text-[10px] text-slate-500 font-bold">실시간 연결</div>
          </div>
          <div className="border-x border-slate-800">
            <div className="text-sm font-black text-teal-400">100%</div>
            <div className="text-[10px] text-slate-500 font-bold">반응형 UI</div>
          </div>
          <div>
            <div className="text-sm font-black text-cyan-400">Fast</div>
            <div className="text-[10px] text-slate-500 font-bold">초고속 로딩</div>
          </div>
        </div>

        {/* 🛠️ 주요 기능 그리드 카드 */}
        <section className="space-y-3">
          <h2 className="text-xs font-black tracking-wider text-slate-400 uppercase px-1">
            주요 기능 안내
          </h2>

          <div className="grid gap-3">
            {/* 카드 1 */}
            <div className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 rounded-2xl backdrop-blur-md transition group">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-lg text-emerald-400 group-hover:scale-110 transition shrink-0">
                  💬
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-xs text-slate-200 group-hover:text-emerald-400 transition">
                    1:1 & 그룹 실시간 채팅
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    원하는 사용자와 언제든지 1:1 메시지를 주고받거나 여러 명과 그룹 채팅을 시작하세요.
                  </p>
                </div>
              </div>
            </div>

            {/* 카드 2 */}
            <div className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 rounded-2xl backdrop-blur-md transition group">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-lg text-teal-400 group-hover:scale-110 transition shrink-0">
                  👥
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-xs text-slate-200 group-hover:text-teal-400 transition">
                    팔로우 및 알림 시스템
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    마음에 드는 유저를 팔로우하고 실시간 푸시 알림으로 소식을 받아보세요.
                  </p>
                </div>
              </div>
            </div>

            {/* 카드 3 */}
            <div className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 rounded-2xl backdrop-blur-md transition group">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-lg text-cyan-400 group-hover:scale-110 transition shrink-0">
                  ✍️
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-xs text-slate-200 group-hover:text-cyan-400 transition">
                    자유로운 커뮤니티 갤러리
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    사진과 다양한 이야기를 공유하고 사람들과 자유롭게 소통할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 📌 하단 푸터 */}
        <footer className="pt-6 border-t border-slate-800/80 text-center text-[10px] text-slate-500 space-y-1">
          <p>© 2026 Next Community. All rights reserved.</p>
          <p className="text-slate-600">Built with Next.js & Supabase</p>
        </footer>
      </div>
    </div>
  );
}
