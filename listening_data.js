// TOEIC600点対策 リスニング問題データ（Web Speech APIで読み上げ）
const LISTENING_DATA = [
  // Part2形式: 質問→応答選択
  {id:1,part:2,audio:"Where is the conference room located?",choices:["It's on the third floor.","At three o'clock.","Yes, I attended it."],ans:0,exp:"場所を尋ねるWhere疑問文には場所で答える。"},
  {id:2,part:2,audio:"When does the store open?",choices:["Near the station.","At nine in the morning.","It's quite large."],ans:1,exp:"時間を尋ねるWhen疑問文には時間で答える。"},
  {id:3,part:2,audio:"Who is in charge of the marketing project?",choices:["Last Monday.","Sarah is.","In the meeting room."],ans:1,exp:"人を尋ねるWho疑問文には人物で答える。"},
  {id:4,part:2,audio:"Could you send me the report by tomorrow?",choices:["Sure, no problem.","It's on the desk.","I went there yesterday."],ans:0,exp:"依頼に対する応答は承諾か拒否。Sure, no problemが自然。"},
  {id:5,part:2,audio:"Why was the meeting postponed?",choices:["For two hours.","Because the manager was sick.","On the second floor."],ans:1,exp:"理由を尋ねるWhy疑問文にはBecauseで答える。"},
  {id:6,part:2,audio:"How long will the project take?",choices:["About three months.","Yes, it will.","In the office."],ans:0,exp:"期間を尋ねるHow long疑問文には期間で答える。"},
  {id:7,part:2,audio:"Did you receive my email about the schedule change?",choices:["Yes, I did.","It's very expensive.","Next Friday."],ans:0,exp:"Did you ~?の疑問文にはYes/Noで答える。"},
  {id:8,part:2,audio:"What time does the train leave?",choices:["From platform five.","At seven thirty.","It's quite fast."],ans:1,exp:"時刻を尋ねるWhat time疑問文には時刻で答える。"},
  {id:9,part:2,audio:"Isn't the new printer working properly?",choices:["No, it's still broken.","I bought it last week.","It's on sale."],ans:0,exp:"否定疑問文にも通常のYes/Noの論理で答える。"},
  {id:10,part:2,audio:"Would you like coffee or tea?",choices:["I'll take coffee, please.","Yes, I would.","At the cafe downstairs."],ans:0,exp:"選択疑問文にはどちらかを選んで答える。"},
  // Part3形式: 短い会話
  {
    id:11,part:3,
    audio:"Man: Excuse me, do you know where the nearest ATM is? Woman: Yes, there's one right around the corner, next to the coffee shop.",
    q:"What is the man looking for?",
    choices:["A coffee shop","An ATM","A bank","A restaurant"],
    ans:1,exp:"男性はATMの場所を尋ねている。"
  },
  {
    id:12,part:3,
    audio:"Woman: I heard the budget meeting got moved to Thursday. Man: Really? I thought it was on Wednesday. I need to update my calendar.",
    q:"What does the man need to do?",
    choices:["Cancel the meeting","Update his calendar","Call the client","Print the report"],
    ans:1,exp:"男性は予定を更新する必要があると言っている。"
  },
  {
    id:13,part:3,
    audio:"Man: Have you finished the presentation slides for tomorrow? Woman: Almost. I just need to add the sales figures from last month.",
    q:"What does the woman still need to do?",
    choices:["Print the slides","Add sales figures","Book a room","Email the client"],
    ans:1,exp:"女性は先月の売上数値を追加する必要があると言っている。"
  },
  {
    id:14,part:3,
    audio:"Woman: The shipment from our supplier hasn't arrived yet. Man: I'll call them right now to check on the delivery status.",
    q:"What will the man do next?",
    choices:["Cancel the order","Call the supplier","Visit the warehouse","Write a report"],
    ans:1,exp:"男性は今すぐ供給業者に電話すると言っている。"
  },
  {
    id:15,part:3,
    audio:"Man: Can you help me set up the projector for the client presentation? Woman: Sure, but I'll need a few minutes to find the right cable.",
    q:"What does the woman need to find?",
    choices:["A cable","A document","A chair","A microphone"],
    ans:0,exp:"女性は適切なケーブルを探す必要があると言っている。"
  }
];
