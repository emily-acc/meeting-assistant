import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // 新增表單
  const [newEvent, setNewEvent] = useState({
    time: '',
    title: '',
    person: '',
    platform: '',
    notes: ''
  });
  
  const [newTask, setNewTask] = useState({
    time: '',
    title: '',
    person: '',
    platform: '',
    notes: ''
  });
  
  // 對話框
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: '你好！我是你的日程助理。貼入會議或工作項目的信息，我可以幫你理解和建議。' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // 登入處理
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
    
    const savedEvents = localStorage.getItem('events');
    if (savedEvents) setEvents(JSON.parse(savedEvents));
    
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  // 保存數據
  useEffect(() => {
    localStorage.setItem('events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  // 添加會議
  const handleAddEvent = () => {
    if (!newEvent.time || !newEvent.title) {
      alert('請填寫時間和標題');
      return;
    }
    
    const event = {
      id: Date.now(),
      ...newEvent,
      date: new Date().toISOString().split('T')[0]
    };
    
    setEvents([...events, event]);
    setNewEvent({ time: '', title: '', person: '', platform: '', notes: '' });
    alert('✅ 會議已新增');
  };

  // 添加工作項目
  const handleAddTask = () => {
    if (!newTask.time || !newTask.title) {
      alert('請填寫時間和標題');
      return;
    }
    
    const task = {
      id: Date.now(),
      ...newTask,
      date: new Date().toISOString().split('T')[0]
    };
    
    setTasks([...tasks, task]);
    setNewTask({ time: '', title: '', person: '', platform: '', notes: '' });
    alert('✅ 工作項目已新增');
  };

  // 對話框
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { role: 'user', text: chatInput };
    setChatMessages([...chatMessages, userMessage]);
    
    // 簡單的 AI 回應（可以後續改進）
    setTimeout(() => {
      let response = '我已記下：' + chatInput;
      if (chatInput.includes('會議')) response = '我看到這是關於會議。時間是什麼時候？';
      if (chatInput.includes('工作')) response = '我看到這是工作項目。截止時間是？';
      if (chatInput.includes('面試')) response = '面試很重要！請提供時間、對象、地點等信息。';
      
      setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    }, 500);
    
    setChatInput('');
  };

  // 時間衝突檢測
  const checkConflicts = () => {
    const allItems = [
      ...events.map(e => ({ ...e, type: 'event' })),
      ...tasks.map(t => ({ ...t, type: 'task' }))
    ];
    
    const conflicts = [];
    for (let i = 0; i < allItems.length; i++) {
      for (let j = i + 1; j < allItems.length; j++) {
        if (allItems[i].date === allItems[j].date && 
            allItems[i].time === allItems[j].time) {
          conflicts.push([allItems[i], allItems[j]]);
        }
      }
    }
    return conflicts;
  };

  // 繁忙度計算
  const getBusyLevel = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayItems = [
      ...events.filter(e => e.date === today),
      ...tasks.filter(t => t.date === today)
    ];
    
    if (todayItems.length === 0) return { level: '閒', color: '#27ae60' };
    if (todayItems.length <= 2) return { level: '不忙', color: '#f39c12' };
    if (todayItems.length <= 5) return { level: '有點忙', color: '#e67e22' };
    return { level: '很忙', color: '#e74c3c' };
  };

  // 日期計算
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
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

  const getDateItems = (dateStr) => {
    return [
      ...events.filter(e => e.date === dateStr),
      ...tasks.filter(t => t.date === dateStr)
    ];
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
          <button onClick={handleLogin} className={styles.loginBtn}>
            登入
          </button>
        </div>
      </div>
    );
  }

  const busyLevel = getBusyLevel();
  const conflicts = checkConflicts();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📅 日程助理</h1>
        <div className={styles.busyStatus} style={{ backgroundColor: busyLevel.color }}>
          {busyLevel.level}
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 日程看板
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'add' ? styles.active : ''}`}
          onClick={() => setActiveTab('add')}
        >
          ➕ 新增
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'chat' ? styles.active : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 對話
        </button>
      </div>

      <div className={styles.main}>
        {activeTab === 'dashboard' && (
          <div>
            <h2>📅 本月日程</h2>
            <div className={styles.calendar}>
              <div className={styles.monthNav}>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>⬅</button>
                <span>{currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月</span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>➡</button>
              </div>
              
              <div className={styles.calendarGrid}>
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                  <div key={day} className={styles.dayHeader}>{day}</div>
                ))}
                {getMonthDates().map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} className={styles.emptyDay}></div>;
                  
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const items = getDateItems(dateStr);
                  
                  return (
                    <div key={day} className={styles.calendarDay}>
                      <div className={styles.dayNum}>{day}</div>
                      <div className={styles.dayItems}>
                        {items.slice(0, 2).map(item => (
                          <div key={item.id} className={styles.itemBadge}>
                            {item.title.substring(0, 5)}...
                          </div>
                        ))}
                        {items.length > 2 && <div className={styles.moreItems}>+{items.length - 2}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {conflicts.length > 0 && (
              <div className={styles.conflicts}>
                <h3>⚠️ 時間衝突提醒</h3>
                {conflicts.map((conflict, idx) => (
                  <div key={idx} className={styles.conflictItem}>
                    <span>{conflict[0].title}</span> 和 <span>{conflict[1].title}</span> 在 {conflict[0].time} 衝突
                  </div>
                ))}
              </div>
            )}

            <h2>📋 今日日程</h2>
            <div className={styles.itemList}>
              {[...events, ...tasks].filter(item => item.date === new Date().toISOString().split('T')[0]).map(item => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemTime}>{item.time}</div>
                  <div className={styles.itemContent}>
                    <div className={styles.itemTitle}>{item.title}</div>
                    {item.person && <div className={styles.itemPerson}>📍 {item.person}</div>}
                    {item.platform && <div className={styles.itemPlatform}>💻 {item.platform}</div>}
                  </div>
                  <button onClick={() => {
                    if (events.find(e => e.id === item.id)) {
                      setEvents(events.filter(e => e.id !== item.id));
                    } else {
                      setTasks(tasks.filter(t => t.id !== item.id));
                    }
                  }} className={styles.deleteBtn}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div>
            <h2>➕ 新增會議</h2>
            <div className={styles.formBox}>
              <div className={styles.formRow}>
                <label>時間 ⏰</label>
                <input 
                  type="text" 
                  placeholder="例：09:30、下週三 14:00"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formRow}>
                <label>標題 📌</label>
                <input 
                  type="text" 
                  placeholder="會議名稱"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formRow}>
                <label>對象 👤</label>
                <input 
                  type="text" 
                  placeholder="參與人員"
                  value={newEvent.person}
                  onChange={(e) => setNewEvent({...newEvent, person: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formRow}>
                <label>平台 💻</label>
                <input 
                  type="text" 
                  placeholder="Webex/Teams/線上/實體"
                  value={newEvent.platform}
                  onChange={(e) => setNewEvent({...newEvent, platform: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formRow}>
                <label>備註 📝</label>
                <textarea 
                  placeholder="任意備註內容..."
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({...newEvent, notes: e.target.value})}
                  className={styles.textarea}
                />
              </div>
              <button onClick={handleAddEvent} className={styles.submitBtn}>新增會議</button>
            </div>

            <h2>➕ 新增工作項目</h2>
            <div className={styles.formBox}>
              <div className={styles.formRow}>
                <label>時間 ⏰</label>
                <input 
                  type="text" 
                  placeholder="例：5/28、下週五"
                  value={newTask.time}
                  onChange={(e) => setNewTask({...newTask, time: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formRow}>
                <label>項目 📌</label>
                <input 
                  type="text" 
                  placeholder="工作項目名稱"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formRow}>
                <label>對象 👤</label>
                <input 
                  type="text" 
                  placeholder="回覆給誰"
                  value={newTask.person}
                  onChange={(e) => setNewTask({...newTask, person: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formRow}>
                <label>相關 💻</label>
                <input 
                  type="text" 
                  placeholder="相關平台/工具"
                  value={newTask.platform}
                  onChange={(e) => setNewTask({...newTask, platform: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formRow}>
                <label>備註 📝</label>
                <textarea 
                  placeholder="任意備註內容..."
                  value={newTask.notes}
                  onChange={(e) => setNewTask({...newTask, notes: e.target.value})}
                  className={styles.textarea}
                />
              </div>
              <button onClick={handleAddTask} className={styles.submitBtn}>新增工作項目</button>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className={styles.chatContainer}>
            <div className={styles.chatMessages}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`${styles.message} ${styles[msg.role]}`}>
                  {msg.role === 'user' ? '👤' : '🤖'} {msg.text}
                </div>
              ))}
            </div>
            <div className={styles.chatInput}>
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="貼入會議或工作信息，或問我任何問題..."
                className={styles.chatInputBox}
              />
              <button onClick={handleSendMessage} className={styles.chatSendBtn}>發送</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
