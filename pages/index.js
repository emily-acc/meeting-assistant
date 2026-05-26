import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [meetings, setMeetings] = useState([]);
  const [inputText, setInputText] = useState('');
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: '貼入 Webex/Teams/Zoom 會議信息，我會幫你自動識別並添加。' }
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

  // 識別會議信息
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
      notes: text
    };

    // 提取標題
    const titleMatch = text.match(/【(.+?)】|會議名稱[：:]\s*(.+?)[\n$]|標題[：:]\s*(.+?)[\n$]|^([^【\n]{2,30})[\n【]/m);
    if (titleMatch) meeting.title = titleMatch[1] || titleMatch[2] || titleMatch[3] || titleMatch[4];

    // 提取時間 (開始時間)
    const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      meeting.startTime = `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
    }

    // 提取結束時間
    const endTimeMatch = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (endTimeMatch) {
      meeting.endTime = `${String(endTimeMatch[3]).padStart(2, '0')}:${endTimeMatch[4]}`;
    }

    // 提取日期
    const dateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日|(\d{1,2})\/(\d{1,2})\/(\d{4})|(\d{4})\/(\d{1,2})\/(\d{1,2})|(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
      if (dateMatch[1]) {
        meeting.date = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`;
      } else if (dateMatch[4]) {
        const year = new Date().getFullYear();
        meeting.date = `${year}-${String(dateMatch[4]).padStart(2, '0')}-${String(dateMatch[5]).padStart(2, '0')}`;
      }
    }

    // 提取平台
    if (text.includes('Webex') || text.includes('webex')) meeting.platform = 'Webex';
    else if (text.includes('Teams') || text.includes('teams')) meeting.platform = 'Teams';
    else if (text.includes('Zoom') || text.includes('zoom')) meeting.platform = 'Zoom';
    else if (text.includes('Google Meet') || text.includes('meet')) meeting.platform = 'Google Meet';

    // 提取鏈接
    const linkMatch = text.match(/(https?:\/\/[^\s]+)/);
    if (linkMatch) meeting.link = linkMatch[1];

    // 提取主持人/組織者
    const organizerMatch = text.match(/主持人[：:]\s*(.+?)[\n$]|組織者[：:]\s*(.+?)[\n$]|Organizer[：:]\s*(.+?)[\n$]/);
    if (organizerMatch) meeting.organizer = organizerMatch[1] || organizerMatch[2] || organizerMatch[3];

    // 提取密碼
    const passwordMatch = text.match(/密碼[：:]\s*(\S+)|密码[：:]\s*(\S+)|Password[：:]\s*(\S+)|會議號碼[：:]\s*(\d+)|(\d{6})/);
    if (passwordMatch) meeting.password = passwordMatch[1] || passwordMatch[2] || passwordMatch[3] || passwordMatch[4] || passwordMatch[5];

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
      meeting.title = '新會議';
    }

    setMeetings([...meetings, meeting]);
    setChatMessages([...chatMessages, 
      { role: 'user', text: inputText.substring(0, 100) + '...' },
      { role: 'assistant', text: `✅ 已添加：${meeting.title} (${meeting.platform || '線上'})` }
    ]);
    setInputText('');
  };

  // 刪除會議
  const handleDeleteMeeting = (id) => {
    setMeetings(meetings.filter(m => m.id !== id));
  };

  // 複製到剪貼板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ 已複製');
  };

  // 對話
  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', text: chatInput };
    setChatMessages([...chatMessages, userMsg]);

    let response = '我已記下：' + chatInput;
    if (chatInput.includes('時間')) response = '時間已記錄。';
    if (chatInput.includes('會議')) response = '會議信息已識別。';
    if (chatInput.includes('Webex') || chatInput.includes('Teams')) response = '平台已確認。';

    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
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

  // 日期計算
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

    for (let i = 0; i < firstDay; i++) {
      dates.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(i);
    }

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
      {/* 頭部 */}
      <div className={styles.header}>
        <h1>📅 日程助理</h1>
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.viewBtn} ${viewMode === 'month' ? styles.active : ''}`}
            onClick={() => setViewMode('month')}
          >
            📅 月
          </button>
          <button 
            className={`${styles.viewBtn} ${viewMode === 'week' ? styles.active : ''}`}
            onClick={() => setViewMode('week')}
          >
            📋 週
          </button>
        </div>
      </div>

      {/* 日曆視圖 */}
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
