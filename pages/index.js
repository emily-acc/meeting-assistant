import React, { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

// 識別模塊
const enhancedTextParser = {
  extractTitle: (text) => {
    const patterns = [
      /[主題题标題][:：]\s*([^\n]+)/,
      /^【([^\】]+)】/m,
      /^([^:\n]+)(?=[，、\n]|$)/m,
    ];
    for (let p of patterns) {
      const m = text.match(p);
      if (m) {
        const title = m[1].trim();
        if (title && title.length > 1) return title;
      }
    }
    return text.split('\n')[0]?.trim() || '';
  },

  extractDate: (text) => {
    let m = text.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    m = text.match(/(\d{1,2})月\s*(\d{1,2})日/);
    if (m) {
      const y = new Date().getFullYear();
      return `${y}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
    }
    return '';
  },

  extractTime: (text) => {
    let m = text.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (m) return `${String(m[1]).padStart(2,'0')}:${m[2]}`;
    m = text.match(/上午\s*(\d{1,2}):(\d{2})/i);
    if (m) {
      let h = parseInt(m[1]);
      if (h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${m[2]}`;
    }
    m = text.match(/下午\s*(\d{1,2}):(\d{2})/i);
    if (m) {
      let h = parseInt(m[1]);
      if (h !== 12) h += 12;
      return `${String(h).padStart(2,'0')}:${m[2]}`;
    }
    m = text.match(/(\d{1,2}):(\d{2})(?!:)/);
    if (m) return `${String(m[1]).padStart(2,'0')}:${m[2]}`;
    return '';
  },

  extractEndTime: (text) => {
    const m = text.match(/[~–\-至]\s*(\d{1,2}):(\d{2})/);
    if (m) return `${String(m[1]).padStart(2,'0')}:${m[2]}`;
    return '';
  },

  extractPassword: (text) => {
    const m = text.match(/[密碼码][:：]\s*([A-Za-z0-9]+)/i);
    return m ? m[1].trim() : '';
  },

  extractMeetingNumber: (text) => {
    let m = text.match(/[号碼码號][码碼]?[:：]\s*([0-9\s]+)/i);
    if (m) return m[1].replace(/\s/g,'').trim();
    return '';
  },

  extractLink: (text) => {
    const m = text.match(/(https?:\/\/[^\s\n]+)/);
    return m ? m[0].trim() : '';
  },

  extractLocation: (text) => {
    if (/webex/i.test(text)) return 'Webex';
    if (/teams|microsoft/i.test(text)) return 'Microsoft Teams';
    if (/zoom/i.test(text)) return 'Zoom';
    return '';
  },

  extractAttendees: (text) => {
    const m = text.match(/[參参]加[對对象][:：]\s*([^\n]+)/);
    return m ? m[1].trim() : '';
  },

  extractChairman: (text) => {
    const patterns = [
      /[主持人][:：]\s*([^\n]+)/,
      /[組織單位][:：]\s*([^\n]+)/,
    ];
    for (let p of patterns) {
      const m = text.match(p);
      if (m) return m[1].trim();
    }
    return '';
  }
};

// WorkForm
const WorkForm = ({ work, onSave, onClose }) => {
  const [formData, setFormData] = useState(work || {
    title: '', dueDate: '', dueTime: '',
    contact: '', phone: '', isRecurring: false,
    frequency: 'daily'
  });

  return (
    <div className={styles.form}>
      <h3>{work?.id ? '編輯工作' : '新增工作'}</h3>
      <label>標題</label>
      <input type="text" value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        className={styles.input} />
      <label>截止日期</label>
      <input type="date" value={formData.dueDate}
        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
        className={styles.input} />
      <label>截止時間</label>
      <input type="text" placeholder="HH:MM" value={formData.dueTime}
        onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
        className={styles.input} />
      <label>聯絡人</label>
      <input type="text" value={formData.contact}
        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
        className={styles.input} />
      <label>聯絡電話</label>
      <input type="text" value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        className={styles.input} />
      <label>類型</label>
      <select value={formData.isRecurring ? 'recurring' : 'single'}
        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.value === 'recurring' })}
        className={styles.input}>
        <option value="single">一次性</option>
        <option value="recurring">例行</option>
      </select>
      {formData.isRecurring && (
        <>
          <label>循環頻率</label>
          <select value={formData.frequency || 'daily'}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            className={styles.input}>
            <option value="daily">每日</option>
            <option value="weekly">每週</option>
            <option value="monthly">每月</option>
            <option value="yearly">每年</option>
          </select>
        </>
      )}
      <div className={styles.formButtons}>
        <button onClick={() => onSave(formData)} className={styles.primaryBtn}>保存</button>
        <button onClick={onClose} className={styles.secondaryBtn}>取消</button>
      </div>
    </div>
  );
};

