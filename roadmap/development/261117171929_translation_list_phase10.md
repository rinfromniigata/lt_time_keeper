# 訳の確認用の一覧（T10-7）

- 対象：`src/lib/i18n/locales/` の ja・en・zh-Hans（全キー 122 件）。画面ID は、そのキーを使う画面（複数なら併記。`S05〜S05c` はタブの見出し）。
- 確認のしかた：直したいキーと直し方を、キー名で伝えてください（T10-8）。ja の原文は変えません（訳の言い回しだけ）。
- 英語・中国語は、T10-7 で見直しました。変えた箇所は末尾の「T10-7 で見直した箇所」にあります。

## S00

- `app.name`（S00・S01（題名））
  - ja: LTタイムキーパー
  - en: LT Timekeeper
  - zh-Hans: LT 计时器
- `app.loading`（S00）
  - ja: 読み込み中…
  - en: Loading…
  - zh-Hans: 正在加载…

## S01

- `header.open_prefs`（S01）
  - ja: 環境設定を開く
  - en: Open preferences
  - zh-Hans: 打开偏好设置
- `settings.duration.title`（S01）
  - ja: 持ち時間
  - en: Talk time
  - zh-Hans: 演讲时长
- `settings.duration.minutes_unit`（S01）
  - ja: 分
  - en: min
  - zh-Hans: 分
- `settings.duration.seconds_unit`（S01）
  - ja: 秒
  - en: sec
  - zh-Hans: 秒
- `settings.duration.minutes_field`（S01）
  - ja: 分
  - en: Minutes
  - zh-Hans: 分钟
- `settings.duration.seconds_field`（S01）
  - ja: 秒
  - en: Seconds
  - zh-Hans: 秒
- `settings.duration.decrease_minute`（S01）
  - ja: 1分減らす
  - en: Subtract 1 minute
  - zh-Hans: 减少 1 分钟
- `settings.duration.increase_minute`（S01）
  - ja: 1分増やす
  - en: Add 1 minute
  - zh-Hans: 增加 1 分钟
- `settings.duration.decrease_seconds`（S01）
  - ja: 10秒減らす
  - en: Subtract 10 seconds
  - zh-Hans: 减少 10 秒
- `settings.duration.increase_seconds`（S01）
  - ja: 10秒増やす
  - en: Add 10 seconds
  - zh-Hans: 增加 10 秒
- `settings.duration.preset`（S01）
  - ja: {n}分
  - en: {n} min
  - zh-Hans: {n} 分钟
- `settings.title.title`（S01）
  - ja: 表示名
  - en: Display title
  - zh-Hans: 显示标题
- `settings.title.optional`（S01）
  - ja: 任意
  - en: Optional
  - zh-Hans: 可选
- `settings.title.placeholder`（S01）
  - ja: 例：LT「型安全なCSS設計」
  - en: e.g. LT: Type-safe CSS architecture
  - zh-Hans: 例如：LT「类型安全的 CSS 设计」
- `settings.title.hint`（S01）
  - ja: 計測中の画面の上部に表示します。
  - en: Shown at the top of the timer screen.
  - zh-Hans: 显示在计时画面的顶部。
- `settings.bells.title`（S01）
  - ja: ベル
  - en: Bells
  - zh-Hans: 铃声
- `settings.bells.count`（S01）
  - ja: {n}件
  - en: one: {n} bell ／ other: {n} bells
  - zh-Hans: {n} 个
- `settings.bells.label_ordinal`（S01）
  - ja: {n}鈴
  - en: Bell {n}
  - zh-Hans: 第 {n} 铃
- `settings.bells.remaining`（S01）
  - ja: 残り {time}
  - en: {time} left
  - zh-Hans: 剩余 {time}
- `settings.bells.overtime`（S01・S01c）
  - ja: 超過 +{time}
  - en: {time} over
  - zh-Hans: 超时 +{time}
