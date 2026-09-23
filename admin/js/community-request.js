// 승인된 갤러리 목록 불러오기
async function loadApprovedGalleries() {
  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('*')
    .order('created_at', { ascending: true });

  const container = document.getElementById('gallery-list');
  if (error || !galleries || galleries.length === 0) {
    container.innerHTML = '<p>개설된 갤러리가 없습니다.</p>';
    return;
  }

  container.innerHTML = galleries.map(g => `
    <div class="gallery-card">
      <h4>${g.name}</h4>
      <a href="gallery/${g.id}/index.html" class="btn-primary btn-sm">입장하기</a>
    </div>
  `).join('');
}

// 사용자: 갤러리 개설 신청
async function submitGalleryRequest() {
  const idInput = document.getElementById('req-id');
  const nameInput = document.getElementById('req-name');
  const id = idInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  const name = nameInput.value.trim();

  if (!id || !name) return alert('ID와 이름을 입력해 주세요.');

  const { error } = await supabase.from('gallery_requests').insert([{
    gallery_id: id,
    gallery_name: name,
    applicant_email: currentUser.email
  }]);

  if (error) {
    alert('신청 실패: ' + error.message);
  } else {
    alert('갤러리 신청이 완료되었습니다! 어드민 승인 후 개설됩니다.');
    idInput.value = '';
    nameInput.value = '';
  }
}

// 어드민: 대기 중인 신청 목록 조회
async function loadPendingRequests() {
  const { data: requests, error } = await supabase
    .from('gallery_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const container = document.getElementById('request-list');
  if (error || !requests || requests.length === 0) {
    container.innerHTML = '<p>대기 중인 신청이 없습니다.</p>';
    return;
  }

  container.innerHTML = requests.map(r => `
    <div class="post-card" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>${r.gallery_name}</strong> (ID: ${r.gallery_id})<br>
        <small style="color:#6b7280;">신청자: ${r.applicant_email}</small>
      </div>
      <div>
        <button class="btn-secondary btn-sm" onclick="approveGallery(${r.id}, '${r.gallery_id}', '${r.gallery_name}')">승인</button>
        <button class="btn-danger btn-sm" onclick="rejectGallery(${r.id})">거절</button>
      </div>
    </div>
  `).join('');
}

// 어드민 승인 -> galleries 테이블에 자동 등록
async function approveGallery(requestId, galleryId, galleryName) {
  // 1. galleries 테이블에 등록
  const { error: insertError } = await supabase
    .from('galleries')
    .insert([{ id: galleryId, name: galleryName }]);

  if (insertError) {
    return alert('갤러리 생성 실패: ' + insertError.message);
  }

  // 2. 신청 상태를 'approved'로 변경
  await supabase
    .from('gallery_requests')
    .update({ status: 'approved' })
    .eq('id', requestId);

  alert(`'${galleryName}' 갤러리가 승인되어 자동 개설되었습니다!`);
  loadPendingRequests();
}

// 어드민 거절
async function rejectGallery(requestId) {
  await supabase
    .from('gallery_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  alert('신청을 거절했습니다.');
  loadPendingRequests();
}
