import { Button } from "./ui/button";
import { LogOut, User } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Header({ onNavigate, currentPage }: HeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName] = useState("山田太郎");

  const handleLineLogin = () => {
    // LINE ログイン処理（実装時にLINE Login APIを使用）
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* サイト名とホームボタン */}
          <div className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center cursor-pointer"
              onClick={() => onNavigate('dashboard')}
            >
              <span className="text-primary-foreground font-medium">F</span>
            </div>
            <h1 
              className="font-medium cursor-pointer text-base text-[16px]"
              onClick={() => onNavigate('dashboard')}
            >
              FEELCYCLE Hub
            </h1>

          </div>

          {/* ログイン状態 */}
          <div className="flex items-center">
            {isLoggedIn ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span className="hidden xs:inline text-sm">{userName}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs px-2 py-1">
                  <LogOut className="w-3 h-3 mr-1" />
                  <span className="hidden xs:inline">ログアウト</span>
                </Button>
              </div>
            ) : (
              <Button onClick={handleLineLogin} className="bg-[#00B900] hover:bg-[#009900] text-sm px-3 py-2">
                LINEログイン
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}