- `settings.bells.note_warn`（S01）
  - ja: ここで黄（予鈴）に変わる
  - en: Turns yellow (warning) here
  - zh-Hans: 此时变为黄色（预警）
- `settings.bells.note_over`（S01）
  - ja: ここで赤（超過）に変わる
  - en: Turns red (overtime) here
  - zh-Hans: 此时变为红色（超时）
- `settings.bells.note_never`（S01）
  - ja: 持ち時間より長いため鳴りません
  - en: Longer than the talk time, so it won't ring
  - zh-Hans: 超过演讲时长，不会响铃
- `settings.bells.note_none`（S01）
  - ja: —
  - en: —
  - zh-Hans: —
- `settings.bells.strikes`（S01）
  - ja: {n}回鳴らす
  - en: one: Rings once ／ other: Rings {n} times
  - zh-Hans: 响 {n} 次
- `settings.bells.delete`（S01）
  - ja: 削除
  - en: Delete
  - zh-Hans: 删除
- `settings.bells.add`（S01）
  - ja: ベルを追加
  - en: Add bell
  - zh-Hans: 添加铃声
- `settings.start_bar.summary`（S01）
  - ja: 持ち時間 {time} ／ ベル {n}件
  - en: one: Talk time {time} / {n} bell ／ other: Talk time {time} / {n} bells
  - zh-Hans: 演讲时长 {time} / 铃声 {n} 个
- `settings.start_bar.summary_no_bells`（S01）
  - ja: 持ち時間 {time} ／ ベルなし
  - en: Talk time {time} / No bells
  - zh-Hans: 演讲时长 {time} / 无铃声
- `settings.start_bar.summary_invalid`（S01）
  - ja: 持ち時間を入力すると開始できます
  - en: Enter a talk time to start
  - zh-Hans: 输入演讲时长后即可开始
- `settings.start`（S01）
  - ja: 開始
  - en: Start
  - zh-Hans: 开始

## S01a

- `settings.duration.error_zero`（S01a）
  - ja: 持ち時間を1秒以上にしてください。
  - en: Set the talk time to at least 1 second.
  - zh-Hans: 请将演讲时长设为至少 1 秒。

## S01b

- `settings.bells.empty`（S01b）
  - ja: ベルがありません。音は鳴らさず、時間と色だけで知らせます。
  - en: No bells. The timer shows time and color only, without sound.
  - zh-Hans: 没有铃声。不会发出声音，仅通过时间和颜色提示。

## S01c

- `settings.bells.label_number`（S01c）
  - ja: {n}
  - en: {n}
  - zh-Hans: {n}

## S01d

- `bell_editor.title_edit`（S01d）
  - ja: {label}を編集
  - en: Edit {label}
  - zh-Hans: 编辑{label}
- `bell_editor.title_add`（S01d）
  - ja: ベルを追加
  - en: Add bell
  - zh-Hans: 添加铃声
- `bell_editor.when`（S01d）
  - ja: 鳴らす時点
  - en: Ring at
  - zh-Hans: 响铃时间点
- `bell_editor.basis_remaining`（S01d）
  - ja: 残り
  - en: Time left
  - zh-Hans: 剩余
- `bell_editor.basis_overtime`（S01d）
  - ja: 超過後
  - en: Overtime
  - zh-Hans: 超时后
- `bell_editor.count`（S01d）
  - ja: 鳴らす回数
  - en: Number of rings
  - zh-Hans: 响铃次数
- `bell_editor.count_option`（S01d）
  - ja: {n}回
  - en: {n}×
  - zh-Hans: {n} 次
- `bell_editor.delete`（S01d）
  - ja: 削除
  - en: Delete
  - zh-Hans: 删除
- `bell_editor.cancel`（S01d）
  - ja: キャンセル
  - en: Cancel
  - zh-Hans: 取消
- `bell_editor.confirm`（S01d）
  - ja: 決定
  - en: Done
  - zh-Hans: 确定
- `common.close`（S01d・S05（×ボタンの名前））
  - ja: 閉じる
  - en: Close
  - zh-Hans: 关闭

