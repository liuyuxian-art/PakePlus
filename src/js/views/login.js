import { api, login } from '../api.js';
import { $, esc, toast } from '../dom.js';

/**
 * 登录视图。演示账号由后端 /api/auth/demo-accounts 提供，
 * 生产环境关闭 demoMode 后该接口返回 404，页面自动隐藏演示区。
 */
export async function renderLogin(container, onSuccess) {
  container.innerHTML = `
    <div class="login-brand">
      <div class="logo">职镜</div>
      <div class="login-slogan">
        <h1>把招聘要求，<br>翻译成能练的能力项</h1>
        <p>从岗位 JD 出发，拆解结构化能力指标；用标准化测试与情景任务做诊断；
           把作品、评分与企业反馈沉淀成可分享的能力证据链。</p>
        <div class="login-points">
          <div><b>4 类</b><span>知识 / 工具 / 方法 / 产出</span></div>
          <div><b>L0—L3</b><span>证据分级采信</span></div>
          <div><b>40% + 60%</b><span>测试与作品加权</span></div>
        </div>
      </div>
      <div class="small">职镜大学生就业能力诊断与成长服务平台 V1.0</div>
    </div>
    <div class="login-panel">
      <div class="login-card">
        <h2>登录平台</h2>
        <p class="sub">学生、教研、企业与管理员共用入口</p>
        <form id="loginForm" novalidate>
          <label class="field">
            <span>账号</span>
            <input name="account" autocomplete="username" placeholder="请输入账号" value="zhang">
          </label>
          <label class="field">
            <span>密码</span>
            <input name="password" type="password" autocomplete="current-password" placeholder="请输入密码" value="123456">
          </label>
          <div class="login-error" id="loginError"></div>
          <button class="btn btn-primary btn-block" type="submit">登录</button>
        </form>
        <div class="demo-title" id="demoTitle" hidden>演示账号（点击直接登录，密码均为 123456）</div>
        <div class="demo-grid" id="demoGrid"></div>
      </div>
    </div>
  `;

  const form = $('#loginForm', container);
  const errorBox = $('#loginError', container);
  const submit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';
    submit.disabled = true;
    submit.textContent = '登录中…';
    try {
      const data = await login(form.account.value.trim(), form.password.value);
      onSuccess(data);
    } catch (err) {
      errorBox.textContent = err.message;
      submit.disabled = false;
      submit.textContent = '登录';
    }
  });

  try {
    const { accounts } = await api.get('/api/auth/demo-accounts');
    const grid = $('#demoGrid', container);
    $('#demoTitle', container).hidden = false;
    grid.innerHTML = accounts
      .map(
        (item) => `
        <button class="demo-btn" type="button" data-account="${esc(item.account)}">
          <b>${esc(item.name)}</b>
          <span>${esc(item.roleName)} · ${esc(item.account)}</span>
        </button>`
      )
      .join('');
    grid.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-account]');
      if (!button) return;
      errorBox.textContent = '';
      try {
        const data = await login(button.dataset.account, '123456');
        onSuccess(data);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  } catch (err) {
    /* 关闭演示模式时静默隐藏 */
  }
}

/** 免登录演示入口：?autologin=zhang，用于答辩演示与截图。 */
export async function autoLogin(account) {
  return login(account, '123456');
}
