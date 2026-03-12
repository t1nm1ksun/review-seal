import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { callClaude, callOpenAI } from '../_shared/ai-clients.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify user
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { review_id } = await req.json()
    if (!review_id) {
      return new Response(JSON.stringify({ error: 'review_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', review_id)
      .eq('user_id', user.id)
      .single()

    if (reviewError || !review) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update status to running
    await supabase
      .from('reviews')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', review_id)

    // Get user settings (API keys, GitHub token)
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!settings) {
      await supabase
        .from('reviews')
        .update({ status: 'failed', error_message: 'Settings not found. Please configure API keys.' })
        .eq('id', review_id)
      return new Response(JSON.stringify({ error: 'Settings not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const githubToken = settings.github_token_encrypted
    if (!githubToken) {
      await supabase
        .from('reviews')
        .update({ status: 'failed', error_message: 'GitHub token not found. Please sign in again or add a PAT.' })
        .eq('id', review_id)
      return new Response(JSON.stringify({ error: 'GitHub token not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiApiKey = review.provider === 'claude'
      ? settings.claude_api_key_encrypted
      : settings.openai_api_key_encrypted

    if (!aiApiKey) {
      await supabase
        .from('reviews')
        .update({ status: 'failed', error_message: `${review.provider} API key not configured` })
        .eq('id', review_id)
      return new Response(JSON.stringify({ error: 'AI API key not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch PR diff from GitHub
    const [owner, repo] = review.repo_full_name.split('/')
    const diffResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${review.pr_number}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3.diff',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    if (!diffResponse.ok) {
      await supabase
        .from('reviews')
        .update({ status: 'failed', error_message: `Failed to fetch diff: ${diffResponse.status}` })
        .eq('id', review_id)
      return new Response(JSON.stringify({ error: 'Failed to fetch diff' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let diff = await diffResponse.text()

    // Truncate large diffs
    const MAX_DIFF_SIZE = 200_000
    if (diff.length > MAX_DIFF_SIZE) {
      diff = diff.slice(0, MAX_DIFF_SIZE) + '\n\n[... diff truncated due to size ...]'
    }

    // Fetch active review rules
    const { data: reviewRules } = await supabase
      .from('review_rules')
      .select('content')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at')

    const rulesContent = reviewRules && reviewRules.length > 0
      ? reviewRules.map(r => r.content).join('\n')
      : null

    // Call AI
    const aiResult = review.provider === 'claude'
      ? await callClaude(aiApiKey, review.prompt, review.custom_instructions, diff, rulesContent)
      : await callOpenAI(aiApiKey, review.prompt, review.custom_instructions, diff, rulesContent)

    // Insert review comments
    if (aiResult.comments.length > 0) {
      const commentsToInsert = aiResult.comments.map(c => ({
        review_id,
        file_path: c.file_path,
        start_line: c.start_line,
        end_line: c.end_line,
        body: c.body,
        severity: c.severity,
      }))

      await supabase.from('review_comments').insert(commentsToInsert)
    }

    // Update review as completed
    await supabase
      .from('reviews')
      .update({
        status: 'completed',
        summary: aiResult.summary,
        completed_at: new Date().toISOString(),
      })
      .eq('id', review_id)

    return new Response(
      JSON.stringify({ success: true, review_id, comments_count: aiResult.comments.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('run-review error:', error)

    // Try to update review status to failed
    try {
      const { review_id } = await req.clone().json()
      if (review_id) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )
        await supabase
          .from('reviews')
          .update({ status: 'failed', error_message: String(error) })
          .eq('id', review_id)
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