## S01f

- `update.title`（S01f）
  - ja: 新しいバージョンがあります。
  - en: A new version is available.
  - zh-Hans: 有新版本可用。
- `update.note`（S01f）
  - ja: 再読み込みすると、入力中の値は初期値に戻ります。
  - en: Reloading resets the values you have entered.
  - zh-Hans: 重新加载后，已输入的值将恢复为初始值。
- `update.reload`（S01f）
  - ja: 再読み込み
  - en: Reload
  - zh-Hans: 重新加载

## S03

- `timer.next_bell_long`（S03）
  - ja: 次のベル　{label}まで {time}
  - en: Next: {label} in {time}
  - zh-Hans: 下一次铃声：距{label} {time}
- `timer.next_bell_short`（S03）
  - ja: {label}まで {time}
  - en: {label} in {time}
  - zh-Hans: 距{label} {time}
- `timer.bell_ordinal_long`（S03）
  - ja: {n}番目のベル
  - en: Bell {n}
  - zh-Hans: 第 {n} 个铃声
- `timer.elapsed`（S03）
  - ja: 経過 {elapsed} ／ {total}
  - en: Elapsed {elapsed} / {total}
  - zh-Hans: 已用 {elapsed} / {total}
- `timer.pause`（S03）
  - ja: 一時停止
  - en: Pause
  - zh-Hans: 暂停
- `timer.resume`（S03）
  - ja: 再開
  - en: Resume
  - zh-Hans: 继续
- `timer.end`（S03）
  - ja: 終了
  - en: End
  - zh-Hans: 结束
- `timer.fullscreen`（S03）
  - ja: 全画面
  - en: Full screen
  - zh-Hans: 全屏
- `timer.kbd.pause`（S03）
  - ja: 一時停止・再開
  - en: Pause / Resume
  - zh-Hans: 暂停 / 继续
- `timer.kbd.fullscreen`（S03）
  - ja: 全画面
  - en: Full screen
  - zh-Hans: 全屏
- `timer.kbd.end`（S03）
  - ja: 終了
  - en: End
  - zh-Hans: 结束

## S03a

- `timer.state.warn`（S03a）
  - ja: 予鈴
  - en: Warning
  - zh-Hans: 预警

## S03b

- `timer.state.over`（S03b）
  - ja: 超過
  - en: Overtime
  - zh-Hans: 超时

## S03c

- `timer.state.paused`（S03c）
  - ja: 一時停止中
  - en: Paused
  - zh-Hans: 已暂停

## S03d

- `warning.sound_title`（S03d）
  - ja: ベルの音を出せません。
  - en: The bell sound can't play.
  - zh-Hans: 无法播放铃声。
- `warning.sound_note`（S03d）
  - ja: 端末の消音を解除するか、音量を上げてから画面を一度タップしてください。
  - en: Unmute your device or turn up the volume, then tap the screen once.
  - zh-Hans: 请取消设备静音或调高音量，然后轻触一次屏幕。
- `warning.wake_title`（S03d）
  - ja: 画面のスリープを防げませんでした。
  - en: Couldn't keep the screen awake.
  - zh-Hans: 无法阻止屏幕休眠。
- `warning.wake_note`（S03d）
  - ja: 端末の自動ロックを長めにしておくと安心です。
  - en: Setting a longer auto-lock time on your device helps.
  - zh-Hans: 建议将设备的自动锁定时间设得长一些。

## S03e

- `timer.show_controls`（S03e）
  - ja: タップで操作ボタンを表示
  - en: Tap to show controls
  - zh-Hans: 轻触以显示控制按钮

## S03f

- `end_confirm.title`（S03f）
  - ja: 計測を終了しますか？
  - en: End the timer?
  - zh-Hans: 要结束计时吗？
