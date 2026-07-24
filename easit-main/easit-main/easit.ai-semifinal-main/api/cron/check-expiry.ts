/**
 * EASIT.AI — Subscription Expiry Checker (Vercel Cron Job)
 * 
 * Runs daily via Vercel Cron to:
 * 1. Find users whose plan expires within 15 days and send reminder
 * 2. Deactivate API keys for expired subscriptions
 * 3. Reset daily query counters at midnight UTC
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  // Verify this is called by Vercel Cron (not external)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow if no CRON_SECRET is set (for development)
    if (process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const results = {
    daily_counters_reset: 0,
    expiry_reminders_sent: 0,
    expired_keys_deactivated: 0,
    errors: [] as string[],
  };

  try {
    // ── TASK 1: Reset Daily Query Counters ──
    const { data: resetData, error: resetError } = await supabase
      .from('api_keys')
      .update({ queries_used_today: 0 })
      .gt('queries_used_today', 0)
      .select('id');

    if (resetError) {
      results.errors.push(`Counter reset failed: ${resetError.message}`);
    } else {
      results.daily_counters_reset = resetData?.length || 0;
    }

    // ── TASK 2: Send 15-Day Expiry Reminders ──
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

    const { data: expiringUsers, error: expiringError } = await supabase
      .from('enterprise_users')
      .select('user_uid, email, name, plan, plan_expires_at')
      .lte('plan_expires_at', fifteenDaysFromNow.toISOString())
      .gt('plan_expires_at', new Date().toISOString())
      .eq('reminder_sent', false)
      .neq('plan', 'free'); // Don't remind free users

    if (expiringError) {
      results.errors.push(`Expiry query failed: ${expiringError.message}`);
    } else if (expiringUsers && expiringUsers.length > 0) {
      for (const user of expiringUsers) {
        // Log the reminder (in production, integrate with Resend/SendGrid/Zoho SMTP)
        console.log(`[EXPIRY REMINDER] User ${user.user_uid} (${user.email}) — Plan "${user.plan}" expires at ${user.plan_expires_at}`);

        // Mark reminder as sent
        await supabase
          .from('enterprise_users')
          .update({ reminder_sent: true })
          .eq('user_uid', user.user_uid);

        results.expiry_reminders_sent++;
      }
    }

    // ── TASK 3: Deactivate Keys for Expired Subscriptions ──
    const { data: expiredKeys, error: deactivateError } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true)
      .select('id, user_uid');

    if (deactivateError) {
      results.errors.push(`Deactivation failed: ${deactivateError.message}`);
    } else {
      results.expired_keys_deactivated = expiredKeys?.length || 0;
    }

  } catch (error: any) {
    results.errors.push(`Cron error: ${error.message}`);
  }

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    ...results
  });
}
