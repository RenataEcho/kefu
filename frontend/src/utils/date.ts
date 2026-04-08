import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export const formatDate = (date: string | Date, fmt = 'YYYY-MM-DD HH:mm'): string =>
  dayjs(date).format(fmt)

export const formatDateOnly = (date: string | Date): string =>
  dayjs(date).format('YYYY-MM-DD')

export const fromNow = (date: string | Date): string =>
  dayjs(date).fromNow()

export const isExpired = (date: string | Date): boolean =>
  dayjs(date).isBefore(dayjs())

export { dayjs }