- `end_confirm.body`（S03f）
  - ja: 経過 {elapsed} ／ {total}。終了すると設定画面に戻ります。計測はこのあいだも続いています。
  - en: {elapsed} of {total} elapsed. Ending takes you back to setup. The timer keeps running while this is open.
  - zh-Hans: 已用 {elapsed} / {total}。结束后将返回设置画面。此窗口打开期间，计时仍在继续。
- `end_confirm.key_end`（S03f）
  - ja: 終了する
  - en: End
  - zh-Hans: 结束
- `end_confirm.key_continue`（S03f）
  - ja: 続ける
  - en: Keep going
  - zh-Hans: 继续
- `end_confirm.continue`（S03f）
  - ja: 続ける
  - en: Keep going
  - zh-Hans: 继续计时
- `end_confirm.end`（S03f）
  - ja: 終了する
  - en: End timer
  - zh-Hans: 结束计时
- `end_confirm.dont_ask`（S03f）
  - ja: 今後この確認を表示しない
  - en: Don't ask me again
  - zh-Hans: 不再显示此确认
- `end_confirm.dont_ask_hint`（S03f）
  - ja: 環境設定でいつでも元に戻せます。
  - en: You can turn this back on in Preferences at any time.
  - zh-Hans: 可随时在偏好设置中恢复。

## S05

- `prefs.title`（S05〜S05c）
  - ja: 環境設定
  - en: Preferences
  - zh-Hans: 偏好设置
- `prefs.tab.general`（S05〜S05c）
  - ja: 一般
  - en: General
  - zh-Hans: 常规
- `prefs.tab.sound`（S05〜S05c）
  - ja: 音
  - en: Sound
  - zh-Hans: 声音
- `prefs.tab.about`（S05〜S05c（S05c は戻るボタンの名前））
  - ja: アプリ情報
  - en: About
  - zh-Hans: 关于
- `prefs.language.title`（S05）
  - ja: 言語
  - en: Language
  - zh-Hans: 语言
- `prefs.language.hint`（S05）
  - ja: 最初はブラウザの言語に合わせます。日本語・英語・中国語以外のときは英語で表示します。
  - en: Starts in your browser's language. Other languages fall back to English.
  - zh-Hans: 默认跟随浏览器语言。其他语言将显示为英语。
- `prefs.theme.title`（S05）
  - ja: 表示テーマ
  - en: Theme
  - zh-Hans: 外观主题
- `prefs.theme.system`（S05）
  - ja: システム
  - en: System
  - zh-Hans: 跟随系统
- `prefs.theme.light`（S05）
  - ja: ライト
  - en: Light
  - zh-Hans: 浅色
- `prefs.theme.dark`（S05）
  - ja: ダーク
  - en: Dark
  - zh-Hans: 深色
- `prefs.end_confirm.title`（S05）
  - ja: 終了の確認
  - en: End confirmation
  - zh-Hans: 结束确认
- `prefs.end_confirm.label`（S05）
  - ja: 計測を終了するときに確認する
  - en: Ask before ending the timer
  - zh-Hans: 结束计时前进行确认
- `prefs.end_confirm.hint`（S05）
  - ja: オフにすると、「終了」や Esc キーですぐに設定画面へ戻ります。
  - en: When off, End and the Esc key return to setup immediately.
  - zh-Hans: 关闭后，点击“结束”或按 Esc 键会立即返回设置画面。

## S05a

- `prefs.sound.volume`（S05a）
  - ja: 音量
  - en: Volume
  - zh-Hans: 音量
- `prefs.sound.test`（S05a）
  - ja: 鳴らしてみる
  - en: Play test sound
  - zh-Hans: 试听
- `prefs.sound.vibrate`（S05a）
  - ja: ベルと同時に振動する
  - en: Vibrate with bells
  - zh-Hans: 响铃时同时振动
- `prefs.sound.vibrate_hint`（S05a）
  - ja: 振動に対応した端末でだけ表示します。
  - en: Shown only on devices that can vibrate.
  - zh-Hans: 仅在支持振动的设备上显示。

## S05b

