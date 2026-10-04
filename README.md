# かんたんデジタル案内所 Ver.8

# かんたんデジタル案内所 Ver.4

Cloudflare Pages + Pages Functions + D1 で動作する問い合わせ機能付き静的サイトです。

## D1 Binding
Pages の Binding 名を `DB`、接続先を `beginner-digital-guide-db` に設定します。

## 管理者パスワード
Cloudflare Pages の Settings > Variables and Secrets で、Secret として `ADMIN_PASSWORD` を追加してください。
値はGitHubやHTMLには書かず、十分長いパスワードを設定します。

## 1台限定管理
最初に `/admin/` で正しい管理者パスワードを入力したブラウザに、ランダムな管理端末キーを HttpOnly/Secure Cookie として発行します。D1にはキーそのものではなくSHA-256ハッシュだけを保存します。以後、別PC・別ブラウザはパスワードを知っていても管理画面へログインできません。

管理端末では12時間の管理セッションを発行します。ログアウトしても端末登録は維持されます。

### PC故障・Cookie削除などで管理画面に入れなくなった場合
Cloudflare D1 Console で次を実行すると端末登録だけ初期化できます。

```sql
DELETE FROM admin_devices;
DELETE FROM admin_login_attempts;
```

その後、次に正しい管理者パスワードでログインしたPCが新しい唯一の管理端末になります。

## 問い合わせ
一般ユーザーは `/contact.html` から送信し、受付番号で `/inquiry-status.html` から回答を確認します。


## Ver.5 changes
- 受付番号を16文字のランダム文字列へ強化
- 送信完了画面に受付番号コピーボタンを追加
- 回答確認ページは常に空欄から開始
- 問い合わせフォーム横の確認ボタンを削除
- ページ説明下に回答状況確認への導線を追加


## Ver.6
- 便利ツールページを追加し、CarLog / PriceLogを公開リンクで掲載
- 問い合わせ説明文を「不要です。」で改行
- 受付番号コピーボタンの見た目を改善
