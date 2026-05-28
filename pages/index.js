import React, { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

// Gemini AI 識別（改進版）
const identifyWithAI = async (text, apiKey) => {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `請精確分析這段會議邀請或工作郵件，按照以下格式提取信息（如果沒有則為空字符串）：

【日期時間識別規則】
- 如果寫「5月14日（週四）上午10:00–11:00」，應提取為：
  開始日期: 2026-05-14
  開始時間: 10:00
  結束時間: 11:00
- 所有日期統一為 YYYY-MM-DD 格式
- 所有時間統一為 HH:MM 格式（24小時制）

【會議信息】
會議標題: (郵件標題或會議名稱)
開始日期: (YYYY-MM-DD格式)
開始時間: (HH:MM格式)
結束時間: (HH:MM格式)
會議地點: (實體地點或「線上」)
主持人名稱: 
會議密碼: (所有可能的密碼)
會議連結: (完整的Teams/Webex/Zoom連結URL)
會議識別碼: (會議號碼，去掉空格)
參加對象: (參加者說明)

【工作信息】
工作標題: 
截止日期: (YYYY-MM-DD格式)
截止時間: (HH:MM格式)
聯絡人名稱:
聯絡人電話:

【分類】
是否是會議: (true/false)
是否是例行工作: (true/false)
循環頻率: (如果是例行：daily/weekly/monthly/yearly，否則為空)

回復格式：只回復JSON，不要markdown代碼塊或其他文字。

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
      console.error('AI response:', content);
      return null;
    }
  } catch (error) {
    console.error('AI 識別失敗:', error);
    return null;
  }
};

// 本地識別增強
const enhanceIdentification = (aiResult, text) => {
  const result = aiResult || {};

  // 識別連結
  if (!result['會議連結'] || result['會議連結'] === '') {
    const linkMatch = text.match(/(https:\/\/[^\s]+)/);
    if (linkMatch) {
      result['會議連結'] = linkMatch[0];
    }
  }

  // 識別密碼
  if (!result['會議密碼'] || result['會議密碼'] === '') {
    const pwMatch = text.match(/[密碼password]+[：:]\s*([A-Za-z0-9]+)/i);
    if (pwMatch) {
      result['會議密碼'] = pwMatch[1];
    }
  }

  // 識別碼
  if (!result['會議識別碼'] || result['會議識別碼'] === '') {
    const idMatch = text.match(/[識別碼meeting\s]+[id]*[：:]\s*([0-9\s]+)/i);
    if (idMatch) {
      result['會議識別碼'] = idMatch[1].replace(/\s/g, '');
    }
  }

  return result;
};

// 日期時間識別
class DateTimeParser {
  constructor() {
    this.currentYear = new Date().getFullYear();
  }

  isValidDate(year, month, day) {
    if (month < 1 || month > 12) return false;
    if (day < 1) return false;
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeapYear && month === 2) daysInMonth[1] = 29;
    return day <= daysInMonth[month - 1];
  }

  parseDate(dateStr) {
    if (!dateStr) return { date: null, valid: false };
    let year, month, day;

    let match = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      year = parseInt(match[1]);
      month = parseInt(match[2]);
      day = parseInt(match[3]);
    } else if ((match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})(?!\d)/))) {
      month = parseInt(match[1]);
      day = parseInt(match[2]);
      year = this.currentYear;
    } else {
      return { date: null, valid: false };
    }

    if (!this.isValidDate(year, month, day)) return { date: null, valid: false };

    const paddedMonth = String(month).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    return { date: `${year}-${paddedMonth}-${paddedDay}`, valid: true };
  }
}

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
  const [parser] = useState(new DateTimeParser());

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

  // 打開編輯表單
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

  // 保存工作
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

  // 保存會議
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

  // 快速添加會議
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

  // 快速添加待辦
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

  // 快速添加例行
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

  // 貼會議郵件（AI 識別）
  const handlePasteMeeting = async (text) => {
    if (!text.trim()) return;
    setIsIdentifying(true);
    let aiResult = await identifyWithAI(text, GEMINI_API_KEY);
    aiResult = enhanceIdentification(aiResult, text);
    setIsIdentifying(false);

    if (aiResult) {
      const meeting = {
        title: aiResult['會議標題'] || text.split('\n')[0],
        startDate: aiResult['開始日期'] || '',
        startTime: aiResult['開始時間'] || '',
        endTime: aiResult['結束時間'] || '',
        location: aiResult['會議地點'] || '',
        chairman: aiResult['主持人名稱'] || '',
        password: aiResult['會議密碼'] || '',
        link: aiResult['會議連結'] || '',
        meetingNumber: aiResult['會議識別碼'] || '',
        attendees: aiResult['參加對象'] || '',
        originalText: text
      };
      openMeetingModal(meeting);
    }
    setPastedText('');
  };

  // 貼工作郵件（AI 識別）
  const handlePasteTodo = async (text) => {
    if (!text.trim()) return;
    setIsIdentifying(true);
    let aiResult = await identifyWithAI(text, GEMINI_API_KEY);
    aiResult = enhanceIdentification(aiResult, text);
    setIsIdentifying(false);

    if (aiResult) {
      const work = {
        title: aiResult['工作標題'] || text.split('\n')[0],
        dueDate: aiResult['截止日期'] || '',
        dueTime: aiResult['截止時間'] || '',
        contact: aiResult['聯絡人名稱'] || '',
        phone: aiResult['聯絡人電話'] || '',
        isRecurring: false,
        originalText: text
      };
      openWorkModal(work);
    }
    setPastedText('');
  };

  // 貼例行工作郵件（AI 識別）
  const handlePasteRecurring = async (text) => {
    if (!text.trim()) return;
    setIsIdentifying(true);
    let aiResult = await identifyWithAI(text, GEMINI_API_KEY);
    aiResult = enhanceIdentification(aiResult, text);
    setIsIdentifying(false);

    if (aiResult) {
      const work = {
        title: aiResult['工作標題'] || text.split('\n')[0],
        dueDate: aiResult['截止日期'] || '',
        dueTime: aiResult['截止時間'] || '',
        contact: aiResult['聯絡人名稱'] || '',
        phone: aiResult['聯絡人電話'] || '',
        isRecurring: true,
        frequency: aiResult['循環頻率'] || 'daily',
        originalText: text
      };
      openWorkModal(work);
    }
    setPastedText('');
  };

  // 刪除
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

  // 完成
  const completeWork = (id, isRecurring) => {
    if (isRecurring) {
      setRecurringWorks(recurringWorks.map(w => w.id === id ? { ...w, lastCompleted: new Date().toISOString() } : w));
    } else {
      setTodoWorks(todoWorks.map(w => w.id === id ? { ...w, completed: true } : w));
    }
  };

  // 月曆
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

  // 全部行程
  const renderAllSchedule = () => {
    const allItems = [];
    meetings.forEach(m => {
      if (m.startDate) allItems.push({ type: 'meeting', data: m, date: m.startDate });
    });
    todoWorks.forEach(w => {
      if (w.dueDate && !w.completed) allItems.push({ type: 'todo', data: w, date: w.dueDate });
    });
    recurringWorks.forEach(w => {
      if (w.dueDate) allItems.push({ type: 'recurring', data: w, date: w.dueDate });
    });
    allItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
      <div className={styles.scheduleContainer}>
        <div className={styles.calendarSection}>{renderCalendar()}</div>
        <div className={styles.listSection}>
          <h3>行程和工作</h3>
          {allItems.length === 0 ? (
            <p className={styles.empty}>無行程</p>
          ) : (
            allItems.map((item, idx) => (
              <div key={idx} className={styles.itemCard}>
                {item.type === 'meeting' && (
                  <>
                    <div className={styles.itemTitle}>📞 {item.data.title}</div>
                    <div className={styles.itemMeta}>📅 {item.data.startDate} {item.data.startTime || ''}</div>
                    {item.data.link && <div className={styles.itemLink}><a href={item.data.link} target="_blank" rel="noopener noreferrer">🔗 會議連結</a></div>}
                    <button onClick={() => deleteMeeting(item.data.id)} className={styles.deleteBtn}>刪除</button>
                  </>
                )}
                {item.type === 'todo' && (
                  <>
                    <div className={styles.itemTitle}>📝 {item.data.title}</div>
                    <div className={styles.itemMeta}>📅 {item.data.dueDate}</div>
                    <button onClick={() => completeWork(item.data.id, false)} className={styles.completeBtn}>完成</button>
                  </>
                )}
                {item.type === 'recurring' && (
                  <>
                    <div className={styles.itemTitle}>♻️ {item.data.title}</div>
                    <div className={styles.itemMeta}>📅 {item.data.dueDate}</div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // 會議菜單
  const renderMeetings = () => {
    const sorted = [...meetings].sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate) - new Date(b.startDate);
    });

    const handleAdd = () => handleQuickAddMeeting();

    return (
      <div className={styles.listContainer}>
        <h2>📞 會議時程</h2>
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
            <div key={m.id} className={styles.itemCard}>
              <div className={styles.itemTitle}>{m.title}</div>
              {m.startDate && <div className={styles.itemMeta}>📅 {m.startDate} {m.startTime || ''}</div>}
              {m.location && <div className={styles.itemMeta}>📍 {m.location}</div>}
              {m.chairman && <div className={styles.itemMeta}>主持：{m.chairman}</div>}
              {m.password && <div className={styles.itemMeta}>🔐 密碼：{m.password}</div>}
              {m.meetingNumber && <div className={styles.itemMeta}>🆔 {m.meetingNumber}</div>}
              {m.link && <div className={styles.itemLink}><a href={m.link} target="_blank" rel="noopener noreferrer">🔗 會議連結</a></div>}
              <div className={styles.buttonGroup}>
                <button onClick={() => openMeetingModal(m)} className={styles.viewBtn}>編輯</button>
                <button onClick={() => deleteMeeting(m.id)} className={styles.deleteBtn}>刪除</button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // 待辦菜單
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
        <h2>📝 待辦清單</h2>
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
            <div key={w.id} className={styles.itemCard}>
              <div className={styles.itemTitle}>{w.title}</div>
              {w.dueDate && <div className={styles.itemMeta}>📅 {w.dueDate} {w.dueTime ? `🕐 ${w.dueTime}` : ''}</div>}
              {w.contact && <div className={styles.itemMeta}>👤 {w.contact}</div>}
              {w.phone && <div className={styles.itemMeta}>📞 {w.phone}</div>}
              <div className={styles.buttonGroup}>
                <button onClick={() => openWorkModal(w)} className={styles.viewBtn}>編輯</button>
                <button onClick={() => completeWork(w.id, false)} className={styles.completeBtn}>✓</button>
                <button onClick={() => deleteWork(w.id, false)} className={styles.deleteBtn}>刪除</button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // 例行菜單
  const renderRecurring = () => {
    const sorted = [...recurringWorks].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const handleAdd = () => handleQuickAddRecurring();

    return (
      <div className={styles.listContainer}>
        <h2>♻️ 例行工作</h2>
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
            <div key={w.id} className={styles.itemCard}>
              <div className={styles.itemTitle}>{w.title}</div>
              <div className={styles.itemMeta}>♻️ {frequencyText[w.frequency] || '每日'}</div>
              {w.dueDate && <div className={styles.itemMeta}>📅 {w.dueDate} {w.dueTime ? `🕐 ${w.dueTime}` : ''}</div>}
              {w.contact && <div className={styles.itemMeta}>👤 {w.contact}</div>}
              {w.phone && <div className={styles.itemMeta}>📞 {w.phone}</div>}
              <div className={styles.buttonGroup}>
                <button onClick={() => openWorkModal(w)} className={styles.viewBtn}>編輯</button>
                <button onClick={() => completeWork(w.id, true)} className={styles.completeBtn}>✓</button>
                <button onClick={() => deleteWork(w.id, true)} className={styles.deleteBtn}>刪除</button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // 工作表單
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

        {formData.originalText && (
          <>
            <label>原始內容</label>
            <div className={styles.originalText}>{formData.originalText}</div>
          </>
        )}

        <div className={styles.formButtons}>
          <button onClick={() => onSave(formData)} className={styles.primaryBtn}>保存</button>
          <button onClick={() => setShowModal(false)} className={styles.secondaryBtn}>取消</button>
        </div>
      </div>
    );
  };

  // 會議表單
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
          placeholder="413 936 238 568 15"
        />

        <label>參加對象</label>
        <textarea
          value={formData.attendees}
          onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
          className={styles.input}
          placeholder="請各單位務必指派..."
          rows="3"
        />

        {formData.originalText && (
          <>
            <label>原始內容</label>
            <div className={styles.originalText}>{formData.originalText}</div>
          </>
        )}

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

      {/* 貼會議郵件 */}
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

      {/* 貼工作郵件 */}
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

      {/* 貼例行工作郵件 */}
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

      {/* 編輯工作表單 */}
      {showModal && modalType === 'work' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <WorkForm work={modalData} onSave={saveWork} />
          </div>
        </div>
      )}

      {/* 編輯會議表單 */}
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