- `prefs.about.heading`（S05b）
  - ja: LTタイムキーパーについて
  - en: About LT Timekeeper
  - zh-Hans: 关于 LT 计时器
- `prefs.about.tagline`（S05b）
  - ja: LTやプレゼンの持ち時間を計るタイムキーパー
  - en: A timekeeper for lightning talks and presentations
  - zh-Hans: 用于闪电演讲和演示的计时工具
- `prefs.about.version`（S05b）
  - ja: バージョン {version}
  - en: Version {version}
  - zh-Hans: 版本 {version}
- `prefs.about.source`（S05b）
  - ja: ソースコード（GitHub）
  - en: Source code (GitHub)
  - zh-Hans: 源代码（GitHub）
- `prefs.about.license`（S05b）
  - ja: ライセンス
  - en: License
  - zh-Hans: 许可证
- `prefs.about.third_party`（S05b）
  - ja: 使用しているオープンソースソフトウェア
  - en: Open-source software
  - zh-Hans: 使用的开源软件
- `prefs.about.privacy_link`（S05b）
  - ja: プライバシーポリシー
  - en: Privacy policy
  - zh-Hans: 隐私政策
- `prefs.about.privacy_summary`（S05b）
  - ja: 情報を集めず、入力した内容を外部へ送りません。
  - en: Collects nothing, and never sends what you enter off your device.
  - zh-Hans: 不收集信息，也不会把你输入的内容发送到外部。

## S05c

- `privacy.title`（S05c）
  - ja: プライバシーポリシー
  - en: Privacy policy
  - zh-Hans: 隐私政策
- `privacy.lead`（S05c）
  - ja: LTタイムキーパーが扱う情報と、使う端末の機能についての説明です。
  - en: What information LT Timekeeper handles, and which device features it uses.
  - zh-Hans: 说明 LT 计时器处理哪些信息，以及使用哪些设备功能。
- `privacy.collect.title`（S05c）
  - ja: 集める情報
  - en: Information we collect
  - zh-Hans: 收集的信息
- `privacy.collect.body`（S05c）
  - ja: このアプリは、あなたの個人情報や利用状況を集めません。アカウント登録、解析ツール、広告、Cookie による追跡はありません。
  - en: This app does not collect any personal information or usage data. There are no accounts, analytics, ads, or tracking cookies.
  - zh-Hans: 本应用不收集你的个人信息或使用情况。没有账号注册、统计分析工具、广告，也不使用 Cookie 进行跟踪。
- `privacy.store.title`（S05c）
  - ja: 端末に保存する情報
  - en: Information stored on your device
  - zh-Hans: 保存在设备上的信息
- `privacy.store.body`（S05c）
  - ja: 環境設定の値（言語・表示テーマ・音量・振動・終了の確認）を、この端末のブラウザの中にだけ保存します。持ち時間・ベル・表示名は保存しません。保存した値は、ブラウザでこのサイトのデータを消すと消えます。
  - en: Your preferences (language, theme, volume, vibration, and end confirmation) are saved only in this browser on this device. Talk time, bells, and the display title are not saved. Clearing this site's data in your browser deletes them.
  - zh-Hans: 偏好设置（语言、外观主题、音量、振动和结束确认）仅保存在此设备的浏览器中。演讲时长、铃声和显示标题不会保存。在浏览器中清除本网站的数据后，这些值会被删除。
- `privacy.store.cache`（S05c）
  - ja: 通信なしで動かすために、アプリ本体と書体のファイルもブラウザに保存します。
  - en: To work offline, the app's own files and fonts are also stored in your browser.
  - zh-Hans: 为了在离线时运行，应用本身的文件和字体也会保存在浏览器中。
- `privacy.send.title`（S05c）
  - ja: 外部への送信
  - en: Data sent off your device
  - zh-Hans: 向外部发送
