import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

const LEVEL_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#22c55e'];
const LEVEL_LABELS = ['Level 0', 'Level 1', 'Level 2', 'Level 3'];
const BLOOM_OPTIONS = ['Remember', 'Understand', 'Apply', 'Analyse', 'Evaluate', 'Create'];
const STRENGTH_LABELS = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High' };

const S = {
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', marginBottom: 16 },
  label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' },
  btn: (variant = 'primary', sm = false) => ({
    padding: sm ? '5px 12px' : '9px 18px',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
    fontSize: sm ? 11 : 13,
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: variant === 'primary' ? '#6366f1' : variant === 'danger' ? '#ef4444' : variant === 'success' ? '#16a34a' : variant === 'warning' ? '#d97706' : '#fff',
    color: variant === 'outline' ? '#374151' : '#fff',
    border: variant === 'outline' ? '1px solid #e5e7eb' : 'none',
  }),
  th: { background: '#f9fafb', color: '#6b7280', fontWeight: 600, padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '9px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 13 },
  badge: (color) => ({
    padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, display: 'inline-block',
    background: color === 'green' ? '#dcfce7' : color === 'red' ? '#fee2e2' : color === 'blue' ? '#dbeafe' : color === 'yellow' ? '#fef3c7' : '#ede9fe',
    color: color === 'green' ? '#166534' : color === 'red' ? '#991b1b' : color === 'blue' ? '#1e40af' : color === 'yellow' ? '#92400e' : '#5b21b6',
  }),
};

function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const c = color || (pct >= 75 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{Math.round(value)}%</span>
    </div>
  );
}

