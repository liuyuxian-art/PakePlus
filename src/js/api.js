// === 纯前端演示版专属 API（已拦截所有网络请求，使用假数据） ===
class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// 核心请求拦截器
async function request(path, options = {}) {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300));

  // 岗位解析
  if (path.includes('/parse-jd')) {
    return { capabilities: [
      { name: 'SQL 数据查询', w: 22, type: '工具', req: 85, me: 60 },
      { name: 'Excel 数据处理', w: 18, type: '工具', req: 90, me: 82 },
      { name: 'Python 数据分析', w: 15, type: '工具', req: 70, me: 45 },
      { name: '数据可视化', w: 15, type: '方法', req: 80, me: 65 },
      { name: '商业分析', w: 18, type: '方法', req: 85, me: 70 },
      { name: '报告撰写', w: 12, type: '产出', req: 75, me: 55 }
    ]};
  }

  // 能力诊断
  if (path.includes('/diagnose')) {
    return { 
      compositeScore: 68,
      gaps: [
        { name: 'SQL', gap: -25, note: '窗口函数与多表查询是面试必考，优先补' },
        { name: '报告撰写', gap: -20, note: '能算不会讲，直接影响业务方判断' },
        { name: 'Python', gap: -25, note: 'JD 写「优先」，可后置，但会限制上限' }
      ]
    };
  }

  // 成长计划
  if (path.includes('/generate-plan')) {
    return { weeks: [
      { week: '第1周', task: 'SQL 窗口函数与多表查询', status: '进行中' },
      { week: '第2周', task: '复购率分析实战', status: '未开始' },
      { week: '第3周', task: '可视化与结论表达', status: '未开始' },
      { week: '第4周', task: '企业真题任务', status: '未开始' }
    ]};
  }

  // 能力档案
  if (path.includes('/profile')) {
    return { 
      name: '张同学', 
      score: 68, 
      target: 82,
      evidences: [
        { level: 'L2', title: '电商复购率分析报告', score: 82, date: '2026-11-22' },
        { level: 'L2', title: '营销活动归因分析', score: 78, date: '2026-11-10' },
        { level: 'L1', title: 'SQL 基础测试', score: 76, date: '2026-11-20' }
      ]
    };
  }

  // 默认返回空对象
  return {};
}

// 暴露给外部的 API 对象（兼容常见的导出方式）
const api = { request, get: request, post: request };