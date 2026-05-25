import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Google 登入
  const handleGoogleLogin = () => {
    const mockUser = {
      name: '王可欣',
      email: 'sbndy0609@gmail.com',
      picture: '👤'
    };
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  // 登出
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // 載入本地數據
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    const savedEvents = localStorage.getItem('events');
    if (savedEvents) setEvents(JSON.parse(savedEvents));
  }, []);

  // 保存事件到本地
  useEffect(() => {
    localStorage.setItem('events', JSON.stringify(events));
  }, [events]);

  // 解析會議
  const handleParse = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, apiKey: 'AIzaSyBzgBpDj-8zY-TAzhnNjcZFarf18XoP0mw' })
      });

      const data = await response.json();
      
      if (data.events) {
        setEvents([...events, ...data.events]);
        setInputText('');
        alert('✅ 會議已新增！');
      }
    } catch (error) {
      console.error('解析失敗:', error);
      alert('❌ 解析失敗，請重試');
    }
    setLoading(false);
  };

  // 刪除會議
  const deleteEvent = (index) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  // 複製到剪貼簿
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ 已複製');
  };

  // 導出到 Google Calendar
  const exportToGoogleCalendar = (event) => {
    const startTime = new Date(event.startTime).toISOString().replace(/[-:]/g, '').split('.')[0];
    const endTime = new Date(new Date(event.startTime).getTime() + event.duration * 60000).toISOString().replace(/[-:]/g, '').split('.')[0];
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.link || '')}`;
    
    window.open(url, '_blank');
  };

  // 加入會議
  const joinMeeting = (link) => {
    if (link) window.open(link, '_blank');
  };

  // 計算週日期
  const getWeekDates = () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay() + currentWeek * 7);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // 按日期分組事件
  const groupEventsByDate = () => {
    const weekDates = getWeekDates();
    const grouped = {};
    
    weekDates.forEach(date => {
      const key = date.toISOString().split('T')[0];
      grouped[key] = [];
    });

    events.forEach(event => {
      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
      if (grouped[eventDate]) {
        grouped[eventDate].push(event);
      }
    });

    return grouped;
  };

  if (!user) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <h1>📅 會議行程助理</h1>
          <p>用 Google 帳號登入開始</p>
          <button className={styles.googleButton} onClick={handleGoogleLogin}>
            🔐 Google 登入
          </button>
        </div>
      </div>
    );
  }

  const weekDates = getWeekDates();
  const groupedEvents = groupEventsByDate();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1>📅 會議行程助理</h1>
          <div className={styles.userInfo}>
            <span>{user.name}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>登出</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.main}>
        {/* 新增會議表單 */}
        <div className={styles.formSection}>
          <button 
            className={styles.toggleBtn}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '❌ 關閉' : '➕ 新增會議'}
          </button>

          {showForm && (
            <div className={styles.form}>
              <textarea
                placeholder="貼入會議邀請（支援 Webex, Zoom, Teams 等）"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className={styles.textarea}
              />
              <button 
                onClick={handleParse}
                disabled={loading}
                className={styles.parseBtn}
              >
                {loading ? '⏳ 解析中...' : '🤖 AI 解析'}
              </button>
            </div>
          )}
        </div>

        {/* 週視圖 */}
        <div className={styles.weekView}>
          <div className={styles.weekControls}>
            <button onClick={() => setCurrentWeek(currentWeek - 1)}>⬅️ 上週</button>
            <span className={styles.weekLabel}>
              {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
            </span>
            <button onClick={() => setCurrentWeek(currentWeek + 1)}>下週 ➡️</button>
          </div>

          <div className={styles.days}>
            {weekDates.map((date, idx) => {
              const dateKey = date.toISOString().split('T')[0];
              const dayEvents = groupedEvents[dateKey] || [];
              const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

              return (
                <div key={idx} className={styles.day}>
                  <div className={styles.dayHeader}>
                    {dayName} {date.getDate()}
                  </div>
                  <div className={styles.dayEvents}>
                    {dayEvents.length === 0 ? (
                      <p className={styles.noEvents}>無會議</p>
                    ) : (
                      dayEvents.map((event, eIdx) => (
                        <div key={eIdx} className={styles.eventCard}>
                          <div className={styles.eventTitle}>{event.title}</div>
                          <div className={styles.eventTime}>
                            {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className={styles.eventButtons}>
                            {event.link && (
                              <button 
                                className={styles.btn}
                                onClick={() => joinMeeting(event.link)}
                                title="加入會議"
                              >
                                🔗
                              </button>
                            )}
                            {event.password && (
                              <button 
                                className={styles.btn}
                                onClick={() => copyToClipboard(event.password)}
                                title="複製密碼"
                              >
                                🔑
                              </button>
                            )}
                            {event.hostKey && (
                              <button 
                                className={styles.btn}
                                onClick={() => copyToClipboard(event.hostKey)}
                                title="複製主持人金鑰"
                              >
                                👑
                              </button>
                            )}
                            <button 
                              className={styles.btn}
                              onClick={() => exportToGoogleCalendar(event)}
                              title="導出到 Google Calendar"
                            >
                              📅
                            </button>
                            <button 
                              className={styles.btn + ' ' + styles.deleteBtn}
                              onClick={() => deleteEvent(events.indexOf(event))}
                              title="刪除"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 全部會議列表 */}
        <div className={styles.allEvents}>
          <h2>📋 全部會議 ({events.length})</h2>
          {events.length === 0 ? (
            <p>還沒有會議，點「新增會議」開始</p>
          ) : (
            <div className={styles.eventsList}>
              {events.map((event, idx) => (
                <div key={idx} className={styles.listItem}>
                  <div className={styles.listInfo}>
                    <strong>{event.title}</strong>
                    <div>{new Date(event.startTime).toLocaleString()}</div>
                    {event.platform && <div>平台: {event.platform}</div>}
                  </div>
                  <div className={styles.listActions}>
                    <button onClick={() => deleteEvent(idx)} className={styles.deleteBtn}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
