import type { MockMethod } from 'vite-plugin-mock'
import { setSimulateMentorApiDown } from './mentorApiFlags'
import { setSimulateYoubaoApiDown } from './youbaoFlags'

/** 本地验收：触发全局 401 / 403 拦截（frontend-development-sequence Step 0） */
export default [
  {
    url: '/api/v1/dev/trigger-401',
    method: 'get',
    statusCode: 401,
    response: () => ({ message: 'Unauthorized' }),
  },
  {
    url: '/api/v1/dev/trigger-401',
    method: 'post',
    statusCode: 401,
    response: () => ({ message: 'Unauthorized' }),
  },
  {
    url: '/api/v1/dev/trigger-403',
    method: 'get',
    statusCode: 403,
    response: () => ({ message: 'Forbidden' }),
  },
  {
    url: '/api/v1/dev/trigger-403',
    method: 'post',
    statusCode: 403,
    response: () => ({ message: 'Forbidden' }),
  },
  /** 本地验收 Story 4-4：切换右豹 API 降级（需刷新用户详情以更新顶栏） */
  {
    url: '/api/v1/dev/youbao-degraded',
    method: 'post',
    response: (opt: { body?: { degraded?: boolean } }) => {
      const degraded = Boolean(opt.body?.degraded)
      setSimulateYoubaoApiDown(degraded)
      return {
        code: 0,
        message: 'success',
        data: { degraded },
      }
    },
  },
  /** Story 3-4：切换第三方导师 API 降级（导师详情 ApiStatusBar） */
  {
    url: '/api/v1/dev/mentor-api-degraded',
    method: 'post',
    response: (opt: { body?: { degraded?: boolean } }) => {
      const degraded = Boolean(opt.body?.degraded)
      setSimulateMentorApiDown(degraded)
      return {
        code: 0,
        message: 'success',
        data: { degraded },
      }
    },
  },
] as MockMethod[]
