'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface LessonSummary {
  period: string;
  totalLessons: number;
  remainingLessons: number;
  favoriteInstructors: Array<{ name: string; count: number }>;
  favoritePrograms: Array<{ name: string; count: number }>;
  studioBreakdown: Array<{ studio: string; count: number }>;
}

export default function HomePage() {
  const { isAuthenticated, user, apiUser, loading, error, login } = useAuth();
  const [lessonSummary, setLessonSummary] = useState<LessonSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchLessonSummary = async () => {
    if (!apiUser) return;

    try {
      setLoadingSummary(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/history/summary`,
        {
          params: { userId: apiUser.userId },
        }
      );
      setLessonSummary(response.data.data);
    } catch (error) {
      console.error('Failed to fetch lesson summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && apiUser) {
      fetchLessonSummary();
    }
  }, [isAuthenticated, apiUser]);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          エラーが発生しました: {error}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', marginTop: '50px' }}>
          <h1>FEELCYCLE Hub</h1>
          <p>レッスン予約サポートシステム</p>
          <p>ご利用にはLINEログインが必要です</p>
          <button onClick={login} className="btn btn-primary">
            LINEでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{ padding: '20px 0', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>FEELCYCLE Hub</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user?.pictureUrl && (
              <img 
                src={user.pictureUrl} 
                alt={user.displayName}
                style={{ width: '32px', height: '32px', borderRadius: '50%' }}
              />
            )}
            <span>{user?.displayName}</span>
          </div>
        </div>
      </header>

      <main>
        <div className="card">
          <h2>ダッシュボード</h2>
          
          {loadingSummary ? (
            <div className="loading">
              <p>データを読み込み中...</p>
            </div>
          ) : lessonSummary ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="card">
                  <h3>今月の受講状況</h3>
                  <p><strong>受講済み:</strong> {lessonSummary.totalLessons}回</p>
                  <p><strong>残り:</strong> {lessonSummary.remainingLessons}回</p>
                </div>
                
                <div className="card">
                  <h3>お気に入りインストラクター</h3>
                  {lessonSummary.favoriteInstructors.slice(0, 3).map((instructor, index) => (
                    <p key={index}>{instructor.name}: {instructor.count}回</p>
                  ))}
                </div>
                
                <div className="card">
                  <h3>人気プログラム</h3>
                  {lessonSummary.favoritePrograms.slice(0, 3).map((program, index) => (
                    <p key={index}>{program.name}: {program.count}回</p>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3>スタジオ別利用状況</h3>
                {lessonSummary.studioBreakdown.map((studio, index) => (
                  <p key={index}>{studio.studio}: {studio.count}回</p>
                ))}
              </div>
            </div>
          ) : (
            <p>データがありません</p>
          )}
        </div>

        <div className="card">
          <h2>機能</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div className="card">
              <h3>レッスン検索</h3>
              <p>空きのあるレッスンを検索</p>
              <button className="btn btn-secondary">検索</button>
            </div>
            
            <div className="card">
              <h3>監視登録</h3>
              <p>希望レッスンの空き通知を設定</p>
              <button className="btn btn-secondary">設定</button>
            </div>
            
            <div className="card">
              <h3>履歴確認</h3>
              <p>受講履歴とレッスン詳細</p>
              <button className="btn btn-secondary">確認</button>
            </div>
            
            <div className="card">
              <h3>設定</h3>
              <p>通知設定と個人情報管理</p>
              <button className="btn btn-secondary">設定</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}