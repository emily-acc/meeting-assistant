export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, apiKey } = req.body;

  if (!text || !apiKey) {
    return res.status(400).json({ error: 'Missing text or apiKey' });
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `請解析以下會議邀請文本，並提取以下信息（如果存在）。以 JSON 格式回傳：
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
${text}`
          }]
        }]
      })
    });

    const data = await response.json();

    // 從 Gemini 回應中提取內容
    let parsedEvents = [];
    
    try {
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // 嘗試從回應中提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsedEvents = parsed.events || [];
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
    }

    // 確保時間格式正確
    parsedEvents = parsedEvents.map(event => ({
      ...event,
      startTime: new Date(event.startTime).toISOString(),
      duration: event.duration || 60
    }));

    res.status(200).json({ events: parsedEvents });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to parse meeting' });
  }
}
