import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [meetings, setMeetings] = useState([]);
  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: '貼入 Webex/Teams 會議信息，我會自動識別並添加到你的日程。' }
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
      time: '',
      date: new Date().toISOString().split('T')[0],
      platform: '',
      link: '',
      password: '',
      notes: text
    };

    // 提取標題
    const titleMatch = text.match(/【(.+?)】|會議名稱[：:]\s*(.+?)[\n$]|標題[：:]\s*(.+?)[\n$]/);
    if (titleMatch) meeting.title = titleMatch[1] || titleMatch[2] || titleMatch[3];

    // 提取時間
    const timeMatch = text.match(/(\d{1,2}):(\d{2})|(\d{1,2})點|時間[：:]\s*(.+?)[\n$]/);
    if (timeMatch) {
      const hour = timeMatch[1] || timeMatch[3] || timeMatch[4];
      const min = timeMatch[2] || '00';
      meeting.time = `${hour}:${min}`;
    }

    // 提取日期
    const dateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日|(\d{1,2})\/(\d{1,2})|下週[一二三四五六日]|明天|今天/);
    if (dateMatch) {
      if (dateMatch[1]) {
        meeting.date = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`;
      }
    }

    // 提取平台
    if (text.includes('Webex') || text.includes('webex')) meeting.platform = 'Webex';
    if (text.includes('Teams') || text.includes('teams')) meeting.platform = 'Teams';
    if (text.includes('Google Meet') || text.includes('meet')) meeting.platform = 'Google Meet';
    if (text.includes('Zoom') || text.includes('zoom')) meeting.platform = 'Zoom';

    // 提取鏈接
    const linkMatch = text.match(/(https?:\/\/[^\s]+)/);
    if (linkMatch) meeting.link = linkMatch[1];

    // 提取密碼
    const passwordMatch = text.match(/密碼[：:]\s*(\S+)|密码[：:]\s*(\S+)|\*{3,}|(\d{6})/);
    if (passwordMatch) meeting.password = passwordMatch[1] || passwordMatch[2] || passwordMatch[3];

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
      { role: 'user', text: inputText },
      { role: 'assistant', text: `✅ 已添加會議：${meeting.title} ${meeting.time} (${meeting.platform})` }
    ]);
    setInputText('');
    alert('✅ 會議已添加');
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
    if (chatInput.includes('會議')) response = '我看到這是會議信息。';
    if (chatInput.includes('時間')) response = '時間已記錄。';
    if (chatInput.includes('Webex') || chatInput.includes('Teams')) response = '平台信息已識別。';

    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    }, 300);

    setChatInput('');
  };

  // 衝突檢測
  const checkConflicts = () => {
    const conflicts = [];
    for (let i = 0; i < meetings.length; i++) {
      for (let j = i + 1; j < meetings.length; j++) {
        if (meetings[i].date === meetings[j].date && 
            meetings[i].time === meetings[j].time) {
          conflicts.push([meetings[i], meetings[j]]);
        }
      }
    }
    return conflicts;
  };

  // 繁忙度
  const getBusyLevel = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayMeetings = meetings.filter(m => m.date === today);
    
    if (todayMeetings.length === 0) return { text: '閒', color: '#27ae60' };
    if (todayMeetings.length <= 2) return { text: '不忙', color: '#f39c12' };
    if (todayMeetings.length <= 4) return { text: '有點忙', color: '#e67e22' };
    return { text: '很忙', color: '#e74c3c' };
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

  const busyLevel = getBusyLevel();
  const conflicts = checkConflicts();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📅 日程助理</h1>
        <div className={styles.busyBadge} style={{ backgroundColor: busyLevel.color }}>
          {busyLevel.text}
        </div>
      </div>

      {/* 簡單輸入區 */}
      <div className={styles.inputSection}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="貼入 Webex / Teams 會議信息..."
          className={styles.mainInput}
        />
        <button onClick={handleAddMeeting} className={styles.addBtn}>
          ➕ 添加會議
        </button>
      </div>

      {/* 會議卡片 */}
      <div className={styles.meetingsSection}>
        <h2>📌 會議日程</h2>
        
        {meetings.length === 0 ? (
          <p className={styles.noData}>還沒有會議</p>
        ) : (
          <div className={styles.meetingsList}>
            {meetings.map(meeting => (
              <div key={meeting.id} className={styles.meetingCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.dateTime}>
                    <div className={styles.date}>{meeting.date}</div>
                    <div className={styles.time}>{meeting.time || '--:--'}</div>
                  </div>
                  <div className={styles.cardTitle}>{meeting.title}</div>
                </div>
                
                <div className={styles.cardBody}>
                  {meeting.platform && (
                    <div className={styles.badge}>{meeting.platform}</div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  {meeting.link && (
                    <button 
                      onClick={() => window.open(meeting.link, '_blank')}
                      className={styles.actionBtn}
                      title="加入會議"
                    >
                      🔗 加入
                    </button>
                  )}
                  {meeting.password && (
                    <button 
                      onClick={() => copyToClipboard(meeting.password)}
                      className={styles.actionBtn}
                      title="複製密碼"
                    >
                      🔑 {meeting.password}
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteMeeting(meeting.id)}
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    title="刪除"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 衝突提醒 */}
      {conflicts.length > 0 && (
        <div className={styles.conflictAlert}>
          <h3>⚠️ 時間衝突</h3>
          {conflicts.map((conflict, idx) => (
            <div key={idx} className={styles.conflictItem}>
              {conflict[0].title} 和 {conflict[1].title} 在 {conflict[0].time} 衝突
            </div>
          ))}
        </div>
      )}

      {/* 對話框 */}
      <div className={styles.chatSection}>
        <h2>💬 對話</h2>
        <div className={styles.chatBox}>
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
              onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="問我任何問題..."
              className={styles.chatInputBox}
            />
            <button onClick={handleSendChat} className={styles.chatSendBtn}>發送</button>
          </div>
        </div>
      </div>
    </div>
  );
}
