export const isValidPhone = (phone: string): boolean =>
  /^1[3-9]\d{9}$/.test(phone)

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const isValidYoubaoCode = (code: string): boolean =>
  /^[A-Z0-9]{6,20}$/.test(code)

export const isRequired = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== ''
