import React, { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

const enhancedTextParser = {
  extractTitle: (text) => {
    const patterns = [
      /[主題题][:：]\s*([^\n]+)/,
      /^【([^\】]+)】/m,
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
    let m = text.match(/[号碼码號][:：]\s*([0-9\s]+)/i);
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

// 待辦編輯表單
const TodoForm = ({ todo, onSave, onClose }) => {
  const [formData, setFormData] = useState(todo || {
    title: '', dueDate: '', dueTime: '', contact: '', phone: '', description: ''
  });

  return (
    <div className={styles.form}>
      <h3>{todo?.id ? '編輯待辦' : '新增待辦'}</h3>
      <label>標題</label>
      <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={styles.input} />
      <label>截止日期</label>
      <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className={styles.input} />
      <label>截止時間</label>
      <input type="text" placeholder="HH:MM" value={formData.dueTime} onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })} className={styles.input} />
      <label>聯絡人</label>
      <input type="text" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} className={styles.input} />
      <label>聯絡電話</label>
      <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={styles.input} />
      <label>工作說明</label>
      <textarea value={formData.description} rows="4" onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={styles.input} placeholder="貼入原文或工作說明..." />
      <div className={styles.formButtons}>
        <button onClick={() => onSave(formData)} className={styles.primaryBtn}>保存</button>
        <button onClick={onClose} className={styles.secondaryBtn}>取消</button>
      </div>
    </div>
  );
};

// 會議編輯表單
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
      <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={styles.input} />
      <label>開始日期</label>
      <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={styles.input} />
      <label>開始時間</label>
      <input type="text" placeholder="HH:MM" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className={styles.input} />
      <label>結束時間</label>
      <input type="text" placeholder="HH:MM" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className={styles.input} />
      <label>地點</label>
      <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className={styles.input} />
      <label>主持人</label>
      <input type="text" value={formData.chairman} onChange={(e) => setFormData({ ...formData, chairman: e.target.value })} className={styles.input} />
      <label>密碼</label>
      <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={styles.input} />
      <label>會議連結</label>
      <input type="text" value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} className={styles.input} />
      <label>會議識別碼</label>
      <input type="text" value={formData.meetingNumber} onChange={(e) => setFormData({ ...formData, meetingNumber: e.target.value })} className={styles.input} />
      <label>參加對象</label>
      <textarea value={formData.attendees} rows="3" onChange={(e) => setFormData({ ...formData, attendees: e.target.value })} className={styles.input} />
      <div className={styles.formButtons}>
        <button onClick={() => onSave(formData)} className={styles.primaryBtn}>保存</button>
        <button onClick={onClose} className={styles.secondaryBtn}>取消</button>
      </div>
    </div>
  );
};

