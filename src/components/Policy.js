// src/constants/policy.js
export const PRIVACY_POLICY = {
  VERSION: '2026.09.23',
  EFFECTIVE_DATE: '2026년 9월 23일',
  
  COLLECTED_ITEMS: [
    '이메일 주소, 비밀번호, 프로필 이름(닉네임)',
    '게시글 작성 시 IP 기반 자동 추적 접속 도시 위치 (예: Seoul, Hanam-si)',
    '게시글 첨부 이미지(사진) 파일 및 텍스트 데이터',
    '접속 로그, 쿠키(Session 데이터)'
  ],

  DELETION_POLICY: '회원 탈퇴 시 작성된 게시글, 댓글, 좋아요/비추천 내역, 첨부 사진 파일 및 계정 정보가 즉시 완전 연쇄 삭제(Cascade Delete)됩니다.',

  LINKS: {
    PRIVACY: '/privacy',
    TERMS: '/terms',
  }
};
