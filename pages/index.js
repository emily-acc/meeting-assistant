import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [meetings, setMeetings] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: '貼入 Webex/Teams/Zoom 會議或面試信息，我會自動識別並添加。' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // 登入
  const handleLogin = () => {
    if (password === '123') {
      setIsLoggedIn(true);
      setPasswordError('');
      localStorage.setItem('loggedIn', 'true');
    } else {
      setPasswordError('密碼錯誤');
    }
  };

  // 載入數據
  useEffect(() => {
    const loggedIn = localStorage.getItem('loggedIn');
    if (loggedIn) setIsLoggedIn(true);
    
    const savedMeetings = localStorage.getItem('meetings');
    if (savedMeetings) setMeetings(JSON.parse(savedMeetings));
  }, []);

  // 保存數據
  useEffect(() => {
    localStorage.setItem('meetings', JSON.stringify(meetings));
  }, [meetings]);

  // 識別會議/工作項目
  const parseMeetingText = (text) => {
    const meeting = {
      id: Date.now(),
      title: '',
      startTime: '',
      endTime: '',
      date: new Date().toISOString().split('T')[0],
      platform: '',
      link: '',
      organizer: '',
      password: '',
      location: '',
      notes: text
    };

    // 提取標題（優先級：【標題】> 人名 > 第一句話）
    const titleMatch = text.match(/【(.+?)】|^(.{2,30}?)[，,。]/m);
    if (titleMatch) {
      meeting.title = titleMatch[1] || titleMatch[2];
    }

    // 提取人名
    const nameMatch = text.match(/([林王陳李張劉黃吳周郭何高施曾彭]\w{1,2})[，。\n]/);
    if (nameMatch && !meeting.title) {
      meeting.title = nameMatch[1] + '面試';
    }

    // 提取地點
    const locationMatch = text.match(/到(\S+?)[廠場室間區]/);
    if (locationMatch) meeting.location = locationMatch[1] + locationMatch[2];

    // 提取時間（支持多種格式）
    // 格式：下午3點、下午15:00、下午3點、15:00、3:00、5/28等
    
    // 先處理 "下午/早上" 格式
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
      // 直接提取時間格式 HH:MM 或 H:MM
      const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        meeting.startTime = `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
      }
    }

    // 提取日期（支持多種格式）
    // 格式：5/28、5/28、下週三、明天、後天等
    
    // 明確日期格式 (MM/DD 或 M/DD)
    const explicitDateMatch = text.match(/(\d{1,2})\/(\d{1,2})/);
    if (explicitDateMatch) {
      const month = String(explicitDateMatch[1]).padStart(2, '0');
      const day = String(explicitDateMatch[2]).padStart(2, '0');
      const year = new Date().getFullYear();
      meeting.date = `${year}-${month}-${day}`;
    } else {
      // 相對日期格式（下週三、明天等）
      const relativeMatch = text.match(/下週([一二三四五六日])|明天|後天|今天/);
      if (relativeMatch) {
        const today = new Date();
        let targetDate = new Date(today);
        
        if (relativeMatch[0] === '明天') {
          targetDate.setDate(today.getDate() + 1);
        } else if (relativeMatch[0] === '後天') {
          targetDate.setDate(today.getDate() + 2);
        } else if (relativeMatch[0] === '今天') {
          targetDate = today;
        } else if (relativeMatch[1]) {
          // 下週X
          const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0 };
          const targetDay = dayMap[relativeMatch[1]];
          const daysUntilTarget = (targetDay - today.getDay() + 7) % 7 || 7;
          targetDate.setDate(today.getDate() + 7 + daysUntilTarget);
        }
        
        meeting.date = targetDate.toISOString().split('T')[0];
      }
    }

    // 提取平台
    if (text.includes('Webex') || text.includes('webex')) meeting.platform = 'Webex';
    else if (text.includes('Teams') || text.includes('teams')) meeting.platform = 'Teams';
    else if (text.includes('Zoom') || text.includes('zoom')) meeting.platform = 'Zoom';
    else if (text.includes('Google Meet')) meeting.platform = 'Google Meet';
    else if (text.includes('面試')) meeting.platform = '面試';
    else if (text.includes('104')) meeting.platform = '104';

    // 提取鏈接
    const linkMatch = text.match(/(https?:\/\/[^\s]+)/);
    if (linkMatch) meeting.link = linkMatch[1];

    // 提取組織者/主持人
    const orgMatch = text.match(/([林王陳李張劉黃吳周郭何高施曾彭]\w{1,2})[，。\n]/);
    if (orgMatch) meeting.organizer = orgMatch[1];

    // 提取密碼/會議號碼
    const pwMatch = text.match(/密碼[：:]\s*(\S+)|會議號碼[：:]\s*(\d+)|(\d{6})/);
    if (pwMatch) meeting.password = pwMatch[1] || pwMatch[2] || pwMatch[3];

    return meeting;
  };

  // 添加會議
  const handleAddMeeting = () => {
    if (!inputText.trim()) {
      alert('請貼入會議信息');
      return;
    }

    const meeting = parseMeetingText(inputText);
    
    if (!meeting.title) {
      meeting.title = '新事項';
    }

    setMeetings([...meetings, meeting]);
    setChatMessages([...chatMessages, 
      { role: 'user', text: inputText.substring(0, 80) + '...' },
      { role: 'assistant', text: `✅ 已添加：${meeting.title} ${meeting.startTime ? '@ ' + meeting.startTime : ''}` }
    ]);
    setInputText('');
  };

  // 刪除會議
  const handleDeleteMeeting = (id) => {
    setMeetings(meetings.filter(m => m.id !== id));
  };

  // 複製
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ 已複製');
  };

  // 對話
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages([...chatMessages, { role: 'user', text: chatInput }]);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'assistant', text: '已記錄：' + chatInput }]);
    }, 300);
    setChatInput('');
  };

  // 獲取當天會議
  const getTodayMeetings = () => {
    const today = new Date().toISOString().split('T')[0];
    return meetings.filter(m => m.date === today).sort((a, b) => {
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });
  };

  // 日曆
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthDates = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const dates = [];
    for (let i = 0; i < firstDay; i++) dates.push(null);
    for (let i = 1; i <= daysInMonth; i++) dates.push(i);
    return dates;
  };

  const getDateMeetings = (dateStr) => {
    return meetings.filter(m => m.date === dateStr);
  };

  const isToday = (dateStr) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  const formatDateString = (day) => {
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  if (!isLoggedIn) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <h1>📅 日程助理</h1>
          <p>輸入密碼登入</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="密碼"
            className={styles.passwordInput}
          />
          {passwordError && <p className={styles.error}>{passwordError}</p>}
          <button onClick={handleLogin} className={styles.loginBtn}>登入</button>
        </div>
      </div>
    );
  }

  const todayMeetings = getTodayMeetings();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📅 日程助理</h1>
      </div>

      {/* 月曆 */}
      <div className={styles.calendarSection}>
        <div className={styles.monthNav}>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>⬅</button>
          <span>{currentDate.getFullYear()}/{currentDate.getMonth() + 1}</span>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>➡</button>
        </div>

        <div className={styles.calendarGrid}>
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className={styles.dayHeader}>{day}</div>
          ))}
          {getMonthDates().map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className={styles.emptyDay}></div>;
            
            const dateStr = formatDateString(day);
            const dayMeetings = getDateMeetings(dateStr);
            const todayFlag = isToday(dateStr);
            
            return (
              <div key={day} className={`${styles.calendarDay} ${todayFlag ? styles.today : ''}`}>
                <div className={styles.dayNum}>{day}</div>
                {dayMeetings.length > 0 && <span className={styles.dot}>●</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 輸入框 */}
      <div className={styles.inputSection}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="貼入 Webex/Teams/面試信息..."
          className={styles.largeInput}
        />
        <button onClick={handleAddMeeting} className={styles.addBtn}>➕ 添加</button>
      </div>

      {/* 當天行程 */}
      <div className={styles.todaySection}>
        <h2>📌 {today} 今日行程 ({todayMeetings.length})</h2>
        
        {todayMeetings.length === 0 ? (
          <p className={styles.noData}>暫無行程</p>
        ) : (
          <div className={styles.meetingsList}>
            {todayMeetings.map(m => (
              <div key={m.id} className={styles.meetingCard}>
                <div className={styles.cardTime}>
                  {m.startTime}
                  {m.endTime && ` - ${m.endTime}`}
                </div>
                <div className={styles.cardTitle}>{m.title}</div>
                {m.platform && <div className={styles.badge}>{m.platform}</div>}
                {m.location && <div className={styles.detail}>📍 {m.location}</div>}
                {m.organizer && <div className={styles.detail}>👤 {m.organizer}</div>}
                {m.link && <div className={styles.detail}>🔗 <a href={m.link} target="_blank" rel="noopener noreferrer">會議鏈接</a></div>}
                {m.password && <div className={styles.detail}>🔑 {m.password}</div>}
                
                <div className={styles.actions}>
                  {m.link && <button onClick={() => window.open(m.link, '_blank')} className={styles.actionBtn}>🔗 加入</button>}
                  {m.password && <button onClick={() => copyToClipboard(m.password)} className={styles.actionBtn}>📋 複製</button>}
                  <button onClick={() => handleDeleteMeeting(m.id)} className={`${styles.actionBtn} ${styles.delete}`}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 對話框 */}
      <div className={styles.chatSection}>
        <h2>💬 對話</h2>
        <div className={styles.chatBox}>
          <div className={styles.messages}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`${styles.message} ${styles[msg.role]}`}>
                {msg.role === 'user' ? '👤' : '🤖'} {msg.text}
              </div>
            ))}
          </div>
          <div className={styles.inputBox}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="問我任何問題..."
              className={styles.chatInputBox}
            />
            <button onClick={handleSendChat} className={styles.sendBtn}>發送</button>
          </div>
        </div>
      </div>
    </div>
  );
}
