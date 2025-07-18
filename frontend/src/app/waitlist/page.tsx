'use client';

import { useState, useEffect } from 'react';

type WaitlistStatus = 'active' | 'paused' | 'expired' | 'cancelled' | 'completed';

interface Waitlist {
  userId: string;
  waitlistId: string;
  studioCode: string;
  studioName: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  lessonName: string;
  instructor: string;
  status: WaitlistStatus;
  createdAt: string;
  updatedAt: string;
  pausedAt?: string;
  expiredAt?: string;
  cancelledAt?: string;
  notificationHistory: Array<{
    sentAt: string;
    availableSlots: number;
    totalSlots: number;
    notificationId: string;
  }>;
}

export default function WaitlistPage() {
  const [waitlists, setWaitlists] = useState<Waitlist[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'paused' | 'ended'>('active');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchWaitlists();
    // Set up real-time updates
    const interval = setInterval(fetchWaitlists, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchWaitlists = async () => {
    try {
      setLoading(true);
      // Mock API call
      const mockWaitlists: Waitlist[] = [
        {
          userId: 'user123',
          waitlistId: 'sapporo#2025-07-18#19:30#BSL House 1',
          studioCode: 'sapporo',
          studioName: '札幌',
          lessonDate: '2025-07-18',
          startTime: '19:30',
          endTime: '20:15',
          lessonName: 'BSL House 1',
          instructor: 'Shiori.I',
          status: 'active',
          createdAt: '2025-07-17T10:00:00Z',
          updatedAt: '2025-07-17T10:00:00Z',
          notificationHistory: [],
        },
        {
          userId: 'user123',
          waitlistId: 'ginza#2025-07-17#12:00#BB1 Beat',
          studioCode: 'ginza',
          studioName: '銀座',
          lessonDate: '2025-07-17',
          startTime: '12:00',
          endTime: '12:45',
          lessonName: 'BB1 Beat',
          instructor: 'MIKI',
          status: 'paused',
          createdAt: '2025-07-17T09:00:00Z',
          updatedAt: '2025-07-17T11:30:00Z',
          pausedAt: '2025-07-17T11:30:00Z',
          notificationHistory: [
            {
              sentAt: '2025-07-17T11:30:00Z',
              availableSlots: 2,
              totalSlots: 20,
              notificationId: 'notif_1721218200000',
            },
          ],
        },
        {
          userId: 'user123',
          waitlistId: 'shibuya#2025-07-16#18:00#BSW',
          studioCode: 'shibuya',
          studioName: '渋谷',
          lessonDate: '2025-07-16',
          startTime: '18:00',
          endTime: '18:45',
          lessonName: 'BSW',
          instructor: 'YUKI',
          status: 'expired',
          createdAt: '2025-07-16T08:00:00Z',
          updatedAt: '2025-07-16T19:00:00Z',
          expiredAt: '2025-07-16T19:00:00Z',
          notificationHistory: [],
        },
      ];
      
      setWaitlists(mockWaitlists);
    } catch (error) {
      console.error('Error fetching waitlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const resumeWaitlist = async (waitlistId: string) => {
    try {
      console.log('Resuming waitlist:', waitlistId);
      // Mock API call
      alert('キャンセル待ちを再開しました');
      fetchWaitlists(); // Refresh data
    } catch (error) {
      console.error('Error resuming waitlist:', error);
      alert('キャンセル待ちの再開に失敗しました');
    }
  };

  const cancelWaitlist = async (waitlistId: string) => {
    if (confirm('キャンセル待ちを解除しますか？')) {
      try {
        console.log('Cancelling waitlist:', waitlistId);
        // Mock API call
        alert('キャンセル待ちを解除しました');
        fetchWaitlists(); // Refresh data
      } catch (error) {
        console.error('Error cancelling waitlist:', error);
        alert('キャンセル待ちの解除に失敗しました');
      }
    }
  };

  const getFilteredWaitlists = () => {
    switch (activeTab) {
      case 'active':
        return waitlists.filter(w => w.status === 'active');
      case 'paused':
        return waitlists.filter(w => w.status === 'paused');
      case 'ended':
        return waitlists.filter(w => ['expired', 'cancelled', 'completed'].includes(w.status));
      default:
        return waitlists;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  };

  const getStatusIcon = (status: WaitlistStatus) => {
    switch (status) {
      case 'active': return '🔍';
      case 'paused': return '⏸️';
      case 'expired': return '⏰';
      case 'cancelled': return '❌';
      case 'completed': return '✅';
      default: return '❓';
    }
  };

  const getStatusText = (status: WaitlistStatus) => {
    switch (status) {
      case 'active': return '監視中';
      case 'paused': return '通知済み';
      case 'expired': return '期限切れ';
      case 'cancelled': return '解除済み';
      case 'completed': return '予約済み';
      default: return '不明';
    }
  };

  const getStatusColor = (status: WaitlistStatus) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgramColor = (program: string) => {
    if (program.includes('BB1')) return 'bg-yellow-100 text-yellow-800';
    if (program.includes('BB2')) return 'bg-orange-100 text-orange-800';
    if (program.includes('BSL')) return 'bg-blue-100 text-blue-800';
    if (program.includes('BSW')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const filteredWaitlists = getFilteredWaitlists();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🔔 キャンセル待ち管理
        </h1>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'active'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              🔍 監視中
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {waitlists.filter(w => w.status === 'active').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('paused')}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'paused'
                  ? 'text-yellow-600 border-b-2 border-yellow-600 bg-yellow-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              ⏸️ 通知済み
              <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {waitlists.filter(w => w.status === 'paused').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('ended')}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'ended'
                  ? 'text-gray-600 border-b-2 border-gray-600 bg-gray-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              🏁 終了済み
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                {waitlists.filter(w => ['expired', 'cancelled', 'completed'].includes(w.status)).length}
              </span>
            </button>
          </div>
        </div>

        {/* Add New Waitlist Button */}
        <div className="mb-6">
          <a
            href="/lessons/"
            className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium shadow-md"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新しいキャンセル待ちを登録
          </a>
        </div>

        {/* Waitlists List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : filteredWaitlists.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">
                {activeTab === 'active' && 'アクティブなキャンセル待ちはありません'}
                {activeTab === 'paused' && '通知済みのキャンセル待ちはありません'}
                {activeTab === 'ended' && '終了したキャンセル待ちはありません'}
              </p>
              {activeTab === 'active' && (
                <a
                  href="/lessons/"
                  className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  レッスンを検索してキャンセル待ち登録
                </a>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredWaitlists.map((waitlist) => (
                <div key={waitlist.waitlistId} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-lg font-semibold">
                          📍 {waitlist.studioName}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            waitlist.status
                          )}`}
                        >
                          {getStatusIcon(waitlist.status)} {getStatusText(waitlist.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <p className="text-gray-900">
                          📅 {formatDate(waitlist.lessonDate)} {waitlist.startTime}-{waitlist.endTime}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${getProgramColor(
                              waitlist.lessonName
                            )}`}
                          >
                            🎵 {waitlist.lessonName}
                          </span>
                          <span className="text-gray-600">👤 {waitlist.instructor}</span>
                        </div>
                      </div>

                      {/* Notification History */}
                      {waitlist.notificationHistory.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">📬 通知履歴:</p>
                          <div className="space-y-1">
                            {waitlist.notificationHistory.map((notification) => (
                              <div
                                key={notification.notificationId}
                                className="text-sm text-gray-500 bg-gray-50 rounded p-2"
                              >
                                {new Date(notification.sentAt).toLocaleString('ja-JP')} - 
                                残り{notification.availableSlots}席で通知
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        作成: {new Date(waitlist.createdAt).toLocaleString('ja-JP')}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 ml-4">
                      {waitlist.status === 'active' && (
                        <button
                          onClick={() => cancelWaitlist(waitlist.waitlistId)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                          ❌ 解除
                        </button>
                      )}
                      
                      {waitlist.status === 'paused' && (
                        <>
                          <button
                            onClick={() => window.open('https://www.feelcycle.com/', '_blank')}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                          >
                            📱 予約サイト
                          </button>
                          <button
                            onClick={() => resumeWaitlist(waitlist.waitlistId)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                          >
                            🔄 再開
                          </button>
                          <button
                            onClick={() => cancelWaitlist(waitlist.waitlistId)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                          >
                            ❌ 解除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            🔄 30秒ごとに自動更新中... 最終更新: {new Date().toLocaleTimeString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  );
}