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
      prompt = `【重要】今天日期是 ${new Date().toISOString().split('T')[0]}

請解析以下工作項目文本。文本格式：每行一個任務，用「｜」分隔。

支持的格式（任選一個）：
- 日期時間｜任務名稱｜詳情
- 任務名稱｜日期時間｜詳情
- 人名｜日期時間｜任務

識別規則：
1. 相對日期轉換（例：下週三 → 實際日期）
2. 時間格式：11:00、15:00 等
3. 循環規則：每周、每月、每年（如果有提及）

以 JSON 格式回傳，只回傳 JSON，不要其他文字：
{
  "tasks": [
    {
      "title": "任務名稱（重點、簡潔）",
      "date": "YYYY-MM-DD",
      "recurring": "不循環 / 每周 / 每月 / 每年",
      "priority": "高 / 中 / 低"
    }
  ]
}

工作項目文本：
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
