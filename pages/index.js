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
  const [viewType, setViewType] = useState('all');
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  const [alert, setAlert] = useState(null);

  // 登入
  const handleLogin = () => {
    if (password === '123') {
      setIsLoggedIn(true);
      setPasswordError('');
      localStorage.setItem('loggedIn', 'true');
      // 請求通知權限
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
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

  // 通知檢查（每分鐘檢查一次）
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkNotifications = () => {
      const now = new Date();
      const currentDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      meetings.forEach(meeting => {
        if (!meeting.notifications) return;
        
        meeting.notifications.forEach((notif, idx) => {
          if (!notif.enabled) return;
          
          const meetingDateTime = `${meeting.date} ${meeting.startTime || '00:00'}`;
          const notificationTime = calculateNotificationTime(meetingDateTime, notif.minutesBefore);
          
          // 檢查是否該觸發通知（誤差 1 分鐘內）
          if (isTimeWithinRange(currentDateTime, notificationTime, 1)) {
            // 防止重複通知
            if (!meeting.notified) {
              triggerNotification(meeting, notif);
              // 標記為已通知
              const updatedMeetings = meetings.map(m => 
                m.id === meeting.id ? { ...m, notified: true } : m
              );
              setMeetings(updatedMeetings);
            }
          }
        });
      });
    };

    const interval = setInterval(checkNotifications, 60000); // 每分鐘檢查一次
    checkNotifications(); // 初始檢查

    return () => clearInterval(interval);
  }, [meetings, isLoggedIn]);

  // 計算通知時間
  const calculateNotificationTime = (meetingDateTime, minutesBefore) => {
    const [datePart, timePart] = meetingDateTime.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hours, mins] = timePart.split(':');
    
    let date = new Date(year, month - 1, day, hours, mins, 0);
    date.setMinutes(date.getMinutes() - minutesBefore);
    
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 檢查時間範圍
  const isTimeWithinRange = (currentTime, targetTime, minuteRange) => {
    const current = new Date(currentTime.replace(' ', 'T'));
    const target = new Date(targetTime.replace(' ', 'T'));
    const diff = Math.abs(current - target) / 60000; // 轉換為分鐘
    return diff <= minuteRange;
  };

  // 觸發通知
  const triggerNotification = (meeting, notif) => {
    // 1️⃣ 浏览器通知
    if (Notification.permission === 'granted') {
      new Notification(`📅 ${meeting.title}`, {
        body: `即將開始${notif.minutesBefore ? `（${notif.minutesBefore}分鐘後）` : ''}`,
        icon: '📞',
        badge: '📅'
      });
    }

    // 2️⃣ 應用內彈窗
    setAlert({
      title: `🔔 ${meeting.title}`,
      message: `時間：${meeting.date} ${meeting.startTime}\n${notif.minutesBefore ? `提醒：${notif.minutesBefore}分鐘後即將開始` : '即將開始'}`,
      type: meeting.type === 'meeting' ? 'meeting' : 'task'
    });

    // 3️⃣ 聲音提醒
    if (notif.sound) {
      playNotificationSound();
    }
  };

  // 播放聲音
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 播放連續的警報音
      oscillator.frequency.value = 800; // 頻率
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    } catch (e) {
      console.log('聲音播放失敗');
    }
  };

  // 識別會議/工作項目
  const parseMeetingText = (text) => {
    const meeting = {
      id: Date.now(),
      title: '',
      subject: '',
      startTime: '',
      endTime: '',
      date: new Date().toISOString().split('T')[0],
      platform: '',
      link: '',
      organizer: '',
      password: '',
      hostPassword: '',
      location: '',
      phone: '',
      duration: '',
      type: 'meeting',
      notifications: [
        { minutesBefore: 15, enabled: true, sound: true }
      ],
      notified: false,
      notes: text
    };

    // 判斷類型（面試 → meeting，財稅報等 → task）
    const isInterview = text.includes('面試') || text.includes('面试');
    const isTask = (text.includes('財稅報') || text.includes('审核') || text.includes('提交') || text.includes('填寫')) && !isInterview;
    
    if (isTask) {
      meeting.type = 'task';
    } else {
      meeting.type = 'meeting';
    }

    // 提取主題
    const subjectMatch = text.match(/主題[：:]\s*(.+?)[\n$]|主题[：:]\s*(.+?)[\n$]/);
    if (subjectMatch) {
      meeting.subject = subjectMatch[1] || subjectMatch[2];
      meeting.title = meeting.subject;
    }

    // 提取標題
    const titleMatch = text.match(/【(.+?)】|標題[：:]\s*(.+?)[\n$]|^([^【\n：:]{2,40}?)[\n【時間日期]/m);
    if (titleMatch && !meeting.subject) {
      meeting.title = titleMatch[1] || titleMatch[2] || titleMatch[3];
    }

    // 如果還沒有標題，根據內容推斷
    if (!meeting.title) {
      if (isInterview) {
        const nameMatch = text.match(/([林王陳李張劉黃吳周郭何高施曾彭趙]\w{1,2})/);
        meeting.title = nameMatch ? nameMatch[1] + '面試' : '面試';
      } else if (text.includes('財稅報')) {
        meeting.title = '法人財稅報';
      } else if (text.includes('會議')) {
        const titleMatch2 = text.match(/(.{2,20}?)會議/);
        meeting.title = titleMatch2 ? titleMatch2[1] + '會議' : '會議';
      } else {
        meeting.title = '新會議';
      }
    }

    // 提取人名
    const nameMatch = text.match(/([林王陳李張劉黃吳周郭何高施曾彭趙]\w{1,2})/);
    if (nameMatch && isInterview && !meeting.title.includes(nameMatch[1])) {
      meeting.organizer = nameMatch[1];
    }

    // 提取地點
    const locationMatch = text.match(/到(\S+?)[廠場室間區]|地點[：:]\s*([^\n]+)|永寧/);
    if (locationMatch) {
      meeting.location = locationMatch[1] ? locationMatch[1] + (locationMatch[2] || '') : (locationMatch[2] || '永寧廠');
    }

    // 提取時間
    const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      meeting.startTime = `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
    }

    // 提取時長
    const durationMatch = text.match(/時長[：:]\s*(.+?)[\n$]|时长[：:]\s*(.+?)[\n$]/);
    if (durationMatch) {
      meeting.duration = durationMatch[1] || durationMatch[2];
    }

    // 提取日期
    const dateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日|(\d{1,2})[\/年](\d{1,2})/);
    if (dateMatch) {
      if (dateMatch[1]) {
        meeting.date = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`;
      } else if (dateMatch[4] && dateMatch[5]) {
        const month = String(dateMatch[4]).padStart(2, '0');
        const day = String(dateMatch[5]).padStart(2, '0');
        const year = new Date().getFullYear();
        meeting.date = `${year}-${month}-${day}`;
      }
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
    if (text.includes('Webex') || text.includes('webex')) meeting.platform = 'Webex';
    else if (text.includes('Teams') || text.includes('teams')) meeting.platform = 'Teams';
    else if (text.includes('Zoom') || text.includes('zoom')) meeting.platform = 'Zoom';
    else if (text.includes('Google Meet')) meeting.platform = 'Google Meet';
    else if (text.includes('104')) meeting.platform = '104';
    else if (isInterview) meeting.platform = '面試';
    else if (isTask) meeting.platform = '工作';

    // 提取鏈接
    const linkMatch = text.match(/(https?:\/\/[^\s\n]+)/);
    if (linkMatch) meeting.link = linkMatch[1];

    // 提取會議號碼
    const numberMatch = text.match(/號碼[：:]\s*(\d+)|号码[：:]\s*(\d+)/);
    if (numberMatch) {
      meeting.password = numberMatch[1] || numberMatch[2];
    }

    // 提取組織者
    const orgMatch = text.match(/主持人[：:]\s*([^\n]+)|主席[：:]\s*([^\n]+)|寄件人[：:]\s*([^\n]+)|([A-Za-z\s\.]+\s[\u4e00-\u9fff]{2,4})/);
    if (orgMatch) {
      meeting.organizer = orgMatch[1] || orgMatch[2] || orgMatch[3] || orgMatch[4];
    }

    // 提取電話號碼
    const phoneMatch = text.match(/O\s*\+(\d{3}\.\d{1,2}\.\d{4,5}\.\d{4,5})|Ext\.\d+|電話[：:]\s*(\+[\d\.\-\s]+)|集團內分機[：:]\s*(\(.+?\)[\d]+)/);
    if (phoneMatch) {
      meeting.phone = phoneMatch[1] || phoneMatch[2] || phoneMatch[3] || '';
    }

    // 提取會議密碼
    const pwMatch = text.match(/密碼[：:]\s*([^\n\s]+)|密码[：:]\s*([^\n\s]+)/);
    if (pwMatch) meeting.password = pwMatch[1] || pwMatch[2];

    // 提取主持人密碼
    const hostPwMatch = text.match(/主持人密碼[：:]\s*([^\n\s]+)|主持人號碼[：:]\s*([^\n\s]+)|主持人[密码][：:]\s*([^\n\s]+)/);
    if (hostPwMatch) meeting.hostPassword = hostPwMatch[1] || hostPwMatch[2] || hostPwMatch[3];

    return meeting;
  };

  // 添加會議
  const handleAddMeeting = () => {
    if (!inputText.trim()) {
      alert('請貼入會議信息');
      return;
    }

    const meeting = parseMeetingText(inputText);
    
    // 根據當前菜單決定類型
    if (viewType === 'meeting') {
      meeting.type = 'meeting';
    } else if (viewType === 'task') {
      meeting.type = 'task';
    } else {
      meeting.type = 'meeting';
    }

    setMeetings([...meetings, meeting]);
    setInputText('');
    alert(`✅ 已添加：${meeting.title}`);
  };

  // 編輯會議
  const handleEditStart = (meeting) => {
    setEditingId(meeting.id);
    setEditForm({ ...meeting });
  };

  const handleEditChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const handleEditSave = () => {
    setMeetings(meetings.map(m => m.id === editingId ? editForm : m));
    setEditingId(null);
    alert('✅ 已更新');
  };

  const handleEditCancel = () => {
    setEditingId(null);
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
          placeholder="貼入 Webex / Teams / 面試 / 郵件信息..."
          className={styles.largeInput}
        />
        <button onClick={handleAddMeeting} className={styles.addBtn}>➕ 添加</button>
      </div>

      {/* 內容區 */}
      <div className={styles.contentSection}>
        {viewType === 'all' && (
          <div className={styles.allViewContainer}>
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
                  
                  const hasMeeting = dayMeetings.some(m => m.type === 'meeting');
                  const hasTask = dayMeetings.some(m => m.type === 'task');
                  
                  return (
                    <div 
                      key={day} 
                      className={`${styles.calendarDay} ${isSelected ? styles.selected : ''}`}
                      onClick={() => setSelectedDate(dateStr)}
                    >
                      <div className={styles.dayNum}>{day}</div>
                      <div className={styles.dotsContainer}>
                        {hasMeeting && <span className={styles.dotMeeting}></span>}
                        {hasTask && <span className={styles.dotTask}></span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.listPanel}>
              <h2>📌 {selectedDate} ({getSelectedDateMeetings().length})</h2>
              {getSelectedDateMeetings().length === 0 ? (
                <p className={styles.noData}>暫無行程</p>
              ) : (
                <div className={styles.meetingsList}>
                  {getSelectedDateMeetings().map(m => (
                    <MeetingCard 
                      key={m.id} 
                      meeting={m}
                      isEditing={editingId === m.id}
                      editForm={editForm}
                      onEditStart={handleEditStart}
                      onEditChange={handleEditChange}
                      onEditSave={handleEditSave}
                      onEditCancel={handleEditCancel}
                      onDelete={handleDeleteMeeting}
                      onCopy={copyToClipboard}
                    />
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
                  <MeetingCard 
                    key={m.id} 
                    meeting={m}
                    isEditing={editingId === m.id}
                    editForm={editForm}
                    onEditStart={handleEditStart}
                    onEditChange={handleEditChange}
                    onEditSave={handleEditSave}
                    onEditCancel={handleEditCancel}
                    onDelete={handleDeleteMeeting}
                    onCopy={copyToClipboard}
                  />
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
                  <MeetingCard 
                    key={m.id} 
                    meeting={m}
                    isEditing={editingId === m.id}
                    editForm={editForm}
                    onEditStart={handleEditStart}
                    onEditChange={handleEditChange}
                    onEditSave={handleEditSave}
                    onEditCancel={handleEditCancel}
                    onDelete={handleDeleteMeeting}
                    onCopy={copyToClipboard}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 編輯模態框 */}
      {editingId && <EditModal meeting={editForm} onChange={handleEditChange} onSave={handleEditSave} onCancel={handleEditCancel} />}

      {/* 通知彈窗 */}
      {alert && <AlertModal alert={alert} onClose={() => setAlert(null)} />}
    </div>
  );
}

// 會議卡片
function MeetingCard({ meeting, isEditing, editForm, onEditStart, onEditChange, onEditSave, onEditCancel, onDelete, onCopy }) {
  const styles = require('../styles/Home.module.css');
  
  if (isEditing) {
    return (
      <div className={styles.meetingCard}>
        <div className={styles.editForm}>
          <input 
            type="text" 
            value={editForm.title} 
            onChange={(e) => onEditChange('title', e.target.value)}
            placeholder="標題"
            className={styles.editInput}
          />
          <select 
            value={editForm.type} 
            onChange={(e) => onEditChange('type', e.target.value)}
            className={styles.editSelect}
          >
            <option value="meeting">會議</option>
            <option value="task">工作項目</option>
          </select>
          <input 
            type="text" 
            value={editForm.startTime} 
            onChange={(e) => onEditChange('startTime', e.target.value)}
            placeholder="時間 (HH:MM)"
            className={styles.editInput}
          />
          <input 
            type="text" 
            value={editForm.password} 
            onChange={(e) => onEditChange('password', e.target.value)}
            placeholder="會議密碼"
            className={styles.editInput}
          />
          <input 
            type="text" 
            value={editForm.hostPassword} 
            onChange={(e) => onEditChange('hostPassword', e.target.value)}
            placeholder="主持人密碼"
            className={styles.editInput}
          />
          <div className={styles.editActions}>
            <button onClick={onEditSave} className={styles.saveBtn}>💾 保存</button>
            <button onClick={onEditCancel} className={styles.cancelBtn}>✕ 取消</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.meetingCard} ${styles[meeting.type]}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTime}>{meeting.startTime || '--:--'}</div>
        <div className={styles.cardTitle}>{meeting.title}</div>
      </div>

      <div className={styles.cardInfo}>
        {meeting.subject && <div className={styles.detail}>📌 {meeting.subject}</div>}
        {meeting.date && <div className={styles.detail}>📅 {meeting.date}</div>}
        {meeting.duration && <div className={styles.detail}>⏱️ {meeting.duration}</div>}
        {meeting.platform && <div className={styles.badge}>{meeting.platform}</div>}
        {meeting.location && <div className={styles.detail}>📍 {meeting.location}</div>}
        {meeting.organizer && <div className={styles.detail}>👤 {meeting.organizer}</div>}
        {meeting.phone && <div className={styles.detail}>☎️ {meeting.phone}</div>}
        {meeting.link && <div className={styles.detail}>🔗 <a href={meeting.link} target="_blank" rel="noopener noreferrer">會議鏈接</a></div>}
        {meeting.password && <div className={styles.detail}>🔑 {meeting.password}</div>}
        {meeting.hostPassword && <div className={styles.detail}>🔐 主持人密碼: {meeting.hostPassword}</div>}
        {meeting.notifications && meeting.notifications.length > 0 && (
          <div className={styles.detail}>🔔 提醒設置：{meeting.notifications.map(n => `提前${n.minutesBefore}分鐘`).join(', ')}</div>
        )}
      </div>

      <div className={styles.actions}>
        {meeting.link && <button onClick={() => window.open(meeting.link, '_blank')} className={styles.actionBtn}>🔗 加入</button>}
        {meeting.password && <button onClick={() => onCopy(meeting.password)} className={styles.actionBtn}>📋 複製</button>}
        <button onClick={() => onEditStart(meeting)} className={styles.actionBtn}>✏️ 編輯</button>
        <button onClick={() => onDelete(meeting.id)} className={`${styles.actionBtn} ${styles.delete}`}>🗑 刪除</button>
      </div>
    </div>
  );
}

// 編輯模態框
function EditModal({ meeting, onChange, onSave, onCancel }) {
  const styles = require('../styles/Home.module.css');
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>編輯會議</h2>
        <div className={styles.modalForm}>
          <label>標題</label>
          <input 
            type="text" 
            value={meeting.title} 
            onChange={(e) => onChange('title', e.target.value)}
            className={styles.formInput}
          />
          
          <label>類型</label>
          <select 
            value={meeting.type} 
            onChange={(e) => onChange('type', e.target.value)}
            className={styles.formSelect}
          >
            <option value="meeting">會議</option>
            <option value="task">工作項目</option>
          </select>
          
          <label>主題</label>
          <input 
            type="text" 
            value={meeting.subject} 
            onChange={(e) => onChange('subject', e.target.value)}
            className={styles.formInput}
          />
          
          <label>時間</label>
          <input 
            type="text" 
            value={meeting.startTime} 
            onChange={(e) => onChange('startTime', e.target.value)}
            placeholder="HH:MM"
            className={styles.formInput}
          />
          
          <label>日期</label>
          <input 
            type="text" 
            value={meeting.date} 
            onChange={(e) => onChange('date', e.target.value)}
            placeholder="YYYY-MM-DD"
            className={styles.formInput}
          />
          
          <label>時長</label>
          <input 
            type="text" 
            value={meeting.duration} 
            onChange={(e) => onChange('duration', e.target.value)}
            className={styles.formInput}
          />
          
          <label>平台</label>
          <input 
            type="text" 
            value={meeting.platform} 
            onChange={(e) => onChange('platform', e.target.value)}
            className={styles.formInput}
          />
          
          <label>會議鏈接</label>
          <input 
            type="text" 
            value={meeting.link} 
            onChange={(e) => onChange('link', e.target.value)}
            className={styles.formInput}
          />
          
          <label>會議密碼</label>
          <input 
            type="text" 
            value={meeting.password} 
            onChange={(e) => onChange('password', e.target.value)}
            className={styles.formInput}
          />
          
          <label>主持人密碼</label>
          <input 
            type="text" 
            value={meeting.hostPassword} 
            onChange={(e) => onChange('hostPassword', e.target.value)}
            className={styles.formInput}
          />
          
          <label>主持人</label>
          <input 
            type="text" 
            value={meeting.organizer} 
            onChange={(e) => onChange('organizer', e.target.value)}
            className={styles.formInput}
          />
          
          <label>地點</label>
          <input 
            type="text" 
            value={meeting.location} 
            onChange={(e) => onChange('location', e.target.value)}
            className={styles.formInput}
          />
          
          <label>電話</label>
          <input 
            type="text" 
            value={meeting.phone} 
            onChange={(e) => onChange('phone', e.target.value)}
            className={styles.formInput}
          />
          
          <label>🔔 提醒設置</label>
          <div className={styles.notificationSettings}>
            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={meeting.notifications?.[0]?.enabled || false}
                onChange={(e) => {
                  const notifs = [...(meeting.notifications || [])];
                  if (!notifs[0]) notifs[0] = { minutesBefore: 15, enabled: true, sound: true };
                  notifs[0].enabled = e.target.checked;
                  onChange('notifications', notifs);
                }}
              />
              提前 15 分鐘提醒
            </label>
            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox"
                checked={meeting.notifications?.[0]?.sound || false}
                onChange={(e) => {
                  const notifs = [...(meeting.notifications || [])];
                  if (!notifs[0]) notifs[0] = { minutesBefore: 15, enabled: true, sound: true };
                  notifs[0].sound = e.target.checked;
                  onChange('notifications', notifs);
                }}
              />
              開啟聲音提醒
            </label>
          </div>
        </div>
        
        <div className={styles.modalActions}>
          <button onClick={onSave} className={styles.modalSaveBtn}>💾 保存</button>
          <button onClick={onCancel} className={styles.modalCancelBtn}>✕ 取消</button>
        </div>
      </div>
    </div>
  );
}

// 通知彈窗
function AlertModal({ alert, onClose }) {
  const styles = require('../styles/Home.module.css');
  
  useEffect(() => {
    const timer = setTimeout(onClose, 6000); // 6秒後自動關閉
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={styles.alertOverlay}>
      <div className={`${styles.alertBox} ${styles[`alert-${alert.type}`]}`}>
        <div className={styles.alertTitle}>{alert.title}</div>
        <div className={styles.alertMessage}>{alert.message}</div>
        <button onClick={onClose} className={styles.alertClose}>✕</button>
      </div>
    </div>
  );
}
