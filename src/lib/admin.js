// 관리자 이메일 목록 (추후 수정 시 이 파일만 변경)
export const ADMIN_EMAILS = [
  'treetowood@goedu.kr',
  '2026ys6807@goe.go.kr',
  '2026ys6809@goe.go.kr',
];

/**
 * 이메일이 관리자 이메일인지 확인하는 함수
 * @param {string|null} email 
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
