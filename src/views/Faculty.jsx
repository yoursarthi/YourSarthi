import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import Modal from '../components/ui/Modal';

const DESIGNATION_STYLES = {
  'HOD':                 { bg: 'rgba(245,158,11,0.12)', color: '#b45309', border: 'rgba(245,158,11,0.25)', icon: 'ri-vip-crown-line' },
  'Professor':           { bg: 'rgba(99,102,241,0.12)', color: '#4f46e5', border: 'rgba(99,102,241,0.25)', icon: 'ri-award-line' },
  'Associate Professor': { bg: 'rgba(20,184,166,0.12)', color: '#0f766e', border: 'rgba(20,184,166,0.25)', icon: 'ri-medal-line' },
  'Assistant Professor': { bg: 'rgba(100,116,139,0.12)',color: '#475569', border: 'rgba(100,116,139,0.25)',icon: 'ri-user-star-line' },
  'Lecturer':            { bg: 'rgba(59,130,246,0.12)', color: '#1d4ed8', border: 'rgba(59,130,246,0.25)', icon: 'ri-account-box-line' },
  'Visiting Faculty':    { bg: 'rgba(168,85,247,0.12)', color: '#7c3aed', border: 'rgba(168,85,247,0.25)', icon: 'ri-user-shared-line' },
};

const DEPT_COLORS = [
  '#6366f1','#10b981','#f59e0b','#3b82f6','#ef4444','#14b8a6','#a855f7','#ec4899',
];

const EMPTY_FORM = {
  name: '', email: '', phone: '', department: '',
  designation: 'Assistant Professor', specialization: '',
  qualification: '', experienceYears: 0,
  // Personal
  dateOfBirth: '', address: '', fatherName: '', motherName: '', spouseName: '',
  // Academic qualifications
  ugDegree: '', ugCollege: '',
  pgDegree: '', pgCollege: '',
  phdTitle: '', phdUniversity: '', phdYear: '',
  // Research
  researchContributions: '', patents: '', awards: '',
};

