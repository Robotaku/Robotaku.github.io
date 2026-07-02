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
  }
];
