import { Button } from "./ui/button";
import { ArrowRight, Play } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Hero() {
  return (
    <section id="home" className="relative py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* テキストコンテンツ */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-4 py-2 bg-accent rounded-full">
                <span className="text-accent-foreground">🚀 新機能リリース</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-medium leading-tight">
                あなたのビジネスを
                <span className="text-primary"> 次のレベル</span>
                へ
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                革新的なソリューションで、効率性を向上させ、成長を加速させましょう。
                私たちのプラットフォームがあなたの成功をサポートします。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="flex items-center gap-2">
                無料で始める
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="lg" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                デモを見る
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-8">
              <div className="text-center">
                <div className="text-2xl font-medium">10,000+</div>
                <div className="text-muted-foreground">利用企業</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-medium">99.9%</div>
                <div className="text-muted-foreground">稼働率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-medium">24/7</div>
                <div className="text-muted-foreground">サポート</div>
              </div>
            </div>
          </div>

          {/* 画像 */}
          <div className="relative">
            <div className="relative z-10 bg-gradient-to-br from-primary/10 to-accent rounded-2xl p-8">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop"
                alt="ビジネスダッシュボード"
                className="w-full h-auto rounded-lg"
              />
            </div>
            {/* 装飾的な要素 */}
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-accent/5 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}