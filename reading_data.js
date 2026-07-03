// TOEIC600点対策 長文読解問題データ
const READING_DATA = [
  {
    id:1,
    title:"社内お知らせ",
    type:"memo",
    passage:`TO: All Staff
FROM: Office Management
SUBJECT: Parking Lot Renovation

Starting Monday, June 8, the main parking lot will be closed for repaving. This work is expected to take approximately two weeks. During this period, employees are asked to park in the temporary lot located behind the building on Maple Street. Please allow extra time for walking to the main entrance.

We apologize for any inconvenience this may cause. If you have any questions, please contact the facilities department at extension 204.`,
    passageJa:"宛先：全スタッフ／差出人：施設管理部／件名：駐車場改修工事について\n\n6月8日（月）より、メイン駐車場が舗装工事のため閉鎖されます。工事は約2週間を要する見込みです。この期間中、従業員はメープルストリート沿いの建物裏にある仮設駐車場をご利用ください。正面入口までの徒歩時間に余裕を持ってください。\n\nご不便をおかけしますことをお詫び申し上げます。ご質問は内線204の施設部までご連絡ください。",
    questions:[
      {q:"What is the purpose of the memo?",choices:["To announce a new employee","To explain a parking lot closure","To request vacation days","To introduce a new manager"],ans:1,exp:"駐車場の閉鎖と仮設駐車場の案内が主旨。"},
      {q:"How long will the renovation likely take?",choices:["One week","Two weeks","One month","Three days"],ans:1,exp:"本文に approximately two weeks とある。"},
      {q:"What should employees do during the renovation?",choices:["Work from home","Park on Maple Street","Take the bus","Cancel meetings"],ans:1,exp:"仮設駐車場はメープルストリートの裏にあると記載。"}
    ]
  },
  {
    id:2,
    title:"求人広告",
    type:"ad",
    passage:`Marketing Assistant Wanted

Bright Solutions Inc. is seeking a full-time Marketing Assistant to join our growing team. The ideal candidate will have at least one year of experience in marketing or a related field, strong communication skills, and proficiency in spreadsheet software.

Responsibilities include preparing marketing materials, coordinating with the sales team, and assisting with social media campaigns.

This position offers a competitive salary and health benefits. To apply, please send your resume and cover letter to careers@brightsolutions.com by July 20.`,
    passageJa:"マーケティングアシスタント募集\n\nBright Solutions社は成長中のチームに加わるフルタイムのマーケティングアシスタントを募集しています。理想的な候補者は、マーケティングまたは関連分野で最低1年の経験、優れたコミュニケーション能力、表計算ソフトの習熟度を持つ方です。\n\n業務内容にはマーケティング資料の作成、営業チームとの連携、ソーシャルメディアキャンペーンの補助が含まれます。\n\nこのポジションは競争力のある給与と健康保険を提供します。応募には履歴書とカバーレターを7月20日までにcareers@brightsolutions.comへ送付してください。",
    questions:[
      {q:"What is required for this position?",choices:["A college degree only","At least one year of related experience","Five years of management experience","A driver's license"],ans:1,exp:"at least one year of experience と明記されている。"},
      {q:"What is one of the job responsibilities?",choices:["Managing the warehouse","Assisting with social media campaigns","Repairing equipment","Hiring new employees"],ans:1,exp:"assisting with social media campaigns と記載。"},
      {q:"How should applicants apply?",choices:["By calling the office","By visiting in person","By sending an email","By mailing a letter"],ans:2,exp:"send your resume...to careers@brightsolutions.com とある。"}
    ]
  },
  {
    id:3,
    title:"Eメール",
    type:"email",
    passage:`From: Lisa Tanaka
To: David Kim
Subject: Re: Quarterly Report

Hi David,

Thank you for sending the draft of the quarterly report. I reviewed it and I think the sales figures look great. However, I noticed that the section on customer feedback is missing some data from the March survey.

Could you please add that information and send the updated version by Thursday? We need to present it at the board meeting on Friday morning.

Thanks for your hard work on this.

Best,
Lisa`,
    passageJa:"差出人：Lisa Tanaka／宛先：David Kim／件名：Re: 四半期報告書\n\nDavidさん\n\n四半期報告書の草案を送ってくれてありがとう。確認しましたが、売上数値はとても良いと思います。ただ、顧客フィードバックのセクションに3月の調査データが一部抜けていることに気づきました。\n\nその情報を追加して、木曜日までに更新版を送ってもらえますか？金曜日朝の役員会議で発表する必要があります。\n\nこの件での尽力に感謝します。\n\nLisaより",
    questions:[
      {q:"What does Lisa want David to do?",choices:["Rewrite the entire report","Add missing data to the report","Cancel the board meeting","Send the report to a client"],ans:1,exp:"missing data from the March survey を追加してほしいとある。"},
      {q:"When is the updated report due?",choices:["Wednesday","Thursday","Friday morning","Next week"],ans:1,exp:"by Thursday と明記。"},
      {q:"Why is the report needed by then?",choices:["For a client meeting","For a board meeting","For a press release","For a training session"],ans:1,exp:"present it at the board meeting on Friday とある。"}
    ]
  },
  {
    id:4,
    title:"通知文",
    type:"notice",
    passage:`NOTICE: System Maintenance

The company's internal network will undergo scheduled maintenance this Saturday, from 10:00 P.M. to 2:00 A.M. During this time, employees will not be able to access email, shared drives, or the company website.

We recommend saving any important files before the maintenance begins. If the maintenance takes longer than expected, an update will be posted on the IT department's bulletin board.

Thank you for your understanding.`,
    passageJa:"お知らせ：システムメンテナンスについて\n\n社内ネットワークは今週土曜日の午後10時から午前2時まで定期メンテナンスを実施します。この間、従業員はメール、共有ドライブ、会社のウェブサイトにアクセスできません。\n\nメンテナンス開始前に重要なファイルを保存しておくことをお勧めします。メンテナンスが予定より長引く場合は、IT部門の掲示板に更新情報が掲示されます。\n\nご理解のほどよろしくお願いいたします。",
    questions:[
      {q:"When will the maintenance take place?",choices:["Friday morning","Saturday night","Sunday afternoon","Monday morning"],ans:1,exp:"this Saturday, from 10:00 P.M. to 2:00 A.M. とある。"},
      {q:"What is recommended before the maintenance?",choices:["Turning off computers","Saving important files","Contacting IT immediately","Attending a meeting"],ans:1,exp:"save any important files before the maintenance begins とある。"},
      {q:"Where will updates be posted if maintenance is delayed?",choices:["On the company website","Via text message","On the IT bulletin board","In an email"],ans:2,exp:"posted on the IT department's bulletin board とある。"}
    ]
  },
  {
    id:5,
    title:"新聞記事",
    type:"article",
    passage:`Local Bakery Expands to Second Location

Sweet Crumb Bakery, a popular local business known for its artisan bread, announced last week that it will open a second location downtown. The new shop is scheduled to open in early September.

Owner Maria Chen said the expansion was driven by increasing demand from customers who live and work downtown. "We've had so many requests to open closer to the business district," she said. The new location will offer the same menu as the original shop, along with a few new seasonal items.

Sweet Crumb has been operating since 2018 and has built a loyal customer base thanks to its high-quality ingredients and friendly service.`,
    passageJa:"地元ベーカリー、2号店を出店\n\n手作りパンで知られる地元の人気店Sweet Crumb Bakeryは先週、ダウンタウンに2号店をオープンすると発表した。新店舗は9月初旬の開店を予定している。\n\nオーナーのMaria Chen氏は、この出店拡大はダウンタウンに住み働く顧客からの需要増加によるものだと述べた。「ビジネス街の近くに出店してほしいという要望をたくさんいただいていました」と彼女は語った。新店舗は本店と同じメニューに加え、季節限定の新商品も提供する予定だ。\n\nSweet Crumbは2018年から営業しており、高品質な材料と親切なサービスで多くの常連客を獲得してきた。",
    questions:[
      {q:"What is the article mainly about?",choices:["A bakery closing down","A bakery opening a new location","A change in bakery ownership","A new bakery recipe"],ans:1,exp:"2号店出店についての記事。"},
      {q:"Why did the owner decide to expand?",choices:["Rising ingredient costs","Customer demand downtown","A government grant","A competitor closing"],ans:1,exp:"increasing demand from customers who live and work downtown とある。"},
      {q:"When is the new location expected to open?",choices:["Early September","Late August","October","Next year"],ans:0,exp:"scheduled to open in early September とある。"}
    ]
  },
  {
    id:6,
    title:"社内フォーム",
    type:"form",
    passage:`EXPENSE REIMBURSEMENT REQUEST

Employee Name: _______________
Department: _______________
Date of Expense: _______________
Amount: $_______________
Description: _______________

Instructions: Please attach original receipts for all expenses. Forms without receipts will not be processed. Submit completed forms to the accounting department by the 25th of each month. Reimbursements are typically processed within two weeks.

Questions? Contact accounting@company.com.`,
    passageJa:"経費払い戻し申請書\n\n従業員氏名：＿＿＿＿＿＿＿／部署：＿＿＿＿＿＿＿／経費発生日：＿＿＿＿＿＿＿／金額：＄＿＿＿＿＿＿＿／内容：＿＿＿＿＿＿＿\n\n記入方法：すべての経費について原本の領収書を添付してください。領収書のない申請書は処理されません。記入済みの用紙は毎月25日までに経理部へ提出してください。払い戻しは通常2週間以内に処理されます。\n\nご質問は accounting@company.com までご連絡ください。",
    questions:[
      {q:"What must be attached to the form?",choices:["A photo ID","Original receipts","A manager's signature","A bank statement"],ans:1,exp:"attach original receipts for all expenses とある。"},
      {q:"By when should the form be submitted each month?",choices:["The 1st","The 15th","The 25th","The last day"],ans:2,exp:"by the 25th of each month とある。"},
      {q:"How long does reimbursement typically take?",choices:["One day","Two weeks","One month","Three months"],ans:1,exp:"typically processed within two weeks とある。"}
    ]
  },
  {
    id:7,
    title:"レビュー・口コミ",
    type:"review",
    passage:`★★★★☆ Great value for the price

I stayed at this hotel for a business trip last month. The room was clean and comfortable, and the staff at the front desk were very helpful when I needed directions to a nearby restaurant. The only downside was that the Wi-Fi connection was slow in the evenings, which made it hard to finish some work. Overall, I would recommend this hotel to other business travelers, especially those on a budget.

— Posted by a verified guest`,
    passageJa:"★★★★☆ 価格に見合った価値\n\n先月、出張でこのホテルに宿泊しました。部屋は清潔で快適で、フロントのスタッフは近くのレストランへの道を尋ねた際、とても親切に対応してくれました。唯一の欠点は、夜間のWi-Fi接続が遅く、仕事を終わらせるのが大変だったことです。全体として、特に予算重視の他の出張者にこのホテルをお勧めします。\n\n— 認証済み宿泊者による投稿",
    questions:[
      {q:"What did the guest like about the hotel?",choices:["The Wi-Fi speed","The helpful staff","The low price only","The pool"],ans:1,exp:"フロントスタッフが親切だったと述べている。"},
      {q:"What problem did the guest experience?",choices:["Noisy neighbors","Slow Wi-Fi in the evenings","A billing error","A dirty room"],ans:1,exp:"夜間のWi-Fiが遅かったとある。"},
      {q:"Who would the guest recommend the hotel to?",choices:["Families with children","Business travelers on a budget","Luxury travelers","Long-term residents"],ans:1,exp:"予算重視の出張者に勧めるとある。"}
    ]
  },
  {
    id:8,
    title:"スケジュール表",
    type:"schedule",
    passage:`ANNUAL SALES CONFERENCE — SCHEDULE

Day 1 (Monday, September 9)
9:00 A.M. — Registration and welcome coffee
10:00 A.M. — Opening keynote: "Market Trends 2026"
1:00 P.M. — Breakout sessions
6:00 P.M. — Networking dinner

Day 2 (Tuesday, September 10)
9:00 A.M. — Workshop: "Effective Client Communication"
12:00 P.M. — Lunch break
2:00 P.M. — Panel discussion
4:30 P.M. — Closing remarks and awards ceremony

Note: All sessions will be held in the Grand Ballroom unless otherwise noted.`,
    passageJa:"年次営業会議 — スケジュール\n\n1日目（9月9日月曜日）\n午前9時 — 受付・ウェルカムコーヒー／午前10時 — 開会基調講演「2026年市場動向」／午後1時 — 分科会／午後6時 — 懇親ディナー\n\n2日目（9月10日火曜日）\n午前9時 — ワークショップ「効果的な顧客コミュニケーション」／正午 — 昼休憩／午後2時 — パネルディスカッション／午後4時30分 — 閉会の挨拶・表彰式\n\n注：特に記載がない限り、すべてのセッションはグランドボールルームで開催されます。",
    questions:[
      {q:"What happens at 10:00 A.M. on Day 1?",choices:["Registration","The opening keynote","Lunch","A workshop"],ans:1,exp:"午前10時は開会基調講演。"},
      {q:"What is scheduled for 6:00 P.M. on Day 1?",choices:["A workshop","A networking dinner","A panel discussion","Registration"],ans:1,exp:"午後6時は懇親ディナー。"},
      {q:"What takes place at the end of Day 2?",choices:["Registration","A keynote speech","An awards ceremony","A networking dinner"],ans:2,exp:"2日目の最後は表彰式。"}
    ]
  },
  {
    id:9,
    title:"手紙（ビジネスレター）",
    type:"letter",
    passage:`Dear Mr. Anderson,

Thank you for your inquiry regarding our office furniture catalog. I have enclosed our latest price list, which includes a 10% discount for orders placed before the end of this month.

Please note that delivery typically takes two to three weeks for standard items, and custom orders may take longer. If you have any questions about specific products, feel free to contact our sales team directly.

We look forward to the possibility of working with your company.

Sincerely,
Rachel Kim
Sales Representative, Modern Office Supplies`,
    passageJa:"Anderson様\n\n弊社のオフィス家具カタログへのお問い合わせをいただき、ありがとうございます。最新の価格表を同封いたしました。今月末までにご注文いただくと10%の割引が適用されます。\n\n標準品の配送には通常2〜3週間かかりますが、特注品はさらに時間がかかる場合がございます。特定の製品についてご質問があれば、営業チームに直接お問い合わせください。\n\n貴社とお取引できることを楽しみにしております。\n\n敬具\nRachel Kim\nModern Office Supplies 営業担当",
    questions:[
      {q:"What is enclosed with the letter?",choices:["A product sample","A price list","A contract","A warranty card"],ans:1,exp:"最新の価格表が同封されている。"},
      {q:"How can customers receive a 10% discount?",choices:["By ordering before the end of the month","By ordering online only","By ordering in bulk","By paying in cash"],ans:0,exp:"今月末までの注文で10%割引とある。"},
      {q:"How long does delivery of standard items typically take?",choices:["One week","Two to three weeks","One month","Same day"],ans:1,exp:"標準品の配送は通常2〜3週間。"}
    ]
  },
  {
    id:10,
    title:"製品説明",
    type:"product",
    passage:`EcoBrew Coffee Maker — Model X200

The EcoBrew X200 combines convenience with energy efficiency. This coffee maker automatically shuts off after 30 minutes to save power, and its reusable filter reduces paper waste. The 12-cup capacity is ideal for offices or family use.

Features:
- Programmable timer for automatic brewing
- Dishwasher-safe removable parts
- One-year manufacturer's warranty

Available now at select retailers for $79.99.`,
    passageJa:"EcoBrewコーヒーメーカー — モデルX200\n\nEcoBrew X200は利便性と省エネ性を兼ね備えています。このコーヒーメーカーは30分後に自動的に電源が切れて節電し、再利用可能なフィルターが紙ごみを減らします。12カップの容量はオフィスやご家庭での使用に最適です。\n\n特徴：\n・自動抽出用のプログラムタイマー\n・食洗機対応の取り外し可能パーツ\n・メーカー1年保証\n\n現在、一部の小売店で79.99ドルにて発売中です。",
    questions:[
      {q:"What is one feature of the EcoBrew X200?",choices:["A five-year warranty","An automatic shutoff after 30 minutes","A built-in grinder","A smartphone app"],ans:1,exp:"30分後に自動的に電源が切れると記載。"},
      {q:"What is the capacity of this coffee maker?",choices:["6 cups","12 cups","20 cups","4 cups"],ans:1,exp:"12カップの容量と記載。"},
      {q:"How long is the manufacturer's warranty?",choices:["Six months","One year","Two years","Five years"],ans:1,exp:"1年保証と記載。"}
    ]
  },
  {
    id:11,
    title:"社内テキストメッセージ",
    type:"textmessage",
    passage:`Kevin (10:15 A.M.): Hey, are you still coming to the 11 o'clock meeting?

Sandra (10:17 A.M.): Yes, but I might be a few minutes late. I'm finishing up a call with a supplier.

Kevin (10:18 A.M.): No problem. I'll let the others know and save you a seat.

Sandra (10:19 A.M.): Thanks! Also, can you bring a copy of the budget spreadsheet?

Kevin (10:20 A.M.): Sure thing, I'll print one out now.`,
    passageJa:"Kevin（午前10時15分）：やあ、11時の会議にはまだ来る予定？\n\nSandra（午前10時17分）：はい、でも数分遅れるかもしれません。今、仕入先との電話を終えているところです。\n\nKevin（午前10時18分）：問題ないよ。他の人には伝えておいて、席を確保しておくね。\n\nSandra（午前10時19分）：ありがとう！あと、予算のスプレッドシートのコピーを持ってきてもらえる？\n\nKevin（午前10時20分）：もちろん、今すぐ1部印刷するよ。",
    questions:[
      {q:"Why might Sandra be late to the meeting?",choices:["She is stuck in traffic","She is on a call with a supplier","She is out of the office","Her computer is broken"],ans:1,exp:"仕入先との電話を終えているところだと述べている。"},
      {q:"What does Kevin offer to do for Sandra?",choices:["Cancel the meeting","Save her a seat","Reschedule the call","Drive her to work"],ans:1,exp:"席を確保しておくと申し出ている。"},
      {q:"What does Sandra ask Kevin to bring?",choices:["A laptop","A copy of the budget spreadsheet","Coffee for everyone","A projector"],ans:1,exp:"予算のスプレッドシートのコピーを頼んでいる。"}
    ]
  },
  {
    id:12,
    title:"求人情報（第2弾）",
    type:"ad",
    passage:`Warehouse Supervisor — Full-Time

Global Logistics Co. is hiring an experienced Warehouse Supervisor to oversee daily operations at our downtown facility. Candidates should have at least three years of warehouse management experience and strong leadership skills.

Duties include managing a team of 15 staff, tracking inventory levels, and ensuring safety compliance. This position offers a starting salary of $55,000 per year plus benefits.

Interested candidates should apply through our website by August 15.`,
    passageJa:"倉庫管理責任者 — フルタイム\n\nGlobal Logistics社は、ダウンタウンの施設で日々の業務を統括する経験豊富な倉庫管理責任者を募集しています。候補者には最低3年間の倉庫管理経験と優れたリーダーシップ能力が求められます。\n\n業務内容には15名のスタッフの管理、在庫レベルの追跡、安全遵守の確保が含まれます。このポジションの初任給は年間55,000ドルに加え福利厚生が付きます。\n\n応募希望者は8月15日までに弊社ウェブサイトよりご応募ください。",
    questions:[
      {q:"How many years of experience are required?",choices:["One year","Three years","Five years","Ten years"],ans:1,exp:"最低3年間の経験が必要と記載。"},
      {q:"How many staff will the supervisor manage?",choices:["5","10","15","20"],ans:2,exp:"15名のスタッフを管理すると記載。"},
      {q:"How should candidates apply?",choices:["By mail","In person","Through the website","By phone"],ans:2,exp:"ウェブサイトから応募するよう記載。"}
    ]
  },
  {
    id:13,
    title:"社内お知らせ（第2弾）",
    type:"memo",
    passage:`TO: All Staff
FROM: Human Resources
SUBJECT: New Health Insurance Provider

Starting next month, our company will switch to a new health insurance provider, HealthFirst. All employees will receive new insurance cards by mail before the transition date.

An information session will be held in the main conference room on the 20th to answer any questions about the new plan. Attendance is optional but strongly recommended.

Please contact HR at ext. 150 with any questions.`,
    passageJa:"宛先：全スタッフ／差出人：人事部／件名：新しい健康保険会社について\n\n来月より、弊社は新しい健康保険会社HealthFirstに切り替えます。全従業員には移行日前に新しい保険証が郵送されます。\n\n新プランに関するご質問にお答えするための説明会が20日にメイン会議室で開催されます。出席は任意ですが強く推奨します。\n\nご質問は内線150の人事部までご連絡ください。",
    questions:[
      {q:"What is changing next month?",choices:["The office location","The health insurance provider","The company logo","The work schedule"],ans:1,exp:"健康保険会社が変更になると記載。"},
      {q:"How will employees receive new insurance cards?",choices:["By email","By mail","In person","Through an app"],ans:1,exp:"郵送されると記載。"},
      {q:"Is attendance at the information session required?",choices:["Yes, mandatory","No, but recommended","Only for managers","Only for new hires"],ans:1,exp:"任意だが強く推奨されると記載。"}
    ]
  },
  {
    id:14,
    title:"通知文（第2弾）",
    type:"notice",
    passage:`NOTICE: Temporary Office Closure

Our office will be closed on Friday, October 3, for a company-wide training event. All staff are required to attend the training, which will be held off-site at the Riverside Conference Center.

Regular office hours will resume on Monday, October 6. Clients with urgent matters during the closure should email support@company.com, and a team member will respond within 24 hours.

We apologize for any inconvenience.`,
    passageJa:"お知らせ：オフィス一時休業について\n\n弊社は10月3日金曜日、全社研修イベントのため休業いたします。全スタッフは社外のRiverside会議センターで開催される研修への参加が必須です。\n\n通常の営業時間は10月6日月曜日から再開します。休業期間中に緊急のご用件があるお客様は support@company.com までメールをお送りください。担当者が24時間以内に返信いたします。\n\nご不便をおかけしますことをお詫び申し上げます。",
    questions:[
      {q:"Why will the office be closed?",choices:["A holiday","A company-wide training event","A power outage","A renovation"],ans:1,exp:"全社研修イベントのためと記載。"},
      {q:"Where will the training be held?",choices:["At the main office","Off-site at a conference center","Online","At a client's office"],ans:1,exp:"社外の会議センターで開催されると記載。"},
      {q:"How should clients contact the company during the closure?",choices:["By phone","By email","In person","By fax"],ans:1,exp:"メールで連絡するよう案内されている。"}
    ]
  },
  {
    id:15,
    title:"新聞記事（第2弾）",
    type:"article",
    passage:`Tech Startup Secures Major Investment

Innovatech, a local software startup, announced this week that it has secured $5 million in funding from a group of investors. The company, founded just two years ago, develops project management tools for small businesses.

CEO James Park stated that the funding will be used to hire additional engineers and expand marketing efforts. The company currently employs 25 people and plans to double its workforce within the next year.

Analysts say the investment reflects growing confidence in software solutions tailored for small businesses.`,
    passageJa:"テック系スタートアップが大型投資を獲得\n\n地元のソフトウェアスタートアップ企業Innovatechは今週、投資家グループから500万ドルの資金調達に成功したと発表した。わずか2年前に設立されたこの会社は、中小企業向けのプロジェクト管理ツールを開発している。\n\nJames Park CEOは、この資金は追加のエンジニア採用とマーケティング活動の拡大に使われると述べた。同社は現在25名を雇用しており、今後1年以内に従業員数を倍増させる計画だ。\n\nアナリストは、この投資は中小企業向けソフトウェアソリューションへの信頼の高まりを反映していると指摘している。",
    questions:[
      {q:"How much funding did Innovatech secure?",choices:["$1 million","$5 million","$10 million","$500,000"],ans:1,exp:"500万ドルの資金調達と記載。"},
      {q:"What will the funding be used for?",choices:["Office renovation","Hiring engineers and marketing","Paying off debt","Opening a new office"],ans:1,exp:"エンジニア採用とマーケティングに使われると記載。"},
      {q:"How many employees does the company plan to have within a year?",choices:["25","50","75","100"],ans:1,exp:"現在25名を倍増させる計画なので約50名。"}
    ]
  }
];
