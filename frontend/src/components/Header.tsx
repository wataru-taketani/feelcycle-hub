'use client';

import { Button } from "./ui/button";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export function Header({ onNavigate, currentPage }: HeaderProps) {
  const { isAuthenticated, user, login, logout } = useAuth();
  const router = useRouter();

  const handleNavigateHome = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    } else {
      // Next.js App Router navigation
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* サイト名とホームボタン */}
          <div className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center cursor-pointer"
              onClick={handleNavigateHome}
            >
              <span className="text-primary-foreground font-medium">F</span>
            </div>
            <h1 
              className="font-medium cursor-pointer text-base text-[16px]"
              onClick={handleNavigateHome}
            >
              FEELCYCLE Hub
            </h1>
          </div>

          {/* ログイン状態 */}
          <div className="flex items-center">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {user.pictureUrl ? (
                    <img 
                      src={user.pictureUrl} 
                      alt={user.displayName}
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="hidden xs:inline text-sm">{user.displayName}</span>
                </div>
                <Button variant="outline" size="sm" onClick={logout} className="text-xs px-2 py-1">
                  <LogOut className="w-3 h-3 mr-1" />
                  <span className="hidden xs:inline">ログアウト</span>
                </Button>
              </div>
            ) : (
              <Button onClick={login} className="bg-[#00B900] hover:bg-[#009900] text-sm px-3 py-2">
                LINEログイン
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}