import { api } from '../api.js';
import { radarSvg, animateBars } from '../charts.js';
import { esc, toast, fmtDate, statusTag } from '../dom.js';
import { state, isStaff } from '../state.js';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function scoreCard(assessment) {
  const rows = assessment.rows || [];
  return rows
    .map((row) => {
      const hasScore = Number.isFinite(row.score);
      return `
      <div class="row">
        <div class="n">${esc(row.name)}</div>
        <div class="track">
          <div class="base"></div>
          <div class="me" data-w="${hasScore ? row.score : 0}"></div>
          <div class="need" style="left:${row.req}%"></div>
        </div>
        <div class="num">
          ${hasScore ? `${row.score} / ${row.req}` : '未测'}
          <span class="tag ${row.status === 'ok' ? 'ok' : row.status === 'near' ? 'gray' : 'warn'}" style="margin-left:4px">${esc(row.statusText)}</span>
        </div>
      </div>`;
    })
    .join('');
}

function assessmentHead(assessment) {
  const status = assessment.status;
  const tag =
    status === 'reviewed'
      ? '<span class="tag ok">教研已复核</span>'
      : status === 'test_done'
        ? '<span class="tag warn">作品分待复核</span>'
        : '<span class="tag gray">答题中</span>';
  return `
    <div class="screen-head">
      <div>
        <div class="kicker">Step 02 · 能力诊断</div>
        <h1>你现在在哪，差多少</h1>
        <p class="sub">
          岗位：${esc(assessment.jobTitle)} · 标准化测试占 40%，情景任务作品占 60%，按能力权重加权。
        </p>
      </div>
      <div class="tag">${tag}</div>
    </div>`;
}

function renderResult(root, data, reload) {
  const { assessment, paper, canReview } = data;
  const rows = assessment.rows || [];
  const weakest = (assessment.weakest || []).slice(0, 3);
  const gapText = weakest.length
    ? weakest
        .map(
          (item) => `
        <div class="pill">${esc(item.name)} <b>−${item.gap}</b><br>
          <span class="small muted">权重 ${item.weight}%，优先补这项</span></div>`
        )
        .join('')
    : '<div class="pill">各项已达标，可挑战更高要求的岗位</div>';

  root.innerHTML = `
    ${assessmentHead(assessment)}
    <div class="grid g2">
      <div class="card">
        <div class="section-title"><h2>能力雷达</h2><span class="tag line">岗位要求 vs 我的能力</span></div>
        <div class="radar-box">${radarSvg(rows.map((r) => ({ name: r.name, req: r.req, score: r.score })))}</div>
        <div class="legend">
          <span><i class="dt"></i>岗位要求</span>
          <span><i class="dt dt2"></i>我的能力</span>
        </div>
      </div>
      <div class="card">
        <div class="score-wrap">
          <div class="score">${assessment.finalScore == null ? '—' : assessment.finalScore}<small> / 100 综合匹配度</small></div>
          ${assessment.shortCount ? `<div class="tag warn">${assessment.shortCount} 项短板</div>` : '<div class="tag ok">无明显短板</div>'}
        </div>
        <div class="small muted" style="margin-top:8px">
          证据覆盖率 ${assessment.coverage}% · 目标分 ${assessment.targetScore}
        </div>
        <h3 style="margin-top:18px">分项对比</h3>
        ${scoreCard(assessment)}
        <div class="btn-row">
          <button class="btn btn-primary" id="toPlan">生成成长计划 →</button>
          ${
            isStaff()
              ? '<button class="btn btn-ghost" id="backList">返回记录列表</button>'
              : '<button class="btn btn-ghost" id="retake">重新诊断</button>'
          }
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">
        <h3>诊断结论</h3>
        ${assessment.reviewNote ? `<span class="tag line">复核意见：${esc(assessment.reviewNote)}</span>` : ''}
      </div>
      <div class="diff">${gapText}</div>
    </div>

    ${
      canReview && assessment.status === 'test_done'
        ? `<div class="card">
             <div class="section-title"><h3>教研复核评分</h3><span class="small muted">按 0—4 档打分，系统按 rubric 换算百分制</span></div>
             <div id="reviewForm"></div>
             <div class="btn-row"><button class="btn btn-primary" id="submitReview">提交复核</button></div>
           </div>`
        : ''
    }

    ${
      canReview
        ? `<div class="card">
             <div class="section-title"><h3>答题明细</h3><span class="small muted">共 ${paper.length} 题</span></div>
             <div class="small muted">${paper
               .map(
                 (q, index) =>
                   `<div style="padding:6px 0;border-bottom:1px solid #f5f6f9">
                      ${index + 1}. ${esc(q.stem)}
                      <span class="tag ${q.answerIndex === assessment.answers?.[q.id] ? 'ok' : 'warn'}" style="margin-left:6px">
                        正确答案 ${OPTION_LETTERS[q.answerIndex] || '—'} · 学生选 ${OPTION_LETTERS[assessment.answers?.[q.id]] || '未答'}
                      </span>
                    </div>`
               )
               .join('')}</div>
           </div>`
        : ''
    }
  `;

  animateBars(root);

  const planButton = root.querySelector('#toPlan');
  if (planButton) {
    planButton.addEventListener('click', async () => {
      planButton.disabled = true;
      try {
        await api.post('/api/plans', { assessmentId: assessment.id });
        window.location.hash = '#/plan';
      } catch (err) {
        toast(err.message, 'error');
        planButton.disabled = false;
      }
    });
  }

  const retake = root.querySelector('#retake');
  if (retake) retake.addEventListener('click', () => startAssessment(root));

  const back = root.querySelector('#backList');
  if (back) back.addEventListener('click', () => renderAssessList(root));

  if (canReview && assessment.status === 'test_done') {
    const form = root.querySelector('#reviewForm');
    form.innerHTML = rows
      .map(
        (row) => `
        <div class="row">
          <div class="n">${esc(row.name)}</div>
          <div style="flex:1" class="small muted">${row.test == null ? '未测试' : `测试分 ${row.test}`}</div>
          <select class="field" data-ability="${esc(row.key)}" style="width:150px;padding:7px 10px">
            ${[4, 3, 2, 1, 0]
              .map((v) => `<option value="${v}">${v} 档 · ${['未完成', '初步', '基本达标', '较好', '优秀'][v]}</option>`)
              .join('')}
          </select>
        </div>`
      )
      .join('');
    root.querySelector('#submitReview').addEventListener('click', async (event) => {
      const scores = {};
      form.querySelectorAll('select[data-ability]').forEach((select) => {
        scores[select.dataset.ability] = Number(select.value);
      });
      event.target.disabled = true;
      try {
        await api.post(`/api/assessments/${assessment.id}/work`, {
          scores,
          note: '教研按 rubric 完成复核'
        });
        toast('复核完成，已生成能力证据');
        await reload();
      } catch (err) {
        toast(err.message, 'error');
        event.target.disabled = false;
      }
    });
  }
}

