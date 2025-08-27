import toast from 'react-hot-toast'

export const showToast = {
  success: (message: string, options?: any) => {
    return toast.success(message, {
      duration: 4000,
      style: {
        background: '#f0fdf4',
        color: '#166534',
        border: '1px solid #22c55e',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      iconTheme: {
        primary: '#22c55e',
        secondary: '#f0fdf4',
      },
      ...options,
    })
  },

  error: (message: string, options?: any) => {
    return toast.error(message, {
      duration: 6000,
      style: {
        background: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #ef4444',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        maxWidth: '500px',
      },
      iconTheme: {
        primary: '#ef4444',
        secondary: '#fef2f2',
      },
      ...options,
    })
  },

  loading: (message: string, options?: any) => {
    return toast.loading(message, {
      style: {
        background: '#f0f9ff',
        color: '#1e40af',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      iconTheme: {
        primary: '#3b82f6',
        secondary: '#f0f9ff',
      },
      ...options,
    })
  },

  info: (message: string, options?: any) => {
    return toast(message, {
      duration: 4000,
      icon: 'ℹ️',
      style: {
        background: '#f0f9ff',
        color: '#1e40af',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      ...options,
    })
  },

  warning: (message: string, options?: any) => {
    return toast(message, {
      duration: 5000,
      icon: '⚠️',
      style: {
        background: '#fefbf3',
        color: '#a16207',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      ...options,
    })
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    },
    options?: any
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        style: {
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          padding: '12px 16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        success: {
          duration: 4000,
          style: {
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #22c55e',
          },
          iconTheme: {
            primary: '#22c55e',
            secondary: '#f0fdf4',
          },
        },
        error: {
          duration: 6000,
          style: {
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #ef4444',
            maxWidth: '500px',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fef2f2',
          },
        },
        loading: {
          style: {
            background: '#f0f9ff',
            color: '#1e40af',
            border: '1px solid #3b82f6',
          },
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#f0f9ff',
          },
        },
        ...options,
      }
    )
  },

  dismiss: (toastId?: string) => {
    return toast.dismiss(toastId)
  },

  remove: (toastId?: string) => {
    return toast.remove(toastId)
  },
}