// ─── Setup: Course Outcomes ──────────────────────────────────────────────────
function COSetup({ courseId, toast }) {
  const [cos, setCOs] = useState([]);
  const [form, setForm] = useState({ co_code: '', co_description: '', bloom_level: '', target_attainment: 2 });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) return;
    try { setCOs(await api.obe.courseOutcomes(courseId)); } catch {}
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.co_code.trim()) return toast('CO code required', 'error');
    setLoading(true);
    try {
      if (editing) {
        await api.obe.updateCO(editing, { co_description: form.co_description, bloom_level: form.bloom_level, target_attainment: form.target_attainment });
        toast('CO updated');
      } else {
        await api.obe.addCO(courseId, form);
        toast('CO added');
      }
      setForm({ co_code: '', co_description: '', bloom_level: '', target_attainment: 2 });
      setEditing(null);
      await load();
    } catch (e) { toast(e.message, 'error'); } finally { setLoading(false); }
  }

  async function del(id) {
    if (!confirm('Delete this CO and all its mappings?')) return;
    try { await api.obe.deleteCO(id); await load(); toast('Deleted'); } catch (e) { toast(e.message, 'error'); }
  }

  function startEdit(co) {
    setEditing(co.id);
    setForm({ co_code: co.co_code, co_description: co.co_description, bloom_level: co.bloom_level, target_attainment: co.target_attainment });
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 80px 100px', gap: 10, marginBottom: 12, alignItems: 'end' }}>
        <div>
          <label style={S.label}>CO Code</label>
          <input style={S.input} placeholder="CO1" value={form.co_code} disabled={!!editing}
            onChange={e => setForm(f => ({ ...f, co_code: e.target.value.toUpperCase() }))} />
        </div>
        <div>
          <label style={S.label}>Description</label>
          <input style={S.input} placeholder="Understand data structures and their applications" value={form.co_description}
            onChange={e => setForm(f => ({ ...f, co_description: e.target.value }))} />
        </div>
        <div>
          <label style={S.label}>Bloom's Level</label>
          <select style={S.input} value={form.bloom_level} onChange={e => setForm(f => ({ ...f, bloom_level: e.target.value }))}>
            <option value="">—</option>
            {BLOOM_OPTIONS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Target</label>
          <select style={S.input} value={form.target_attainment} onChange={e => setForm(f => ({ ...f, target_attainment: +e.target.value }))}>
            <option value={1}>L1</option><option value={2}>L2</option><option value={3}>L3</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <button style={S.btn('primary')} disabled={loading} onClick={save}>{editing ? 'Update' : '+ Add'}</button>
          {editing && <button style={S.btn('outline')} onClick={() => { setEditing(null); setForm({ co_code: '', co_description: '', bloom_level: '', target_attainment: 2 }); }}>✕</button>}
        </div>
      </div>

      {cos.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Code','Description','Bloom Level','Target',''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {cos.map(co => (
              <tr key={co.id}>
                <td style={{ ...S.td, fontWeight: 700, color: '#6366f1' }}>{co.co_code}</td>
                <td style={S.td}>{co.co_description || '—'}</td>
                <td style={S.td}>{co.bloom_level || '—'}</td>
                <td style={S.td}><span style={S.badge('blue')}>Level {co.target_attainment}</span></td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  <button style={{ ...S.btn('outline', true), marginRight: 6 }} onClick={() => startEdit(co)}>Edit</button>
                  <button style={S.btn('danger', true)} onClick={() => del(co.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>No COs defined yet. Add course outcomes above.</p>}
    </div>
  );
}

// ─── Setup: Component → CO Mapping ──────────────────────────────────────────
function MappingSetup({ courseId, toast }) {
  const [cos, setCOs] = useState([]);
  const [components, setComponents] = useState([]);
  const [matrix, setMatrix] = useState({}); // { componentId_coId: weight }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      api.obe.courseOutcomes(courseId),
      api.results.components(),
      api.obe.getMapping(courseId),
    ]).then(([coList, compList, mappingList]) => {
      setCOs(coList);
      setComponents(compList.filter(c => c.is_active));
      const m = {};
      mappingList.forEach(row => { m[`${row.component_id}_${row.co_id}`] = row.co_weight; });
      setMatrix(m);
    }).catch(() => {});
  }, [courseId]);

  function toggle(compId, coId) {
    const key = `${compId}_${coId}`;
    setMatrix(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key]; else next[key] = 1;
      return next;
    });
  }

  function setWeight(compId, coId, val) {
    const key = `${compId}_${coId}`;
    setMatrix(prev => ({ ...prev, [key]: Number(val) }));
  }

  async function save() {
    setSaving(true);
    try {
      const rows = Object.entries(matrix).map(([key, weight]) => {
        const [component_id, co_id] = key.split('_');
        return { component_id, co_id, co_weight: weight };
      });
      await api.obe.saveMapping(courseId, rows);
      toast('Mapping saved');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  }

  if (!cos.length) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>Define Course Outcomes first.</p>;

  return (
    <div>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
        Check which assessment components cover each CO and set relative weight (e.g., 1, 2, or 30/70). The system normalises weights per CO.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={S.th}>Component</th>
              {cos.map(co => <th key={co.id} style={{ ...S.th, textAlign: 'center' }}>{co.co_code}</th>)}
            </tr>
          </thead>
          <tbody>
            {components.map(comp => (
              <tr key={comp.id}>
                <td style={{ ...S.td, fontWeight: 600 }}>{comp.component_name}</td>
                {cos.map(co => {
                  const key = `${comp.id}_${co.id}`;
                  const active = !!matrix[key];
                  return (
                    <td key={co.id} style={{ ...S.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <input type="checkbox" checked={active} onChange={() => toggle(comp.id, co.id)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }} />
                        {active && (
                          <input type="number" min={0.1} step={0.1} value={matrix[key] || 1}
                            onChange={e => setWeight(comp.id, co.id, e.target.value)}
                            style={{ width: 55, padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 11, textAlign: 'center' }} />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14, textAlign: 'right' }}>
        <button style={S.btn('primary')} disabled={saving} onClick={save}>
          {saving ? 'Saving...' : 'Save Mapping'}
        </button>
      </div>
    </div>
  );
}

// ─── Setup: Program Outcomes ─────────────────────────────────────────────────
function POSetup({ programs, toast }) {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [pos, setPOs] = useState([]);
  const [newPO, setNewPO] = useState({ po_code: '', po_description: '' });
  const [loading, setLoading] = useState(false);

  async function loadPOs(pid) {
    setSelectedProgram(pid);
    if (!pid) { setPOs([]); return; }
    try { setPOs(await api.obe.programOutcomes(pid)); } catch {}
  }

  async function seedNBA() {
    if (!selectedProgram) return toast('Select a program first', 'error');
    setLoading(true);
    try {
      const r = await api.obe.addPOs(selectedProgram, { seed_nba: true });
      toast(`Seeded ${r.inserted} NBA POs`);
      await loadPOs(selectedProgram);
    } catch (e) { toast(e.message, 'error'); } finally { setLoading(false); }
  }

  async function addPO() {
    if (!newPO.po_code.trim()) return toast('PO code required', 'error');
    if (!selectedProgram) return toast('Select a program first', 'error');
    setLoading(true);
    try {
      await api.obe.addPOs(selectedProgram, { pos: [newPO] });
      setNewPO({ po_code: '', po_description: '' });
      toast('PO added');
      await loadPOs(selectedProgram);
    } catch (e) { toast(e.message, 'error'); } finally { setLoading(false); }
  }

  async function delPO(id) {
    try { await api.obe.deletePO(id); await loadPOs(selectedProgram); toast('Deleted'); } catch (e) { toast(e.message, 'error'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Program</label>
          <select style={S.input} value={selectedProgram} onChange={e => loadPOs(e.target.value)}>
            <option value="">— Select Program —</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button style={{ ...S.btn('success'), marginTop: 18 }} disabled={loading || !selectedProgram} onClick={seedNBA}>
          Seed NBA POs (PO1–PO12)
        </button>
      </div>

      {selectedProgram && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 10, marginBottom: 14, alignItems: 'end' }}>
            <div>
              <label style={S.label}>PO Code</label>
              <input style={S.input} placeholder="PO13" value={newPO.po_code} onChange={e => setNewPO(f => ({ ...f, po_code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label style={S.label}>Description</label>
              <input style={S.input} placeholder="Custom outcome description" value={newPO.po_description} onChange={e => setNewPO(f => ({ ...f, po_description: e.target.value }))} />
            </div>
            <button style={{ ...S.btn('primary'), marginTop: 18 }} disabled={loading} onClick={addPO}>+ Add</button>
          </div>

          {pos.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Code', 'Description', ''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {pos.map(po => (
                  <tr key={po.id}>
                    <td style={{ ...S.td, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap' }}>{po.po_code}</td>
                    <td style={{ ...S.td, fontSize: 12 }}>{po.po_description}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <button style={S.btn('danger', true)} onClick={() => delPO(po.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>No POs yet. Seed NBA POs or add custom ones.</p>}
        </>
      )}
    </div>
  );
}

// ─── Setup: CO-PO Matrix ─────────────────────────────────────────────────────
function COPOMatrix({ courseId, programs, toast }) {
  const [cos, setCOs] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [pos, setPOs] = useState([]);
  const [matrix, setMatrix] = useState({}); // { coId_poId: strength }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    api.obe.courseOutcomes(courseId).then(setCOs).catch(() => {});
    api.obe.getCOPOMapping(courseId).then(rows => {
      const m = {};
      rows.forEach(r => { m[`${r.co_id}_${r.po_id}`] = r.mapping_strength; });
      setMatrix(m);
    }).catch(() => {});
  }, [courseId]);

  useEffect(() => {
    if (!selectedProgram) { setPOs([]); return; }
    api.obe.programOutcomes(selectedProgram).then(setPOs).catch(() => {});
  }, [selectedProgram]);

  function setStrength(coId, poId, val) {
    setMatrix(prev => ({ ...prev, [`${coId}_${poId}`]: +val }));
  }

  async function save() {
    setSaving(true);
    try {
      const rows = Object.entries(matrix)
        .filter(([, s]) => s > 0)
        .map(([key, mapping_strength]) => {
          const [co_id, po_id] = key.split('_');
          return { co_id, po_id, mapping_strength };
        });
      await api.obe.saveCOPOMapping(courseId, rows);
      toast('CO-PO matrix saved');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  }

  if (!cos.length) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>Define Course Outcomes first.</p>;

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>Program (for POs)</label>
        <select style={{ ...S.input, maxWidth: 300 }} value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}>
          <option value="">— Select Program —</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {selectedProgram && pos.length > 0 ? (
        <>
          <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>0 = None · 1 = Low · 2 = Medium · 3 = High</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={S.th}>CO</th>
                  {pos.map(po => <th key={po.id} style={{ ...S.th, textAlign: 'center', minWidth: 60 }}>{po.po_code}</th>)}
                </tr>
              </thead>
              <tbody>
                {cos.map(co => (
                  <tr key={co.id}>
                    <td style={{ ...S.td, fontWeight: 700, color: '#6366f1' }}>{co.co_code}</td>
                    {pos.map(po => {
                      const val = matrix[`${co.id}_${po.id}`] || 0;
                      const colors = ['#f3f4f6', '#fef3c7', '#dbeafe', '#dcfce7'];
                      return (
                        <td key={po.id} style={{ ...S.td, textAlign: 'center', background: colors[val], padding: '6px 8px' }}>
                          <select value={val} onChange={e => setStrength(co.id, po.id, e.target.value)}
                            style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: '3px 4px', fontSize: 12, background: 'transparent', cursor: 'pointer' }}>
                            {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14, textAlign: 'right' }}>
            <button style={S.btn('primary')} disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Matrix'}</button>
          </div>
        </>
      ) : selectedProgram ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>No POs for this program. Set them up in the "Program Outcomes" tab first.</p>
      ) : null}
    </div>
  );
}

// ─── CO Attainment View ──────────────────────────────────────────────────────
function COAttainmentView({ courseId, filters, toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subtab, setSubtab] = useState('co');

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    api.obe.coAttainment(courseId, filters)
      .then(setData).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [courseId, filters]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Computing attainment…</div>;
  if (!data) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>Select a course to view CO attainment.</p>;
  if (!data.cos.length) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⚙️</div>
      No Course Outcomes defined. Go to <strong>Setup → Course Outcomes</strong> to add COs.
    </div>
  );

  const { cos, results, studentDetail, config } = data;

  const tabs = [
    { id: 'co', label: 'CO Summary' },
    { id: 'students', label: `Students (${studentDetail.length})` },
    { id: 'config', label: 'Config' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSubtab(t.id)} style={{
            padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, borderBottom: subtab === t.id ? '2px solid #6366f1' : '2px solid transparent',
            color: subtab === t.id ? '#6366f1' : '#6b7280', marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      {subtab === 'co' && (
        <>
          {/* CO cards */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {cos.map(co => {
              const r = results[co.co_code];
              if (!r) return null;
              const color = LEVEL_COLORS[r.level];
              return (
                <div key={co.id} style={{ flex: '1 1 140px', minWidth: 130, textAlign: 'center', padding: '16px 12px', background: '#f9fafb', borderRadius: 10, border: `2px solid ${r.met_target ? '#bbf7d0' : '#fee2e2'}` }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>{co.co_code}</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color, margin: '8px 0' }}>{r.attainment_pct}%</div>
                  <span style={S.badge(r.level === 3 ? 'green' : r.level === 2 ? 'blue' : r.level === 1 ? 'yellow' : 'red')}>
                    Level {r.level}
                  </span>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
                    {r.students_attained}/{r.total_students} students
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Threshold', value: `${config.threshold_pct}%`, color: '#374151' },
              { label: 'COs at Target', value: Object.values(results).filter(r => r.met_target).length, color: '#16a34a' },
              { label: 'COs Below Target', value: Object.values(results).filter(r => !r.met_target).length, color: '#ef4444' },
              { label: 'Total Students', value: Object.values(results)[0]?.total_students || 0, color: '#374151' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Detailed table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['CO', 'Description', 'Attainment %', 'Level', 'Target', 'Students Attained', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {cos.map(co => {
                const r = results[co.co_code];
                if (!r) return null;
                return (
                  <tr key={co.id}>
                    <td style={{ ...S.td, fontWeight: 700, color: '#6366f1' }}>{co.co_code}</td>
                    <td style={{ ...S.td, fontSize: 12, maxWidth: 220 }}>{co.co_description || '—'}</td>
                    <td style={{ ...S.td, minWidth: 140 }}><ProgressBar value={r.attainment_pct} /></td>
                    <td style={S.td}>
                      <span style={S.badge(r.level === 3 ? 'green' : r.level === 2 ? 'blue' : r.level === 1 ? 'yellow' : 'red')}>
                        Level {r.level}
                      </span>
                    </td>
                    <td style={S.td}><span style={S.badge('purple')}>Level {r.target_attainment}</span></td>
                    <td style={S.td}>{r.students_attained} / {r.total_students}</td>
                    <td style={S.td}>{r.met_target ? '✅ Met' : '⚠️ Gap'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {subtab === 'students' && (
        studentDetail.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}>Roll</th>
                <th style={S.th}>Name</th>
                {cos.map(co => <th key={co.id} style={S.th}>{co.co_code}</th>)}
                <th style={S.th}>Avg Score</th>
                <th style={S.th}>Weak COs</th>
                <th style={S.th}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {studentDetail.map(s => (
                <tr key={s.student_id}>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11 }}>{s.roll}</td>
                  <td style={S.td}>{s.name}</td>
                  {cos.map(co => {
                    const v = s.co_scores[co.co_code];
                    return (
                      <td key={co.id} style={{ ...S.td, textAlign: 'center', fontWeight: 600, color: v === null ? '#d1d5db' : v >= config.threshold_pct ? '#16a34a' : '#ef4444' }}>
                        {v === null ? '—' : `${v}%`}
                      </td>
                    );
                  })}
                  <td style={{ ...S.td, fontWeight: 600 }}>{s.avg_score}%</td>
                  <td style={S.td}>{s.weak_cos.length ? s.weak_cos.map(c => <span key={c} style={{ ...S.badge('red'), marginRight: 3 }}>{c}</span>) : '✅'}</td>
                  <td style={{ ...S.td, minWidth: 100 }}>
                    {s.risk > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${s.risk}%`, height: '100%', background: s.risk > 60 ? '#ef4444' : '#f59e0b', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28 }}>{s.risk}%</span>
                      </div>
                    ) : <span style={{ color: '#16a34a', fontSize: 12 }}>Low</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>No marks data available for this course/semester.</p>
      )}

      {subtab === 'config' && <ConfigPanel courseId={courseId} toast={toast} />}
    </div>
  );
}

function ConfigPanel({ courseId, toast }) {
  const [cfg, setCfg] = useState({ threshold_pct: 60, level_3_pct: 80, level_2_pct: 70, level_1_pct: 60, target_level: 2, weight_direct: 0.8, weight_indirect: 0.2 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    api.obe.getCourseConfig(courseId).then(setCfg).catch(() => {});
  }, [courseId]);

  async function save() {
    setSaving(true);
    try { await api.obe.saveCourseConfig(courseId, cfg); toast('Config saved'); } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  }

  const field = (label, key, extra = {}) => (
    <div style={{ flex: 1 }}>
      <label style={S.label}>{label}</label>
      <input type="number" style={S.input} value={cfg[key]} onChange={e => setCfg(f => ({ ...f, [key]: +e.target.value }))} {...extra} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        {field('Pass Threshold %', 'threshold_pct', { min: 1, max: 100 })}
        {field('Level 3 (≥ % students)', 'level_3_pct', { min: 1, max: 100 })}
        {field('Level 2 (≥ % students)', 'level_2_pct', { min: 1, max: 100 })}
        {field('Level 1 (≥ % students)', 'level_1_pct', { min: 1, max: 100 })}
        {field('Default Target Level', 'target_level', { min: 1, max: 3 })}
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, padding: '8px 12px', background: '#f9fafb', borderRadius: 6 }}>
        <strong>How levels work:</strong> If ≥ {cfg.level_3_pct}% of students score ≥ {cfg.threshold_pct}% on a CO → Level 3 (Target Met).
        {cfg.level_2_pct}% → Level 2 · {cfg.level_1_pct}% → Level 1 · Below → Level 0.
      </div>
      <button style={S.btn('primary')} disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Config'}</button>
    </div>
  );
}

// ─── PO Attainment View ──────────────────────────────────────────────────────
function POAttainmentView({ courseId, programs, filters, toast }) {
  const [mode, setMode] = useState('course'); // 'course' | 'program'
  const [selectedProgram, setSelectedProgram] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'course' && courseId) {
      setLoading(true);
      api.obe.poAttainment(courseId, filters)
        .then(setData).catch(e => toast(e.message, 'error'))
        .finally(() => setLoading(false));
    } else if (mode === 'program' && selectedProgram) {
      setLoading(true);
      api.obe.programPO(selectedProgram, filters)
        .then(setData).catch(e => toast(e.message, 'error'))
        .finally(() => setLoading(false));
    }
  }, [courseId, mode, selectedProgram, filters]);

  const poResults = data?.poResults || {};
  const poList = Object.values(poResults).sort((a, b) => a.po_code.localeCompare(b.po_code, undefined, { numeric: true }));

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div>
          <label style={S.label}>View Mode</label>
          <select style={S.input} value={mode} onChange={e => { setMode(e.target.value); setData(null); }}>
            <option value="course">Single Course (CO→PO)</option>
            <option value="program">Program Level (All Courses)</option>
          </select>
        </div>
        {mode === 'program' && (
          <div style={{ flex: 1 }}>
            <label style={S.label}>Program</label>
            <select style={S.input} value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}>
              <option value="">— Select —</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#9ca3af', padding: 30 }}>Computing…</p>}

      {!loading && poList.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'POs Computed', value: poList.length },
              { label: 'POs ≥ 75%', value: poList.filter(p => p.attainment_pct >= 75).length, color: '#16a34a' },
              { label: 'POs ≥ 60%', value: poList.filter(p => p.attainment_pct >= 60).length, color: '#3b82f6' },
              { label: 'POs < 60%', value: poList.filter(p => p.attainment_pct < 60).length, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color || '#374151', marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>PO Attainment Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {poList.map(po => (
                <div key={po.po_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ minWidth: 45, fontWeight: 700, color: '#7c3aed', fontSize: 13 }}>{po.po_code}</span>
                  <ProgressBar value={po.attainment_pct} />
                  <span style={S.badge(po.attainment_pct >= 75 ? 'green' : po.attainment_pct >= 60 ? 'blue' : po.attainment_pct >= 40 ? 'yellow' : 'red')}>
                    {po.attainment_pct}%
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, borderTop: '1px dashed #ef4444', paddingTop: 8, fontSize: 11, color: '#ef4444' }}>Target: ≥ 60% minimum attainment</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['PO', 'Description', 'Attainment %', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {poList.map(po => (
                <tr key={po.po_id}>
                  <td style={{ ...S.td, fontWeight: 700, color: '#7c3aed' }}>{po.po_code}</td>
                  <td style={{ ...S.td, fontSize: 12 }}>{po.po_description || '—'}</td>
                  <td style={{ ...S.td, minWidth: 180 }}><ProgressBar value={po.attainment_pct} /></td>
                  <td style={S.td}>
                    <span style={S.badge(po.attainment_pct >= 75 ? 'green' : po.attainment_pct >= 60 ? 'blue' : 'red')}>
                      {po.attainment_pct >= 75 ? 'High' : po.attainment_pct >= 60 ? 'Met' : 'Below Target'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {!loading && !poList.length && (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          No PO data. Ensure COs are defined, component mapping is saved, and CO-PO matrix has been configured.
        </div>
      )}
    </div>
  );
}

// ─── Gap Analysis View ───────────────────────────────────────────────────────
function GapView({ courseId, filters, toast }) {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    api.obe.gaps(courseId, filters)
      .then(setGaps).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [courseId, filters]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Analysing gaps…</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Gaps', value: gaps.length },
          { label: 'Critical', value: gaps.filter(g => g.severity === 'Critical').length, color: '#ef4444' },
          { label: 'High', value: gaps.filter(g => g.severity === 'High').length, color: '#d97706' },
          { label: 'Medium', value: gaps.filter(g => g.severity === 'Medium').length, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color || '#374151', marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {gaps.length > 0 ? (
        gaps.map((g, i) => (
          <div key={i} style={{ padding: '14px 16px', marginBottom: 10, background: g.severity === 'Critical' ? '#fef2f2' : g.severity === 'High' ? '#fffbeb' : '#eff6ff', borderRadius: 8, borderLeft: `4px solid ${g.severity === 'Critical' ? '#ef4444' : g.severity === 'High' ? '#f59e0b' : '#3b82f6'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>{g.code}</span>
                {g.description && <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>{g.description}</span>}
              </div>
              <span style={S.badge(g.severity === 'Critical' ? 'red' : g.severity === 'High' ? 'yellow' : 'blue')}>{g.severity}</span>
            </div>
            <p style={{ fontSize: 12, color: '#374151', margin: '6px 0 4px' }}>
              <strong>Attainment:</strong> {g.attainment_pct}% → Level {g.current_level} (Target: Level {g.target_level})
            </p>
            <p style={{ fontSize: 12, color: '#6366f1' }}><strong>Action:</strong> {g.action}</p>
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#16a34a' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          All COs meeting target attainment. No gaps detected.
        </div>
      )}
    </div>
  );
}

// ─── At-Risk Students ────────────────────────────────────────────────────────
function RiskView({ courseId, filters, toast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    api.obe.atRisk(courseId, filters)
      .then(setStudents).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [courseId, filters]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Scanning…</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'At Risk', value: students.length, color: '#ef4444' },
          { label: 'High Risk (> 60%)', value: students.filter(s => s.risk > 60).length, color: '#d97706' },
          { label: 'Multiple Weak COs (≥ 2)', value: students.filter(s => s.weak_cos.length >= 2).length, color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {students.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Roll', 'Name', 'Avg Score', 'Weak COs', 'Risk Score', 'Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {students.map(s => (
              <tr key={s.student_id}>
                <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11 }}>{s.roll}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>{s.name}</td>
                <td style={{ ...S.td, fontWeight: 600, color: s.avg_score >= 60 ? '#16a34a' : '#ef4444' }}>{s.avg_score}%</td>
                <td style={S.td}>{s.weak_cos.map(c => <span key={c} style={{ ...S.badge('red'), marginRight: 3 }}>{c}</span>)}</td>
                <td style={{ ...S.td, minWidth: 120 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${s.risk}%`, height: '100%', background: s.risk > 60 ? '#ef4444' : '#f59e0b', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, minWidth: 30 }}>{s.risk}%</span>
                  </div>
                </td>
                <td style={S.td}>
                  <button style={S.btn('warning', true)}
                    onClick={() => alert(`Notify ${s.name} (${s.roll}) about weak performance in: ${s.weak_cos.join(', ')}`)}>
                    Notify
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#16a34a' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
          No at-risk students detected.
        </div>
      )}
    </div>
  );
}

// ─── Main OBEAnalytics Component ─────────────────────────────────────────────
export default function OBEAnalytics({ user }) {
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const isSetupAllowed = isAdmin || user?.role === 'faculty';

  const [tab, setTab] = useState('attainment');
  const [setupTab, setSetupTab] = useState('co');
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  useEffect(() => {
    Promise.all([api.courses.list(), api.programs.list()])
      .then(([c, p]) => { setCourses(c || []); setPrograms(p || []); })
      .catch(() => {});
  }, []);

  const filters = semester || academicYear ? { semester, academic_year: academicYear } : {};

  const TABS = [
    ...(isSetupAllowed ? [{ id: 'setup', label: '⚙️ Setup', icon: 'ri-settings-3-line' }] : []),
    { id: 'attainment', label: '📊 CO Attainment', icon: 'ri-bar-chart-line' },
    { id: 'po', label: '🎯 PO Attainment', icon: 'ri-target-line' },
    { id: 'gaps', label: '⚠️ Gap Analysis', icon: 'ri-alert-line' },
    { id: 'risk', label: '🚩 At-Risk Students', icon: 'ri-user-unfollow-line' },
  ];

  const SETUP_TABS = [
    { id: 'co', label: 'Course Outcomes' },
    { id: 'mapping', label: 'Component Mapping' },
    { id: 'po_setup', label: 'Program Outcomes' },
    { id: 'matrix', label: 'CO-PO Matrix' },
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '2 1 200px', minWidth: 180 }}>
          <label style={S.label}>Course</label>
          <select style={S.input} value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
            <option value="">— Select Course —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 140px', minWidth: 120 }}>
          <label style={S.label}>Semester</label>
          <input style={S.input} placeholder="e.g. Odd 2024" value={semester} onChange={e => setSemester(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 140px', minWidth: 120 }}>
          <label style={S.label}>Academic Year</label>
          <input style={S.input} placeholder="e.g. 2024-25" value={academicYear} onChange={e => setAcademicYear(e.target.value)} />
        </div>
        {(semester || academicYear) && (
          <button style={{ ...S.btn('outline'), marginBottom: 1 }} onClick={() => { setSemester(''); setAcademicYear(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid #e5e7eb', marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
            color: tab === t.id ? '#6366f1' : '#6b7280', marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Setup tab */}
      {tab === 'setup' && isSetupAllowed && (
        <div style={S.card}>
          <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
            {SETUP_TABS.map(t => (
              <button key={t.id} onClick={() => setSetupTab(t.id)} style={{
                padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                borderBottom: setupTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                color: setupTab === t.id ? '#6366f1' : '#6b7280', marginBottom: -1,
              }}>{t.label}</button>
            ))}
          </div>

          {setupTab === 'co' && (
            selectedCourse
              ? <COSetup key={selectedCourse} courseId={selectedCourse} toast={toast} />
              : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>Select a course above to manage its COs.</p>
          )}
          {setupTab === 'mapping' && (
            selectedCourse
              ? <MappingSetup key={selectedCourse} courseId={selectedCourse} toast={toast} />
              : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>Select a course above.</p>
          )}
          {setupTab === 'po_setup' && <POSetup programs={programs} toast={toast} />}
          {setupTab === 'matrix' && (
            selectedCourse
              ? <COPOMatrix key={selectedCourse} courseId={selectedCourse} programs={programs} toast={toast} />
              : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>Select a course above.</p>
          )}
        </div>
      )}

      {tab === 'attainment' && (
        <div style={S.card}>
          <COAttainmentView courseId={selectedCourse} filters={filters} toast={toast} />
        </div>
      )}

      {tab === 'po' && (
        <div style={S.card}>
          <POAttainmentView courseId={selectedCourse} programs={programs} filters={filters} toast={toast} />
        </div>
      )}

      {tab === 'gaps' && (
        <div style={S.card}>
          {selectedCourse
            ? <GapView courseId={selectedCourse} filters={filters} toast={toast} />
            : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>Select a course to view gap analysis.</p>}
        </div>
      )}

      {tab === 'risk' && (
        <div style={S.card}>
          {selectedCourse
            ? <RiskView courseId={selectedCourse} filters={filters} toast={toast} />
            : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>Select a course to view at-risk students.</p>}
        </div>
      )}
    </div>
  );
}
