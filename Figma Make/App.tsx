import { useState } from "react";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { Menu } from "./components/Menu";
import { CancelWaiting } from "./components/CancelWaiting";
import { AutoBooking } from "./components/AutoBooking";
import { LessonSearch } from "./components/LessonSearch";
import { AttendanceHistory } from "./components/AttendanceHistory";
import { UserSettings } from "./components/UserSettings";

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'cancel-waiting':
        return <CancelWaiting />;
      case 'auto-booking':
        return <AutoBooking />;
      case 'lesson-search':
        return <LessonSearch onNavigate={handleNavigate} />;
      case 'attendance-history':
        return <AttendanceHistory />;
      case 'user-settings':
        return <UserSettings />;
      case 'dashboard':
      default:
        return (
          <>
            <Dashboard />
            <Menu onNavigate={handleNavigate} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onNavigate={handleNavigate} currentPage={currentPage} />
      <main className="flex-1">
        {renderCurrentPage()}
      </main>
    </div>
  );
}