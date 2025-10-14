// plugins/errorHandler.ts
import { Elysia } from 'elysia'
import { AppError } from '../lib/errors'

export const ErrorHandler = new Elysia()
  .onError(({ code, error, set }) => {
    // Handle custom AppError
    if (error instanceof AppError) {
      set.status = error.statusCode
      return { error: error.message, code: error.code }
    }

    // Handle Supabase/Postgres errors
    if ('code' in error && typeof error.code === 'string') {
      // Supabase "not found" error
      if (error.code === 'PGRST116') {
        set.status = 404
        return { error: 'Resource not found' }
      }
      
      // Supabase "permission denied" error
      if (error.code === 'PGRST301' || error.code === '42501') {
        set.status = 403
        return { error: 'Permission denied' }
      }

      // Foreign key violation
      if (error.code === '23503') {
        set.status = 400
        return { error: 'Invalid reference to related resource' }
      }

      // Unique constraint violation
      if (error.code === '23505') {
        set.status = 409
        return { error: 'Resource already exists' }
      }
    }

    // Handle Elysia validation errors
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Validation error', details: error.message }
    }

    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Route not found' }
    }

    // Log unexpected errors
    console.error('Unhandled error:', error)
    set.status = 500
    return { error: 'Internal server error' }
  })