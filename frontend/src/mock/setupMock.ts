import MockAdapter from 'axios-mock-adapter'
import type { AxiosInstance } from 'axios'
import mockConfig from './index'

export function setupMockAdapter(axiosInstance: AxiosInstance) {
  // 设置延迟模拟真实网络，默认 500ms
  const mock = new MockAdapter(axiosInstance, { delayResponse: 500 })

  mockConfig.forEach((mockItem: any) => {
    const method = mockItem.method.toLowerCase()
    const urlPattern = new RegExp('^' + mockItem.url.replace(/:\w+/g, '[^/]+') + '$')

    const handler = (config: any): any => {
      // 解析 url 参数
      const paramsRegex = new RegExp('^' + mockItem.url.replace(/:\w+/g, '([^/]+)') + '$')
      const match = config.url.match(paramsRegex)
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

      // vite-plugin-mock 期望的 options 参数格式
      const mockOptions = {
        url: config.url,
        body: parsedBody,
        query: config.params || {},
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
