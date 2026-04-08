import MockAdapter from 'axios-mock-adapter'
import type { AxiosInstance } from 'axios'
import mockConfig from './index'

/** 与 axios-mock-adapter 的 combineUrls 一致，得到用于匹配 mock 的完整路径 */
function combinedRequestPath(config: { baseURL?: string; url?: string }): string {
  const b = (config.baseURL || '').replace(/\/+$/, '')
  const u = (config.url || '').replace(/^\/+/, '')
  if (!b) return u ? `/${u}` : '/'
  const joined = `${b}/${u}`.replace(/\/+/g, '/')
  return joined.startsWith('/') ? joined : `/${joined}`
}

/**
 * 生产构建 baseURL 为 /kefu/api/v1，adapter 会用 combineUrls 得到 /kefu/api/v1/...；
 * mock 定义仍为 /api/v1/...，需同时匹配两种路径，否则请求会 passThrough 到静态站（POST → 405）。
 */
function mockUrlMatchPattern(mockUrl: string): RegExp {
  const baseSeg = (import.meta.env.BASE_URL || '/').replace(/^\/+|\/+$/g, '')
  const pathWithParams = mockUrl.replace(/:\w+/g, '[^/]+')
  const prefix = baseSeg ? `(?:/${baseSeg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})?` : ''
  return new RegExp(`^${prefix}${pathWithParams}$`)
}

function mockUrlParamsPattern(mockUrl: string): RegExp {
  const baseSeg = (import.meta.env.BASE_URL || '/').replace(/^\/+|\/+$/g, '')
  const pathWithGroups = mockUrl.replace(/:\w+/g, '([^/]+)')
  const prefix = baseSeg ? `(?:/${baseSeg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})?` : ''
  return new RegExp(`^${prefix}${pathWithGroups}$`)
}

export function setupMockAdapter(axiosInstance: AxiosInstance) {
  // 设置延迟模拟真实网络，默认 500ms
  const mock = new MockAdapter(axiosInstance, { delayResponse: 500 })

  mockConfig.forEach((mockItem: any) => {
    const method = mockItem.method.toLowerCase()
    const urlPattern = mockUrlMatchPattern(mockItem.url)

    const handler = (config: any): any => {
      const fullPath = combinedRequestPath(config)
      // 解析 url 参数（必须用完整路径，config.url 常为相对片段）
      const paramsRegex = mockUrlParamsPattern(mockItem.url)
      const match = fullPath.match(paramsRegex)
      const urlParams: Record<string, string> = {}
      
      if (match) {
        const keys = mockItem.url.match(/:\w+/g)
        if (keys) {
          keys.forEach((key: string, index: number) => {
            urlParams[key.substring(1)] = match[index + 1]
          })
        }
      }

      // 组装传给 mock 响应函数的参数
      let parsedBody = {}
      if (config.data) {
        try {
          parsedBody = JSON.parse(config.data)
        } catch (e) {
          parsedBody = config.data
        }
      }

      // vite-plugin-mock 会把路径参数放进 query；需合并 urlParams，否则 :id 等永远读不到
      const mockOptions = {
        url: fullPath,
        body: parsedBody,
        query: { ...(config.params || {}), ...urlParams },
        headers: config.headers || {},
      }

      // 获取响应
      let responseData
      if (typeof mockItem.response === 'function') {
        responseData = mockItem.response(mockOptions)
      } else {
        responseData = mockItem.response
      }

      const statusCode = responseData?.statusCode || 200
      
      // 处理由于 vite-plugin-mock 和 axios-mock-adapter 返回格式不同的问题
      if (responseData && responseData.statusCode) {
        delete responseData.statusCode
      }

      // 如果有 mock 出来的 header（例如 x-renewed-token），我们尽量放在 headers 里
      const headers = responseData?.headers || {}
      if (responseData && responseData.headers) {
         delete responseData.headers
      }

      return [statusCode, responseData, headers]
    }

    switch (method) {
      case 'get':
        mock.onGet(urlPattern).reply(handler)
        break
      case 'post':
        mock.onPost(urlPattern).reply(handler)
        break
      case 'put':
        mock.onPut(urlPattern).reply(handler)
        break
      case 'patch':
        mock.onPatch(urlPattern).reply(handler)
        break
      case 'delete':
        mock.onDelete(urlPattern).reply(handler)
        break
      default:
        mock.onAny(urlPattern).reply(handler)
    }
  })

  // 不匹配的请求全部放行
  mock.onAny().passThrough()
  
  return mock
}
