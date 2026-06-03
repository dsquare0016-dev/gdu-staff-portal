import { toast } from 'sonner';

export type ErrorSeverity = 'error' | 'warning' | 'info' | 'success';

interface ErrorOptions {
  title?: string;
  description?: string;
  severity?: ErrorSeverity;
  logToConsole?: boolean;
}

/**
 * Global error and notification handler for the GDU Portal.
 * Ensures consistent messaging across the application.
 */
export const handlePortalNotification = (
  message: string,
  options: ErrorOptions = {}
) => {
  const {
    severity = 'info',
    description,
    logToConsole = true,
  } = options;

  if (logToConsole) {
    if (severity === 'error') console.error(`[Portal Error]: ${message}`, description || '');
    else if (severity === 'warning') console.warn(`[Portal Warning]: ${message}`, description || '');
    else console.log(`[Portal ${severity}]: ${message}`, description || '');
  }

  // User-facing toast notification
  const toastFn = severity === 'success' ? toast.success :
                 severity === 'error' ? toast.error :
                 severity === 'warning' ? toast.warning :
                 toast.info;

  toastFn(message, {
    description: description,
  });
};

/**
 * Specific handler for database errors to provide user-friendly explanations
 */
export const handleDatabaseError = (error: any, action: string = 'save data') => {
  console.error(`Database Error during ${action}:`, error);

  let userMessage = `Data could not be ${action === 'fetch' ? 'loaded from' : 'saved into'} the database.`;
  let description = 'Please check your internet connection or database configuration.';

  if (error?.code === 'PGRST116') {
    userMessage = 'No portal record found.';
    description = 'The requested information does not exist.';
  } else if (error?.code === '42P01') {
    userMessage = 'Data could not be processed because the database table is missing.';
    description = 'Please contact the ICT department.';
  } else if (error?.code === '23502') {
    userMessage = 'Data could not be saved because required fields are empty.';
    description = 'Please fill in all mandatory fields.';
  } else if (error?.code === '42501') {
    userMessage = 'You do not have permission to perform this portal action.';
    description = 'Access denied by security policy.';
  } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    userMessage = 'Connection error.';
    description = 'Unable to connect to the database. Check your internet.';
  }

  handlePortalNotification(userMessage, {
    description,
    severity: 'error',
    logToConsole: false // Already logged above
  });
};
