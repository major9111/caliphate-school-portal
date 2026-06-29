export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) errors.push('Email is required')
  else if (!emailRegex.test(email)) errors.push('Invalid email format')
  return { valid: errors.length === 0, errors }
}

export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = []
  if (!password) errors.push('Password is required')
  else {
    if (password.length < 8) errors.push('Password must be at least 8 characters')
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter')
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter')
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one digit')
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character')
  }
  return { valid: errors.length === 0, errors }
}

export const validatePhone = (phone: string): ValidationResult => {
  const errors: string[] = []
  const phoneRegex = /^\+?[\d\s-]{10,}$/
  if (!phone) errors.push('Phone number is required')
  else if (!phoneRegex.test(phone)) errors.push('Invalid phone number format')
  return { valid: errors.length === 0, errors }
}

export const sanitizeInput = (input: string): string => {
  if (!input) return input
  let sanitized = input.replace(/<[^>]+>/g, '')
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')
  sanitized = sanitized.replace(/javascript\s*:/gi, '')
  return sanitized.trim()
}
