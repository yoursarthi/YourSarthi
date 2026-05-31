import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { parseCSV } from '../utils/helpers';

const STAT_CONFIG = [
  { label: 'Students',    key: 'students',    icon: 'ri-user-line',         grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { label: 'Faculty',     key: 'faculty',     icon: 'ri-team-line',          grad: 'linear-gradient(135deg,#10b981,#059669)' },
  { label: 'Courses',     key: 'courses',     icon: 'ri-book-open-line',     grad: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { label: 'Departments', key: 'departments', icon: 'ri-building-line',      grad: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  { label: 'Questions',   key: 'questions',   icon: 'ri-file-text-line',     grad: 'linear-gradient(135deg,#f97316,#ef4444)' },
  { label: 'Evaluations', key: 'evaluations', icon: 'ri-pencil-ruler-line',  grad: 'linear-gradient(135deg,#3b82f6,#6366f1)' },
];

export default function DataManagement() {
  const toast = useToast();
  const [tab, setTab]             = useState('students');
  const [stats, setStats]         = useState({});
  const [depts, setDepts]         = useState([]);
  const [deptForm, setDeptForm]   = useState({ name: '', code: '', hod: '' });
  const [csvText, setCsvText]     = useState('');
  const [csvPreview, setCsvPreview]   = useState([]);
  const [csvHeaders, setCsvHeaders]   = useState([]);
  const [importType, setImportType]   = useState('students');

  const loadStats = () => api.stats().then(setStats).catch(() => {});
  const loadDepts = () => api.departments.list().then(setDepts).catch(() => {});
  useEffect(() => { loadStats(); loadDepts(); }, []);

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      const rows = parseCSV(text);
      if (rows.length) { setCsvPreview(rows.slice(0, 5)); setCsvHeaders(Object.keys(rows[0])); setCsvText(text); }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvText) return;
    const rows = parseCSV(csvText);
    try {
      if (importType === 'students') {
        const res = await api.students.import(rows);
        toast(`Imported ${res.imported} students!`, 'success');
      } else if (importType === 'faculty') {
        let count = 0;
        for (const r of rows) { await api.faculty.add(r); count++; }
        toast(`Imported ${count} faculty!`, 'success');
      }
      loadStats(); setCsvText(''); setCsvPreview([]); setCsvHeaders([]);
    } catch (err) { toast(err.message, 'error'); }
  };

  const addDept = async (e) => {
    e.preventDefault();
    try {
      await api.departments.add(deptForm);
      setDeptForm({ name: '', code: '', hod: '' });
      loadDepts(); loadStats();
      toast('Department added!', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  const deleteDept = async (id) => {
    if (!confirm('Delete this department?')) return;
    await api.departments.remove(id);
    loadDepts(); loadStats();
    toast('Department deleted', 'info');
  };

  const downloadTemplate = () => {
    const csv = 'firstName,lastName,email,phone,department,program,batch,status\nAditya,Sharma,aditya@yoursarthi.com,9876543210,Computer Science & Engineering,B.Tech CSE,2024-2028,active';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'Sarthi_Student_Template.csv';
    a.click();
    toast('Template downloaded!', 'success');
  };

  const label = { fontSize: 11.5, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' };

  return (
    <div className="space-y-6 page-fade">
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Data Management Center</h2>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Import, export and manage all university data</p>
      </div>

      {/* Glassmorphism stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {STAT_CONFIG.map(s => (
          <div
            key={s.key}
            className="dark-card stat-card"
            style={{ padding: '16px 14px', textAlign: 'center' }}
          >
            <div style={{
              width: 38, height: 38,
              background: s.grad,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <i className={s.icon} style={{ fontSize: 17, color: '#fff' }} />
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats[s.key] ?? 0}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="tab-bar" style={{ width: 'fit-content' }}>
        {[['students','ri-user-line','Student Form'],['departments','ri-building-line','Departments'],['import','ri-upload-2-line','CSV Import']].map(([t, ic, lbl]) => (
          <button key={t} onClick={() => setTab(t)} className={`tab-btn${tab === t ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className={ic} style={{ fontSize: 12 }} />{lbl}
          </button>
        ))}
      </div>

      {tab === 'students' && (
        <div className="dark-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Add New Student</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
            Use the <strong style={{ color: '#a5b4fc' }}>Students</strong> page to add/edit students directly, or use CSV Import below for bulk additions.
          </p>
          <button onClick={downloadTemplate} className="btn btn-ghost" style={{ gap: 6, fontSize: 13 }}>
            <i className="ri-download-line" />Download CSV Template
          </button>
        </div>
      )}

      {tab === 'departments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="dark-card" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Add Department</h3>
            <form onSubmit={addDept} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={label}>Department Name *</label><input className="form-input" value={deptForm.name} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div><label style={label}>Code (e.g. CSE)</label><input className="form-input" value={deptForm.code} onChange={e => setDeptForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} maxLength={5} /></div>
              <div><label style={label}>Head of Department</label><input className="form-input" value={deptForm.hod} onChange={e => setDeptForm(p => ({ ...p, hod: e.target.value }))} /></div>
              <button type="submit" className="btn btn-primary" style={{ gap: 6, fontSize: 13, width: 'fit-content' }}>
                <i className="ri-add-line" />Add Department
              </button>
            </form>
          </div>

          <div className="dark-card" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
              Departments <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>({depts.length})</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {depts.map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: '#f8fafc',
                  border: '1px solid rgba(15,23,42,0.07)',
                  borderRadius: 9,
                }}>
                  <div style={{
                    width: 36, height: 36, background: 'rgba(99,102,241,0.15)', borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: '#a5b4fc',
                  }}>
                    {d.code || d.name.slice(0, 3).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                    <p style={{ fontSize: 11, color: '#64748b' }}>HOD: {d.hod || 'TBD'}</p>
                  </div>
                  <button onClick={() => deleteDept(d.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, padding: '4px 8px', color: '#f87171', cursor: 'pointer', fontSize: 13 }}>
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'import' && (
        <div className="dark-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 18 }}>CSV Import</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={label}>Import Type</label>
                <select className="form-input" value={importType} onChange={e => setImportType(e.target.value)}>
                  <option value="students">Students</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>
              <div>
                <label style={label}>Upload CSV File</label>
                <div style={{
                  border: '2px dashed rgba(99,102,241,0.25)',
                  borderRadius: 10, padding: '20px',
                  textAlign: 'center',
                  background: 'rgba(99,102,241,0.04)',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                >
                  <i className="ri-upload-cloud-2-line" style={{ fontSize: 28, color: '#6366f1', display: 'block', marginBottom: 8 }} />
                  <p style={{ fontSize: 12.5, color: '#64748b', marginBottom: 10 }}>Drag &amp; drop or click to upload</p>
                  <input type="file" accept=".csv" onChange={handleCSV} style={{ fontSize: 12, color: '#64748b' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={downloadTemplate} className="btn btn-ghost" style={{ gap: 5, fontSize: 12.5 }}>
                  <i className="ri-download-line" />Template
                </button>
                {csvPreview.length > 0 && (
                  <button onClick={handleImport} className="btn btn-primary" style={{ gap: 5, fontSize: 12.5 }}>
                    <i className="ri-upload-2-line" />Import {importType}
                  </button>
                )}
              </div>
            </div>

            {csvPreview.length > 0 && (
              <div>
                <label style={label}>Preview (first 5 rows)</label>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid rgba(15,23,42,0.08)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                    <thead>
                      <tr>
                        {csvHeaders.map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', background: '#f8fafc', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(15,23,42,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(15,23,42,0.05)' }}>
                          {csvHeaders.map(h => (
                            <td key={h} style={{ padding: '7px 10px', color: '#64748b', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
