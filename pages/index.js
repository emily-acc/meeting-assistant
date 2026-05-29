import React, { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

// 增強的本地識別模塊
const enhancedTextParser = {
  extractTitle: (text) => {
    const patterns = [
      /[主題标题][:：]\s*([^\n]+)/,
      /^【([^\】]+)】/,
    ];
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return text.split('\n')[0].trim();
  },

  extractDate: (text) => {
    const patterns = [
      /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/,
      /(\d{1,2})月\s*(\d{1,2})日(?=\s*[（\(]|[週周]|上|下|午)/,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match.length === 4) {
          const year = match[1];
          const month = String(match[2]).padStart(2, '0');
          const day = String(match[3]).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } else if (match.length === 3) {
          const year = new Date().getFullYear();
          const month = String(match[1]).padStart(2, '0');
          const day = String(match[2]).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
    }
    return '';
  },

  extractTime: (text) => {
    const patterns = [
      { regex: /上午\s*(\d{1,2}):(\d{2})/, isAM: true },
      { regex: /下午\s*(\d{1,2}):(\d{2})/, isAM: false },
      { regex: /(\d{1,2}):(\d{2}):(\d{2})/, isTime: true },
      { regex: /(\d{1,2}):(\d{2})(?!:)/, isTime: true },
    ];

    for (let item of patterns) {
      const match = text.match(item.regex);
      if (match) {
        if (item.isAM !== undefined) {
          let hour = parseInt(match[1]);
          if (!item.isAM && hour !== 12) hour += 12;
          if (item.isAM && hour === 12) hour = 0;
          return `${String(hour).padStart(2, '0')}:${match[2]}`;
        } else if (item.isTime) {
          return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
        }
      }
    }
    return '';
  },

  extractEndTime: (text) => {
    const patterns = [
      /–\s*(\d{1,2}):(\d{2})/,
      /至\s*(\d{1,2}):(\d{2})/,
      /\s*-\s*(\d{1,2}):(\d{2})/,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
      }
    }
    return '';
  },

  extractPassword: (text) => {
    const patterns = [
      /[密碼password]+[：:]\s*([A-Za-z0-9]+)/i,
      /密码\s*[:：]\s*([A-Za-z0-9]+)/i,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  },

  extractMeetingNumber: (text) => {
    const patterns = [
      /[號号码][:：]\s*([0-9]+)/,
      /[識別碼meeting\s]+[id]*[：:]\s*([0-9\s]+)/i,
      /会议号\s*[:：]\s*([0-9]+)/i,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].replace(/\s/g, '').trim();
      }
    }
    return '';
  },

  extractLink: (text) => {
    const match = text.match(/(https:\/\/[^\s]+)/);
    return match ? match[0].trim() : '';
  },

  extractLocation: (text) => {
    const patterns = [
      /[引擎类型][:：]\s*([^\n]+)/i,
      /会议类型\s*[:：]\s*([^\n]+)/i,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }

    if (text.match(/webex/i)) return 'Webex';
    if (text.match(/teams|microsoft/i)) return 'Microsoft Teams';
    if (text.match(/zoom/i)) return 'Zoom';
    return '';
  },

  extractAttendees: (text) => {
    const patterns = [
      /[參参]加[對对]象[:：]\s*([^\n]+)/,
      /參加者\s*[:：]\s*([^\n]+)/i,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }
};

// Gemini AI 識別
const identifyWithAI = async (text, apiKey) => {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `請精確分析這段會議邀請或工作郵件，按照以下格式提取信息（如果沒有則為空字符串）：

【會議信息】
會議標題: 
開始日期: (YYYY-MM-DD格式)
開始時間: (HH:MM格式)
結束時間: (HH:MM格式)
會議地點: 
主持人名稱: 
會議密碼: 
會議連結: (完整URL)
會議識別碼: 
參加對象: 

【工作信息】
工作標題: 
截止日期: (YYYY-MM-DD格式)
截止時間: (HH:MM格式)
聯絡人名稱:
聯絡人電話:

回復格式：只回復JSON，不要其他文字。

郵件內容：
${text}`
          }]
        }]
      })
    });

    const data = await response.json();
    const content = data.contents[0].parts[0].text;
    
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (e) {
      return null;
    }
  } catch (error) {
    console.error('AI 識別失敗:', error);
    return null;
  }
};

