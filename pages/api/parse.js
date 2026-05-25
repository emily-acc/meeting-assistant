function getNextWednesday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const daysAhead = (3 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

function getNextFriday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const daysAhead = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

function getTomorrow(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getDayAfterTomorrow(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 2);
  return d.toISOString().split('T')[0];
}

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
      const tomorrow = getTomorrow(today);
      const dayAfterTomorrow = getDayAfterTomorrow(today);
      const nextWednesday = getNextWednesday(today);
      const nextFriday = getNextFriday(today);
      
      prompt = `你是一個任務識別助手。從文本中提取所有工作任務、面試、會議等事項。

【必須的識別規則】
1. 時間詞：早上、下午、11:00、15:00、上午10點、下午3點 等
2. 日期詞：下週一/二/三/四/五/六、明天、後天、下個月、這週五 等  
3. 人名：林珍伊、林宣晴、王小明 等
4. 任務詞：面試、會議、開會、截止、提交、報告、審核、通知、確認、提供、跟進、完成 等
5. 地點：永寧廠、台北辦公室、線上 等

【日期轉換表】
- 今天：${todayStr}
- 明天：${tomorrow}
- 後天：${dayAfterTomorrow}
- 下週三：${nextWednesday}
- 下週五：${nextFriday}

【提取原則】
- 每一個任務獨立提取
- 任務名稱要簡潔（包含人名、地點等關鍵信息）
- 時間和日期必須一起識別
- 如果只有時間沒日期，用今天日期
- 優先級判斷：
  * 包含「緊急」「立即」「趕快」 → 高
  * 有具體日期和時間 → 中
  * 其他 → 低

【輸出規則】
只輸出 JSON，不要其他文字。如果找不到任務，輸出 {"tasks": []}

{
  "tasks": [
    {
      "title": "任務名稱（包含人名/地點）",
      "date": "YYYY-MM-DD",
      "recurring": "不循環 / 每周 / 每月 / 每年",
      "priority": "高 / 中 / 低"
    }
  ]
}

【文本內容】
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
        try {
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
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          result = { events: [], tasks: [] };
        }
      }
    } catch (parseError) {
      console.error('Regex/parse error:', parseError);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to parse' });
  }
}