// 主應用
export default function Home() {
  const [activeTab, setActiveTab] = useState('meetings');
  const [meetings, setMeetings] = useState([]);
  const [todos, setTodos] = useState([]);
  const [todoInput, setTodoInput] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('appData');
    if (saved) {
      const data = JSON.parse(saved);
      setMeetings(data.meetings || []);
      setTodos(data.todos || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('appData', JSON.stringify({ meetings, todos }));
  }, [meetings, todos]);

  const closeModal = () => {
    setShowModal(false);
    setModalType(null);
    setModalData(null);
    setPastedText('');
  };

  const saveTodo = (todoData) => {
    if (todoData.id) {
      setTodos(todos.map(w => w.id === todoData.id ? todoData : w));
    } else {
      const newTodo = { ...todoData, id: `todo-${Date.now()}`, createdAt: new Date().toISOString() };
      setTodos([...todos, newTodo]);
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

  const handleQuickAddTodo = () => {
    if (!todoInput.trim()) return;
    const text = todoInput;
    const result = {
      title: enhancedTextParser.extractTitle(text),
      dueDate: enhancedTextParser.extractDate(text),
      dueTime: enhancedTextParser.extractTime(text),
      contact: '', phone: '',
      description: text
    };
    setTodos([...todos, { ...result, id: `todo-${Date.now()}`, createdAt: new Date().toISOString() }]);
    setTodoInput('');
  };

  const handlePasteMeeting = (text) => {
    if (!text.trim()) { alert('請貼入會議郵件'); return; }
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
    setMeetings([...meetings, { ...result, id: `meeting-${Date.now()}`, createdAt: new Date().toISOString() }]);
    closeModal();
  };

  const handlePasteTodo = (text) => {
    if (!text.trim()) { alert('請貼入待辦郵件'); return; }
    const result = {
      title: enhancedTextParser.extractTitle(text),
      dueDate: enhancedTextParser.extractDate(text),
      dueTime: enhancedTextParser.extractTime(text),
      contact: '', phone: '',
      description: text
    };
    setTodos([...todos, { ...result, id: `todo-${Date.now()}`, createdAt: new Date().toISOString() }]);
    closeModal();
  };

  const deleteTodo = (id) => setTodos(todos.filter(w => w.id !== id));
  const deleteMeeting = (id) => setMeetings(meetings.filter(m => m.id !== id));

  const completeTodo = (id) => {
    setTodos(todos.map(w => w.id === id ? { ...w, completed: true, completedAt: new Date().toISOString() } : w));
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
          <button onClick={() => { setPastedText(''); setShowModal(true); setModalType('pasteModal'); }} className={styles.pasteBtn}>📋 貼郵件</button>
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
    const sorted = [...todos].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const pending = sorted.filter(w => !w.completed);
    const completed = sorted.filter(w => w.completed);

    return (
      <div className={styles.listContainer}>
        <h2>📝 待辦事項 ({pending.length})</h2>
        <div className={styles.quickAddForm}>
          <input type="text" placeholder="快速輸入..." value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') handleQuickAddTodo(); }} className={styles.input} />
          <button onClick={handleQuickAddTodo} className={styles.addBtn}>➕</button>
          <button onClick={() => { setPastedText(''); setShowModal(true); setModalType('pasteTodoModal'); }} className={styles.pasteBtn}>📋</button>
        </div>

        {pending.length === 0 ? <p className={styles.empty}>無待做</p> : pending.map(w => (
          <div key={w.id} className={styles.workCard} style={{borderLeft: '4px solid #FF9800'}}>
            <div className={styles.workHeader}>
              <div className={styles.title}>{w.title}</div>
              <div className={styles.workActions}>
                <button onClick={() => completeTodo(w.id)} className={styles.completeBtn}>✓</button>
                <button onClick={() => { setModalData(w); setModalType('todo'); setShowModal(true); }} className={styles.editBtn}>✎</button>
                <button onClick={() => deleteTodo(w.id)} className={styles.deleteBtn}>✕</button>
              </div>
            </div>
            {w.dueDate && <div className={styles.info}>📅 截止：{w.dueDate} {w.dueTime && `${w.dueTime}`}</div>}
            {w.contact && <div className={styles.info}>👤 {w.contact}</div>}
            {w.phone && <div className={styles.info}>📞 {w.phone}</div>}
            {w.description && <div className={styles.info} style={{whiteSpace: 'pre-wrap', fontSize: '0.9em', color: '#666', marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px'}}>{w.description}</div>}
          </div>
        ))}

        {completed.length > 0 && (
          <>
            <h3 style={{marginTop: '20px', color: '#999'}}>✓ 已完成 ({completed.length})</h3>
            {completed.map(w => (
              <div key={w.id} className={styles.workCard} style={{opacity: 0.6, borderLeft: '4px solid #4CAF50'}}>
                <div className={styles.workHeader}>
                  <div className={styles.title} style={{textDecoration: 'line-through'}}>{w.title}</div>
                  <div className={styles.workActions}>
                    <button onClick={() => deleteTodo(w.id)} className={styles.deleteBtn}>✕</button>
                  </div>
                </div>
                {w.dueDate && <div className={styles.info}>📅 {w.dueDate}</div>}
                {w.completedAt && <div className={styles.info} style={{color: '#4CAF50'}}>✓ 完成於 {new Date(w.completedAt).toLocaleString('zh-TW')}</div>}
                {w.description && <div className={styles.info} style={{whiteSpace: 'pre-wrap', fontSize: '0.85em', color: '#999', marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px'}}>{w.description}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>💼 財務工作平台</h1>
      </header>
      <nav className={styles.tabs}>
        {[['meetings','📞 會議'],['todos','📝 待辦']].map(([key, label]) => (
          <button key={key} className={`${styles.tab} ${activeTab === key ? styles.active : ''}`} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </nav>
      <main className={styles.main}>
        {activeTab === 'meetings' && renderMeetings()}
        {activeTab === 'todos' && renderTodos()}
      </main>

      {showModal && modalType === 'pasteModal' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>📋 貼會議郵件</h2>
            <textarea className={styles.textarea} rows="10" placeholder="貼入郵件內容..." value={pastedText} onChange={e => setPastedText(e.target.value)} />
            <div className={styles.modalButtons}>
              <button className={styles.primaryBtn} onClick={() => handlePasteMeeting(pastedText)}>✓ 識別</button>
              <button className={styles.secondaryBtn} onClick={closeModal}>✕ 取消</button>
            </div>
          </div>
        </div>
      )}

      {showModal && modalType === 'pasteTodoModal' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>📋 貼待辦郵件</h2>
            <textarea className={styles.textarea} rows="10" placeholder="貼入郵件內容..." value={pastedText} onChange={e => setPastedText(e.target.value)} />
            <div className={styles.modalButtons}>
              <button className={styles.primaryBtn} onClick={() => handlePasteTodo(pastedText)}>✓ 識別</button>
              <button className={styles.secondaryBtn} onClick={closeModal}>✕ 取消</button>
            </div>
          </div>
        </div>
      )}

      {showModal && modalType === 'todo' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <TodoForm todo={modalData} onSave={saveTodo} onClose={closeModal} />
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