function renderQuiz(root, data) {
  const { assessment, paper } = data;
  const groups = [];
  for (const question of paper) {
    const group = groups.find((g) => g.abilityKey === question.abilityKey);
    if (group) group.items.push(question);
    else groups.push({ abilityKey: question.abilityKey, abilityName: question.abilityName, items: [question] });
  }

  root.innerHTML = `
    ${assessmentHead(assessment)}
    <div class="card">
      <div class="section-title">
        <h2>标准化测试</h2>
        <span class="tag">${paper.length} 题 · 单项选择</span>
      </div>
      <p class="sub" style="margin-bottom:16px">
        题目按岗位能力自动组卷，提交后立即得到测试分；作品分由教研按 rubric 复核后合成最终匹配度。
      </p>
      <form id="quizForm">
        ${groups
          .map(
            (group) => `
            <div class="quiz-group">
              <h4>${esc(group.abilityName)} · ${group.items.length} 题</h4>
              ${group.items
                .map(
                  (question, index) => `
                  <div class="quiz-item">
                    <div class="stem">${index + 1}. ${esc(question.stem)}</div>
                    <div class="opts">
                      ${question.options
                        .map(
                          (option, optionIndex) => `
                          <label>
                            <input type="radio" name="${esc(question.id)}" value="${optionIndex}">
                            <span>${OPTION_LETTERS[optionIndex]}. ${esc(option)}</span>
                          </label>`
                        )
                        .join('')}
                    </div>
                  </div>`
                )
                .join('')}
            </div>`
          )
          .join('')}
        <div class="btn-row">
          <button class="btn btn-primary" type="submit">提交答卷</button>
          <span class="small muted" id="quizHint" style="align-self:center">已答 0 / ${paper.length}</span>
        </div>
      </form>
    </div>
  `;

  const form = root.querySelector('#quizForm');
  const hint = root.querySelector('#quizHint');
  form.addEventListener('change', () => {
    const answered = new Set([...form.querySelectorAll('input[type="radio"]:checked')].map((i) => i.name));
    hint.textContent = `已答 ${answered.size} / ${paper.length}`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const answers = {};
    for (const question of paper) {
      const picked = form.querySelector(`input[name="${CSS.escape(question.id)}"]:checked`);
      if (picked) answers[question.id] = Number(picked.value);
    }
    if (!Object.keys(answers).length) {
      toast('至少回答一道题再提交', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = '判分中…';
    try {
      await api.post(`/api/assessments/${assessment.id}/answers`, { answers });
      await renderAssessmentDetail(root, assessment.id);
    } catch (err) {
      toast(err.message, 'error');
      button.disabled = false;
      button.textContent = '提交答卷';
    }
  });
}

async function renderAssessmentDetail(root, id) {
  const data = await api.get(`/api/assessments/${id}`);
  state.assessmentId = id;
  const reload = () => renderAssessmentDetail(root, id);
  if (data.assessment.status === 'draft') renderQuiz(root, data);
  else renderResult(root, data, reload);
}

async function renderAssessList(root) {
  const { items } = await api.get('/api/assessments');
  const rows = items
    .map(
      (item) => `
      <tr>
        <td>${esc(item.userName)}</td>
        <td>${esc(item.jobTitle)}</td>
        <td>${statusTag(item.status)}</td>
        <td>${item.finalScore == null ? '—' : item.finalScore}</td>
        <td>${fmtDate(item.createdAt)}</td>
        <td><button class="btn btn-ghost btn-sm" data-view="${esc(item.id)}">查看</button></td>
      </tr>`
    )
    .join('');
  root.innerHTML = `
    <div class="screen-head">
      <div>
        <div class="kicker">Step 02 · 能力诊断</div>
        <h1>学生诊断记录</h1>
        <p class="sub">教研可查看全部诊断，对「待复核」的记录按 rubric 打分。</p>
      </div>
      <div class="tag">共 ${items.length} 条</div>
    </div>
    <div class="card">
      ${
        items.length
          ? `<table class="table"><thead><tr><th>学生</th><th>岗位</th><th>状态</th><th>综合分</th><th>时间</th><th></th></tr></thead>
             <tbody>${rows}</tbody></table>`
          : '<div class="empty">暂无诊断记录</div>'
      }
    </div>`;
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (button) renderAssessmentDetail(root, button.dataset.view);
  });
}

