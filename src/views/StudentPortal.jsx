import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const CATEGORIES = ['General', 'OBC', 'OBC-NCL', 'SC', 'ST', 'EWS'];
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other', 'Prefer not to say'];
const NATIONALITIES = ['Indian', 'Other'];

const TABS = [
  { id: 'profile', label: 'My Profile', icon: 'ri-user-line' },
  { id: 'grades', label: 'My Grades', icon: 'ri-bar-chart-line' },
];

export default function StudentPortal({ user }) {
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const [studentData, setStudentData] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Admin-locked — shown but not editable without admin approval
  const [locked, setLocked] = useState({
    id: '', firstName: '', lastName: '', email: '', department: '', program: '',
    batch: '', fatherName: '', motherName: '', permanentAddress: '',
    category: '', enrollmentNo: '',
  });

  // Freely editable by student
  const [personal, setPersonal] = useState({
    phone: '', whatsapp: '', gender: '', dateOfBirth: '', nationality: 'Indian',
    religion: '', bloodGroup: '', medicalHistory: '',
    localAddress: '', hobbies: '', careerOptions: '', achievements: '',
    linkedin: '', github: '',
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.students.list().catch(() => []),
      api.evaluations.results().catch(() => []),
    ]).then(([allStudents, allResults]) => {
      const s = allStudents.find(st => st.id === user.studentId || st.email === user.email);
      if (s) {
        setStudentData(s);
        setLocked({
          id: s.id || '',
          firstName: s.firstName || '',
          lastName: s.lastName || '',
          email: s.email || '',
          department: s.department || '',
          program: s.program || '',
          batch: s.batch || '',
          fatherName: s.fatherName || '',
          motherName: s.motherName || '',
          permanentAddress: s.permanentAddress || '',
          category: s.category || '',
          enrollmentNo: s.enrollmentNo || s.id || '',
        });
        setPersonal({
          phone: s.phone || '',
          whatsapp: s.whatsapp || s.phone || '',
          gender: s.gender || '',
          dateOfBirth: s.dateOfBirth || '',
          nationality: s.nationality || 'Indian',
          religion: s.religion || '',
          bloodGroup: s.bloodGroup || '',
          medicalHistory: s.medicalHistory || '',
          localAddress: s.localAddress || '',
          hobbies: s.hobbies || '',
          careerOptions: s.careerOptions || '',
          achievements: s.achievements || '',
          linkedin: s.linkedin || '',
          github: s.github || '',
        });
      }
      const myResults = allResults.filter(r =>
        r.studentName?.toLowerCase() === user.name?.toLowerCase() ||
        r.rollNo === user.studentId
      );
      setResults(myResults);
    }).finally(() => setLoading(false));
  }, [user]);

  const saveProfile = async () => {
    const sid = user.studentId || studentData?.id;
    if (!sid) { toast('Student record not linked — contact admin to update profile.', 'error'); return; }
    setSaving(true);
    try {
      await api.students.update(sid, {
        ...personal,
        firstName: locked.firstName, lastName: locked.lastName,
        email: locked.email, department: locked.department,
        program: locked.program, batch: locked.batch,
        fatherName: locked.fatherName, motherName: locked.motherName,
        permanentAddress: locked.permanentAddress,
      });
      toast('Profile updated successfully!', 'success');
      setEditMode(false);
    } catch (err) {
      toast(`Failed to save: ${err.message}`, 'error');
    }
    setSaving(false);
  };

  const P = k => e => setPersonal(p => ({ ...p, [k]: e.target.value }));

  const gradeColor = {
    O: 'bg-green-100 text-green-700', 'A+': 'bg-blue-100 text-blue-700',
    A: 'bg-blue-100 text-blue-600', 'B+': 'bg-yellow-100 text-yellow-700',
    B: 'bg-yellow-100 text-yellow-600', C: 'bg-orange-100 text-orange-700',
    F: 'bg-red-100 text-red-700',
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading your portal…</p>
      </div>
    </div>
  );

  const fullName = `${locked.firstName} ${locked.lastName}`.trim() || user.name;
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center text-3xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold">{fullName}</h2>
            <p className="text-blue-200 text-sm">{locked.email || user.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {locked.program && <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{locked.program}</span>}
              {locked.batch && <span className="text-xs bg-white/20 px-3 py-1 rounded-full">Batch: {locked.batch}</span>}
              {locked.department && <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{locked.department.split(' ')[0]}</span>}
              {locked.id && <span className="text-xs bg-orange-400 px-3 py-1 rounded-full font-semibold">ID: {locked.id}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <i className={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── PROFILE TAB ─── */}
      {tab === 'profile' && (
        <div className="space-y-5">

          {/* Locked — Academic & Family Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Academic & Admission Information</h3>
                <p className="text-xs text-gray-500 mt-0.5">Set at admission — request admin to change</p>
              </div>
              <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full flex items-center gap-1">
                <i className="ri-lock-line" /> Admin only
              </span>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <InfoField icon="ri-fingerprint-line" label="Student / Roll No." value={locked.id} />
              <InfoField icon="ri-file-text-line" label="Enrollment No." value={locked.enrollmentNo} />
              <InfoField icon="ri-mail-line" label="Official Email" value={locked.email || user.email} />
              <InfoField icon="ri-building-line" label="Department" value={locked.department} />
              <InfoField icon="ri-book-open-line" label="Program" value={locked.program} />
              <InfoField icon="ri-calendar-line" label="Batch" value={locked.batch} />
              <InfoField icon="ri-shield-user-line" label="Category" value={locked.category || '—'} />
              <InfoField icon="ri-parent-line" label="Father's Name" value={locked.fatherName || '—'} />
              <InfoField icon="ri-parent-line" label="Mother's Name" value={locked.motherName || '—'} />
              <div className="sm:col-span-2 md:col-span-3">
                <InfoField icon="ri-map-pin-2-line" label="Permanent Address" value={locked.permanentAddress || '—'} />
              </div>
            </div>
          </div>

          {/* Editable — Personal Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Personal Information</h3>
                <p className="text-xs text-gray-500 mt-0.5">You can update these at any time</p>
              </div>
              {!editMode ? (
                <button onClick={() => setEditMode(true)} className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-700">
                  <i className="ri-edit-line" /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="text-xs border px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button onClick={saveProfile} disabled={saving} className="text-xs bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 flex items-center gap-1.5">
                    <i className="ri-save-line" /> {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
            <div className="p-6 space-y-6">

              {/* Basic Personal */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Basic Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <EditField label="Gender" icon="ri-user-heart-line" value={personal.gender} editMode={editMode}>
                    {editMode ? (
                      <select className="form-input text-sm" value={personal.gender} onChange={P('gender')}>
                        <option value="">Select Gender</option>
                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : null}
                  </EditField>

                  <EditField label="Date of Birth" icon="ri-cake-line" value={personal.dateOfBirth ? new Date(personal.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} editMode={editMode}>
                    {editMode ? <input type="date" className="form-input text-sm" value={personal.dateOfBirth} onChange={P('dateOfBirth')} /> : null}
                  </EditField>

                  <EditField label="Nationality" icon="ri-global-line" value={personal.nationality} editMode={editMode}>
                    {editMode ? (
                      <select className="form-input text-sm" value={personal.nationality} onChange={P('nationality')}>
                        {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    ) : null}
                  </EditField>

                  <EditField label="Religion" icon="ri-star-smile-line" value={personal.religion || '—'} editMode={editMode}>
                    {editMode ? (
                      <select className="form-input text-sm" value={personal.religion} onChange={P('religion')}>
                        <option value="">Select Religion</option>
                        {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : null}
                  </EditField>

                  <EditField label="Blood Group" icon="ri-heart-pulse-line" value={personal.bloodGroup || '—'} editMode={editMode}>
                    {editMode ? (
                      <select className="form-input text-sm" value={personal.bloodGroup} onChange={P('bloodGroup')}>
                        <option value="">Select Blood Group</option>
                        {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : null}
                  </EditField>
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Contact Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SimpleField label="Phone Number" icon="ri-phone-line" value={personal.phone} editMode={editMode} onChange={P('phone')} placeholder="+91 98765 43210" />
                  <SimpleField label="WhatsApp Number" icon="ri-whatsapp-line" value={personal.whatsapp} editMode={editMode} onChange={P('whatsapp')} placeholder="+91 98765 43210" />
                  <div className="sm:col-span-2">
                    <SimpleField label="Local / Current Address" icon="ri-home-line" value={personal.localAddress} editMode={editMode} onChange={P('localAddress')} placeholder="Current hostel room or local address…" textarea />
                  </div>
                </div>
              </div>

              {/* Health */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Health Information</p>
                <SimpleField label="Medical History / Conditions" icon="ri-hospital-line" value={personal.medicalHistory} editMode={editMode} onChange={P('medicalHistory')} placeholder="Known allergies, medications, or medical conditions…" textarea />
              </div>

              {/* Social */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Social Profiles</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SimpleField label="LinkedIn Profile" icon="ri-linkedin-box-line" value={personal.linkedin} editMode={editMode} onChange={P('linkedin')} placeholder="linkedin.com/in/yourname" />
                  <SimpleField label="GitHub Profile" icon="ri-github-line" value={personal.github} editMode={editMode} onChange={P('github')} placeholder="github.com/yourname" />
                </div>
              </div>

              {/* Personal Development */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Personal Development</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SimpleField label="Hobbies & Interests" icon="ri-gamepad-line" value={personal.hobbies} editMode={editMode} onChange={P('hobbies')} placeholder="Reading, Photography, Coding, Sports…" textarea />
                  <SimpleField label="Career Goals / Options" icon="ri-briefcase-line" value={personal.careerOptions} editMode={editMode} onChange={P('careerOptions')} placeholder="Your career aspirations and goals…" textarea />
                  <div className="sm:col-span-2">
                    <SimpleField label="Awards & Achievements" icon="ri-trophy-line" value={personal.achievements} editMode={editMode} onChange={P('achievements')} placeholder="Academic awards, competitions, certifications, publications…" textarea />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── GRADES TAB ─── */}
      {tab === 'grades' && (
        <div className="space-y-5">
          {results.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-700">No Results Yet</h3>
              <p className="text-gray-500 mt-2 text-sm">Your evaluation results will appear here once graded by faculty.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Evaluated" value={results.length} icon="ri-file-text-line" color="blue" />
                <StatCard label="Average %" value={Math.round(results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length) + '%'} icon="ri-percent-line" color="green" />
                <StatCard label="Highest" value={Math.max(...results.map(r => r.percentage || 0)) + '%'} icon="ri-arrow-up-line" color="purple" />
                <StatCard label="Needs Review" value={results.filter(r => r.needsReview).length} icon="ri-flag-line" color="orange" />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Evaluation History</h3>
                </div>
                <div className="divide-y">
                  {results.map(r => (
                    <div key={r.id} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeColor[r.grade] || 'bg-gray-100 text-gray-600'}`}>
                              Grade: {r.grade}
                            </span>
                            {r.needsReview && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Needs Review</span>}
                          </div>
                          <p className="text-sm font-semibold text-gray-800">{r.marksAwarded} / {r.maxMarks} marks</p>
                          <p className="text-xs text-gray-500 mt-0.5">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-bold text-gray-800">{r.percentage}%</p>
                          <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full rounded-full ${r.percentage >= 60 ? 'bg-green-500' : r.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${r.percentage}%` }} />
                          </div>
                        </div>
                      </div>
                      {r.detailedFeedback && (
                        <p className="text-xs text-gray-600 mt-3 bg-blue-50 rounded-lg p-3 border-l-2 border-blue-400">{r.detailedFeedback}</p>
                      )}
                      {(r.strengths?.length > 0 || r.improvements?.length > 0) && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {r.strengths?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
                              <ul className="space-y-0.5">
                                {r.strengths.slice(0, 3).map((s, i) => (
                                  <li key={i} className="text-xs text-gray-600 flex gap-1"><span className="text-green-500 flex-shrink-0">✓</span>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {r.improvements?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-orange-700 mb-1">Areas to Improve</p>
                              <ul className="space-y-0.5">
                                {r.improvements.slice(0, 3).map((s, i) => (
                                  <li key={i} className="text-xs text-gray-600 flex gap-1"><span className="text-orange-500 flex-shrink-0">→</span>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Locked field display
function InfoField({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <i className={`${icon} text-blue-600 text-sm`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

// Editable field with custom select/date child support
function EditField({ label, icon, value, editMode, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
        {icon && <i className={`${icon} text-gray-400`} />} {label}
      </p>
      {editMode && children ? children : <p className="text-sm font-medium text-gray-800">{value || '—'}</p>}
    </div>
  );
}

// Simple text / textarea editable field
function SimpleField({ label, icon, value, editMode, onChange, placeholder, textarea }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
        {icon && <i className={`${icon} text-gray-400`} />} {label}
      </p>
      {editMode ? (
        textarea ? (
          <textarea className="form-input text-sm resize-none" rows={2} value={value} onChange={onChange} placeholder={placeholder} />
        ) : (
          <input className="form-input text-sm" value={value} onChange={onChange} placeholder={placeholder} />
        )
      ) : (
        <p className="text-sm font-medium text-gray-800 break-words">{value || '—'}</p>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };
  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <i className={`${icon} text-lg`} />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
