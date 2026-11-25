export default function MaintenancePage() {
  return (
    <main style={{ 
      textAlign: 'center', 
      marginTop: '120px', 
      fontFamily: 'sans-serif',
      padding: '0 20px',
      lineHeight: '1.6'
    }}>
      <h1>🛠️ 서비스 점검 및 데이터 이전 안내</h1>
      <p style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px' }}>
        현재 안정적인 서비스 제공을 위해 데이터 이전 작업을 진행하고 있습니다.
      </p>
      <p style={{ color: '#555' }}>
        작업은 <strong>최대 1주일</strong> 정도 소요될 예정입니다.<br />
        이용에 불편을 드려 죄송하며, 빠른 시일 내에 정상화하겠습니다.
      </p>
    </main>
  )
}
