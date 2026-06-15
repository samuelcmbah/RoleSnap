import { AppError } from '../errors/AppError'

/**
 * Decode a JWT token without verification (for Clerk tokens from Cloudflare)
 * In production, you should verify the signature, but Cloudflare can validate via middleware
 */
export const extractUserIdFromToken = (authHeader?: string): string => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Missing or invalid Authorization header', 'AUTH_MISSING', 401)
  }

  const token = authHeader.slice(7) // Remove 'Bearer '
  const parts = token.split('.')

  if (parts.length !== 3) {
    throw new AppError('Invalid JWT token format', 'AUTH_INVALID', 401)
  }

  try {
    // Decode the payload (second part of JWT)
    const payload = JSON.parse(atob(parts[1]))
    
    // Clerk uses 'sub' for user ID
    const userId = payload.sub || payload.user_id
    
    if (!userId) {
      throw new AppError('User ID not found in token', 'AUTH_NO_USER_ID', 401)
    }

    return userId
  } catch (err: any) {
    if (err instanceof AppError) throw err
    throw new AppError('Failed to decode token', 'AUTH_DECODE_ERROR', 401)
  }
}
