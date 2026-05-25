import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('meeting');
  const [inputText, setInputText] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [importPreview, setImportPreview] = useState(null);

  const handleGoogleLogin = () => {
    const mockUser = {
      name: '王可欣',
      email: 'sbndy0609@gmail.com',
      picture: '👤'
    };
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    const savedEvents = localStorage.getItem('events');
    if (savedEvents) setEvents(JSON.parse(savedEvents));

    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  useEffect(() => {
    localStorage.setItem('events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  // 智能導入（工作項目 AI 識別）
  const handleSmartTaskImport = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText, 
          apiKey: 'AIzaSyBzgBpDj-8zY-TAzhnNjcZFarf18XoP0mw',
          type: 'tasks'
        })
      });

      const data = await response.json();
      
      if (data.tasks && data.tasks.length > 0) {
        setImportPreview({ type: 'tasks', data: data.tasks });
        alert(`✅ 識別到 ${data.tasks.length} 個工作項目！點擊「確認導入」來添加`);
      } else {
        alert('❌ 無法識別內容，請檢查格式');
      }
    } catch (error) {
      console.error('導入失敗:', error);
      alert('❌ 導入失敗，請重試');
    }
    setLoading(false);
  };

  // 確認導入工作項目
  const confirmTaskImport = () => {
    if (!importPreview || importPreview.type !== 'tasks') return;

    const newTasks = importPreview.data.map(task => ({
      ...task,
      id: Date.now() + Math.random(),
      completed: false
    }));
    setTasks([...tasks, ...newTasks]);
    alert(`✅ 已導入 ${importPreview.data.length} 個工作項目！`);

    setImportPreview(null);
    setInputText('');
  };

  // 顯示導入預覽
  const renderImportPreview = () => {
    if (!importPreview || importPreview.type !== 'tasks') return null;

    return (
      <div className={styles.previewContainer}>
        <h3>📋 導入預覽</h3>
        <div className={styles.previewList}>
          {importPreview.data.map((task, idx) => (
            <div key={idx} className={styles.previewItem}>
              <div><strong>{task.title}</strong></div>
              <div>📅 {task.date} {task.recurring && `| 循環: ${task.recurring}`}</div>
            </div>
          ))}
        </div>
        <div className={styles.previewActions}>
          <button onClick={confirmTaskImport} className={styles.confirmBtn}>
            ✅ 確認導入
          </button>
          <button onClick={() => setImportPreview(null)} className={styles.cancelBtn}>
            ❌ 取消
          </button>
        </div>
      </div>
    );
  };

  const handleParseMeeting = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText, 
          apiKey: 'AIzaSyBzgBpDj-8zY-TAzhnNjcZFarf18XoP0mw',
          type: 'meeting'
        })
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

  const handleAddTask = () => {
    if (!taskInput.trim() || !taskDate) {
      alert('請填寫工作項目和日期');
      return;
    }

    const newTask = {
      id: Date.now(),
      title: taskInput,
      date: taskDate,
      completed: false,
      recurring: '不循環'
    };

    setTasks([...tasks, newTask]);
    setTaskInput('');
    setTaskDate('');
    alert('✅ 工作項目已新增！');
  };

  const deleteEvent = (index) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ 已複製');
  };

  const exportToGoogleCalendar = (event) => {
    const startTime = new Date(event.startTime).toISOString().replace(/[-:]/g, '').split('.')[0];
    const endTime = new Date(new Date(event.startTime).getTime() + event.duration * 60000).toISOString().replace(/[-:]/g, '').split('.')[0];
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.link || '')}`;
    
    window.open(url, '_blank');
  };

  const joinMeeting = (link) => {
    if (link) window.open(link, '_blank');
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isToday = (dateStr) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr === todayStr;
  };

  const getDateEvents = (dateStr) => {
    return events.filter(e => new Date(e.startTime).toISOString().split('T')[0] === dateStr);
  };

  const getDateTasks = (dateStr) => {
    return tasks.filter(t => t.date === dateStr);
  };

  const getMonthDates = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const dates = [];

    for (let i = 0; i < firstDay; i++) {
      dates.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(i);
    }

    return dates;
  };

  const renderMonthView = () => {
    const dates = getMonthDates();
    const monthStr = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

    return (
      <div className={styles.monthContainer}>
        <div className={styles.monthHeader}>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
            ⬅ 上月
          </button>
          <span className={styles.monthTitle}>{monthStr}</span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
            下月 ➡
          </button>
        </div>

        <div className={styles.calendar}>
          <div className={styles.weekDays}>
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} className={styles.weekDay}>{day}</div>
            ))}
          </div>

          <div className={styles.calendarDays}>
            {dates.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className={styles.emptyDay}></div>;
              }

              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dateEvents = getDateEvents(dateStr);
              const dateTasks = getDateTasks(dateStr);
              const hasContent = dateEvents.length > 0 || dateTasks.length > 0;
              const todayFlag = isToday(dateStr);

              return (
                <div key={day} className={`${styles.calendarDay} ${hasContent ? styles.hasContent : ''} ${todayFlag ? styles.today : ''}`}>
                  <div className={styles.dayNumber}>{day}</div>
                  <div className={styles.dayContent}>
                    {dateTasks.map(task => (
                      <div key={task.id} className={`${styles.taskTag} ${task.completed ? styles.completed : ''}`}>
                        {task.title.substring(0, 6)}...
                      </div>
                    ))}
                    {dateEvents.length > 0 && (
                      <div className={styles.eventIndicator}>
                        📅 {dateEvents.length}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMeetingBoard = () => {
    const upcomingEvents = events.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    return (
      <div className={styles.boardContainer}>
        <h2>📅 會議看板 ({upcomingEvents.length})</h2>
        
        {upcomingEvents.length === 0 ? (
          <p className={styles.noData}>還沒有會議</p>
        ) : (
          <div className={styles.meetingsList}>
            {upcomingEvents.map((event, idx) => (
              <div key={idx} className={styles.meetingCard}>
                <div className={styles.meetingTitle}>{event.title}</div>
                <div className={styles.meetingDetails}>
                  <div>⏰ {new Date(event.startTime).toLocaleString()}</div>
                  {event.platform && <div>📱 平台: {event.platform}</div>}
                  {event.duration && <div>⏱ 時長: {event.duration} 分鐘</div>}
                </div>
                <div className={styles.meetingActions}>
                  {event.link && (
                    <button onClick={() => joinMeeting(event.link)} className={styles.actionBtn} title="加入會議">
                      🔗 加入
                    </button>
                  )}
                  {event.password && (
                    <button onClick={() => copyToClipboard(event.password)} className={styles.actionBtn} title="複製密碼">
                      🔑 密碼
                    </button>
                  )}
                  {event.hostKey && (
                    <button onClick={() => copyToClipboard(event.hostKey)} className={styles.actionBtn} title="複製主持人金鑰">
                      👑 金鑰
                    </button>
                  )}
                  <button onClick={() => exportToGoogleCalendar(event)} className={styles.actionBtn} title="導出到 Google Calendar">
                    📅 日曆
                  </button>
                  <button onClick={() => deleteEvent(events.indexOf(event))} className={`${styles.actionBtn} ${styles.deleteBtn}`} title="刪除">
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTaskBoard = () => {
    const sortedTasks = tasks.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
      <div className={styles.boardContainer}>
        <h2>✅ 工作項目 ({tasks.length})</h2>
        
        {tasks.length === 0 ? (
          <p className={styles.noData}>還沒有工作項目</p>
        ) : (
          <div className={styles.tasksList}>
            {sortedTasks.map(task => (
              <div key={task.id} className={`${styles.taskCard} ${task.completed ? styles.completed : ''}`}>
                <input 
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  className={styles.taskCheckbox}
                />
                <div className={styles.taskInfo}>
                  <div className={styles.taskTitle}>{task.title}</div>
                  <div className={styles.taskDate}>
                    📅 {task.date} {task.recurring && task.recurring !== '不循環' && `| 循環: ${task.recurring}`}
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} className={styles.deleteBtn}>
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1>📅 會議行程助理</h1>
          <div className={styles.userInfo}>
            <span>{user.name}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>登出</button>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'month' ? styles.active : ''}`}
          onClick={() => setActiveTab('month')}
        >
          📅 月視圖
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'meetings' ? styles.active : ''}`}
          onClick={() => setActiveTab('meetings')}
        >
          🎤 會議看板
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'tasks' ? styles.active : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          ✅ 工作項目
        </button>
      </div>

      <div className={styles.main}>
        <div className={styles.formSection}>
          <button 
            className={styles.toggleBtn}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '❌ 關閉' : '➕ 新增'}
          </button>

          {showForm && (
            <div className={styles.form}>
              <div className={styles.formTabs}>
                <button 
                  className={`${styles.formTab} ${formType === 'meeting' ? styles.active : ''}`}
                  onClick={() => setFormType('meeting')}
                >
                  會議
                </button>
                <button 
                  className={`${styles.formTab} ${formType === 'task' ? styles.active : ''}`}
                  onClick={() => setFormType('task')}
                >
                  工作項目
                </button>
              </div>

              {formType === 'meeting' ? (
                <>
                  <textarea
                    placeholder="貼入會議邀請（支援 Webex, Zoom, Teams 等）"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className={styles.textarea}
                  />
                  <button 
                    onClick={handleParseMeeting}
                    disabled={loading}
                    className={styles.parseBtn}
                  >
                    {loading ? '⏳ 解析中...' : '🤖 AI 解析'}
                  </button>
                </>
              ) : (
                <>
                  <textarea
                    placeholder="貼入工作項目（Notes/郵件內容，AI 自動識別日期和任務）"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className={styles.textarea}
                  />
                  <button 
                    onClick={handleSmartTaskImport}
                    disabled={loading}
                    className={styles.parseBtn}
                  >
                    {loading ? '⏳ AI 識別中...' : '🤖 AI 智能識別'}
                  </button>
                  {renderImportPreview()}
                </>
              )}
            </div>
          )}
        </div>

        {activeTab === 'month' && renderMonthView()}
        {activeTab === 'meetings' && renderMeetingBoard()}
        {activeTab === 'tasks' && renderTaskBoard()}
      </div>
    </div>
  );
}
