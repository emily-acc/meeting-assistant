import React, { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

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

  parseChineseTime(timeStr) {
    if (!timeStr) return { time: null, valid: false };
    let hour, minute = 0;

    const match = timeStr.match(/(\d{1,2})\s*[:：]?\s*(\d{2})?/);
    if (!match) return { time: null, valid: false };

    hour = parseInt(match[1]);
    minute = match[2] ? parseInt(match[2]) : 0;

    if (timeStr.includes('上午')) {
      if (hour === 12) hour = 0;
    } else if (timeStr.includes('下午') || timeStr.includes('午後')) {
      if (hour !== 12) hour += 12;
    } else if (timeStr.includes('晚上')) {
      if (hour < 12) hour += 12;
    } else if (timeStr.includes('凌晨')) {
      if (hour > 12) hour -= 12;
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { time: null, valid: false };

    return { time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, valid: true };
  }

  extractDateTimeFromText(text) {
    const results = { dates: [], times: [] };
    if (!text) return results;

    const datePatterns = [
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
      /(\d{1,2})[\/\-](\d{1,2})(?!\d)/g
    ];

    datePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const parsed = this.parseDate(match[0]);
        if (parsed.valid) {
          results.dates.push({ original: match[0], parsed: parsed.date });
        }
      }
    });

    const timePatterns = [
      /(上午|下午|晚上|凌晨)\s+(\d{1,2})\s*[:：]\s*(\d{2})/g,
      /(\d{1,2})\s*[:：]\s*(\d{2})(?!\d)/g
    ];

    timePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const parsed = this.parseChineseTime(match[0]);
        if (parsed.valid) {
          results.times.push({ original: match[0], parsed: parsed.time });
        }
      }
    });

    return results;
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
  const [parser] = useState(new DateTimeParser());

  const frequencyText = {
    daily: '每日',
    weekly: '每週',
    monthly: '每月',
    yearly: '每年'
  };

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

  const handleQuickAddMeeting = (text) => {
    if (!text.trim()) return;
    const dateTime = parser.extractDateTimeFromText(text);
    const meeting = {
      id: `meeting-${Date.now()}`,
      title: text,
      startDate: dateTime.dates[0]?.parsed || null,
      startTime: dateTime.times[0]?.parsed || null,
      endTime: null,
      location: '',
      chairman: '',
      password: '',
      originalText: text,
      createdAt: new Date().toISOString()
    };
    setMeetings([...meetings, meeting]);
    setMeetingInput('');
  };

  const handleQuickAddTodo = (text) => {
    if (!text.trim()) return;
    const dateTime = parser.extractDateTimeFromText(text);
    const work = {
      id: `work-${Date.now()}`,
      title: text,
      dueDate: dateTime.dates[0]?.parsed || null,
      dueTime: dateTime.times[0]?.parsed || null,
      contact: null,
      isRecurring: false,
      originalText: text,
      createdAt: new Date().toISOString()
    };
    setTodoWorks([...todoWorks, work]);
    setTodoInput('');
  };

  const handleQuickAddRecurring = (text) => {
    if (!text.trim()) return;
    const dateTime = parser.extractDateTimeFromText(text);
    const work = {
      id: `work-${Date.now()}`,
      title: text,
      dueDate: dateTime.dates[0]?.parsed || null,
      dueTime: dateTime.times[0]?.parsed || null,
      contact: null,
      isRecurring: true,
      frequency: 'daily',
      originalText: text,
      createdAt: new Date().toISOString()
    };
    setRecurringWorks([...recurringWorks, work]);
    setRecurringInput('');
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

  const renderMeetings = () => {
    const sorted = [...meetings].sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate) - new Date(b.startDate);
    });

    return (
      <div className={styles.listContainer}>
        <h2>📞 會議時程</h2>
        <div className={styles.quickAddForm}>
          <input
            type="text"
            placeholder="快速輸入會議..."
            value={meetingInput}
            onChange={(e) => setMeetingInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleQuickAddMeeting(meetingInput);
              }
            }}
            className={styles.input}
          />
          <button 
            onClick={() => { setModalType('meeting'); setShowModal(true); }} 
            className={styles.pasteBtn}
          >
            📋 貼郵件
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
              {m.password && <div className={styles.itemMeta}>密碼：{m.password}</div>}
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

  const renderTodos = () => {
    const sorted = [...todoWorks]
      .filter(w => !w.completed)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

    return (
      <div className={styles.listContainer}>
        <h2>📝 待辦清單</h2>
        <div className={styles.quickAddForm}>
          <input
            type="text"
            placeholder="快速輸入工作..."
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleQuickAddTodo(todoInput);
              }
            }}
            className={styles.input}
          />
          <button 
            onClick={() => { setModalType('work'); setModalData({ isRecurring: false }); setShowModal(true); }} 
            className={styles.pasteBtn}
          >
            📋 貼郵件
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
              <div className={styles.buttonGroup}>
                <button onClick={() => openWorkModal(w)} className={styles.viewBtn}>編輯</button>
                <button onClick={() => completeWork(w.id, false)} className={styles.completeBtn}>✓</button>
                <button onClick={() => deleteWork(w.id, false)} className={styles.deleteBtn}>刪除</button>
              </div>
              {w.originalText && w.originalText.length > 50 && (
                <button onClick={() => setModalData({ ...w, showFullText: true })} className={styles.fullTextBtn}>查看原文</button>
              )}
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

    return (
      <div className={styles.listContainer}>
        <h2>♻️ 例行工作</h2>
        <div className={styles.quickAddForm}>
          <input
            type="text"
            placeholder="快速輸入例行工作..."
            value={recurringInput}
            onChange={(e) => setRecurringInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleQuickAddRecurring(recurringInput);
              }
            }}
            className={styles.input}
          />
          <button 
            onClick={() => { setModalType('work'); setModalData({ isRecurring: true, frequency: 'daily' }); setShowModal(true); }} 
            className={styles.pasteBtn}
          >
            📋 貼郵件
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

  const WorkForm = ({ work = null, onSave }) => {
    const [formData, setFormData] = useState(work || {
      title: '',
      dueDate: '',
      dueTime: '',
      contact: '',
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
          placeholder="工作事項"
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
          placeholder="聯絡人名稱"
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

  const MeetingForm = ({ meeting = null, onSave }) => {
    const [formData, setFormData] = useState(meeting || {
      title: '',
      startDate: '',
      startTime: '',
      endTime: '',
      location: '',
      chairman: '',
      password: '',
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

      {modalData?.showFullText && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>原始內容</h2>
            <div className={styles.fullTextContent}>{modalData.originalText}</div>
            <button onClick={() => setModalData(null)} className={styles.primaryBtn}>關閉</button>
          </div>
        </div>
      )}
    </div>
  );
}
