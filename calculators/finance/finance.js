/* =====================================================================
   finance.js — every calculator on the Finance page.
   To ADD one: copy a block, give it a new key, change fields + calculate().
   To REMOVE one: delete its block.
   To add a currency to the dropdown: add it to CURRENCY_FIELD below AND to CURRENCY_SYMBOLS in shared/js/utils.js.
   Needs: utils.js
   ===================================================================== */
(() => {
  // The "Currency" dropdown shared by most finance calculators (value "PKR" is the default = first option).
  const CURRENCY_FIELD = () => selectField("currency", "Currency", opts(
    ["PKR", "Pakistani Rupee (PKR)"], ["USD", "US Dollar (USD)"], ["GBP", "British Pound (GBP)"],
    ["EUR", "Euro (EUR)"], ["INR", "Indian Rupee (INR)"], ["AED", "UAE Dirham (AED)"],
  ));

  // Monthly payment of a fixed-rate loan: P·r·(1+r)^n ÷ ((1+r)^n − 1)   (r = monthly rate, n = months)
  const monthlyPayment = (principal, r, n) => {
    if (r === 0) return principal / n; // 0% interest: just split the principal
    const f = Math.pow(1 + r, n);
    return (principal * r * f) / (f - 1);
  };

  CATEGORIES.finance = {
    subcategories: {
      "loan-emi": {
        label: "Loan / EMI", resultLabel: "Monthly Payment",
        formula: "EMI = P·r·(1+r)^n ÷ ((1+r)^n − 1)",
        definition: "Equal Monthly Installment for a fixed-rate loan. r = monthly interest rate, n = number of months.",
        fields: [
          numField("principal", "Loan amount", "e.g. 500000"),
          numField("rate", "Annual interest rate (%)", "e.g. 12"),
          numField("months", "Tenure (months)", "e.g. 36"),
          CURRENCY_FIELD(),
        ],
        calculate: (v) => {
          const principal = positive(v.principal, "Loan amount");
          const rate = nonNegative(v.rate, "Annual rate");
          const months = positive(v.months, "Tenure");
          const r = rate / 12 / 100;
          const emi = monthlyPayment(principal, r, months);
          const total = emi * months;
          const totalInterest = total - principal;
          return {
            result: formatCurrency(emi, v.currency),
            secondary: { label: "Total Payable", value: formatCurrency(total, v.currency) },
            steps: [
              `Principal (P) = ${formatNumber(principal)}`,
              `Annual interest rate = ${formatNumber(rate)}%; monthly rate (r) = ${formatNumber(rate)} ÷ 12 ÷ 100 = ${formatNumber(r, 4)}`,
              `Tenure (n) = ${formatNumber(months)} monthly payments`,
              `EMI = P × r × (1+r)^n ÷ ((1+r)^n − 1)${r === 0 ? " ; at 0% interest, EMI = P ÷ n" : ""}`,
              `Monthly EMI = ${formatNumber(emi, 2)}; total interest = ${formatNumber(totalInterest, 2)}; total payable = ${formatNumber(total, 2)}`,
            ],
            details: [
              { label: "Formula", value: "EMI = P × r × (1+r)^n ÷ ((1+r)^n − 1); if r = 0, EMI = P ÷ n" },
              { label: "Variables", value: "P = principal loan amount; r = monthly interest rate as a decimal; n = number of monthly payments" },
              { label: "Loan amount", value: formatCurrency(principal, v.currency) },
              { label: "Annual interest rate", value: `${formatNumber(rate, 2)}%` },
              { label: "Tenure", value: `${formatNumber(months)} months` },
              { label: "Monthly EMI", value: formatCurrency(emi, v.currency) },
              { label: "Total interest", value: formatCurrency(totalInterest, v.currency) },
              { label: "Total payable", value: formatCurrency(total, v.currency) },
            ],
          };
        },
      },

      "sales-tax": {
        label: "Sales Tax", resultLabel: "Total (With Tax)",
        formula: "Total = Amount + (Amount × Rate ÷ 100)",
        definition: "Adds sales tax to a price.",
        fields: [numField("amount", "Amount", "e.g. 250"), numField("rate", "Tax rate (%)", "e.g. 8.5"), CURRENCY_FIELD()],
        calculate: (v) => {
          const amount = nonNegative(v.amount, "Amount"), rate = nonNegative(v.rate, "Tax rate");
          const tax = (amount * rate) / 100, total = amount + tax;
          return {
            result: formatCurrency(total, v.currency),
            secondary: { label: "Tax Amount", value: formatCurrency(tax, v.currency) },
            steps: [
              `Tax = ${formatNumber(amount)} × ${formatNumber(rate)}% = ${formatNumber(tax, 2)}`,
              `Total = ${formatNumber(amount)} + ${formatNumber(tax, 2)} = ${formatNumber(total, 2)}`,
            ],
          };
        },
      },

      "compound-interest": {
        label: "Compound Interest", resultLabel: "Future Value",
        formula: "A = P × (1 + r/n)^(n×t)",
        definition: "Growth of a principal under compound interest. The compounding frequency determines how often interest is added.",
        fields: [
          numField("principal", "Principal", "e.g. 10000"),
          numField("rate", "Annual interest rate (%)", "e.g. 6"),
          CURRENCY_FIELD(),
          selectField("frequency", "Compounding frequency", opts(["365", "Daily"], ["52", "Weekly"], ["12", "Monthly"], ["4", "Quarterly"], ["2", "Semi-Annually"], ["1", "Annually"])),
          numField("years", "Years", "e.g. 2", { section: "How Long?" }),
          numField("months", "Months", "e.g. 6", { section: "How Long?" }),
        ],
        calculate: (v) => {
          const principal = nonNegative(v.principal, "Principal");
          const rate = nonNegative(v.rate, "Annual interest rate");
          const n = positive(v.frequency, "Compounding frequency");
          const years = nonNegative(v.years, "Years");
          const months = nonNegative(v.months, "Months");
          if (months >= 12) throw new Error("Months must be between 0 and 11.");
          const t = years + months / 12;
          if (t <= 0) throw new Error("Enter a duration greater than zero.");
          const periods = n * t;
          const periodicRate = rate / 100 / n;
          const future = principal * Math.pow(1 + periodicRate, periods);
          const interest = future - principal;
          const frequencyName = { 365: "Daily", 52: "Weekly", 12: "Monthly", 4: "Quarterly", 2: "Semi-Annually", 1: "Annually" }[String(n)];
          return {
            result: formatCurrency(future, v.currency),
            secondary: { label: "Interest Earned", value: formatCurrency(interest, v.currency) },
            steps: [
              `Duration = ${formatNumber(years)} years + ${formatNumber(months)} months ÷ 12 = ${formatNumber(t)} years`,
              `Compounding frequency = ${frequencyName} (${n} periods per year)`,
              `Periodic rate = annual rate ÷ n = ${formatNumber(rate)}% ÷ 100 ÷ ${n} = ${formatNumber(periodicRate, 4)}`,
              `Total compounding periods = n × t = ${n} × ${formatNumber(t)} = ${formatNumber(periods)}`,
              `A = P × (1 + r/n)^(n×t) = ${formatNumber(principal)} × (1 + ${formatNumber(periodicRate, 4)})^${formatNumber(periods)} = ${formatNumber(future, 2)}`,
              `Interest earned = A − P = ${formatNumber(interest, 2)}`,
            ],
            details: [
              { label: "Formula", value: "A = P × (1 + r/n)^(n×t)" },
              { label: "Variables", value: "P = principal; r = annual rate as a decimal; n = compounding periods per year; t = time in years" },
              { label: "Frequency", value: frequencyName },
              { label: "Duration", value: `${formatNumber(years)} years, ${formatNumber(months)} months` },
              { label: "Total periods", value: formatNumber(periods) },
            ],
          };
        },
      },

      discount: {
        label: "Discount", resultLabel: "Final Price",
        formula: "Final = Price − (Price × Discount ÷ 100)",
        definition: "Applies a percentage discount to a price.",
        fields: [numField("price", "Original price", "e.g. 80"), numField("discount", "Discount (%)", "e.g. 25"), CURRENCY_FIELD()],
        calculate: (v) => {
          const price = nonNegative(v.price, "Original price"), discount = nonNegative(v.discount, "Discount");
          const off = (price * discount) / 100, final = price - off;
          return {
            result: formatCurrency(final, v.currency),
            secondary: { label: "You Save", value: formatCurrency(off, v.currency) },
            steps: [
              `Savings = ${formatNumber(price)} × ${formatNumber(discount)}% = ${formatNumber(off, 2)}`,
              `Final price = ${formatNumber(price)} − ${formatNumber(off, 2)} = ${formatNumber(final, 2)}`,
            ],
          };
        },
      },

      mortgage: {
        label: "Mortgage", resultLabel: "Monthly Payment",
        formula: "M = P·r·(1+r)^n ÷ ((1+r)^n − 1)",
        definition: "Monthly home-loan payment.",
        fields: [
          numField("principal", "Home loan amount", "e.g. 3000000"),
          numField("rate", "Annual interest rate (%)", "e.g. 9"),
          numField("years", "Loan term (years)", "e.g. 20"),
          CURRENCY_FIELD(),
        ],
        calculate: (v) => {
          const principal = positive(v.principal, "Loan amount");
          const rate = nonNegative(v.rate, "Annual rate");
          const years = positive(v.years, "Loan term");
          const r = rate / 12 / 100, n = years * 12;
          const m = monthlyPayment(principal, r, n);
          const total = m * n;
          return {
            result: formatCurrency(m, v.currency),
            secondary: { label: "Total Payable", value: formatCurrency(total, v.currency) },
            steps: [
              `Monthly rate r = annual rate ÷ 12 ÷ 100 = ${formatNumber(r, 4)}`,
              `Number of monthly payments n = ${formatNumber(years)} × 12 = ${formatNumber(n)}`,
              `Monthly payment = P × r × (1+r)^n ÷ ((1+r)^n − 1) = ${formatNumber(m, 2)}`,
              `Total payable = monthly payment × n = ${formatNumber(total, 2)}`,
            ],
            details: [
              { label: "Formula", value: "M = P × r × (1+r)^n ÷ ((1+r)^n − 1); at 0% interest, M = P ÷ n" },
              { label: "Variables", value: "P = loan principal; r = monthly interest rate; n = number of monthly payments" },
              { label: "Loan amount", value: formatCurrency(principal, v.currency) },
              { label: "Annual interest rate", value: `${formatNumber(rate, 2)}%` },
              { label: "Tenure", value: `${formatNumber(years)} years (${formatNumber(n)} months)` },
              { label: "Monthly payment", value: formatCurrency(m, v.currency) },
              { label: "Total payable", value: formatCurrency(total, v.currency) },
            ],
          };
        },
      },

      margin: {
        label: "Margin", resultLabel: "Margin (%)",
        formula: "Margin % = (Selling − Cost) ÷ Selling × 100",
        definition: "Profit margin as a percentage of selling price.",
        fields: [numField("cost", "Cost price", "e.g. 40"), numField("sell", "Selling price", "e.g. 60")],
        calculate: (v) => {
          const cost = nonNegative(v.cost, "Cost price"), sell = positive(v.sell, "Selling price");
          const margin = ((sell - cost) / sell) * 100;
          const markup = cost === 0 ? NaN : ((sell - cost) / cost) * 100;
          return {
            result: `${formatNumber(margin, 2)}%`,
            secondary: { label: "Markup (%)", value: Number.isFinite(markup) ? `${formatNumber(markup, 2)}%` : "Not defined when cost is zero" },
            steps: [
              `Profit = ${formatNumber(sell)} − ${formatNumber(cost)} = ${formatNumber(sell - cost, 2)}`,
              `Margin = ${formatNumber(sell - cost, 2)} ÷ ${formatNumber(sell)} × 100 = ${formatNumber(margin, 2)}%`,
            ],
          };
        },
      },

      "salary-hourly": {
        label: "Salary-to-Hourly", resultLabel: "Hourly Rate",
        formula: "Hourly = Annual Salary ÷ (Hours/Week × 52)",
        definition: "Converts an annual salary to an equivalent hourly rate.",
        fields: [numField("salary", "Annual salary", "e.g. 60000"), numField("hours", "Hours per week", "e.g. 40")],
        calculate: (v) => {
          const salary = nonNegative(v.salary, "Annual salary"), hours = positive(v.hours, "Hours per week");
          const result = salary / (hours * 52);
          return {
            result: formatNumber(result, 2),
            unit: "/hour",
            steps: [`Weeks per year = 52`, `${formatNumber(salary)} ÷ (${formatNumber(hours)} × 52) = ${formatNumber(result, 2)}`],
          };
        },
      },

      vat: {
        label: "VAT", resultLabel: "Final Price",
        formula: "Add: Total = Amount × (1 + Rate/100) · Extract: Net = Amount ÷ (1 + Rate/100)",
        definition: "Adds VAT to a net amount, or extracts the VAT portion already included in a total.",
        fields: [
          selectField("mode", "Mode", opts(["add", "Add VAT to amount"], ["extract", "Extract VAT from total"])),
          numField("amount", "Amount", "e.g. 100"),
          numField("rate", "VAT rate (%)", "e.g. 15"),
          CURRENCY_FIELD(),
        ],
        calculate: (v) => {
          const amount = nonNegative(v.amount, "Amount"), rate = nonNegative(v.rate, "VAT rate");
          if (v.mode === "add") { // net -> gross
            const total = amount * (1 + rate / 100), vatAmt = total - amount;
            return {
              result: formatCurrency(total, v.currency), resultLabel: "Final Price", unit: "",
              secondary: { label: "VAT Amount", value: formatCurrency(vatAmt, v.currency) },
              steps: [`Total = ${formatNumber(amount)} × (1 + ${formatNumber(rate)}/100) = ${formatNumber(total, 2)}`],
            };
          }
          const net = amount / (1 + rate / 100), vatAmt = amount - net; // gross -> net
          return {
            result: formatCurrency(net, v.currency), resultLabel: "Net Amount", unit: "",
            secondary: { label: "VAT Amount", value: formatCurrency(vatAmt, v.currency) },
            steps: [`Net = ${formatNumber(amount)} ÷ (1 + ${formatNumber(rate)}/100) = ${formatNumber(net, 2)}`],
          };
        },
      },
    },
  };
})();
