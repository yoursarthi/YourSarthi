export const ROLES = {
  ADMIN:      'admin',
  FACULTY:    'faculty',
  STUDENT:    'student',
  MODERATOR:  'moderator',
};

export const ROLE_LABELS = {
  admin:     'Administrator',
  faculty:   'Faculty',
  student:   'Student',
  moderator: 'Moderator',
};

export const ADMIN_ROLES  = [ROLES.ADMIN];
export const STAFF_ROLES  = [ROLES.ADMIN, ROLES.FACULTY, ROLES.MODERATOR];
export const ALL_ROLES    = Object.values(ROLES);
