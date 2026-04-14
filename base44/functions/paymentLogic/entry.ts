const EXCHANGE_FEE_PERCENT = 10;
const TOKEN_UNIT_VALUE_EUR = 1;
const TRIAL_DAYS = 30;

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isValidDate(value) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function getCreatorMonthlyFee(followers) {
  if (followers <= 100) return { monthlyFeeEur: 0, tierLabel: "0-100 followers", isFree: true };
  if (followers <= 1000) return { monthlyFeeEur: 10, tierLabel: "101-1,000 followers", isFree: false };
  if (followers <= 5000) return { monthlyFeeEur: 30, tierLabel: "1,001-5,000 followers", isFree: false };
  if (followers <= 10000) return { monthlyFeeEur: 50, tierLabel: "5,001-10,000 followers", isFree: false };
  if (followers <= 30000) return { monthlyFeeEur: 80, tierLabel: "10,001-30,000 followers", isFree: false };
  if (followers <= 100000) return { monthlyFeeEur: 100, tierLabel: "30,001-100,000 followers", isFree: false };
  if (followers <= 500000) return { monthlyFeeEur: 200, tierLabel: "100,001-500,000 followers", isFree: false };
  return { monthlyFeeEur: 300, tierLabel: "500,001+ followers", isFree: false };
}

function buildCreatorPlan(followers, creatorCreatedAt) {
  const basePlan = getCreatorMonthlyFee(followers);

  if (basePlan.isFree) {
    return { isFree: true, inTrial: false, monthlyFeeEur: 0, tierLabel: basePlan.tierLabel, followers, trialEndsAt: null };
  }

  let inTrial = false;
  let trialEndsAt = null;

  if (isValidDate(creatorCreatedAt)) {
    const createdAt = new Date(creatorCreatedAt);
    const trialEnd = addDays(createdAt, TRIAL_DAYS);
    trialEndsAt = trialEnd.toISOString();
    if (Date.now() < trialEnd.getTime()) inTrial = true;
  }

  return {
    isFree: false,
    inTrial,
    monthlyFeeEur: inTrial ? 0 : basePlan.monthlyFeeEur,
    tierLabel: basePlan.tierLabel,
    followers,
    trialEndsAt,
  };
}

function buildTokenExchange(grossAmountEur) {
  if (grossAmountEur <= 0) throw new Error("grossAmountEur must be greater than 0");

  const platformFeeEur = round2(grossAmountEur * (EXCHANGE_FEE_PERCENT / 100));
  const netValueEur = round2(grossAmountEur - platformFeeEur);
  const tokensGranted = round2(netValueEur / TOKEN_UNIT_VALUE_EUR);

  return {
    grossAmountEur: round2(grossAmountEur),
    exchangeFeePercent: EXCHANGE_FEE_PERCENT,
    platformFeeEur,
    netValueEur,
    tokensGranted,
    tokenUnitValueEur: TOKEN_UNIT_VALUE_EUR,
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed. Use POST." }, { status: 405 });
    }

    const body = await req.json();

    if (!body.action) {
      return Response.json({ error: "Missing action" }, { status: 400 });
    }

    if (body.action === "creator_plan") {
      if (typeof body.followers !== "number" || body.followers < 0) {
        return Response.json({ error: "followers must be a number >= 0" }, { status: 400 });
      }
      const plan = buildCreatorPlan(body.followers, body.creatorCreatedAt);
      return Response.json({ success: true, data: plan });
    }

    if (body.action === "token_exchange") {
      if (typeof body.grossAmountEur !== "number" || body.grossAmountEur <= 0) {
        return Response.json({ error: "grossAmountEur must be a number > 0" }, { status: 400 });
      }
      const exchange = buildTokenExchange(body.grossAmountEur);
      return Response.json({ success: true, data: exchange });
    }

    if (body.action === "full_quote") {
      if (typeof body.followers !== "number" || body.followers < 0) {
        return Response.json({ error: "followers must be a number >= 0" }, { status: 400 });
      }
      if (typeof body.grossAmountEur !== "number" || body.grossAmountEur <= 0) {
        return Response.json({ error: "grossAmountEur must be a number > 0" }, { status: 400 });
      }
      const plan = buildCreatorPlan(body.followers, body.creatorCreatedAt);
      const exchange = buildTokenExchange(body.grossAmountEur);
      return Response.json({ success: true, data: { creatorPlan: plan, tokenExchange: exchange } });
    }

    return Response.json({ error: "Invalid action. Use creator_plan, token_exchange or full_quote." }, { status: 400 });

  } catch (error) {
    console.error("paymentLogic error:", error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
});