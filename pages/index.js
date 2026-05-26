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
    const titleMatch = text.match(/【(.+?)】|標題[：:]\s*(.+?)[\n$]|^([^【\n：:]{2,40}?)[\n【時間日期]/m);
    if (titleMatch) {
      meeting.title = titleMatch[1] || titleMatch[2] || titleMatch[3];
    }

    // 提取人名
    const nameMatch = text.match(/([林王陳李張劉黃吳周郭何高施曾彭趙]\w{1,2})/);
    if (nameMatch && !meeting.title) {
      meeting.title = nameMatch[1] + (meeting.type === 'task' ? '面試' : '會議');
    }

    // 提取地點
    const locationMatch = text.match(/到(\S+?)[廠場室間區]|地點[：:]\s*([^\n]+)/);
    if (locationMatch) {
      meeting.location = locationMatch[1] ? locationMatch[1] + locationMatch[2] : locationMatch[2];
    }

    // 提取時間（早上/下午格式）
    const ampmMatch = text.match(/(早上|上午|中午|下午|晚上)[\s]?(\d{1,2})[點:：](\d{0,2})|時間[：:]\s*(\d{1,2})[點:：](\d{0,2})/);
    if (ampmMatch) {
      let hour = parseInt(ampmMatch[2] || ampmMatch[4]);
      const min = ampmMatch[3] || ampmMatch[5] || '00';
      const period = ampmMatch[1];
      
      if (period === '下午' || period === '晚上') {
        if (hour < 12) hour += 12;
      }
      if (period === '早上' || period === '上午') {
        if (hour === 12) hour = 0;
      }
      
      meeting.startTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    } else {
      // 直接提取時間 HH:MM
      const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        meeting.startTime = `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
      }
    }

    // 提取日期（明確日期格式）
    const explicitDateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日|(\d{1,2})\/(\d{1,2})/);
    if (explicitDateMatch) {
      if (explicitDateMatch[1]) {
        meeting.date = `${explicitDateMatch[1]}-${String(explicitDateMatch[2]).padStart(2, '0')}-${String(explicitDateMatch[3]).padStart(2, '0')}`;
      } else {
        const month = String(explicitDateMatch[4]).padStart(2, '0');
        const day = String(explicitDateMatch[5]).padStart(2, '0');
        const year = new Date().getFullYear();
        meeting.date = `${year}-${month}-${day}`;
      }
    } else {
      // 相對日期格式
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
    if (text.includes('Webex') || text.includes('webex')) meeting.platform = 'Webex';
    else if (text.includes('Teams') || text.includes('teams')) meeting.platform = 'Teams';
    else if (text.includes('Zoom') || text.includes('zoom')) meeting.platform = 'Zoom';
    else if (text.includes('Google Meet')) meeting.platform = 'Google Meet';
    else if (text.includes('104')) meeting.platform = '104';
    else if (meeting.type === 'task') meeting.platform = '面試';

    // 提取鏈接
    const linkMatch = text.match(/(https?:\/\/[^\s\n]+)/);
    if (linkMatch) meeting.link = linkMatch[1];

    // 提取組織者/主持人
    const orgMatch = text.match(/主持人[：:]\s*(\S+)|主席[：:]\s*(\S+)|寄件人[：:]\s*(\S+)|召集人[：:]\s*(\S+)/);
    if (orgMatch) meeting.organizer = orgMatch[1] || orgMatch[2] || orgMatch[3] || orgMatch[4];

    // 提取密碼
    const pwMatch = text.match(/密碼[：:]\s*([^\n\s]+)|會議號碼[：:]\s*(\d+)|密码[：:]\s*([^\n\s]+)/);
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
      meeting.title = '新會議';
    }

    setMeetings([...meetings, meeting]);
    setInputText('');
    alert(`✅ 已添加：${meeting.title}`);
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

  // 獲取各種列表
  const getAllMeetings = () => {
    return meetings.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });
  };

  const getConferenceMeetings = () => {
    return getAllMeetings().filter(m => m.type === 'meeting');
  };

  const getTaskMeetings = () => {
    return getAllMeetings().filter(m => m.type === 'task');
  };

  const getSelectedDateMeetings = () => {
    return getDateMeetings(selectedDate).sort((a, b) => {
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });
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

      {/* 輸入框 */}
      <div className={styles.inputSection}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="貼入 Webex / Teams / 面試信息..."
          className={styles.largeInput}
        />
        <button onClick={handleAddMeeting} className={styles.addBtn}>➕ 添加</button>
      </div>

      {/* 內容區 */}
      <div className={styles.contentSection}>
        {viewType === 'all' && (
          <div className={styles.allViewContainer}>
            {/* 左側：月曆 */}
            <div className={styles.calendarPanel}>
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

            {/* 右側：行程列表 */}
            <div className={styles.listPanel}>
              <h2>📌 {selectedDate} ({getSelectedDateMeetings().length})</h2>
              {getSelectedDateMeetings().length === 0 ? (
                <p className={styles.noData}>暫無行程</p>
              ) : (
                <div className={styles.meetingsList}>
                  {getSelectedDateMeetings().map(m => (
                    <MeetingCard key={m.id} meeting={m} onDelete={handleDeleteMeeting} onCopy={copyToClipboard} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {viewType === 'meeting' && (
          <div className={styles.listPanel}>
            <h2>📞 會議時程 ({getConferenceMeetings().length})</h2>
            {getConferenceMeetings().length === 0 ? (
              <p className={styles.noData}>暫無會議</p>
            ) : (
              <div className={styles.meetingsList}>
                {getConferenceMeetings().map(m => (
                  <MeetingCard key={m.id} meeting={m} onDelete={handleDeleteMeeting} onCopy={copyToClipboard} />
                ))}
              </div>
            )}
          </div>
        )}

        {viewType === 'task' && (
          <div className={styles.listPanel}>
            <h2>📝 工作列表 ({getTaskMeetings().length})</h2>
            {getTaskMeetings().length === 0 ? (
              <p className={styles.noData}>暫無工作項目</p>
            ) : (
              <div className={styles.meetingsList}>
                {getTaskMeetings().map(m => (
                  <MeetingCard key={m.id} meeting={m} onDelete={handleDeleteMeeting} onCopy={copyToClipboard} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 會議卡片組件
function MeetingCard({ meeting, onDelete, onCopy }) {
  const styles = require('../styles/Home.module.css');
  
  return (
    <div className={`${styles.meetingCard} ${styles[meeting.type]}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTime}>{meeting.startTime || '--:--'}</div>
        <div className={styles.cardTitle}>{meeting.title}</div>
      </div>

      <div className={styles.cardInfo}>
        {meeting.date && <div className={styles.detail}>📅 {meeting.date}</div>}
        {meeting.platform && <div className={styles.badge}>{meeting.platform}</div>}
        {meeting.location && <div className={styles.detail}>📍 {meeting.location}</div>}
        {meeting.organizer && <div className={styles.detail}>👤 {meeting.organizer}</div>}
        {meeting.link && <div className={styles.detail}>🔗 <a href={meeting.link} target="_blank" rel="noopener noreferrer">會議鏈接</a></div>}
        {meeting.password && <div className={styles.detail}>🔑 {meeting.password}</div>}
      </div>

      <div className={styles.actions}>
        {meeting.link && <button onClick={() => window.open(meeting.link, '_blank')} className={styles.actionBtn}>🔗 加入</button>}
        {meeting.password && <button onClick={() => onCopy(meeting.password)} className={styles.actionBtn}>📋 複製</button>}
        <button onClick={() => onDelete(meeting.id)} className={`${styles.actionBtn} ${styles.delete}`}>🗑 刪除</button>
      </div>
    </div>
  );
}
