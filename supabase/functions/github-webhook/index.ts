import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SEVERITY_REGEX = /\b(P[1-5])\b/g
const SEVERITY_ORDER = ['P1', 'P2', 'P3', 'P4', 'P5']

function highestSeverity(body: string): string | null {
  const matches = body.match(SEVERITY_REGEX)
  if (!matches) return null
  return SEVERITY_ORDER.find(s => matches.includes(s)) ?? null
}

async function verifySignature(
  secret: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hexSig = 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hexSig === signature
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const event = req.headers.get('x-github-event')
    const signature = req.headers.get('x-hub-signature-256')
    const body = await req.text()
    const payload = JSON.parse(body)

    // Only handle comment events
    if (event !== 'issue_comment' && event !== 'pull_request_review_comment') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Only handle created actions
    if (payload.action !== 'created') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const commentBody = payload.comment?.body ?? ''
    const severity = highestSeverity(commentBody)

    // Only notify if comment contains severity labels
    if (!severity) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const repoFullName = payload.repository?.full_name
    const prNumber = payload.issue?.number ?? payload.pull_request?.number
    const prTitle = payload.issue?.title ?? payload.pull_request?.title ?? ''
    const commentUrl = payload.comment?.html_url ?? ''

    if (!repoFullName || !prNumber) {
      return new Response(JSON.stringify({ error: 'missing repo or PR info' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find all users who have a webhook for this repo and verify signature
    const { data: webhooks } = await supabase
      .from('repo_webhooks')
      .select('user_id, webhook_secret')
      .eq('repo_full_name', repoFullName)

    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no webhooks registered' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const webhook of webhooks) {
      // Verify signature if present
      if (signature) {
        const valid = await verifySignature(webhook.webhook_secret, body, signature)
        if (!valid) continue
      }

      // Insert notification
      await supabase.from('review_notifications').insert({
        user_id: webhook.user_id,
        repo_full_name: repoFullName,
        pr_number: prNumber,
        pr_title: prTitle,
        comment_body: commentBody.substring(0, 2000),
        comment_url: commentUrl,
        severity,
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
