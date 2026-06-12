import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('ADMIN_SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('ADMIN_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Admin-Auth] Missing environment variables')
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing environment variables',
        code: 'missing_env_vars'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await req.json()
    const { action, userId, password, email, fullName, role } = body

    console.log(`[Admin-Auth] Request received - Action: ${action}, Email: ${email}, Role: ${role}, UserID: ${userId}`)

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[Admin-Auth] Missing authorization header')
      return new Response(JSON.stringify({ error: 'Missing authorization header', code: 'missing_auth' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !caller) {
      console.error('[Admin-Auth] Unauthorized access attempt:', authError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized access', code: 'unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      })
    }

    // Check if caller is authorized (super_admin, admin, ict, dg, technical_assistant)
    const { data: callerProfile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileFetchError || !callerProfile) {
      console.error('[Admin-Auth] Could not verify caller profile:', profileFetchError?.message)
      return new Response(JSON.stringify({ error: 'Could not verify caller permissions', code: 'profile_fetch_error' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403 
      })
    }

    const authorizedRoles = ['super_admin', 'ict', 'admin', 'dg', 'technical_assistant']
    if (!authorizedRoles.includes(callerProfile.role)) {
      console.error(`[Admin-Auth] Forbidden: Role '${callerProfile.role}' is not authorized`)
      return new Response(JSON.stringify({ 
        error: `Forbidden: Role '${callerProfile.role}' is not authorized for admin operations`,
        code: 'forbidden'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403 
      })
    }

    // --- ACTIONS ---

    if (action === 'create-user' || action === 'register-staff') {
      if (!email) {
        console.error('[Admin-Auth] Email is required for account creation')
        return new Response(JSON.stringify({ error: 'Email is required', code: 'email_required' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        })
      }
      
      // Check if user already exists in Auth
      console.log(`[Admin-Auth] Checking if user exists: ${email}`)
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) {
        console.warn('[Admin-Auth] Could not list users to check for existence:', listError.message)
      }
      
      const userExists = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (userExists) {
        console.warn(`[Admin-Auth] User already exists: ${email}`)
        return new Response(JSON.stringify({ 
          error: "User email already exists. Use edit staff instead.",
          code: "user_already_exists"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        })
      }

      // 1. Create User in Auth
      console.log(`[Admin-Auth] Creating Auth account for: ${email}`)
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password || 'GDU@123',
        email_confirm: true,
        user_metadata: { 
          full_name: fullName || email.split('@')[0], 
          role: role || 'staff' 
        }
      })

      if (createError) {
        console.error('[Admin-Auth] Auth creation error:', createError.message)
        return new Response(JSON.stringify({ 
          error: `Failed to create Auth account: ${createError.message}`,
          code: 'auth_creation_failed'
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        })
      }
      
      const newUserId = authData.user.id
      console.log(`[Admin-Auth] Auth account created: ${newUserId}`)

      // 2. Upsert Profile
      console.log(`[Admin-Auth] Upserting profile for: ${newUserId}`)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newUserId,
          email: email,
          full_name: fullName || email.split('@')[0],
          role: role || 'staff',
          is_active: true,
          updated_at: new Date().toISOString()
        })
      
      if (profileError) {
        console.error('[Admin-Auth] Profile upsert error:', profileError.message)
        // We continue because the Auth account is already created
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        user: authData.user,
        message: "Staff account created successfully" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'delete-user') {
      if (!userId) throw new Error('User ID is required for deletion')
      
      console.log(`[Admin-Auth] Deleting user: ${userId}`)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) {
        console.error('[Admin-Auth] Auth deletion error:', error.message)
        return new Response(JSON.stringify({ error: error.message, code: 'delete_failed' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        })
      }
      
      // Also delete from profiles and staff_records (optional if cascade is set)
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      await supabaseAdmin.from('staff_records').delete().eq('user_id', userId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'send-recovery') {
      if (!email) throw new Error('Email is required for recovery')
      
      console.log(`[Admin-Auth] Sending recovery link to: ${email}`)
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${req.headers.get('origin') || 'https://gdu-portal.mvxwa.org'}/auth/callback?type=recovery`
        }
      })
      if (error) {
        console.error('[Admin-Auth] Recovery link generation error:', error.message)
        return new Response(JSON.stringify({ error: error.message, code: 'recovery_failed' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        })
      }
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'reset-password') {
      if (!userId || !password) {
        return new Response(JSON.stringify({ error: 'User ID and password are required', code: 'missing_params' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        })
      }

      console.log(`[Admin-Auth] Resetting password for user: ${userId}`)
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password
      })

      if (error) {
        console.error('[Admin-Auth] Password reset error:', error.message)
        return new Response(JSON.stringify({ error: error.message, code: 'reset_failed' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        })
      }

      return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.error('[Admin-Auth] Invalid action requested:', action)
    return new Response(JSON.stringify({ error: 'Invalid action', code: 'invalid_action' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400 
    })

  } catch (error) {
    console.error('[Admin-Auth] Unexpected error:', error.message)
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      code: 'unexpected_error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
