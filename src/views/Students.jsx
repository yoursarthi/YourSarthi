import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import Modal from '../components/ui/Modal';

function batchOptions() {
  const cur = new Date().getFullYear();
  const opts = [];
  for (let y = cur - 4; y <= cur + 1; y++) {
    opts.push(`${y}-${y + 4}`);
    opts.push(`${y}-${y + 3}`);
    opts.push(`${y}-${y + 2}`);
  }
  return [...new Set(opts)].sort((a, b) => b.localeCompare(a));
}
const BATCH_OPTIONS = batchOptions();

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CATEGORIES = ['General', 'OBC', 'OBC-NCL', 'SC', 'ST', 'EWS'];

const DEPT_COLORS = [
  { bg: 'rgba(99,102,241,0.1)',  text: '#4f46e5', border: 'rgba(99,102,241,0.2)' },
  { bg: 'rgba(16,185,129,0.1)',  text: '#047857', border: 'rgba(16,185,129,0.2)' },
  { bg: 'rgba(245,158,11,0.1)',  text: '#b45309', border: 'rgba(245,158,11,0.2)' },
  { bg: 'rgba(59,130,246,0.1)',  text: '#1d4ed8', border: 'rgba(59,130,246,0.2)' },
  { bg: 'rgba(239,68,68,0.1)',   text: '#b91c1c', border: 'rgba(239,68,68,0.2)' },
  { bg: 'rgba(20,184,166,0.1)',  text: '#0f766e', border: 'rgba(20,184,166,0.2)' },
  { bg: 'rgba(168,85,247,0.1)',  text: '#7c3aed', border: 'rgba(168,85,247,0.2)' },
];

function deptColor(dept, depts) {
  const idx = depts.findIndex(d => d.name === dept);
  return DEPT_COLORS[(idx >= 0 ? idx : 0) % DEPT_COLORS.length];
}

const statusStyles = {
  active:   { bg: 'rgba(16,185,129,0.1)', color: '#047857', border: 'rgba(16,185,129,0.2)' },
  pending:  { bg: 'rgba(245,158,11,0.1)', color: '#b45309', border: 'rgba(245,158,11,0.2)' },
  inactive: { bg: 'rgba(239,68,68,0.1)',  color: '#b91c1c', border: 'rgba(239,68,68,0.2)' },
  graduated:{ bg: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: 'rgba(99,102,241,0.2)' },
};

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '',
  phone: '', whatsapp: '',
  department: '', program: '',
  batch: `${new Date().getFullYear()}-${new Date().getFullYear() + 4}`,
  status: 'active', category: 'General',
  gender: '', dateOfBirth: '', bloodGroup: '',
  nationality: 'Indian', religion: '',
  fatherName: '', motherName: '',
  localAddress: '', permanentAddress: '',
  enrollmentNo: '',
};

