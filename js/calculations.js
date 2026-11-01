// =============================================================
// calculations.js
//
// Pure calculation functions for Module 1 (Affordability).
// No DOM access here on purpose — these functions take a plain
// `inputs` object and return plain numbers/objects, so they can
// be tested, reused by Module 2/3 later, and reasoned about
// without worrying about what's on screen.
// =============================================================

/**
 * Total one-time purchase cost: list price + renovation + the
 * three percentage-based purchase fees. Mirrors the spreadsheet's
 * GesamtkostenKauf named range.
 */
function computeTotalPurchaseCost(inputs) {
  const feesPct = (inputs.registroPct + inputs.notaryPct + inputs.agencyPct) / 100;
  return inputs.listPrice + inputs.renovation + inputs.listPrice * feesPct;
}

/**
 * House value used for appreciation / tax-base purposes.
 * Renovation is capitalized into the house value (added, like the
 * spreadsheet does); one-time setup costs (phase 5) will NOT be.
 */
function computeHouseValue(inputs) {
  return inputs.listPrice + inputs.renovation;
}

/**
 * Cash equity actually put in: either the user's manual override,
 * or the automatically calculated remainder after mortgage + family loan.
 */
function computeCashEquity(inputs) {
  if (inputs.cashAuto) {
    const totalCost = computeTotalPurchaseCost(inputs);
    return Math.max(totalCost - inputs.mortgageAmount - inputs.loanAmount, 0);
  }
  return inputs.cashManual;
}

/**
 * Fixed costs: recurring, independent of rental usage.
 * Returns { items: [{label, amount}], total }.
 */
function computeFixedCosts(inputs) {
  const houseValue = computeHouseValue(inputs);
  const maintenance = houseValue * (inputs.maintenancePct / 100);
  const imu = houseValue * (inputs.imuRate / 100);

  const items = [
    { label: "Utilities baseline", amount: inputs.utilitiesBaseline },
    { label: "Home insurance", amount: inputs.insurance },
    { label: "Maintenance reserve", amount: maintenance },
    { label: "Management / garden / pool", amount: inputs.managementGardenPool },
    { label: "IMU", amount: imu },
    { label: "TARI", amount: inputs.tari },
    { label: "Commercialista", amount: inputs.commercialista },
  ];

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { items, total };
}

/**
 * Variable costs: scale with nights actually rented.
 * These are exactly the slice of gross rental income that never
 * reaches you (platform fee + service fee + cedolare secca tax).
 */
function computeVariableCosts(inputs) {
  const grossRentalIncome = inputs.nightsRented * inputs.pricePerNight;
  const platformFee = grossRentalIncome * (inputs.platformFeePct / 100);
  const serviceFee = grossRentalIncome * (inputs.serviceFeePct / 100);
  const netBeforeTax = grossRentalIncome - platformFee - serviceFee;
  const cedolareSecca = netBeforeTax * (inputs.cedolareSeccaPct / 100);

  const items = [
    { label: "Platform commission", amount: platformFee },
    { label: "Cleaning / service fee", amount: serviceFee },
    { label: "Cedolare secca (rental income tax)", amount: cedolareSecca },
  ];

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { items, total, grossRentalIncome };
}

/**
 * Capital costs: the cost of the money tied up in this purchase.
 * Year-1 snapshot only (mortgage interest, linear amortization,
 * linear family-loan repayment) plus the opportunity cost of the
 * cash equity at the assumed market return rate.
 */
function computeCapitalCosts(inputs) {
  const mortgageInterest = inputs.mortgageAmount * (inputs.mortgageRate / 100);
  const mortgageAmortization = inputs.mortgageYears > 0
    ? inputs.mortgageAmount / inputs.mortgageYears
    : 0;
  const loanRepayment = inputs.loanYears > 0
    ? inputs.loanAmount / inputs.loanYears
    : 0;
  const cashEquity = computeCashEquity(inputs);
  const opportunityCost = cashEquity * (inputs.marketReturnRate / 100);

  const items = [
    { label: "Mortgage interest", amount: mortgageInterest },
    { label: "Mortgage amortization", amount: mortgageAmortization },
    { label: "Family loan repayment", amount: loanRepayment },
    { label: "Opportunity cost of cash equity", amount: opportunityCost },
  ];

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { items, total, cashEquity };
}

/**
 * Pulls together the three categories plus the rental-income offset
 * into the final affordability numbers.
 *
 * Why we offset with GROSS rental income, not net: Variable costs
 * (platform fee, service fee, cedolare secca) are already counted
 * as a cost above, and they are exactly the gap between gross and
 * net rental income. Grand total − gross rental income therefore
 * equals Fixed + Capital − net rental income, with no double
 * counting. Subtracting only the net amount from the grand total
 * would subtract the variable-cost portion twice.
 */
function computeAffordability(inputs) {
  const fixed = computeFixedCosts(inputs);
  const variable = computeVariableCosts(inputs);
  const capital = computeCapitalCosts(inputs);

  const grandTotalEUR = fixed.total + variable.total + capital.total;
  const rentalOffsetEUR = inputs.includeRentalIncome ? variable.grossRentalIncome : 0;
  const netAnnualCostEUR = grandTotalEUR - rentalOffsetEUR;
  const netMonthlyCostEUR = netAnnualCostEUR / 12;
  const netAnnualCostCHF = netAnnualCostEUR / inputs.exchangeRate;

  let verdict;
  if (netAnnualCostCHF <= inputs.budgetCHF) {
    verdict = { level: "ok", label: "Comfortably affordable" };
  } else if (netAnnualCostCHF <= inputs.budgetCHF * 1.15) {
    verdict = { level: "tight", label: "Tight" };
  } else {
    verdict = { level: "bad", label: "Not affordable" };
  }

  return {
    fixed,
    variable,
    capital,
    grandTotalEUR,
    rentalOffsetEUR,
    netAnnualCostEUR,
    netMonthlyCostEUR,
    netAnnualCostCHF,
    verdict,
  };
}
