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
  },
  // Part2形式（追加）
  {id:16,part:2,audio:"Where should I submit the expense report?",choices:["To the accounting department.","Around noon.","It was expensive."],ans:0,exp:"場所を尋ねるWhereには場所で答える。"},
  {id:17,part:2,audio:"When is the new product launching?",choices:["In the warehouse.","Next Tuesday.","By the sales team."],ans:1,exp:"時を尋ねるWhenには時で答える。"},
  {id:18,part:2,audio:"Who approved this purchase order?",choices:["The finance director.","On the third floor.","Two weeks ago."],ans:0,exp:"人を尋ねるWhoには人物で答える。"},
  {id:19,part:2,audio:"How much does the annual membership cost?",choices:["About two hundred dollars.","In the lobby.","Every month."],ans:0,exp:"金額を尋ねるHow muchには金額で答える。"},
  {id:20,part:2,audio:"Which printer should I use for this document?",choices:["The one near the entrance.","I printed it yesterday.","It's out of paper."],ans:0,exp:"どれかを尋ねるWhichには具体的な選択で答える。"},
  {id:21,part:2,audio:"Could you double-check these figures before I send them?",choices:["Of course, give me a minute.","They are on the shelf.","I called him already."],ans:0,exp:"依頼への応答は承諾か拒否。Of courseが自然な承諾。"},
  {id:22,part:2,audio:"Isn't the conference room booked for two o'clock?",choices:["Yes, it is.","No, it's too small.","At the front desk."],ans:0,exp:"否定疑問文も通常のYes/Noの論理で答える。"},
  {id:23,part:2,audio:"Have you finished reviewing the contract yet?",choices:["Not yet, I'll finish it today.","It's a long contract.","She signed it."],ans:0,exp:"Have you ~?の疑問文にはYes/Noで答える。"},
  {id:24,part:2,audio:"Would you rather have the meeting in person or online?",choices:["In person would be better.","At three o'clock.","In the main office."],ans:0,exp:"選択疑問文にはどちらかを選んで答える。"},
  {id:25,part:2,audio:"Why did the shipment get delayed?",choices:["Because of a customs issue.","For three days.","At the port."],ans:0,exp:"理由を尋ねるWhyにはBecauseで答える。"},
  {id:26,part:2,audio:"How often does the newsletter get sent out?",choices:["Once a month.","By email.","To all subscribers."],ans:0,exp:"頻度を尋ねるHow oftenには頻度で答える。"},
  {id:27,part:2,audio:"What's the best way to contact the supplier?",choices:["You can email them directly.","They are reliable.","Last Monday."],ans:0,exp:"方法を尋ねるWhat's the best way toには方法で答える。"},
  {id:28,part:2,audio:"Don't you think we should hire more staff?",choices:["Yes, I agree.","In the break room.","Two years ago."],ans:0,exp:"否定疑問文にも通常のYes/Noの論理で答える。"},
  {id:29,part:2,audio:"Are you attending the workshop next week?",choices:["Yes, I signed up already.","It's a useful skill.","At the training center."],ans:0,exp:"Are you ~?の疑問文にはYes/Noで答える。"},
  {id:30,part:2,audio:"Who's going to give the closing remarks?",choices:["The CEO will.","At the end of the day.","In the main hall."],ans:0,exp:"人を尋ねるWho'sには人物で答える。"},
  // Part3形式（追加）
  {
    id:31,part:3,
    audio:"Woman: Did you get a chance to look at the quarterly figures? Man: Not yet, but I'll review them this afternoon and send you feedback.",
    q:"What will the man do this afternoon?",
    choices:["Attend a meeting","Review the figures","Call a client","Book a flight"],
    ans:1,exp:"男性はこの午後、数字を見直すと言っている。"
  },
  {
    id:32,part:3,
    audio:"Man: The printer on the second floor is out of toner again. Woman: I'll order a replacement cartridge right away.",
    q:"What is the woman going to do?",
    choices:["Fix the printer herself","Order a new cartridge","Move the printer","Call a technician"],
    ans:1,exp:"女性は新しいカートリッジをすぐ注文すると言っている。"
  },
  {
    id:33,part:3,
    audio:"Woman: I'm concerned the venue might be too small for all the guests. Man: Let's check the guest list and confirm the capacity today.",
    q:"What are the speakers mainly discussing?",
    choices:["A venue's capacity","A catering menu","A flight schedule","A hiring decision"],
    ans:0,exp:"会場の収容人数について話している。"
  },
  {
    id:34,part:3,
    audio:"Man: Have the new business cards arrived yet? Woman: Yes, they came this morning, but the phone number is incorrect.",
    q:"What problem does the woman mention?",
    choices:["The cards arrived late","The phone number is wrong","The cards were too expensive","The design was rejected"],
    ans:1,exp:"女性は電話番号が間違っていると言っている。"
  },
  {
    id:35,part:3,
    audio:"Woman: Could you send me the slides before the presentation tomorrow? Man: Sure, I'll email them to you tonight.",
    q:"When will the man send the slides?",
    choices:["Tomorrow morning","Tonight","Next week","During the presentation"],
    ans:1,exp:"男性は今夜メールで送ると言っている。"
  },
  {
    id:36,part:3,
    audio:"Man: I heard the office is moving to a new building next month. Woman: That's right, and I'm helping coordinate the move.",
    q:"What is the woman helping with?",
    choices:["Hiring new staff","Coordinating the office move","Planning a conference","Writing a report"],
    ans:1,exp:"女性は引っ越しの調整を手伝っていると言っている。"
  },
  {
    id:37,part:3,
    audio:"Woman: The client wants to reschedule our call to Thursday. Man: That works for me, I'll update the calendar.",
    q:"What will the man do next?",
    choices:["Cancel the call","Update the calendar","Call the client","Book a flight"],
    ans:1,exp:"男性はカレンダーを更新すると言っている。"
  },
  {
    id:38,part:3,
    audio:"Man: This copier keeps jamming. Should we call for repairs? Woman: Let's just replace it, it's over ten years old.",
    q:"What does the woman suggest?",
    choices:["Repairing the copier","Replacing the copier","Buying more paper","Moving the copier"],
    ans:1,exp:"女性はコピー機を交換することを提案している。"
  },
  {
    id:39,part:3,
    audio:"Woman: Our flight got delayed by two hours. Man: Let's let the hotel know we'll be arriving later than planned.",
    q:"What will the speakers do?",
    choices:["Cancel the hotel reservation","Notify the hotel of the delay","Book a different flight","Request a refund"],
    ans:1,exp:"ホテルに到着が遅れることを知らせようとしている。"
  },
  {
    id:40,part:3,
    audio:"Man: We're almost out of promotional flyers for the trade show. Woman: I'll print another batch this afternoon.",
    q:"What will the woman do this afternoon?",
    choices:["Attend the trade show","Print more flyers","Design a new flyer","Order supplies"],
    ans:1,exp:"女性は午後に追加のチラシを印刷すると言っている。"
  },
  // Part4形式: 短いアナウンス・トーク
  {
    id:41,part:4,
    audio:"Attention all passengers. Flight 205 to Chicago has been delayed due to weather conditions. The new departure time is 3:45 P.M. We apologize for the inconvenience and appreciate your patience.",
    q:"Why has the flight been delayed?",
    choices:["Mechanical problems","Weather conditions","A staff shortage","A security issue"],
    ans:1,exp:"天候のためと述べられている。"
  },
  {
    id:42,part:4,
    audio:"Welcome to Riverside Mall. Please note that the north parking garage will be closed for maintenance this weekend. Shoppers are encouraged to use the south garage instead. Thank you for your understanding.",
    q:"What should shoppers do this weekend?",
    choices:["Avoid the mall entirely","Use the south parking garage","Park on the street","Take public transportation"],
    ans:1,exp:"南側の駐車場を使うよう案内されている。"
  },
  {
    id:43,part:4,
    audio:"This is a reminder that the annual staff meeting will begin at ten o'clock in the main conference room. All department heads are required to bring their quarterly reports.",
    q:"What are department heads asked to bring?",
    choices:["Their laptops","Quarterly reports","Business cards","Name badges"],
    ans:1,exp:"部門長は四半期報告書を持参するよう求められている。"
  },
  {
    id:44,part:4,
    audio:"Thank you for calling Bright Solutions customer support. Our office hours are Monday through Friday, nine to five. If this is an emergency, please press one to speak with a representative.",
    q:"What should a caller do in an emergency?",
    choices:["Leave a voicemail","Press one","Call back later","Send an email"],
    ans:1,exp:"緊急の場合は1を押すよう案内されている。"
  },
  {
    id:45,part:4,
    audio:"Good morning, everyone. Before we begin today's training session, please make sure your name tags are visible and your phones are on silent. The session will last approximately two hours.",
    q:"How long will the training session last?",
    choices:["About one hour","About two hours","All day","Thirty minutes"],
    ans:1,exp:"約2時間続くと述べられている。"
  }
];
