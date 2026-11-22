import { getToken, setToken, logout as apiLogout, ensureSession, ApiError } from './api.js';
import { $, toast } from './dom.js';
import { state, setUser, initial, isStaff } from './state.js';
import { renderLogin, autoLogin } from './views/login.js';
import { renderJobs } from './views/jobs.js';
import { renderAssess } from './views/assess.js';
import { renderPlan } from './views/plan.js';
import { renderProfile } from './views/profile.js';
import { renderModel } from './views/model.js';
import { renderAdmin, resetAdminCache } from './views/admin.js';
import { renderCandidates } from './views/candidates.js';

const ROUTES = {
  '/jobs': { title: '岗位解析', view: renderJobs },
  '/assess': { title: '能力诊断', view: renderAssess },
  '/plan': { title: '成长计划', view: renderPlan },
  '/profile': { title: '能力档案', view: renderProfile },
  '/model': { title: '能力模型', view: renderModel },
  '/admin': { title: '后台管理', view: renderAdmin, roles: ['teacher', 'admin'] },
  '/candidates': { title: '候选人', view: renderCandidates, roles: ['enterprise', 'teacher', 'admin'] }
};

let rendering = false;

function currentRoute() {
  const raw = (location.hash || '').replace(/^#/, '');
  if (!raw) return '/jobs';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function updateChrome() {
  const route = currentRoute();
  document.querySelectorAll('.step').forEach((button) => {
    button.classList.toggle('active', button.dataset.route === route);
  });
  if (state.user) {
    $('#accountName').textContent = state.user.name;
    $('#accountRole').textContent = state.roleName;
    $('#avatar').textContent = initial(state.user.name);
  }
  const meta = ROUTES[route];
  document.title = meta ? `${meta.title} · 职镜` : '职镜 · 大学生就业能力诊断与成长服务平台';
}

async function renderRoute() {
  if (!state.user || rendering) return;
  let route = currentRoute();
  const meta = ROUTES[route] || ROUTES['/jobs'];
  if (meta.roles && !meta.roles.includes(state.role)) {
    toast('当前角色无权访问该页面');
    location.hash = '#/jobs';
    return;
  }
  const view = $('#view');
  rendering = true;
  updateChrome();
  try {
    await meta.view(view);
    view.focus({ preventScroll: true });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      handleExpired();
      return;
    }
    console.error(err);
    view.innerHTML = `<div class="card empty">
      <h2>页面加载失败</h2>
      <p class="sub">${err.message || '未知错误'}</p>
      <button class="btn btn-primary" onclick="location.reload()">重新加载</button>
    </div>`;
  } finally {
    rendering = false;
  }
}

function applyRoles() {
  const staff = isStaff();
  document.querySelectorAll('.admin-only').forEach((node) => {
    node.hidden = !staff;
  });
  document.querySelectorAll('.enterprise-only').forEach((node) => {
    node.hidden = !['enterprise', 'teacher', 'admin'].includes(state.role);
  });
}

function startApp(payload) {
  const user = payload.user;
  setUser(user, payload.roleName || '');
  applyRoles();

  $('#boot').hidden = true;
  $('#login').hidden = true;
  $('#app').hidden = false;

  if (!location.hash) location.hash = '#/jobs';
  renderRoute();
}

function showLogin(message) {
  $('#boot').hidden = true;
  $('#app').hidden = true;
  const loginBox = $('#login');
  loginBox.hidden = false;
  renderLogin(loginBox, (data) => startApp(data));
  if (message) toast(message, 'error');
}

function handleExpired() {
  setToken('');
  state.user = null;
  resetAdminCache();
  showLogin('登录已过期，请重新登录');
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const auto = params.get('autologin');

  try {
    if (auto) {
      const data = await autoLogin(auto);
      startApp(data);
      return;
    }
    if (getToken()) {
      const me = await ensureSession();
      startApp(me);
      return;
    }
  } catch (err) {
    setToken('');
  }
  showLogin();
}

$('#nav').addEventListener('click', (event) => {
  const button = event.target.closest('[data-route]');
  if (!button) return;
  location.hash = `#${button.dataset.route}`;
});

$('#logoutBtn').addEventListener('click', async () => {
  await apiLogout();
  state.user = null;
  resetAdminCache();
  window.location.hash = '';
  showLogin('已退出登录');
});

window.addEventListener('hashchange', () => {
  if (state.user) renderRoute();
});

boot();

// 便于在控制台排查问题，同时避免污染全局命名空间。
window.__ZHIJING__ = { state, routes: Object.keys(ROUTES) };
