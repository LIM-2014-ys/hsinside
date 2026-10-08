// 관리자 이메일 목록 (추후 수정 시 이 파일만 변경)
export const ADMIN_EMAILS = [
  'treetowood@goedu.kr',
  '2026ys6807@goe.go.kr',
  '2026ys6809@goe.go.kr',
];

// 이메일이 관리자인지 확인하는 함수
export const isAdminEmail = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(
    email.toLowerCase().trim()
  );
};