// MeetingForm
const MeetingForm = ({ meeting, onSave, onClose }) => {
  const [formData, setFormData] = useState(meeting || {
    title: '', startDate: '', startTime: '', endTime: '',
    location: '', chairman: '', password: '', link: '',
    meetingNumber: '', attendees: ''
  });

  return (
    <div className={styles.form}>
      <h3>{meeting?.id ? '編輯會議' : '新增會議'}</h3>
      <label>標題</label>
      <input type="text" value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        className={styles.input} />
      <label>開始日期</label>
      <input type="date" value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
        className={styles.input} />
      <label>開始時間</label>
      <input type="text" placeholder="HH:MM" value={formData.startTime}
        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
        className={styles.input} />
      <label>結束時間</label>
      <input type="text" placeholder="HH:MM" value={formData.endTime}
        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
        className={styles.input} />
      <label>地點</label>
      <input type="text" value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        className={styles.input} />
      <label>主持人</label>
      <input type="text" value={formData.chairman}
        onChange={(e) => setFormData({ ...formData, chairman: e.target.value })}
        className={styles.input} />
      <label>密碼</label>
      <input type="text" value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        className={styles.input} />
      <label>會議連結</label>
      <input type="text" value={formData.link}
        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
        className={styles.input} />
      <label>會議識別碼</label>
      <input type="text" value={formData.meetingNumber}
        onChange={(e) => setFormData({ ...formData, meetingNumber: e.target.value })}
        className={styles.input} />
      <label>參加對象</label>
      <textarea value={formData.attendees} rows="3"
        onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
        className={styles.input} />
      <div className={styles.formButtons}>
        <button onClick={() => onSave(formData)} className={styles.primaryBtn}>保存</button>
        <button onClick={onClose} className={styles.secondaryBtn}>取消</button>
      </div>
    </div>
  );
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
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const frequencyText = { daily:'每日', weekly:'每週', monthly:'每月', yearly:'每年' };

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

  const closeModal = () => {
    setShowModal(false);
    setModalType(null);
    setModalData(null);
  };

  const saveWork = (workData) => {
    if (workData.id) {
      if (workData.isRecurring) setRecurringWorks(recurringWorks.map(w => w.id === workData.id ? workData : w));
      else setTodoWorks(todoWorks.map(w => w.id === workData.id ? workData : w));
    } else {
      const newWork = { ...workData, id: `work-${Date.now()}`, createdAt: new Date().toISOString() };
      if (workData.isRecurring) setRecurringWorks([...recurringWorks, newWork]);
      else setTodoWorks([...todoWorks, newWork]);
    }
    closeModal();
  };

  const saveMeeting = (meetingData) => {
    if (meetingData.id) {
      setMeetings(meetings.map(m => m.id === meetingData.id ? meetingData : m));
    } else {
      const newMeeting = { ...meetingData, id: `meeting-${Date.now()}`, createdAt: new Date().toISOString() };
      setMeetings([...meetings, newMeeting]);
    }
    closeModal();
  };

  // ✅ 快速輸入會議：自動識別+保存
  const handleQuickAddMeeting = () => {
    if (!meetingInput.trim()) return;
    
    const text = meetingInput;
    const result = {
      title: enhancedTextParser.extractTitle(text),
      startDate: enhancedTextParser.extractDate(text),
      startTime: enhancedTextParser.extractTime(text),
      endTime: enhancedTextParser.extractEndTime(text),
      location: enhancedTextParser.extractLocation(text),
      password: enhancedTextParser.extractPassword(text),
      link: enhancedTextParser.extractLink(text),
      meetingNumber: enhancedTextParser.extractMeetingNumber(text),
      attendees: enhancedTextParser.extractAttendees(text),
      chairman: enhancedTextParser.extractChairman(text)
    };

    setMeetings([...meetings, {
      ...result,
      id: `meeting-${Date.now()}`,
      createdAt: new Date().toISOString()
    }]);
    setMeetingInput('');
  };

  // ✅ 快速輸入工作：自動識別+保存
  const handleQuickAddTodo = () => {
    if (!todoInput.trim()) return;
    
    const text = todoInput;
    const result = {
      title: enhancedTextParser.extractTitle(text),
      dueDate: enhancedTextParser.extractDate(text),
      dueTime: enhancedTextParser.extractTime(text),
      contact: '',
      phone: '',
      isRecurring: false
    };

    setTodoWorks([...todoWorks, {
      ...result,
      id: `work-${Date.now()}`,
      createdAt: new Date().toISOString()
    }]);
    setTodoInput('');
  };

  // ✅ 快速輸入例行：自動識別+保存
  const handleQuickAddRecurring = () => {
    if (!recurringInput.trim()) return;
    
    const text = recurringInput;
    const result = {
      title: enhancedTextParser.extractTitle(text),
      dueDate: enhancedTextParser.extractDate(text),
      dueTime: enhancedTextParser.extractTime(text),
      contact: '',
      phone: '',
      isRecurring: true,
      frequency: 'daily'
    };

    setRecurringWorks([...recurringWorks, {
      ...result,
      id: `work-${Date.now()}`,
      createdAt: new Date().toISOString()
    }]);
    setRecurringInput('');
  };

  const deleteWork = (id, isRecurring) => {
    if (isRecurring) setRecurringWorks(recurringWorks.filter(w => w.id !== id));
    else setTodoWorks(todoWorks.filter(w => w.id !== id));
  };

  const deleteMeeting = (id) => setMeetings(meetings.filter(m => m.id !== id));

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
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const hasEvent = (day) => {
      if (!day) return false;
      const d = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      return meetings.some(m => m.startDate === d) ||
             todoWorks.some(w => w.dueDate === d && !w.completed) ||
             recurringWorks.some(w => w.dueDate === d);
    };

    return (
      <div className={styles.calendar}>
        <div className={styles.calendarHeader}>
          <button onClick={() => setSelectedDate(new Date(year, month-1, 1))}>←</button>
          <span>{year}年 {month+1}月</span>
          <button onClick={() => setSelectedDate(new Date(year, month+1, 1))}>→</button>
        </div>
        <div className={styles.calendarGrid}>
          {['日','一','二','三','四','五','六'].map(d => <div key={d} className={styles.weekday}>{d}</div>)}
          {days.map((day, idx) => (
            <div key={idx}
              className={`${styles.calendarDay} ${day ? styles.hasDay : ''} ${hasEvent(day) ? styles.hasEvent : ''}`}
              onClick={() => day && setSelectedDate(new Date(year, month, day))}>
              {day}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAllSchedule = () => {
    const all = [];
    meetings.forEach(m => { if (m.startDate) all.push({ type:'meeting', data:m, date:m.startDate, time:m.startTime }); });
    todoWorks.forEach(w => { if (w.dueDate && !w.completed) all.push({ type:'todo', data:w, date:w.dueDate, time:w.dueTime }); });
    recurringWorks.forEach(w => { if (w.dueDate) all.push({ type:'recurring', data:w, date:w.dueDate, time:w.dueTime }); });
    all.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
      <div className={styles.scheduleContainer}>
        <div className={styles.calendarSection}>{renderCalendar()}</div>
        <div className={styles.listSection}>
          <h3>行程和工作</h3>
          {all.length === 0 ? <p className={styles.empty}>無行程</p> : all.map((item, idx) => (
            <div key={idx} className={styles.smallItemCard}>
              {item.time && <div className={styles.smallTime}>{item.time}</div>}
              <div className={styles.smallTitle}>
                {item.type === 'meeting' ? '📞' : item.type === 'todo' ? '📝' : '♻️'} {item.data.title}
              </div>
              <div className={styles.smallMeta}>{item.date}</div>
              {item.type === 'meeting' && item.data.link &&
                <a href={item.data.link} target="_blank" rel="noopener noreferrer" className={styles.smallLink}>🔗</a>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMeetings = () => {
    const sorted = [...meetings].sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate) - new Date(b.startDate) || (a.startTime||'').localeCompare(b.startTime||'');
    });

    return (
      <div className={styles.listContainer}>
        <h2>📞 會議時程 ({sorted.length})</h2>
        <div className={styles.quickAddForm}>
          <input type="text" placeholder="快速輸入會議..." value={meetingInput}
            onChange={e => setMeetingInput(e.target.value)}
            onKeyPress={e => { if (e.key === 'Enter') handleQuickAddMeeting(); }}
            className={styles.input} />
          <button onClick={handleQuickAddMeeting} className={styles.addBtn}>➕</button>
        </div>

        {sorted.length === 0 ? <p className={styles.empty}>無會議</p> : sorted.map(m => (
          <div key={m.id} className={styles.meetingCard}>
            <div className={styles.timeBlock}>
              {m.startTime && <div className={styles.time}>{m.startTime}</div>}
              {m.startDate && <div className={styles.date}>{m.startDate}</div>}
            </div>
            <div className={styles.contentBlock}>
              <div className={styles.title}>{m.title || '（未命名）'}</div>
              <div className={styles.infoGrid}>
                {m.location && <div className={styles.info}>📍 {m.location}</div>}
                {m.chairman && <div className={styles.info}>👤 {m.chairman}</div>}
                {m.password && <div className={styles.info}>🔐 {m.password}</div>}
                {m.meetingNumber && <div className={styles.info}>🆔 {m.meetingNumber}</div>}
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
                {m.link && <button onClick={() => window.open(m.link, '_blank')} className={styles.joinBtn}>加入</button>}
                <button onClick={() => { setModalData(m); setModalType('meeting'); setShowModal(true); }} className={styles.editBtn}>編輯</button>
                <button onClick={() => deleteMeeting(m.id)} className={styles.deleteBtn}>刪除</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTodos = () => {
    const sorted = [...todoWorks].filter(w => !w.completed).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    return (
      <div className={styles.listContainer}>
        <h2>📝 待辦清單 ({sorted.length})</h2>
        <div className={styles.quickAddForm}>
          <input type="text" placeholder="快速輸入工作..." value={todoInput}
            onChange={e => setTodoInput(e.target.value)}
            onKeyPress={e => { if (e.key === 'Enter') handleQuickAddTodo(); }}
            className={styles.input} />
          <button onClick={handleQuickAddTodo} className={styles.addBtn}>➕</button>
        </div>
        {sorted.length === 0 ? <p className={styles.empty}>無待做工作</p> : sorted.map(w => (
          <div key={w.id} className={styles.workCard}>
            <div className={styles.workHeader}>
              <div className={styles.title}>{w.title}</div>
              <div className={styles.workActions}>
                <button onClick={() => completeWork(w.id, false)} className={styles.completeBtn}>✓</button>
                <button onClick={() => { setModalData(w); setModalType('work'); setShowModal(true); }} className={styles.editBtn}>✎</button>
                <button onClick={() => deleteWork(w.id, false)} className={styles.deleteBtn}>✕</button>
              </div>
            </div>
            {w.dueDate && <div className={styles.info}>📅 {w.dueDate} {w.dueTime}</div>}
            {w.contact && <div className={styles.info}>👤 {w.contact}</div>}
          </div>
        ))}
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
        <h2>♻️ 例行工作 ({sorted.length})</h2>
        <div className={styles.quickAddForm}>
          <input type="text" placeholder="快速輸入例行工作..." value={recurringInput}
            onChange={e => setRecurringInput(e.target.value)}
            onKeyPress={e => { if (e.key === 'Enter') handleQuickAddRecurring(); }}
            className={styles.input} />
          <button onClick={handleQuickAddRecurring} className={styles.addBtn}>➕</button>
        </div>
        {sorted.length === 0 ? <p className={styles.empty}>無例行工作</p> : sorted.map(w => (
          <div key={w.id} className={styles.recurringCard}>
            <div className={styles.workHeader}>
              <div className={styles.title}>{w.title}</div>
              <div className={styles.workActions}>
                <button onClick={() => completeWork(w.id, true)} className={styles.completeBtn}>✓</button>
                <button onClick={() => { setModalData(w); setModalType('work'); setShowModal(true); }} className={styles.editBtn}>✎</button>
                <button onClick={() => deleteWork(w.id, true)} className={styles.deleteBtn}>✕</button>
              </div>
            </div>
            <div className={styles.info}>♻️ {frequencyText[w.frequency] || '每日'}</div>
            {w.dueDate && <div className={styles.info}>📅 {w.dueDate}</div>}
            {w.contact && <div className={styles.info}>👤 {w.contact}</div>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>💼 財務工作平台</h1>
      </header>
      <nav className={styles.tabs}>
        {[['all','📅 全部行程'],['meetings','📞 會議'],['todos','📝 待辦'],['recurring','♻️ 例行']].map(([key, label]) => (
          <button key={key} className={`${styles.tab} ${activeTab === key ? styles.active : ''}`}
            onClick={() => setActiveTab(key)}>{label}</button>
        ))}
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
            <WorkForm work={modalData} onSave={saveWork} onClose={closeModal} />
          </div>
        </div>
      )}

      {showModal && modalType === 'meeting' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <MeetingForm meeting={modalData} onSave={saveMeeting} onClose={closeModal} />
          </div>
        </div>
      )}
    </div>
  );
}
