import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [meetings, setMeetings] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewType, setViewType] = useState('all'); // 'all', 'meeting', 'task'
  
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
      type: 'meeting',
      notes: text
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

    // 提取時間（早上/下午格式）
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
      // 直接提取時間
      const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        meeting.startTime = `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
      }
    }

    // 提取日期（明確日期）
    const explicitDateMatch = text.match(/(\d{1,2})\/(\d{1,2})/);
    if (explicitDateMatch) {
      const month = String(explicitDateMatch[1]).padStart(2, '0');
      const day = String(explicitDateMatch[2]).padStart(2, '0');
      const year = new Date().getFullYear();
      meeting.date = `${year}-${month}-${day}`;
    } else {
      // 相對日期
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
    else if (meeting.type === 'task') meeting.platform = '面試';

    // 提取鏈接
    const linkMatch = text.match(/(https?:\/\/[^\s]+)/);
    if (linkMatch) meeting.link = linkMatch[1];

    // 提取組織者
    const orgMatch = text.match(/([林王陳李張劉黃吳周郭何高施曾彭]\w{1,2})/);
    if (orgMatch) meeting.organizer = orgMatch[1];

    // 提取密碼
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
      { role: 'assistant', text: `✅ 已添加：${meeting.title} (${meeting.date})` }
    ]);
    setInputText('');
  };

  // 刪除
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

  // 獲取選中日期的行程
  const getSelectedDateMeetings = () => {
    return meetings
      .filter(m => m.date === selectedDate)
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  };

  // 按類型篩選
  const getFilteredMeetings = () => {
    const all = getSelectedDateMeetings();
    if (viewType === 'meeting') return all.filter(m => m.type === 'meeting');
    if (viewType === 'task') return all.filter(m => m.type === 'task');
    return all;
  };

  // 日曆相關
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

  const formatDateString = (day) => {
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isSelectedDate = (dateStr) => {
    return dateStr === selectedDate;
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

  const filteredMeetings = getFilteredMeetings();
  const allMeetings = getSelectedDateMeetings();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📅 日程助理</h1>
      </div>

      {/* 菜單 */}
      <div className={styles.menuBar}>
        <button 
          className={`${styles.menuBtn} ${viewType === 'all' ? styles.active : ''}`}
          onClick={() => setViewType('all')}
        >
          📅 全部行程
        </button>
        <button 
          className={`${styles.menuBtn} ${viewType === 'meeting' ? styles.active : ''}`}
          onClick={() => setViewType('meeting')}
        >
          📞 會議時程
        </button>
        <button 
          className={`${styles.menuBtn} ${viewType === 'task' ? styles.active : ''}`}
          onClick={() => setViewType('task')}
        >
          📝 工作列表
        </button>
      </div>

      <div className={styles.mainContent}>
        {/* 左側：月曆 */}
        <div className={styles.leftPanel}>
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
                const isSelected = isSelectedDate(dateStr);
                
                return (
                  <div 
                    key={day} 
                    className={`${styles.calendarDay} ${isSelected ? styles.selected : ''}`}
                    onClick={() => setSelectedDate(dateStr)}
                  >
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
              placeholder="貼入會議/面試信息..."
              className={styles.largeInput}
            />
            <button onClick={handleAddMeeting} className={styles.addBtn}>➕ 添加</button>
          </div>
        </div>

        {/* 右側：行程列表 */}
        <div className={styles.rightPanel}>
          <div className={styles.todaySection}>
            <h2>📌 {selectedDate} ({allMeetings.length})</h2>
            
            {filteredMeetings.length === 0 ? (
              <p className={styles.noData}>暫無行程</p>
            ) : (
              <div className={styles.meetingsList}>
                {filteredMeetings.map(m => (
                  <div key={m.id} className={`${styles.meetingCard} ${styles[m.type]}`}>
                    <div className={styles.cardTime}>
                      {m.startTime || '--:--'}
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardTitle}>{m.title}</div>
                      {m.platform && <div className={styles.badge}>{m.platform}</div>}
                      {m.location && <div className={styles.detail}>📍 {m.location}</div>}
                      {m.organizer && <div className={styles.detail}>👤 {m.organizer}</div>}
                      {m.link && <div className={styles.detail}>🔗 <a href={m.link} target="_blank" rel="noopener noreferrer">鏈接</a></div>}
                      {m.password && <div className={styles.detail}>🔑 {m.password}</div>}
                    </div>
                    
                    <div className={styles.actions}>
                      {m.link && <button onClick={() => window.open(m.link, '_blank')} className={styles.actionBtn}>🔗</button>}
                      {m.password && <button onClick={() => copyToClipboard(m.password)} className={styles.actionBtn}>📋</button>}
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
                  placeholder="問我..."
                  className={styles.chatInputBox}
                />
                <button onClick={handleSendChat} className={styles.sendBtn}>發送</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
