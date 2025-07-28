import { Card, CardContent } from "./ui/card";
import { Zap, Shield, Users, BarChart3, Clock, Smartphone } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "高速パフォーマンス",
    description: "最新の技術スタックにより、超高速で安定したパフォーマンスを実現します。"
  },
  {
    icon: Shield,
    title: "安全・セキュア",
    description: "企業レベルのセキュリティでお客様の大切なデータを保護します。"
  },
  {
    icon: Users,
    title: "チーム連携",
    description: "チーム全体でのコラボレーションを促進し、生産性を向上させます。"
  },
  {
    icon: BarChart3,
    title: "詳細分析",
    description: "リアルタイムの分析とレポートで、データドリブンな意思決定をサポート。"
  },
  {
    icon: Clock,
    title: "24時間サポート",
    description: "いつでもお客様をサポートする専門チームが待機しています。"
  },
  {
    icon: Smartphone,
    title: "モバイル対応",
    description: "どのデバイスからでもアクセス可能なレスポンシブデザイン。"
  }
];

export function Features() {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-medium mb-4">
            なぜ私たちが選ばれるのか
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            お客様のビジネスを成功に導く、確かな機能と信頼性をご提供します。
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}