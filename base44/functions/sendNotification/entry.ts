import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, type, data } = await req.json();

    const templates = {
      new_subscriber: {
        subject: `🎉 Nuovo abbonato su Unlockr!`,
        body: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0a0a12;color:#f0f0f0;padding:32px;border-radius:16px">
            <h1 style="color:#a855f7;font-size:24px;margin-bottom:8px">Nuovo abbonato!</h1>
            <p style="color:#aaa;margin-bottom:24px">Qualcuno si è appena abbonato al tuo profilo</p>
            <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:24px">
              <p style="margin:0;font-size:18px;font-weight:600">${data?.fanName || 'Un nuovo fan'}</p>
              <p style="color:#888;margin:4px 0 0">Piano: ${data?.plan || 'Base'} · €${data?.price || '4.99'}/mese</p>
            </div>
            <a href="${data?.dashboardUrl || '#'}" style="background:#a855f7;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Vai alla dashboard</a>
            <p style="color:#555;font-size:12px;margin-top:24px">© 2026 Unlockr</p>
          </div>
        `
      },
      new_content: {
        subject: `🎬 ${data?.creatorName || 'Un creator'} ha pubblicato nuovo contenuto`,
        body: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0a0a12;color:#f0f0f0;padding:32px;border-radius:16px">
            <h1 style="color:#3b82f6;font-size:24px;margin-bottom:8px">Nuovo contenuto disponibile!</h1>
            <p style="color:#aaa;margin-bottom:24px">${data?.creatorName} ha appena pubblicato qualcosa per te</p>
            <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:24px">
              <p style="margin:0;font-size:18px;font-weight:600">${data?.contentTitle || 'Nuovo contenuto'}</p>
              <p style="color:#888;margin:4px 0 0">${data?.contentType || 'Post'} · ${data?.category || ''}</p>
            </div>
            <a href="${data?.contentUrl || '#'}" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Guarda ora</a>
            <p style="color:#555;font-size:12px;margin-top:24px">© 2026 Unlockr · <a href="#" style="color:#555">Disiscriviti</a></p>
          </div>
        `
      },
      live_starting: {
        subject: `🔴 ${data?.creatorName || 'Un creator'} sta andando LIVE!`,
        body: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0a0a12;color:#f0f0f0;padding:32px;border-radius:16px">
            <h1 style="color:#ef4444;font-size:24px;margin-bottom:8px">🔴 È LIVE ORA!</h1>
            <p style="color:#aaa;margin-bottom:24px">${data?.creatorName} ha appena iniziato una diretta</p>
            <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:24px">
              <p style="margin:0;font-size:18px;font-weight:600">${data?.liveTitle || 'Live in corso'}</p>
              <p style="color:#ef4444;margin:4px 0 0">● In diretta adesso</p>
            </div>
            <a href="${data?.liveUrl || '#'}" style="background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Guarda il live</a>
            <p style="color:#555;font-size:12px;margin-top:24px">© 2026 Unlockr</p>
          </div>
        `
      },
    };

    const template = templates[type] || {
      subject: subject || 'Notifica da Unlockr',
      body: `<p>${data?.message || ''}</p>`
    };

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: to || user.email,
      subject: template.subject,
      body: template.body,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});