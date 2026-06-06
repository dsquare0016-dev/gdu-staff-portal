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

  const isFetch = action.toLowerCase().includes('fetch') || action.toLowerCase().includes('load') || action.toLowerCase().includes('get');
  let userMessage = `Data could not be ${isFetch ? 'loaded from' : 'saved into'} the database.`;
  let description = error?.message || 'Please check your internet connection or database configuration.';

  if (error?.code === 'PGRST116') {
    userMessage = 'Record not found.';
    description = 'The requested information does not exist in the system.';
  } else if (error?.code === '42P01') {
    userMessage = 'System database table missing.';
    description = 'Please contact the ICT department to update the portal schema.';
  } else if (error?.code === 'PGRST107') {
    userMessage = 'Portal data relationship error.';
    description = 'The system could not find a link between tables. Please contact your administrator.';
  } else if (error?.code === '42703') {
    userMessage = 'Database column missing.';
    description = 'The portal is trying to access data that doesn\'t exist in the database. Please contact ICT.';
  } else if (error?.code === '23502') {
    userMessage = 'Required information missing.';
    description = 'Please ensure all required fields are filled correctly.';
  } else if (error?.code === '23505') {
    userMessage = 'Duplicate record found.';
    description = 'This information already exists in the system (e.g. same Email or Staff ID).';
  } else if (error?.code === '42501') {
    userMessage = 'Permission denied.';
    description = 'Your account does not have the required permissions for this action. Please contact your supervisor.';
  } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    userMessage = 'Network connection error.';
    description = 'Unable to connect to the portal servers. Please check your internet connection.';
  }

  handlePortalNotification(userMessage, {
    description,
    severity: 'error',
    logToConsole: false // Already logged above
  });
};
