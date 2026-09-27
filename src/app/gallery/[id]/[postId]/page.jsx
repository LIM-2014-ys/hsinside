'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function PostDetailPage() {
  const { id: galleryId, postId } = useParams();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 점 3개 더보기 메뉴 열림 상태
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // 메뉴 바깥 영역 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 사용자 정보 및 게시글/댓글 데이터 불러오기
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 게시글 불러오기
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError || !postData) {
        alert('존재하지 않거나 삭제된 게시글입니다.');
        router.push(`/gallery/${galleryId}`);
        return;
      }
      setPost(postData);
      fetchComments();
      setLoading(false);
    }

    fetchData();
  }, [galleryId, postId, router]);

  // 댓글 목록 불러오기
  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data) setComments(data);
  };

  // 게시글 삭제
  const handleDeletePost = async () => {
    setIsMenuOpen(false);
    if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) return;

    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      alert(`삭제 실패: ${error.message}`);
    } else {
      alert('게시글이 삭제되었습니다.');
      router.push(`/gallery/${galleryId}`);
    }
  };

  // 게시글 수정 페이지 이동 (라우팅 경로: /gallery/[id]/[postId]/edit)
  const handleEditPost = () => {
    setIsMenuOpen(false);
    router.push풀고자 하는 1번 문제의 내용이나 이미지, 또는 관련된 지문을 알려주시면 바로 분석해서 해결해 드리겠습니다. 어떤 문제인가요?