export default function Students({ onNavigate, user }) {
  const toast = useToast();
  const [students, setStudents]   = useState([]);
  const [depts, setDepts]         = useState([]);
  const [programs, setPrograms]   = useState([]);
  const [search, setSearch]       = useState('');
  const [filterDept, setFilterDept]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal]         = useState(null);
  const [editing, setEditing]     = useState(null);
  const [viewMode, setViewMode]   = useState('card');
  const [form, setForm]           = useState(EMPTY_FORM);

  useEffect(() => {
    api.students.list().then(setStudents).catch(() => toast('Failed to load students', 'error'));
    api.departments.list().then(setDepts).catch(() => {});
    api.programs.list().then(setPrograms).catch(() => {});
  }, []);

  const filtered = students.filter(s => {
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return (
      (!search || name.includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()) || s.id?.toLowerCase().includes(search.toLowerCase()))
      && (!filterDept || s.department === filterDept)
      && (!filterStatus || s.status === filterStatus)
    );
  });

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditing(null); setModal('form');
  };
  const openEdit = (s) => {
    setForm({
      firstName: s.firstName || '', lastName: s.lastName || '',
      email: s.email || '', phone: s.phone || '', whatsapp: s.whatsapp || '',
      department: s.department || '', program: s.program || '',
      batch: s.batch || '', status: s.status || 'active',
      category: s.category || 'General',
      gender: s.gender || '', dateOfBirth: s.dateOfBirth || '',
      bloodGroup: s.bloodGroup || '', nationality: s.nationality || 'Indian',
      religion: s.religion || '',
      fatherName: s.fatherName || '', motherName: s.motherName || '',
      localAddress: s.localAddress || '', permanentAddress: s.permanentAddress || '',
      enrollmentNo: s.enrollmentNo || '',
    });
    setEditing(s.id); setModal('form');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await api.students.update(editing, form);
        setStudents(p => p.map(x => x.id === editing ? updated : x));
        toast('Student updated', 'success');
      } else {
        const created = await api.students.add(form);
        setStudents(p => [created, ...p]);
        toast(`${form.firstName} ${form.lastName} added — Roll No: ${created.id}`, 'success');
      }
      setModal(null);
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await api.students.remove(id);
      setStudents(p => p.filter(x => x.id !== id));
      toast('Student deleted', 'info');
    } catch (err) { toast(err.message, 'error'); }
  };

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const lbl = { fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 5, display: 'block' };
  const secTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(99,102,241,0.15)' };

  return (
    <div className="space-y-5 page-fade">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Sarthi Students</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{filtered.length} students found</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'rgba(15,23,42,0.06)', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, overflow: 'hidden' }}>
            {[['card','ri-layout-grid-line'],['table','ri-table-line']].map(([v, ic]) => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '6px 10px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: viewMode === v ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: viewMode === v ? '#6366f1' : '#64748b',
                transition: 'all 0.15s',
              }}>
                <i className={ic} style={{ fontSize: 14 }} />
              </button>
            ))}
          </div>
          {user?.role === 'admin' && (
            <button onClick={openAdd} className="btn btn-primary" style={{ gap: 6, fontSize: 13 }}>
              <i className="ri-user-add-line" />Add Student
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="dark-card" style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <i className="ri-search-line" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 14 }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search by name, email or roll no…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto', minWidth: 160 }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto', minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="graduated">Graduated</option>
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.25, color: '#6366f1' }}>
            <i className="ri-user-line" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>No Students Found</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Try adjusting your filters</p>
          {user?.role === 'admin' && (
            <button onClick={openAdd} className="btn btn-primary" style={{ marginTop: 16, gap: 6 }}>
              <i className="ri-user-add-line" />Add Student
            </button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        <div className="data-grid">
          {filtered.map(s => {
            const dc = deptColor(s.department, depts);
            const ss = statusStyles[s.status] || statusStyles.inactive;
            const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase();
            return (
              <div key={s.id} className="data-card fade-in-up" style={{ padding: '18px 18px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: dc.bg, border: `1.5px solid ${dc.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: dc.text,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.firstName} {s.lastName}
                    </p>
                    <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#6366f1', marginTop: 2 }}>{s.id}</p>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600,
                    background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, flexShrink: 0,
                  }}>
                    {s.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { ic: 'ri-mail-line',      v: s.email },
                    { ic: 'ri-phone-line',      v: s.phone || 'N/A' },
                    { ic: 'ri-building-line',   v: s.department },
                    { ic: 'ri-book-open-line',  v: `${s.program} · Batch ${s.batch}` },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569', overflow: 'hidden' }}>
                      <i className={row.ic} style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.v}</span>
                    </div>
                  ))}
                </div>

                {/* Extra info row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                  {s.department && (
                    <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: dc.bg, color: dc.text, border: `1px solid ${dc.border}` }}>
                      {s.department}
                    </span>
                  )}
                  {s.gender && (
                    <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'rgba(15,23,42,0.06)', color: '#475569', border: '1px solid rgba(15,23,42,0.1)' }}>
                      {s.gender}
                    </span>
                  )}
                  {s.bloodGroup && (
                    <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'rgba(239,68,68,0.08)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.15)' }}>
                      {s.bloodGroup}
                    </span>
                  )}
                </div>

                {user?.role === 'admin' && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(15,23,42,0.08)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => openEdit(s)} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                      background: 'rgba(99,102,241,0.08)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.2)',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      <i className="ri-edit-line" style={{ marginRight: 4 }} />Edit
                    </button>
                    <button onClick={() => handleDelete(s.id, `${s.firstName} ${s.lastName}`)} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                      background: 'rgba(239,68,68,0.08)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.15)',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      <i className="ri-delete-bin-line" style={{ marginRight: 4 }} />Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dark-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(15,23,42,0.08)', background: 'rgba(15,23,42,0.02)' }}>
                {['Student', 'Roll No', 'Department', 'Program', 'Batch', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const dc = deptColor(s.department, depts);
                const ss = statusStyles[s.status] || statusStyles.inactive;
                const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase();
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(15,23,42,0.06)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: dc.bg, border: `1.5px solid ${dc.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: dc.text, flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{s.firstName} {s.lastName}</p>
                          <p style={{ fontSize: 11, color: '#64748b' }}>{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6366f1', fontWeight: 600 }}>{s.id}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{s.department}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{s.program}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{s.batch}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {user?.role === 'admin' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(s)} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, background: 'rgba(99,102,241,0.08)', color: '#4f46e5', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Edit</button>
                          <button onClick={() => handleDelete(s.id, `${s.firstName} ${s.lastName}`)} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, background: 'rgba(239,68,68,0.08)', color: '#b91c1c', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal === 'form' && (
        <Modal title={editing ? 'Edit Student' : 'Add New Student'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Roll number info */}
            {!editing ? (
              <div className="info-banner">
                <i className="ri-id-card-line" style={{ fontSize: 14, flexShrink: 0 }} />
                <span>Roll number will be auto-assigned as <strong>STU{(form.batch || '').split('-')[0]}XXX</strong></span>
              </div>
            ) : (
              <div>
                <label style={lbl}>Roll Number</label>
                <input className="form-input" style={{ color: '#64748b' }} value={editing} readOnly />
              </div>
            )}

            {/* SECTION: Basic Info */}
            <div>
              <p style={secTitle}>Basic Information</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={lbl}>First Name *</label><input className="form-input" value={form.firstName} onChange={F('firstName')} required /></div>
                  <div><label style={lbl}>Last Name *</label><input className="form-input" value={form.lastName} onChange={F('lastName')} required /></div>
                </div>
                <div><label style={lbl}>Email</label><input className="form-input" type="email" value={form.email} onChange={F('email')} /></div>
                <div><label style={lbl}>Enrollment No. <span style={{ fontWeight: 400, color: '#64748b' }}>(optional)</span></label><input className="form-input" value={form.enrollmentNo} onChange={F('enrollmentNo')} placeholder="e.g. EN2024001" /></div>
              </div>
            </div>

            {/* SECTION: Personal Details */}
            <div>
              <p style={secTitle}>Personal Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Gender</label>
                  <select className="form-input" value={form.gender} onChange={F('gender')}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Date of Birth</label>
                  <input className="form-input" type="date" value={form.dateOfBirth} onChange={F('dateOfBirth')} />
                </div>
                <div>
                  <label style={lbl}>Blood Group</label>
                  <select className="form-input" value={form.bloodGroup} onChange={F('bloodGroup')}>
                    <option value="">Not Specified</option>
                    {BLOOD_GROUPS.filter(Boolean).map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Category</label>
                  <select className="form-input" value={form.category} onChange={F('category')}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Nationality</label>
                  <input className="form-input" value={form.nationality} onChange={F('nationality')} placeholder="Indian" />
                </div>
                <div>
                  <label style={lbl}>Religion <span style={{ fontWeight: 400, color: '#64748b' }}>(optional)</span></label>
                  <input className="form-input" value={form.religion} onChange={F('religion')} placeholder="Optional" />
                </div>
              </div>
            </div>

            {/* SECTION: Family Details */}
            <div>
              <p style={secTitle}>Family Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Father's Name</label><input className="form-input" value={form.fatherName} onChange={F('fatherName')} placeholder="Father's full name" /></div>
                <div><label style={lbl}>Mother's Name</label><input className="form-input" value={form.motherName} onChange={F('motherName')} placeholder="Mother's full name" /></div>
              </div>
            </div>

            {/* SECTION: Contact & Address */}
            <div>
              <p style={secTitle}>Contact & Address</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={lbl}>Phone Number</label><input className="form-input" value={form.phone} onChange={F('phone')} placeholder="+91 XXXXX XXXXX" /></div>
                  <div><label style={lbl}>WhatsApp Number</label><input className="form-input" value={form.whatsapp} onChange={F('whatsapp')} placeholder="+91 XXXXX XXXXX" /></div>
                </div>
                <div>
                  <label style={lbl}>Local / Current Address</label>
                  <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={form.localAddress} onChange={F('localAddress')} placeholder="Current address where student is staying" />
                </div>
                <div>
                  <label style={lbl}>Permanent Address</label>
                  <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={form.permanentAddress} onChange={F('permanentAddress')} placeholder="Permanent home address" />
                </div>
              </div>
            </div>

            {/* SECTION: Academic Info */}
            <div>
              <p style={secTitle}>Academic Information</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={lbl}>Department</label>
                  <select className="form-input" value={form.department} onChange={F('department')}>
                    <option value="">Select Department</option>
                    {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Program</label>
                  <select className="form-input" value={form.program} onChange={F('program')}>
                    <option value="">Select Program</option>
                    {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Batch</label>
                    <select className="form-input" value={form.batch} onChange={F('batch')}>
                      {BATCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Status</label>
                    <select className="form-input" value={form.status} onChange={F('status')}>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                      <option value="graduated">Graduated</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={() => setModal(null)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Update Student' : 'Add Student'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