- `privacy.send.body`（S05c）
  - ja: 入力した内容や保存した値を、外部へ送ることはありません。通信するのは、アプリ本体と更新を lt.rinontech.com から読み込むときと、書体（Noto Sans・JetBrains Mono）を Google Fonts から読み込むときだけです。アプリ本体の配信は Cloudflare Pages が行います。書体を読み込むとき、お使いのブラウザの接続情報（IP アドレスなど）が Google に届きます。
  - en: Nothing you enter or save is ever sent anywhere. The app only goes online to load itself and its updates from lt.rinontech.com (served by Cloudflare Pages), and to load its fonts (Noto Sans and JetBrains Mono) from Google Fonts. When the fonts load, your browser's connection information, such as your IP address, reaches Google.
  - zh-Hans: 你输入或保存的内容绝不会发送到外部。应用仅在从 lt.rinontech.com 加载自身及其更新（由 Cloudflare Pages 分发）时，以及从 Google Fonts 加载字体（Noto Sans 和 JetBrains Mono）时联网。加载字体时，你的浏览器连接信息（如 IP 地址）会发送给 Google。
- `privacy.perm.title`（S05c）
  - ja: 使う端末の機能
  - en: Device features
  - zh-Hans: 使用的设备功能
- `privacy.perm.lead`（S05c）
  - ja: どれも許可を求めるダイアログは出ません。
  - en: None of these ask for permission.
  - zh-Hans: 以下功能均不会弹出权限请求。
- `privacy.perm.used`（S05c）
  - ja: 使うもの
  - en: Used
  - zh-Hans: 使用
- `privacy.perm.wake_lock`（S05c）
  - ja: 画面のスリープ防止（計測中だけ）
  - en: Keeping the screen awake (only while timing)
  - zh-Hans: 阻止屏幕休眠（仅在计时期间）
- `privacy.perm.audio`（S05c）
  - ja: 音の再生（ベル）
  - en: Playing sound (bells)
  - zh-Hans: 播放声音（铃声）
- `privacy.perm.vibration`（S05c）
  - ja: 振動（対応した端末で、オンにしたときだけ）
  - en: Vibration (only on supported devices, when turned on)
  - zh-Hans: 振动（仅在支持的设备上且已开启时）
- `privacy.perm.fullscreen`（S05c）
  - ja: 全画面表示（ボタンか F キーを押したときだけ）
  - en: Full screen (only when you press the button or F)
  - zh-Hans: 全屏显示（仅在按下按钮或 F 键时）
- `privacy.perm.unused`（S05c）
  - ja: 使わないもの
  - en: Not used
  - zh-Hans: 不使用
- `privacy.perm.unused_list`（S05c）
  - ja: カメラ、マイク、位置情報、通知、連絡先・写真・ファイル
  - en: Camera, microphone, location, notifications, contacts, photos, files
  - zh-Hans: 相机、麦克风、位置信息、通知、通讯录、照片、文件
- `privacy.change.title`（S05c）
  - ja: このポリシーの変更
  - en: Changes to this policy
  - zh-Hans: 本政策的变更
- `privacy.change.body`（S05c）
  - ja: 内容を変えるときは、アプリの更新と一緒にお知らせします。このポリシーはバージョン {version} 時点のものです。
  - en: If this policy changes, you'll be told along with the app update. This policy applies as of version {version}.
  - zh-Hans: 如有变更，将随应用更新一并告知。本政策适用于版本 {version}。

## T10-7 で見直した箇所

- `timer.elapsed`（en）: 「{elapsed} of {total}」→「Elapsed {elapsed} / {total}」。何の時間かが分かるよう、ja（経過）・zh-Hans（已用）と同じ「経過 → 総時間」の形にそろえた
- `warning.wake_title`（en）: 「The screen may go to sleep.」→「Couldn't keep the screen awake.」。ja（画面のスリープを防げませんでした）は「防げなかった」と言い切っているので、推測の言い方をやめた
- ほかのキーは、意味・用語（環境設定＝Preferences／偏好设置、持ち時間＝Talk time／演讲时长、ベル＝bell／铃声）が3言語でそろっており、変更なし
