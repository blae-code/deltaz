import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const VALID_ACTIONS = new Set(['create', 'respond', 'cancel']);
const VALID_DECISIONS = new Set(['accepted', 'rejected']);

const sanitizeText = (value: unknown, maxLength = 240) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const normalizeEmail = (value: unknown) => sanitizeText(value, 200).toLowerCase();

const parseCredits = (value: unknown) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.min(1_000_000, Math.round(amount));
};

const getDisplayName = (user: any) =>
  sanitizeText(user?.callsign || user?.full_name || user?.email || 'Operative', 80);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const userEmail = normalizeEmail(user?.email);

    if (!userEmail) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const action = sanitizeText(body.action, 20);
    if (!VALID_ACTIONS.has(action)) {
      return Response.json({ error: 'Valid action is required' }, { status: 400 });
    }

    if (action === 'create') {
      const receiverUserId = sanitizeText(body.receiver_user_id, 80);
      const receiverEmail = normalizeEmail(body.receiver_email);
      const offerItems = sanitizeText(body.offer_items, 300);
      const requestItems = sanitizeText(body.request_items, 300);
      const offerCredits = parseCredits(body.offer_credits);
      const requestCredits = parseCredits(body.request_credits);
      const message = sanitizeText(body.message, 400);
      const hasOffer = Boolean(offerItems) || offerCredits > 0;
      const hasRequest = Boolean(requestItems) || requestCredits > 0;

      if (!receiverUserId && !receiverEmail) {
        return Response.json({ error: 'Receiver is required' }, { status: 400 });
      }
      if (!hasOffer && !hasRequest) {
        return Response.json({ error: 'Must offer or request something' }, { status: 400 });
      }

      const receiverQuery = receiverUserId ? { id: receiverUserId } : { email: receiverEmail };
      const [receiver] = await base44.asServiceRole.entities.User.filter(receiverQuery);
      const normalizedReceiverEmail = normalizeEmail(receiver?.email);
      if (!receiver || !normalizedReceiverEmail) {
        return Response.json({ error: 'Receiver not found' }, { status: 404 });
      }
      if (normalizedReceiverEmail === userEmail) {
        return Response.json({ error: 'Cannot send a trade request to yourself' }, { status: 400 });
      }

      const trade = await base44.asServiceRole.entities.TradeRequest.create({
        sender_email: userEmail,
        sender_callsign: getDisplayName(user),
        receiver_email: normalizedReceiverEmail,
        receiver_callsign: getDisplayName(receiver),
        offer_items: offerItems || undefined,
        offer_credits: offerCredits,
        request_items: requestItems || undefined,
        request_credits: requestCredits,
        message: message || undefined,
        status: 'pending',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });

      return Response.json({
        status: 'ok',
        trade,
      });
    }

    const tradeId = sanitizeText(body.trade_id, 80);
    if (!tradeId) {
      return Response.json({ error: 'trade_id is required' }, { status: 400 });
    }

    const [trade] = await base44.asServiceRole.entities.TradeRequest.filter({ id: tradeId });
    if (!trade) {
      return Response.json({ error: 'Trade request not found' }, { status: 404 });
    }

    if (trade.status !== 'pending') {
      return Response.json({ error: 'Trade request is already resolved' }, { status: 409 });
    }

    if (trade.expires_at && new Date(trade.expires_at) <= new Date()) {
      const expiredTrade = await base44.asServiceRole.entities.TradeRequest.update(trade.id, {
        status: 'expired',
        resolved_at: trade.resolved_at || new Date().toISOString(),
      });
      return Response.json(
        {
          error: 'Trade request has expired',
          trade: expiredTrade,
        },
        { status: 409 },
      );
    }

    if (action === 'respond') {
      const decision = sanitizeText(body.decision, 20);
      if (!VALID_DECISIONS.has(decision)) {
        return Response.json({ error: 'decision must be accepted or rejected' }, { status: 400 });
      }
      if (normalizeEmail(trade.receiver_email) !== userEmail) {
        return Response.json({ error: 'Only the receiver can respond to this trade request' }, { status: 403 });
      }

      const updatedTrade = await base44.asServiceRole.entities.TradeRequest.update(trade.id, {
        status: decision,
        response_message: sanitizeText(body.response_message, 300) || undefined,
        resolved_at: new Date().toISOString(),
      });

      return Response.json({
        status: 'ok',
        trade: updatedTrade,
      });
    }

    if (normalizeEmail(trade.sender_email) !== userEmail) {
      return Response.json({ error: 'Only the sender can cancel this trade request' }, { status: 403 });
    }

    const updatedTrade = await base44.asServiceRole.entities.TradeRequest.update(trade.id, {
      status: 'cancelled',
      resolved_at: new Date().toISOString(),
    });

    return Response.json({
      status: 'ok',
      trade: updatedTrade,
    });
  } catch (error) {
    console.error('tradeRequestOps error:', error);
    return Response.json({ error: error.message || 'Trade request operation failed' }, { status: 500 });
  }
});
