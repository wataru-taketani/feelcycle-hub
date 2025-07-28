import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { Mail, Phone, MapPin } from "lucide-react";

export function Contact() {
  return (
    <section id="contact" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-medium mb-4">
            お問い合わせ
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            ご質問やご相談がございましたら、お気軽にお問い合わせください。
            専門スタッフが丁寧にサポートいたします。
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* お問い合わせフォーム */}
          <Card>
            <CardContent className="p-8">
              <h3 className="font-medium mb-6">メッセージを送信</h3>
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block mb-2">
                      お名前（姓）
                    </label>
                    <Input id="firstName" placeholder="山田" />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block mb-2">
                      お名前（名）
                    </label>
                    <Input id="lastName" placeholder="太郎" />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block mb-2">
                    メールアドレス
                  </label>
                  <Input id="email" type="email" placeholder="example@email.com" />
                </div>

                <div>
                  <label htmlFor="company" className="block mb-2">
                    会社名
                  </label>
                  <Input id="company" placeholder="株式会社サンプル" />
                </div>

                <div>
                  <label htmlFor="message" className="block mb-2">
                    メッセージ
                  </label>
                  <Textarea 
                    id="message" 
                    placeholder="お問い合わせ内容をご入力ください..."
                    rows={5}
                  />
                </div>

                <Button className="w-full" size="lg">
                  送信する
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* コンタクト情報 */}
          <div className="space-y-8">
            <div>
              <h3 className="font-medium mb-6">その他のお問い合わせ方法</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">メール</h4>
                    <p className="text-muted-foreground">contact@yourbrand.com</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">電話</h4>
                    <p className="text-muted-foreground">03-1234-5678</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">所在地</h4>
                    <p className="text-muted-foreground">
                      〒100-0001<br />
                      東京都千代田区千代田1-1-1
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-xl p-6">
              <h4 className="font-medium mb-2">営業時間</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>月曜日 - 金曜日: 9:00 - 18:00</p>
                <p>土曜日: 10:00 - 16:00</p>
                <p>日曜日: 休業</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}