const enhanceIdentification = (aiResult, text) => {
  const result = aiResult || {};
  if (!result['會議連結'] || result['會議連結'] === '') {
    result['會議連結'] = enhancedTextParser.extractLink(text);
  }
  if (!result['會議密碼'] || result['會議密碼'] === '') {
    result['會議密碼'] = enhancedTextParser.extractPassword(text);
  }
  if (!result['會議識別碼'] || result['會議識別碼'] === '') {
    result['會議識別碼'] = enhancedTextParser.extractMeetingNumber(text);
  }
  return result;
};

// 主應用
export default function Home() {
  const [activeTab, setActiveTab] = useState('all');
  const [meetings, setMeetings] = useState([]);
  const [todoWorks, setTodoWorks] = useState([]);
  const [recurringWorks, setRecurringWorks] = useState([]);
  
  const [meetingInput, setMeetingInput] = useState('');
  const [todoInput, setTodoInput] = useState('');
  const [recurringInput, setRecurringInput] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isIdentifying, setIsIdentifying] = useState(false);

  const GEMINI_API_KEY = 'AIzaSyBzgBpDj-8zY-TAzhnNjcZFarf18XoP0mw';

  const frequencyText = {
    daily: '每日',
    weekly: '每週',
    monthly: '每月',
    yearly: '每年'
  };

  // 保存到 localStorage
  useEffect(() => {
    const saved = localStorage.getItem('appData');
    if (saved) {
      const data = JSON.parse(saved);
      setMeetings(data.meetings || []);
      setTodoWorks(data.todoWorks || []);
      setRecurringWorks(data.recurringWorks || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('appData', JSON.stringify({ meetings, todoWorks, recurringWorks }));
  }, [meetings, todoWorks, recurringWorks]);

  const openWorkModal = (work = null) => {
    setModalType('work');
    setModalData(work);
    setShowModal(true);
  };

  const openMeetingModal = (meeting = null) => {
    setModalType('meeting');
    setModalData(meeting);
    setShowModal(true);
  };

  const saveWork = (workData) => {
    if (workData.id) {
      if (workData.isRecurring) {
        setRecurringWorks(recurringWorks.map(w => w.id === workData.id ? workData : w));
      } else {
        setTodoWorks(todoWorks.map(w => w.id === workData.id ? workData : w));
      }
    } else {
      const newWork = { ...workData, id: `work-${Date.now()}`, createdAt: new Date().toISOString() };
      if (workData.isRecurring) {
        setRecurringWorks([...recurringWorks, newWork]);
      } else {
        setTodoWorks([...todoWorks, newWork]);
      }
    }
    setShowModal(false);
    setPastedText('');
  };

  const saveMeeting = (meetingData) => {
    if (meetingData.id) {
      setMeetings(meetings.map(m => m.id === meetingData.id ? meetingData : m));
    } else {
      const newMeeting = { ...meetingData, id: `meeting-${Date.now()}`, createdAt: new Date().toISOString() };
      setMeetings([...meetings, newMeeting]);
    }
    setShowModal(false);
    setPastedText('');
  };

  const handleQuickAddMeeting = () => {
    if (!meetingInput.trim()) return;
    const meeting = {
      title: meetingInput.split('\n')[0],
      startDate: '',
      startTime: '',
      endTime: '',
      location: '',
      chairman: '',
      password: '',
      link: '',
      meetingNumber: '',
      attendees: '',
      originalText: meetingInput
    };
    setMeetings([...meetings, meeting]);
    setMeetingInput('');
  };

  const handleQuickAddTodo = () => {
    if (!todoInput.trim()) return;
    const work = {
      title: todoInput.split('\n')[0],
      dueDate: '',
      dueTime: '',
      contact: null,
      phone: null,
      isRecurring: false,
      originalText: todoInput
    };
    setTodoWorks([...todoWorks, work]);
    setTodoInput('');
  };

  const handleQuickAddRecurring = () => {
    if (!recurringInput.trim()) return;
    const work = {
      title: recurringInput.split('\n')[0],
      dueDate: '',
      dueTime: '',
      contact: null,
      phone: null,
      isRecurring: true,
      frequency: 'daily',
      originalText: recurringInput
    };
    setRecurringWorks([...recurringWorks, work]);
    setRecurringInput('');
  };

  const handlePasteMeeting = async (text) => {
    if (!text.trim()) {
      alert('請貼入會議郵件');
      return;
    }

    setIsIdentifying(true);

    try {
      const localResult = {
        title: enhancedTextParser.extractTitle(text),
        startDate: enhancedTextParser.extractDate(text),
        startTime: enhancedTextParser.extractTime(text),
        endTime: enhancedTextParser.extractEndTime(text),
        location: enhancedTextParser.extractLocation(text),
        password: enhancedTextParser.extractPassword(text),
        link: enhancedTextParser.extractLink(text),
        meetingNumber: enhancedTextParser.extractMeetingNumber(text),
        attendees: enhancedTextParser.extractAttendees(text),
        chairman: ''
      };

      if (localResult.title || localResult.link) {
        const meeting = { ...localResult, originalText: text };
        openMeetingModal(meeting);
        setPastedText('');
        setIsIdentifying(false);
        return;
      }

      let aiResult = await identifyWithAI(text, GEMINI_API_KEY);
      if (aiResult) {
        aiResult = enhanceIdentification(aiResult, text);
      }

      const meeting = {
        title: aiResult?.['會議標題'] || localResult.title,
        startDate: aiResult?.['開始日期'] || localResult.startDate,
        startTime: aiResult?.['開始時間'] || localResult.startTime,
        endTime: aiResult?.['結束時間'] || localResult.endTime,
        location: aiResult?.['會議地點'] || localResult.location,
        chairman: aiResult?.['主持人名稱'] || '',
        password: aiResult?.['會議密碼'] || localResult.password,
        link: aiResult?.['會議連結'] || localResult.link,
        meetingNumber: aiResult?.['會議識別碼'] || localResult.meetingNumber,
        attendees: aiResult?.['參加對象'] || localResult.attendees,
        originalText: text
      };

      openMeetingModal(meeting);
      setPastedText('');
    } catch (error) {
      console.error('識別失敗:', error);
      alert('識別失敗，請手動填入');
    } finally {
      setIsIdentifying(false);
    }
  };

  const handlePasteTodo = async (text) => {
    if (!text.trim()) return;
    setIsIdentifying(true);

    const work = {
      title: enhancedTextParser.extractTitle(text),
      dueDate: enhancedTextParser.extractDate(text),
      dueTime: enhancedTextParser.extractTime(text),
      contact: '',
      phone: '',
      isRecurring: false,
      originalText: text
    };

    openWorkModal(work);
    setPastedText('');
    setIsIdentifying(false);
  };

  const handlePasteRecurring = async (text) => {
    if (!text.trim()) return;
    setIsIdentifying(true);

    const work = {
      title: enhancedTextParser.extractTitle(text),
      dueDate: enhancedTextParser.extractDate(text),
      dueTime: enhancedTextParser.extractTime(text),
      contact: '',
      phone: '',
      isRecurring: true,
      frequency: 'daily',
      originalText: text
    };

    openWorkModal(work);
    setPastedText('');
    setIsIdentifying(false);
  };

  const deleteWork = (id, isRecurring) => {
    if (isRecurring) {
      setRecurringWorks(recurringWorks.filter(w => w.id !== id));
    } else {
      setTodoWorks(todoWorks.filter(w => w.id !== id));
    }
  };

  const deleteMeeting = (id) => {
    setMeetings(meetings.filter(m => m.id !== id));
  };

  const completeWork = (id, isRecurring) => {
    if (isRecurring) {
      setRecurringWorks(recurringWorks.map(w => w.id === id ? { ...w, lastCompleted: new Date().toISOString() } : w));
    } else {
      setTodoWorks(todoWorks.map(w => w.id === id ? { ...w, completed: true } : w));
    }
  };

  const renderCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const hasEvent = (day) => {
      if (!day) return false;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return meetings.some(m => m.startDate === dateStr) ||
             todoWorks.some(w => w.dueDate === dateStr && !w.completed) ||
             recurringWorks.some(w => w.dueDate === dateStr);
    };

    return (
      <div className={styles.calendar}>
        <div className={styles.calendarHeader}>
          <button onClick={() => setSelectedDate(new Date(year, month - 1, 1))}>←</button>
          <span>{year}年 {month + 1}月</span>
          <button onClick={() => setSelectedDate(new Date(year, month + 1, 1))}>→</button>
        </div>
        <div className={styles.calendarGrid}>
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className={styles.weekday}>{d}</div>
          ))}
          {days.map((day, idx) => (
            <div
              key={idx}
              className={`${styles.calendarDay} ${day ? styles.hasDay : ''} ${hasEvent(day) ? styles.hasEvent : ''}`}
              onClick={() => day && setSelectedDate(new Date(year, month, day))}
            >
              {day}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAllSchedule = () => {
    const allItems = [];
    meetings.forEach(m => {
      if (m.startDate) allItems.push({ type: 'meeting', data: m, date: m.startDate, time: m.startTime });
    });
    todoWorks.forEach(w => {
      if (w.dueDate && !w.completed) allItems.push({ type: 'todo', data: w, date: w.dueDate, time: w.dueTime });
    });
    recurringWorks.forEach(w => {
      if (w.dueDate) allItems.push({ type: 'recurring', data: w, date: w.dueDate, time: w.dueTime });
    });
    allItems.sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });

    return (
      <div className={styles.scheduleContainer}>
        <div className={styles.calendarSection}>{renderCalendar()}</div>
        <div className={styles.listSection}>
          <h3>行程和工作</h3>
          {allItems.length === 0 ? (
            <p className={styles.empty}>無行程</p>
          ) : (
            allItems.map((item, idx) => (
              <div key={idx} className={styles.smallItemCard}>
                {item.type === 'meeting' && (
                  <>
                    {item.time && <div className={styles.smallTime}>{item.time}</div>}
                    <div className={styles.smallTitle}>📞 {item.data.title}</div>
                    <div className={styles.smallMeta}>{item.date}</div>
                    {item.data.link && <a href={item.data.link} target="_blank" rel="noopener noreferrer" className={styles.smallLink}>🔗</a>}
                  </>
                )}
                {item.type === 'todo' && (
                  <>
                    <div className={styles.smallTitle}>📝 {item.data.title}</div>
                    <div className={styles.smallMeta}>{item.date}</div>
                  </>
                )}
                {item.type === 'recurring' && (
                  <>
                    <div className={styles.smallTitle}>♻️ {item.data.title}</div>
                    <div className={styles.smallMeta}>{item.date}</div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderMeetings = () => {
    const sorted = [...meetings].sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      const dateCompare = new Date(a.startDate) - new Date(b.startDate);
      if (dateCompare !== 0) return dateCompare;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    const handleAdd = () => handleQuickAddMeeting();

    return (
      <div className={styles.listContainer}>
        <h2>📞 會議時程 ({sorted.length})</h2>
        <div className={styles.quickAddForm}>
          <input
            type="text"
            placeholder="快速輸入會議..."
            value={meetingInput}
            onChange={(e) => setMeetingInput(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleAdd(); }}
            className={styles.input}
          />
          <button onClick={handleAdd} className={styles.addBtn}>➕</button>
          <button 
            onClick={() => { setPastedText(''); setShowModal(true); setModalType('pasteModal'); }} 
            className={styles.pasteBtn}
            disabled={isIdentifying}
          >
            {isIdentifying ? '...' : '📋'}
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className={styles.empty}>無會議</p>
        ) : (
          sorted.map(m => (
            <div key={m.id} className={styles.meetingCard}>
              <div className={styles.timeBlock}>
                {m.startTime && <div className={styles.time}>{m.startTime}</div>}
                {m.startDate && <div className={styles.date}>{m.startDate}</div>}
              </div>

              <div className={styles.contentBlock}>
                <div className={styles.title}>{m.title}</div>
                
                <div className={styles.infoGrid}>
                  {m.location && <div className={styles.info}>📍 {m.location}</div>}
                  {m.meetingNumber && <div className={styles.info}>🆔 {m.meetingNumber}</div>}
                  {m.password && <div className={styles.info}>🔐 {m.password}</div>}
                  {m.chairman && <div className={styles.info}>👤 {m.chairman}</div>}
                  {m.endTime && <div className={styles.info}>⏱️ {m.endTime}</div>}
                </div>

                {m.link && (
                  <div className={styles.linkBlock}>
                    <a href={m.link} target="_blank" rel="noopener noreferrer" className={styles.meetLink}>
                      🔗 {m.link.length > 60 ? m.link.substring(0, 60) + '...' : m.link}
                    </a>
                  </div>
                )}

                {m.attendees && <div className={styles.info}>{m.attendees}</div>}

                <div className={styles.actionButtons}>
                  {m.link && (
                    <button 
                      onClick={() => window.open(m.link, '_blank')}
                      className={styles.joinBtn}
                    >
                      加入
                    </button>
                  )}
                  <button 
                    onClick={() => openMeetingModal(m)}
                    className={styles.editBtn}
                  >
                    編輯
                  </button>
                  <button 
                    onClick={() => deleteMeeting(m.id)}
                    className={styles.deleteBtn}
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderTodos = () => {
    const sorted = [...todoWorks]
      .filter(w => !w.completed)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

    const handleAdd = () => handleQuickAddTodo();

    return (
      <div className={styles.listContainer}>
        <h2>📝 待辦清單 ({sorted.length})</h2>
        <div className={styles.quickAddForm}>
          <input
            type="text"
            placeholder="快速輸入工作..."
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleAdd(); }}
            className={styles.input}
          />
          <button onClick={handleAdd} className={styles.addBtn}>➕</button>
          <button 
            onClick={() => { setPastedText(''); setShowModal(true); setModalType('pasteTodoModal'); }} 
            className={styles.pasteBtn}
            disabled={isIdentifying}
          >
            {isIdentifying ? '...' : '📋'}
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className={styles.empty}>無待做工作</p>
        ) : (
          sorted.map(w => (
            <div key={w.id} className={styles.workCard}>
              <div className={styles.workHeader}>
                <div className={styles.title}>{w.title}</div>
                <div className={styles.workActions}>
                  <button onClick={() => completeWork(w.id, false)} className={styles.completeBtn}>✓</button>
                  <button onClick={() => openWorkModal(w)} className={styles.editBtn}>✎</button>
                  <button onClick={() => deleteWork(w.id, false)} className={styles.deleteBtn}>✕</button>
                </div>
              </div>
              
              {w.dueDate && <div className={styles.info}>📅 {w.dueDate} {w.dueTime ? `${w.dueTime}` : ''}</div>}
              {w.contact && <div className={styles.info}>👤 {w.contact}</div>}
              {w.phone && <div className={styles.info}>📞 {w.phone}</div>}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderRecurring = () => {
    const sorted = [...recurringWorks].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const handleAdd = () => handleQuickAddRecurring();

    return (
      <div className={styles.listContainer}>
        <h2>♻️ 例行工作 ({sorted.length})</h2>
        <div className={styles.quickAddForm}>
          <input
            type="text"
            placeholder="快速輸入例行工作..."
            value={recurringInput}
            onChange={(e) => setRecurringInput(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleAdd(); }}
            className={styles.input}
          />
          <button onClick={handleAdd} className={styles.addBtn}>➕</button>
          <button 
            onClick={() => { setPastedText(''); setShowModal(true); setModalType('pasteRecurringModal'); }} 
            className={styles.pasteBtn}
            disabled={isIdentifying}
          >
            {isIdentifying ? '...' : '📋'}
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className={styles.empty}>無例行工作</p>
        ) : (
          sorted.map(w => (
            <div key={w.id} className={styles.recurringCard}>
              <div className={styles.workHeader}>
                <div className={styles.title}>{w.title}</div>
                <div className={styles.workActions}>
                  <button onClick={() => completeWork(w.id, true)} className={styles.completeBtn}>✓</button>
                  <button onClick={() => openWorkModal(w)} className={styles.editBtn}>✎</button>
                  <button onClick={() => deleteWork(w.id, true)} className={styles.deleteBtn}>✕</button>
                </div>
              </div>
              
              <div className={styles.info}>♻️ {frequencyText[w.frequency] || '每日'}</div>
              {w.dueDate && <div className={styles.info}>📅 {w.dueDate}</div>}
              {w.contact && <div className={styles.info}>👤 {w.contact}</div>}
            </div>
          ))
        )}
      </div>
    );
  };

  const WorkForm = ({ work = null, onSave }) => {
    const [formData, setFormData] = useState(work || {
      title: '',
      dueDate: '',
      dueTime: '',
      contact: '',
      phone: '',
      isRecurring: false,
      frequency: 'daily',
      originalText: ''
    });

    return (
      <div className={styles.form}>
        <h3>{work ? '編輯工作' : '新增工作'}</h3>
        
        <label>標題 *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={styles.input}
        />

        <label>截止日期</label>
        <input
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          className={styles.input}
        />

        <label>截止時間</label>
        <input
          type="text"
          placeholder="HH:MM"
          value={formData.dueTime}
          onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
          className={styles.input}
        />

        <label>聯絡人</label>
        <input
          type="text"
          value={formData.contact}
          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
          className={styles.input}
        />

        <label>聯絡電話</label>
        <input
          type="text"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className={styles.input}
        />

        <label>類型</label>
        <select
          value={formData.isRecurring ? 'recurring' : 'single'}
          onChange={(e) => setFormData({ ...formData, isRecurring: e.target.value === 'recurring' })}
          className={styles.input}
        >
          <option value="single">一次性工作</option>
          <option value="recurring">例行工作</option>
        </select>

        {formData.isRecurring && (
          <>
            <label>循環頻率</label>
            <select
              value={formData.frequency || 'daily'}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className={styles.input}
            >
              <option value="daily">每日</option>
              <option value="weekly">每週</option>
              <option value="monthly">每月</option>
              <option value="yearly">每年</option>
            </select>
          </>
        )}

        <div className={styles.formButtons}>
          <button onClick={() => onSave(formData)} className={styles.primaryBtn}>保存</button>
          <button onClick={() => setShowModal(false)} className={styles.secondaryBtn}>取消</button>
        </div>
      </div>
    );
  };

  const MeetingForm = ({ meeting = null, onSave }) => {
    const [formData, setFormData] = useState(meeting || {
      title: '',
      startDate: '',
      startTime: '',
      endTime: '',
      location: '',
      chairman: '',
      password: '',
      link: '',
      meetingNumber: '',
      attendees: '',
      originalText: ''
    });

    return (
      <div className={styles.form}>
        <h3>{meeting ? '編輯會議' : '新增會議'}</h3>
        
        <label>標題 *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={styles.input}
        />

        <label>開始日期</label>
        <input
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          className={styles.input}
        />

        <label>開始時間</label>
        <input
          type="text"
          placeholder="HH:MM"
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          className={styles.input}
        />

        <label>結束時間</label>
        <input
          type="text"
          placeholder="HH:MM"
          value={formData.endTime}
          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          className={styles.input}
        />

        <label>地點</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className={styles.input}
        />

        <label>主持人</label>
        <input
          type="text"
          value={formData.chairman}
          onChange={(e) => setFormData({ ...formData, chairman: e.target.value })}
          className={styles.input}
        />

        <label>密碼</label>
        <input
          type="text"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className={styles.input}
        />

        <label>會議連結</label>
        <input
          type="text"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          className={styles.input}
          placeholder="https://..."
        />

        <label>會議識別碼</label>
        <input
          type="text"
          value={formData.meetingNumber}
          onChange={(e) => setFormData({ ...formData, meetingNumber: e.target.value })}
          className={styles.input}
        />

        <label>參加對象</label>
        <textarea
          value={formData.attendees}
          onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
          className={styles.input}
          placeholder="請各單位務必指派..."
          rows="3"
        />

        <div className={styles.formButtons}>
          <button onClick={() => onSave(formData)} className={styles.primaryBtn}>保存</button>
          <button onClick={() => setShowModal(false)} className={styles.secondaryBtn}>取消</button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>💼 財務工作平台</h1>
      </header>

      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📅 全部行程
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'meetings' ? styles.active : ''}`}
          onClick={() => setActiveTab('meetings')}
        >
          📞 會議
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'todos' ? styles.active : ''}`}
          onClick={() => setActiveTab('todos')}
        >
          📝 待辦
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'recurring' ? styles.active : ''}`}
          onClick={() => setActiveTab('recurring')}
        >
          ♻️ 例行
        </button>
      </nav>

      <main className={styles.main}>
        {activeTab === 'all' && renderAllSchedule()}
        {activeTab === 'meetings' && renderMeetings()}
        {activeTab === 'todos' && renderTodos()}
        {activeTab === 'recurring' && renderRecurring()}
      </main>

      {showModal && modalType === 'pasteModal' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>📋 貼會議郵件</h2>
            <textarea
              className={styles.textarea}
              placeholder="貼入會議邀請..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows="10"
            />
            <div className={styles.modalButtons}>
              <button
                className={styles.primaryBtn}
                onClick={() => handlePasteMeeting(pastedText)}
                disabled={isIdentifying}
              >
                {isIdentifying ? '識別中...' : '✓ 識別'}
              </button>
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setShowModal(false);
                  setPastedText('');
                }}
              >
                ✕ 取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && modalType === 'pasteTodoModal' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>📋 貼工作郵件</h2>
            <textarea
              className={styles.textarea}
              placeholder="貼入工作郵件..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows="10"
            />
            <div className={styles.modalButtons}>
              <button
                className={styles.primaryBtn}
                onClick={() => handlePasteTodo(pastedText)}
                disabled={isIdentifying}
              >
                {isIdentifying ? '識別中...' : '✓ 識別'}
              </button>
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setShowModal(false);
                  setPastedText('');
                }}
              >
                ✕ 取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && modalType === 'pasteRecurringModal' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>📋 貼例行工作郵件</h2>
            <textarea
              className={styles.textarea}
              placeholder="貼入例行工作郵件..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows="10"
            />
            <div className={styles.modalButtons}>
              <button
                className={styles.primaryBtn}
                onClick={() => handlePasteRecurring(pastedText)}
                disabled={isIdentifying}
              >
                {isIdentifying ? '識別中...' : '✓ 識別'}
              </button>
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setShowModal(false);
                  setPastedText('');
                }}
              >
                ✕ 取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && modalType === 'work' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <WorkForm work={modalData} onSave={saveWork} />
          </div>
        </div>
      )}

      {showModal && modalType === 'meeting' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <MeetingForm meeting={modalData} onSave={saveMeeting} />
          </div>
        </div>
      )}
    </div>
  );
}
