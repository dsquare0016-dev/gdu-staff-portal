import { supabase } from "@/integrations/supabase/client";

interface WelcomeEmailParams {
  fullName: string;
  staffId: string;
  email: string;
  role: string;
  portalUrl: string;
}

/**
 * Simulates sending a welcome email to a newly registered staff member.
 * In a real production app, this would use a service like SendGrid, Resend, or AWS SES via a Supabase Edge Function.
 */
export async function sendWelcomeEmail({ fullName, staffId, email, role, portalUrl }: WelcomeEmailParams) {
  console.log(`[Email Service] Sending welcome email to ${email}`);
  
  const template = `
    Hello ${fullName},

    Welcome to the Government Delivery Unit (GDU) Portal.
    Your account has been successfully created.

    Account Details:
    ----------------
    Staff ID: ${staffId}
    Email/Username: ${email}
    Role: ${role.toUpperCase()}
    Portal URL: ${portalUrl}

    Please use the "Forgot Password" feature on the login page to set your initial password.

    Best regards,
    GDU Administration
  `;

  // Log the email delivery in the database
  const { error } = await supabase
    .from('notifications')
    .insert([{
      user_id: (await supabase.auth.getUser()).data.user?.id, // logged-in admin's ID or system ID
      type: 'system',
      title: 'Welcome Email Sent',
      body: `Welcome email sent to ${fullName} (${staffId}) at ${email}`,
      metadata: { 
        recipient_email: email,
        staff_id: staffId,
        role: role,
        template: 'welcome_staff'
      }
    }]);

  if (error) {
    console.error('Error logging email notification:', error);
  }

  return { success: true, message: 'Welcome email simulated and logged.' };
}
