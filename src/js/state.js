/** 全局会话状态：只保存与界面相关的少量字段，业务数据按需从接口拉取。 */
export const state = {
  user: null,
  role: '',
  roleName: '',
  route: '/jobs',
  jobId: null,
  assessmentId: null,
  planId: null
};

export function setUser(user, roleName) {
  state.user = user;
  state.role = user ? user.role : '';
  state.roleName = roleName || '';
}

export function isStaff() {
  return state.role === 'teacher' || state.role === 'admin';
}

export function isAdmin() {
  return state.role === 'admin';
}

export function initial(name) {
  return (name || '职').slice(0, 1);
}
