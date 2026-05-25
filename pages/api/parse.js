export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, apiKey, type } = req.body;

  if (!text || !apiKey) {
    return res.status(400).json({ error: 'Missing text or apiKey' });
  }

  try {
    let prompt = '';

    if (type === 'meeting') {
      prompt = `請解析以下會議邀請文本，並提取以下信息（如果存在）。以 JSON 格式回傳：
{
  "events": [
    {
      "title": "會議名稱",
      "startTime": "ISO 8601 格式的開始時間",
      "duration": 60,
      "platform": "Webex/Zoom/Teams/Google Meet/其他",
      "link": "加入鏈接（如果有）",
      "password": "會議密碼（如果有）",
      "hostKey": "主持人金鑰（如果有）",
      "description": "會議描述或備註"
    }
  ]
}

會議邀請文本：
${text}`;
    } else if (type === 'tasks') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const todayDay = today.getDay();
      
      // 計算下週各日期
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + (1 - todayDay + 7) % 7 || 7);
      
      const weekDates = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(nextMonday);
        d.setDate(d.getDate() + i);
        const dayName = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
        weekDates[`下週${dayName}`] = d.toISOString().split('T')[0];
      }
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0];
      
      prompt = `【重要】今天是 ${todayStr}

你是一個聰明的工作項目識別助手。請從以下文本中提取所有工作項目、任務、面試等事項。

識別規則：
1. 任務關鍵詞：面試、會議、開會、截止、提交、報告、審核、確認、跟進、通知、完成、準備、整理、檢查、遞交、回覆、交付、核對 等
2. 時間格式識別：
   - 相對日期轉換（下週 XX）：
     下週一 → ${weekDates['下週一']}
     下週二 → ${weekDates['下週二']}
     下週三 → ${weekDates['下週三']}
     下週四 → ${weekDates['下週四']}
     下週五 → ${weekDates['下週五']}
     下週六 → ${weekDates['下週六']}
     下週日 → ${weekDates['下週日']}
   - 相對日期轉換（其他）：
     明天 → ${tomorrowStr}
     後天 → ${dayAfterTomorrowStr}
   - 時間格式：11:00、下午3點、早上11:00、下午15:00、3:00 PM 等
3. 優先級判斷：
   - 關鍵詞「緊急」「趕快」「立即」→ 高優先級
   - 有日期、有截止時間 → 中優先級
   - 其他 → 低優先級

提取原則：
- 任務名稱簡潔（包含人名、地點等重要信息）
- 如果只有時間沒有日期，假設是今天
- 多個任務則每個提取一次
- 如果提及每週、每月重複，標註循環規則

以 JSON 格式回傳，只回傳 JSON，不要其他文字。

{
  "tasks": [
    {
      "title": "簡潔的任務名稱（包含關鍵人名/地點）",
      "date": "YYYY-MM-DD",
      "recurring": "不循環 / 每周 / 每月 / 每年",
      "priority": "高 / 中 / 低"
    }
  ]
}

文本：
${text}`;
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    const data = await response.json();
    let result = { events: [], tasks: [] };

    try {
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (type === 'meeting' && parsed.events) {
          result.events = parsed.events.map(event => ({
            ...event,
            startTime: new Date(event.startTime).toISOString(),
            duration: event.duration || 60
          }));
        } else if (type === 'tasks' && parsed.tasks) {
          result.tasks = parsed.tasks.filter(task => task.title && task.date);
        }
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to parse' });
  }
}
