export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  // 識別會議/工作項目
  const meeting = {
    title: '',
    startTime: '',
    endTime: '',
    date: new Date().toISOString().split('T')[0],
    platform: '',
    link: '',
    organizer: '',
    password: '',
    location: '',
    type: 'meeting' // 'meeting' 或 'task'
  };

  // 判斷類型
  if (text.includes('面試') || text.includes('104') || text.includes('招聘')) {
    meeting.type = 'task';
  }

  // 提取標題
  const titleMatch = text.match(/【(.+?)】|^(.{2,30}?)[，,。]/m);
  if (titleMatch) {
    meeting.title = titleMatch[1] || titleMatch[2];
  }

  // 提取人名
  const nameMatch = text.match(/([林王陳李張劉黃吳周郭何高施曾彭]\w{1,2})/);
  if (nameMatch && !meeting.title) {
    meeting.title = nameMatch[1] + (meeting.type === 'task' ? '面試' : '會議');
  }

  // 提取地點
  const locationMatch = text.match(/到(\S+?)[廠場室間區]/);
  if (locationMatch) {
    meeting.location = locationMatch[1] + locationMatch[2];
  }

  // 提取時間
  const ampmMatch = text.match(/(早上|上午|中午|下午|晚上)(\d{1,2})[點:：](\d{0,2})/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[2]);
    const min = ampmMatch[3] || '00';
    const period = ampmMatch[1];
    
    if (period === '下午' || period === '晚上') {
      if (hour < 12) hour += 12;
    }
    if (period === '早上' || period === '上午') {
      if (hour === 12) hour = 0;
    }
    
    meeting.startTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  } else {
    const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      meeting.startTime = `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
    }
  }

  // 提取日期
  const explicitDateMatch = text.match(/(\d{1,2})\/(\d{1,2})/);
  if (explicitDateMatch) {
    const month = String(explicitDateMatch[1]).padStart(2, '0');
    const day = String(explicitDateMatch[2]).padStart(2, '0');
    const year = new Date().getFullYear();
    meeting.date = `${year}-${month}-${day}`;
  } else {
    const relativeMatch = text.match(/下週([一二三四五六日])|明天|後天|今天/);
    if (relativeMatch) {
      const today = new Date();
      let targetDate = new Date(today);
      
      if (relativeMatch[0] === '明天') {
        targetDate.setDate(today.getDate() + 1);
      } else if (relativeMatch[0] === '後天') {
        targetDate.setDate(today.getDate() + 2);
      } else if (relativeMatch[1]) {
        const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0 };
        const targetDay = dayMap[relativeMatch[1]];
        const daysUntilTarget = (targetDay - today.getDay() + 7) % 7 || 7;
        targetDate.setDate(today.getDate() + 7 + daysUntilTarget);
      }
      
      meeting.date = targetDate.toISOString().split('T')[0];
    }
  }

  // 提取平台
  if (text.includes('Webex')) meeting.platform = 'Webex';
  else if (text.includes('Teams')) meeting.platform = 'Teams';
  else if (text.includes('Zoom')) meeting.platform = 'Zoom';
  else if (text.includes('Google Meet')) meeting.platform = 'Google Meet';
  else if (text.includes('104')) meeting.platform = '104';

  // 提取鏈接
  const linkMatch = text.match(/(https?:\/\/[^\s]+)/);
  if (linkMatch) meeting.link = linkMatch[1];

  // 提取組織者
  const orgMatch = text.match(/([林王陳李張劉黃吳周郭何高施曾彭]\w{1,2})/);
  if (orgMatch) meeting.organizer = orgMatch[1];

  // 提取密碼
  const pwMatch = text.match(/密碼[：:]\s*(\S+)|會議號碼[：:]\s*(\d+)|(\d{6})/);
  if (pwMatch) meeting.password = pwMatch[1] || pwMatch[2] || pwMatch[3];

  res.status(200).json(meeting);
}
