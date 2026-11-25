import { NextResponse } from 'next/server'

export function middleware(request) {
  // 한국 시간(KST) 기준 2026년 11월 26일 22시 이후부터 점검 모드 시작
  const startTime = new Date('2026-11-26T22:00:00+09:00')
  const now = new Date()

  // 현재 시간이 시작 시간 이후인지 확인
  const isMaintenanceMode = now >= startTime

  if (isMaintenanceMode) {
    // 점검 안내 페이지 자체는 차단에서 제외합니다.
    if (request.nextUrl.pathname.startsWith('/maintenance')) {
      return NextResponse.next()
    }

    // /maintenance 경로로 사용자의 접속을 강제로 보냅니다.
    return NextResponse.rewrite(new URL('/maintenance', request.url))
  }

  return NextResponse.next()
}

// 미들웨어가 실행될 경로를 지정합니다.
export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
}
