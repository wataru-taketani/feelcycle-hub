export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">F</span>
            </div>
            <span className="font-medium">FEELCYCLE Hub</span>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 FEELCYCLE Hub. 非公式ツール
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>個人・小規模チーム向け</p>
          </div>
        </div>
      </div>
    </footer>
  );
}