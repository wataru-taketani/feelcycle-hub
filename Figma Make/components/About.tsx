import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Award, Target, Heart } from "lucide-react";

export function About() {
  return (
    <section id="about" className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* 画像セクション */}
          <div className="relative">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop"
              alt="チームワーク"
              className="w-full h-auto rounded-2xl"
            />
            <div className="absolute -bottom-6 -right-6 bg-background border border-border rounded-xl p-6 shadow-lg">
              <div className="text-2xl font-medium">5年+</div>
              <div className="text-muted-foreground">の実績</div>
            </div>
          </div>

          {/* テキストセクション */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-medium">
                私たちについて
              </h2>
              <p className="text-lg text-muted-foreground">
                私たちは、お客様のビジネス成長を第一に考える専門チームです。
                革新的な技術と確かな経験で、最適なソリューションをご提供いたします。
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">高品質な成果物</h4>
                  <p className="text-muted-foreground">
                    厳格な品質管理プロセスにより、常に最高品質の製品をお届けします。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">目標達成へのコミット</h4>
                  <p className="text-muted-foreground">
                    お客様の目標達成まで、責任を持ってサポートいたします。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">お客様第一主義</h4>
                  <p className="text-muted-foreground">
                    お客様の満足が私たちの最大の喜びです。常にお客様の立場で考えます。
                  </p>
                </div>
              </div>
            </div>

            <Button size="lg">
              詳細を見る
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}