export default function Faculty({ user }) {
  const toast = useToast();
  const [faculty, setFaculty]   = useState([]);
  const [depts, setDepts]       = useState([]);
  const [search, setSearch]     = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [formTab, setFormTab]   = useState('basic');
  const [form, setForm]         = useState(EMPTY_FORM);

  useEffect(() => {
    api.faculty.list().then(setFaculty).catch(() => toast('Failed to load faculty', 'error'));
    api.departments.list().then(setDepts).catch(() => {});
  }, []);

  const filtered = faculty.filter(f =>
    (!search || f.name.toLowerCase().includes(search.toLowerCase()) || f.email?.toLowerCase().includes(search.toLowerCase()))
    && (!filterDept || f.department === filterDept)
  );
  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setFormTab('basic'); setModal(true); };
  const openEdit = f => {
    setForm({
      name: f.name || '', email: f.email || '', phone: f.phone || '',
      department: f.department || '', designation: f.designation || 'Assistant Professor',
      specialization: f.specialization || '', qualification: f.qualification || '',
      experienceYears: f.experienceYears || 0,
      dateOfBirth: f.dateOfBirth || '', address: f.address || '',
      fatherName: f.fatherName || '', motherName: f.motherName || '',
      spouseName: f.spouseName || '',
      ugDegree: f.ugDegree || '', ugCollege: f.ugCollege || '',
      pgDegree: f.pgDegree || '', pgCollege: f.pgCollege || '',
      phdTitle: f.phdTitle || '', phdUniversity: f.phdUniversity || '',
      phdYear: f.phdYear || '',
      researchContributions: f.researchContributions || '',
      patents: f.patents || '', awards: f.awards || '',
    });
    setEditing(f.id); setFormTab('basic'); setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const u = await api.faculty.update(editing, form);
        setFaculty(p => p.map(x => x.id === editing ? u : x));
        toast('Faculty updated', 'success');
      } else {
        const c = await api.faculty.add(form);
        setFaculty(p => [c, ...p]);
        toast(`${form.name} added!`, 'success');
      }
      setModal(false);
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    await api.faculty.remove(id);
    setFaculty(p => p.filter(x => x.id !== id));
    toast('Faculty deleted', 'info');
  };

  const deptColor = (dept) => {
    const idx = depts.findIndex(d => d.name === dept);
    return DEPT_COLORS[(idx >= 0 ? idx : 0) % DEPT_COLORS.length];
  };

  const lbl = { fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 5, display: 'block' };
  const secTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(99,102,241,0.15)' };

  const FORM_TABS = [
    { id: 'basic', label: 'Basic Info', icon: 'ri-user-line' },
    { id: 'personal', label: 'Personal', icon: 'ri-heart-line' },
    { id: 'academic', label: 'Academic', icon: 'ri-graduation-cap-line' },
    { id: 'research', label: 'Research', icon: 'ri-flask-line' },
  ];

  return (
    <div className="space-y-5 page-fade">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Sarthi Faculty</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{filtered.length} faculty members</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={openAdd} className="btn btn-primary" style={{ gap: 6, fontSize: 13 }}>
            <i className="ri-user-add-line" />Add Faculty
          </button>
        )}
      </div>

      {/* Search + dept filter pills */}
      <div className="dark-card" style={{ padding: '14px 16px' }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <i className="ri-search-line" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 14 }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search faculty…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterDept('')}
            style={{
              padding: '4px 12px', borderRadius: 9999, fontSize: 11.5, fontWeight: 600,
              background: !filterDept ? 'rgba(99,102,241,0.12)' : 'rgba(15,23,42,0.05)',
              color: !filterDept ? '#4f46e5' : '#64748b',
              border: `1px solid ${!filterDept ? 'rgba(99,102,241,0.25)' : 'rgba(15,23,42,0.1)'}`,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
            }}
          >All</button>
          {depts.map(d => {
            const active = filterDept === d.name;
            const dc = deptColor(d.name);
            return (
              <button key={d.id} onClick={() => setFilterDept(active ? '' : d.name)} style={{
                padding: '4px 12px', borderRadius: 9999, fontSize: 11.5, fontWeight: 600,
                background: active ? `${dc}18` : 'rgba(15,23,42,0.05)',
                color: active ? dc : '#64748b',
                border: `1px solid ${active ? `${dc}30` : 'rgba(15,23,42,0.1)'}`,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
              }}>{d.name}</button>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.25, color: '#6366f1' }}><i className="ri-team-line" /></div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>No Faculty Found</h3>
        </div>
      ) : (
        <div className="data-grid">
          {filtered.map(f => {
            const ds = DESIGNATION_STYLES[f.designation] || DESIGNATION_STYLES['Lecturer'];
            const dc = deptColor(f.department);
            const initials = f.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const specs = (f.specialization || '').split(',').map(s => s.trim()).filter(Boolean);
            return (
              <div key={f.id} className="data-card fade-in-up" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: `${dc}18`, border: `1.5px solid ${dc}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: dc,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{f.name}</p>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600,
                      background: ds.bg, color: ds.color, border: `1px solid ${ds.border}`, marginTop: 4,
                    }}>
                      <i className={ds.icon} style={{ fontSize: 10 }} />
                      {f.designation}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569', overflow: 'hidden' }}>
                    <i className="ri-mail-line" style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569' }}>
                    <i className="ri-building-line" style={{ fontSize: 12, color: '#64748b' }} />
                    <span>{f.department || 'No department'}</span>
                  </div>
                  {f.experienceYears > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569' }}>
                      <i className="ri-time-line" style={{ fontSize: 12, color: '#64748b' }} />
                      <span>{f.experienceYears} yrs experience</span>
                    </div>
                  )}
                </div>

                {specs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                    {specs.map(s => (
                      <span key={s} style={{
                        padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 500,
                        background: 'rgba(99,102,241,0.07)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.15)',
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Research indicator */}
                {(f.phdTitle || f.researchContributions) && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {f.phdTitle && <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'rgba(20,184,166,0.08)', color: '#0f766e', border: '1px solid rgba(20,184,166,0.15)' }}>PhD</span>}
                    {f.researchContributions && <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'rgba(245,158,11,0.08)', color: '#b45309', border: '1px solid rgba(245,158,11,0.15)' }}>Research</span>}
                  </div>
                )}

                {user?.role === 'admin' && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(15,23,42,0.08)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => openEdit(f)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500, background: 'rgba(99,102,241,0.08)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      <i className="ri-edit-line" style={{ marginRight: 4 }} />Edit
                    </button>
                    <button onClick={() => handleDelete(f.id, f.name)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500, background: 'rgba(239,68,68,0.08)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      <i className="ri-delete-bin-line" style={{ marginRight: 4 }} />Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={editing ? 'Edit Faculty Profile' : 'Add Faculty Member'} onClose={() => setModal(false)}>
          {/* Form tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(15,23,42,0.04)', borderRadius: 8, padding: 4 }}>
            {FORM_TABS.map(t => (
              <button key={t.id} onClick={() => setFormTab(t.id)} style={{
                flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 11.5, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                background: formTab === t.id ? '#6366f1' : 'transparent',
                color: formTab === t.id ? '#fff' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s',
              }}>
                <i className={t.icon} style={{ fontSize: 12 }} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Tab: Basic Info */}
            {formTab === 'basic' && (
              <>
                <div><label style={lbl}>Full Name *</label><input className="form-input" value={form.name} onChange={F('name')} required placeholder="Dr. Firstname Lastname" /></div>
                <div><label style={lbl}>Email</label><input className="form-input" type="email" value={form.email} onChange={F('email')} /></div>
                <div><label style={lbl}>Phone</label><input className="form-input" value={form.phone} onChange={F('phone')} placeholder="+91 XXXXX XXXXX" /></div>
                <div>
                  <label style={lbl}>Department</label>
                  <select className="form-input" value={form.department} onChange={F('department')}>
                    <option value="">Select Department</option>
                    {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Designation</label>
                  <select className="form-input" value={form.designation} onChange={F('designation')}>
                    {['Professor','Associate Professor','Assistant Professor','Lecturer','HOD','Visiting Faculty'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Specialization</label><input className="form-input" value={form.specialization} onChange={F('specialization')} placeholder="e.g. AI, Machine Learning, VLSI" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={lbl}>Qualification</label><input className="form-input" value={form.qualification} onChange={F('qualification')} placeholder="e.g. Ph.D, M.Tech" /></div>
                  <div><label style={lbl}>Experience (Years)</label><input className="form-input" type="number" min={0} value={form.experienceYears} onChange={F('experienceYears')} /></div>
                </div>
              </>
            )}

            {/* Tab: Personal */}
            {formTab === 'personal' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={lbl}>Date of Birth</label><input className="form-input" type="date" value={form.dateOfBirth} onChange={F('dateOfBirth')} /></div>
                  <div><label style={lbl}>Spouse Name</label><input className="form-input" value={form.spouseName} onChange={F('spouseName')} placeholder="Optional" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={lbl}>Father's Name</label><input className="form-input" value={form.fatherName} onChange={F('fatherName')} /></div>
                  <div><label style={lbl}>Mother's Name</label><input className="form-input" value={form.motherName} onChange={F('motherName')} /></div>
                </div>
                <div>
                  <label style={lbl}>Address</label>
                  <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} value={form.address} onChange={F('address')} placeholder="Full residential address" />
                </div>
              </>
            )}

            {/* Tab: Academic Qualifications */}
            {formTab === 'academic' && (
              <>
                <div>
                  <p style={secTitle}>Undergraduate</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label style={lbl}>Degree</label><input className="form-input" value={form.ugDegree} onChange={F('ugDegree')} placeholder="e.g. B.Tech CSE" /></div>
                    <div><label style={lbl}>College / University</label><input className="form-input" value={form.ugCollege} onChange={F('ugCollege')} placeholder="Institution name" /></div>
                  </div>
                </div>
                <div>
                  <p style={secTitle}>Postgraduate</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label style={lbl}>Degree</label><input className="form-input" value={form.pgDegree} onChange={F('pgDegree')} placeholder="e.g. M.Tech, M.Sc" /></div>
                    <div><label style={lbl}>College / University</label><input className="form-input" value={form.pgCollege} onChange={F('pgCollege')} placeholder="Institution name" /></div>
                  </div>
                </div>
                <div>
                  <p style={secTitle}>PhD / Doctorate</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label style={lbl}>Thesis Title</label><input className="form-input" value={form.phdTitle} onChange={F('phdTitle')} placeholder="PhD thesis title" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div><label style={lbl}>University</label><input className="form-input" value={form.phdUniversity} onChange={F('phdUniversity')} placeholder="University name" /></div>
                      <div><label style={lbl}>Year of Completion</label><input className="form-input" type="number" min={1970} max={2030} value={form.phdYear} onChange={F('phdYear')} placeholder="YYYY" /></div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tab: Research */}
            {formTab === 'research' && (
              <>
                <div>
                  <label style={lbl}>Research Contributions</label>
                  <textarea className="form-input" rows={4} style={{ resize: 'vertical' }} value={form.researchContributions} onChange={F('researchContributions')} placeholder="List research papers, journals, and conferences…" />
                </div>
                <div>
                  <label style={lbl}>Patents</label>
                  <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} value={form.patents} onChange={F('patents')} placeholder="Patent titles and patent numbers…" />
                </div>
                <div>
                  <label style={lbl}>Awards & Publications</label>
                  <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} value={form.awards} onChange={F('awards')} placeholder="Awards received, books published, notable recognitions…" />
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, paddingTop: 4, borderTop: '1px solid rgba(15,23,42,0.08)', marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {FORM_TABS.map((t, i) => (
                  <button key={t.id} type="button" onClick={() => setFormTab(t.id)} style={{
                    width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: formTab === t.id ? '#6366f1' : 'rgba(15,23,42,0.15)',
                    padding: 0,
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update Faculty' : 'Add Faculty'}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