async function startAssessment(root) {
  let jobId = state.jobId;
  if (!jobId) {
    const { items } = await api.get('/api/jobs');
    if (!items.length) {
      toast('请先在后台导入岗位', 'error');
      return;
    }
    jobId = items[0].id;
    state.jobId = jobId;
  }
  const created = await api.post('/api/assessments', { jobId });
  toast('已按岗位能力组卷，共 ' + created.paper.length + ' 题');
  await renderAssessmentDetail(root, created.assessmentId);
}

export async function renderAssess(root) {
  root.innerHTML = '<div class="loading">正在读取诊断记录…</div>';
  if (isStaff()) {
    await renderAssessList(root);
    return;
  }

  const { items } = await api.get('/api/assessments');
  const mine = items.filter((item) => item.userId === state.user.id);
  const latest = mine.find((item) => item.finalScore != null) || mine[0];
  if (latest) {
    await renderAssessmentDetail(root, latest.id);
    return;
  }

  root.innerHTML = `
    <div class="screen-head">
      <div>
        <div class="kicker">Step 02 · 能力诊断</div>
        <h1>你现在在哪，差多少</h1>
        <p class="sub">标准化测试（40%）+ 情景任务作品（60%），由平台评分并经教研复核。</p>
      </div>
      <div class="tag">评分口径：测试 40% · 作品 60%</div>
    </div>
    <div class="card">
      <h2>还没有诊断记录</h2>
      <p class="sub" style="margin:8px 0 16px">
        系统会按你选择的岗位能力自动组卷，题目来自岗位能力题库；提交后立即得到分项得分与差距清单。
      </p>
      <button class="btn btn-primary" id="startAssess">开始诊断</button>
    </div>`;
  root.querySelector('#startAssess').addEventListener('click', () => {
    startAssessment(root).catch((err) => toast(err.message, 'error'));
  });
}
